import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_STATUS_FLOW } from '@/lib/constants'
import { sendEmail } from '@/lib/email'
import { outForDeliveryHtml, outForDeliveryText } from '@/lib/emailTemplates'
import { orderRecipient } from '@/lib/notify'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { status, note } = await request.json()

  const admin = createAdminClient()
  const { data: order } = await admin.from('orders').select('*').eq('id', id).single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const currentIndex = ADMIN_STATUS_FLOW.indexOf(order.order_status)
  const nextIndex = ADMIN_STATUS_FLOW.indexOf(status)

  const isForwardStep = currentIndex !== -1 && nextIndex === currentIndex + 1
  const isFirstStep = order.order_status === 'placed' && status === 'confirmed'
  const isAwaitingPaymentStep = order.order_status === 'awaiting_payment' && status === 'placed'

  if (!isForwardStep && !isFirstStep && !isAwaitingPaymentStep) {
    return NextResponse.json(
      { error: 'Status can only move forward one step at a time.' },
      { status: 400 }
    )
  }

  await admin.from('orders').update({ order_status: status }).eq('id', id)
  await admin.from('order_status_history').insert({
    order_id: id,
    status,
    changed_by: auth.user.id,
    note: note || null,
  })

  // Only 'out_for_delivery' is worth an email. Notifying on every step would
  // spend ~3 sends per order against a 300/day cap for little customer value.
  if (status === 'out_for_delivery') {
    const recipient = await orderRecipient(order.user_id)
    if (recipient) {
      const payload = {
        orderNumber: order.order_number,
        customerName: recipient.name,
        orderId: order.id,
      }
      await sendEmail({
        to: { email: recipient.email, name: recipient.name },
        subject: `Your order #${order.order_number} is out for delivery`,
        html: outForDeliveryHtml(payload),
        text: outForDeliveryText(payload),
        context: 'out-for-delivery',
      })
    }
  }

  return NextResponse.json({ ok: true })
}
