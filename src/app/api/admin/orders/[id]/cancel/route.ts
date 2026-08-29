import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { orderCancelledHtml, orderCancelledText } from '@/lib/emailTemplates'
import { orderRecipient } from '@/lib/notify'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { reason } = await request.json()
  if (!reason) return NextResponse.json({ error: 'A cancellation reason is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: order } = await admin.from('orders').select('*').eq('id', id).single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.order_status === 'delivered') {
    return NextResponse.json({ error: 'A delivered order cannot be cancelled.' }, { status: 400 })
  }

  const { data: items } = await admin.from('order_items').select('*').eq('order_id', id)

  for (const item of items ?? []) {
    const { data: product } = await admin
      .from('products')
      .select('stock_qty')
      .eq('id', item.product_id)
      .single()
    if (product) {
      await admin
        .from('products')
        .update({ stock_qty: product.stock_qty + item.quantity })
        .eq('id', item.product_id)
    }
  }

  const note =
    order.payment_status === 'paid'
      ? `${reason} — Manual refund required.`
      : reason

  await admin
    .from('orders')
    .update({ order_status: 'cancelled', cancellation_reason: reason })
    .eq('id', id)

  await admin.from('order_status_history').insert({
    order_id: id,
    status: 'cancelled',
    changed_by: auth.user.id,
    note,
  })

  // Tell the customer why — the reason is captured here but was never
  // surfaced to them anywhere. Best-effort: never fail the cancellation.
  const recipient = await orderRecipient(order.user_id)
  if (recipient) {
    const payload = {
      orderNumber: order.order_number,
      customerName: recipient.name,
      orderId: order.id,
      reason,
      refundDue: order.payment_status === 'paid',
    }
    await sendEmail({
      to: { email: recipient.email, name: recipient.name },
      subject: `Order #${order.order_number} cancelled`,
      html: orderCancelledHtml(payload),
      text: orderCancelledText(payload),
      context: 'order-cancelled',
    })
  }

  return NextResponse.json({ ok: true })
}
