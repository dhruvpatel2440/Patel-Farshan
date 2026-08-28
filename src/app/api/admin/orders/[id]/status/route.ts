import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_STATUS_FLOW } from '@/lib/constants'

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

  return NextResponse.json({ ok: true })
}
