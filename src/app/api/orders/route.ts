import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import {
  newOrderAdminHtml,
  newOrderAdminText,
  orderConfirmationHtml,
  orderConfirmationText,
} from '@/lib/emailTemplates'
import { adminInbox } from '@/lib/notify'
import { formatWeightKg } from '@/lib/weight'
import type { Address, PaymentMode } from '@/types'

interface CreateOrderBody {
  items: { productId: string; tierId: string; quantity: number }[]
  address: Address
  paymentMode: PaymentMode
  deliveryInstructions?: string
}

export async function POST(request: Request) {
  try {
    const authClient = await createClient()
    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to place an order.' }, { status: 401 })
    }

    const body: CreateOrderBody = await request.json()
    const { items, address, paymentMode, deliveryInstructions } = body

    if (!items?.length) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
    }
    if (!address?.city_id) {
      return NextResponse.json({ error: 'Select a delivery address.' }, { status: 400 })
    }
    if (paymentMode !== 'upi' && paymentMode !== 'cod') {
      return NextResponse.json({ error: 'Select a payment method.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Re-fetch city — never trust the client's delivery charge / min order.
    const { data: city, error: cityError } = await admin
      .from('cities')
      .select('*')
      .eq('id', address.city_id)
      .eq('is_active', true)
      .single()

    if (cityError || !city) {
      return NextResponse.json(
        { error: 'This delivery city is no longer available.' },
        { status: 400 }
      )
    }

    // Re-fetch every price tier — never trust the client's price or stock.
    const tierIds = items.map((i) => i.tierId)
    const { data: tiers, error: tiersError } = await admin
      .from('product_price_tiers')
      .select('*, product:products(*)')
      .in('id', tierIds)

    if (tiersError || !tiers || tiers.length !== tierIds.length) {
      return NextResponse.json(
        { error: 'One or more items in your cart are no longer available.' },
        { status: 409 }
      )
    }

    for (const item of items) {
      const tier = tiers.find((t) => t.id === item.tierId)
      const product = tier?.product
      if (
        !tier ||
        !product ||
        tier.product_id !== item.productId ||
        !product.is_available ||
        product.is_deleted
      ) {
        return NextResponse.json(
          { error: 'One or more items in your cart are no longer available.' },
          { status: 409 }
        )
      }
      if (tier.stock_qty < item.quantity) {
        return NextResponse.json(
          { error: `Sorry, ${product.name} (${tier.unit_label}) just went out of stock.` },
          { status: 409 }
        )
      }
    }

    const subtotal = items.reduce((sum, item) => {
      const tier = tiers.find((t) => t.id === item.tierId)!
      return sum + tier.price * item.quantity
    }, 0)

    const orderWeightKg = items.reduce((sum, item) => {
      const tier = tiers.find((t) => t.id === item.tierId)!
      return sum + (tier.weight_grams * item.quantity) / 1000
    }, 0)

    if (orderWeightKg < city.min_order_kg) {
      return NextResponse.json(
        { error: `Minimum order for ${city.name} is ${formatWeightKg(city.min_order_kg)}.` },
        { status: 400 }
      )
    }

    const deliveryCharge = city.delivery_charge
    const total = subtotal + deliveryCharge

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: user.id,
        address_snapshot: { ...address, city },
        subtotal,
        delivery_charge: deliveryCharge,
        total,
        payment_mode: paymentMode,
        payment_status: 'pending',
        order_status: paymentMode === 'upi' ? 'awaiting_payment' : 'placed',
        delivery_instructions: deliveryInstructions || null,
      })
      .select()
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Could not create your order. Please try again.' }, { status: 500 })
    }

    const orderItems = items.map((item) => {
      const tier = tiers.find((t) => t.id === item.tierId)!
      const product = tier.product
      return {
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        product_name_gujarati: product.name_gujarati,
        product_image_url: product.image_url,
        tier_id: tier.id,
        unit_label: tier.unit_label,
        price_at_purchase: tier.price,
        quantity: item.quantity,
        line_total: tier.price * item.quantity,
      }
    })

    await admin.from('order_items').insert(orderItems)

    await admin.from('order_status_history').insert({
      order_id: order.id,
      status: order.order_status,
      changed_by: user.id,
      note: 'Order placed by customer',
    })

    // Conditional stock decrement per tier — compensate if any fails.
    // (products.stock_qty is a derived aggregate, kept in sync by a DB
    // trigger whenever product_price_tiers.stock_qty changes.)
    const decremented: { tierId: string; quantity: number }[] = []
    for (const item of items) {
      const tier = tiers.find((t) => t.id === item.tierId)!
      const { data: updated } = await admin
        .from('product_price_tiers')
        .update({ stock_qty: tier.stock_qty - item.quantity })
        .eq('id', item.tierId)
        .gte('stock_qty', item.quantity)
        .select('id')

      if (!updated || updated.length === 0) {
        // Roll back: restore already-decremented tiers and cancel the order.
        for (const done of decremented) {
          const restoredTier = tiers.find((t) => t.id === done.tierId)!
          await admin
            .from('product_price_tiers')
            .update({ stock_qty: restoredTier.stock_qty })
            .eq('id', done.tierId)
        }
        await admin
          .from('orders')
          .update({
            order_status: 'cancelled',
            cancellation_reason: `${tier.product.name} just went out of stock.`,
          })
          .eq('id', order.id)

        return NextResponse.json(
          { error: `Sorry, ${tier.product.name} just went out of stock.` },
          { status: 409 }
        )
      }
      decremented.push({ tierId: item.tierId, quantity: item.quantity })
    }

    // Clear the user's server-side cart.
    await admin.from('cart_items').delete().eq('user_id', user.id)

    // Best-effort confirmation email — never blocks or fails the order.
    // user.email is the auth identity's email; falls back to the address's
    // name for the greeting since email itself is optional at signup.
    if (user.email) {
      sendEmail({
        to: { email: user.email, name: address.full_name },
        subject: `Order Confirmed — #${order.order_number}`,
        html: orderConfirmationHtml({
          orderNumber: order.order_number,
          customerName: address.full_name,
          items: orderItems.map((i) => ({
            name: `${i.product_name} (${i.unit_label})`,
            quantity: i.quantity,
            lineTotal: i.line_total,
          })),
          subtotal: order.subtotal,
          deliveryCharge: order.delivery_charge,
          total: order.total,
          paymentMode: order.payment_mode,
          orderId: order.id,
        }),
        text: orderConfirmationText({
          orderNumber: order.order_number,
          customerName: address.full_name,
          items: orderItems.map((i) => ({
            name: `${i.product_name} (${i.unit_label})`,
            quantity: i.quantity,
            lineTotal: i.line_total,
          })),
          subtotal: order.subtotal,
          deliveryCharge: order.delivery_charge,
          total: order.total,
          paymentMode: order.payment_mode,
          orderId: order.id,
        }),
        context: 'order-confirmation',
      }).catch(() => {})
    }

    // Alert the shop. Without this, new orders are only discovered by
    // opening the admin dashboard.
    const shopInbox = adminInbox()
    if (shopInbox) {
      const adminPayload = {
        orderNumber: order.order_number,
        customerName: address.full_name,
        customerPhone: address.phone,
        items: orderItems.map((i) => ({
          name: i.product_name,
          quantity: i.quantity,
          lineTotal: i.line_total,
        })),
        total: order.total,
        paymentMode: order.payment_mode,
        address: `Bus pickup — ${city.name}`,
        orderId: order.id,
      }
      sendEmail({
        to: { email: shopInbox },
        subject: `New order #${order.order_number} — ₹${order.total}`,
        html: newOrderAdminHtml(adminPayload),
        text: newOrderAdminText(adminPayload),
        context: 'new-order-admin',
      }).catch(() => {})
    }

    return NextResponse.json({ order })
  } catch {
    return NextResponse.json({ error: 'Something went wrong placing your order.' }, { status: 500 })
  }
}
