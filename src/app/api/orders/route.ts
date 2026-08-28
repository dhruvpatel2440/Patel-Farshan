import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { orderConfirmationHtml, orderConfirmationText } from '@/lib/emailTemplates'
import type { Address, PaymentMode } from '@/types'

interface CreateOrderBody {
  items: { productId: string; quantity: number }[]
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

    // Re-fetch every product — never trust the client's price or stock.
    const productIds = items.map((i) => i.productId)
    const { data: products, error: productsError } = await admin
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('is_available', true)
      .eq('is_deleted', false)

    if (productsError || !products || products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'One or more items in your cart are no longer available.' },
        { status: 409 }
      )
    }

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)
      if (!product || product.stock_qty < item.quantity) {
        return NextResponse.json(
          { error: `Sorry, ${product?.name ?? 'an item'} just went out of stock.` },
          { status: 409 }
        )
      }
    }

    const subtotal = items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)!
      return sum + product.price * item.quantity
    }, 0)

    if (subtotal < city.min_order_value) {
      return NextResponse.json(
        { error: `Minimum order for ${city.name} is ₹${city.min_order_value}.` },
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
      const product = products.find((p) => p.id === item.productId)!
      return {
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        product_name_gujarati: product.name_gujarati,
        product_image_url: product.image_url,
        price_at_purchase: product.price,
        quantity: item.quantity,
        line_total: product.price * item.quantity,
      }
    })

    await admin.from('order_items').insert(orderItems)

    await admin.from('order_status_history').insert({
      order_id: order.id,
      status: order.order_status,
      changed_by: user.id,
      note: 'Order placed by customer',
    })

    // Conditional stock decrement per item — compensate if any fails.
    const decremented: { productId: string; quantity: number }[] = []
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!
      const { data: updated } = await admin
        .from('products')
        .update({ stock_qty: product.stock_qty - item.quantity })
        .eq('id', item.productId)
        .gte('stock_qty', item.quantity)
        .select('id')

      if (!updated || updated.length === 0) {
        // Roll back: restore already-decremented items and cancel the order.
        for (const done of decremented) {
          const restoredProduct = products.find((p) => p.id === done.productId)!
          await admin
            .from('products')
            .update({ stock_qty: restoredProduct.stock_qty })
            .eq('id', done.productId)
        }
        await admin
          .from('orders')
          .update({
            order_status: 'cancelled',
            cancellation_reason: `${product.name} just went out of stock.`,
          })
          .eq('id', order.id)

        return NextResponse.json(
          { error: `Sorry, ${product.name} just went out of stock.` },
          { status: 409 }
        )
      }
      decremented.push({ productId: item.productId, quantity: item.quantity })
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
            name: i.product_name,
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
            name: i.product_name,
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

    return NextResponse.json({ order })
  } catch {
    return NextResponse.json({ error: 'Something went wrong placing your order.' }, { status: 500 })
  }
}
