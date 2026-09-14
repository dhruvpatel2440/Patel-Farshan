import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAudit, setAuditTarget } from '@/lib/audit'

export const PATCH = withAudit(
  'order.payment_verify',
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const admin = createAdminClient()

  const { data: order } = await admin.from('orders').select('*').eq('id', id).single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.payment_status !== 'awaiting_verification') {
    return NextResponse.json({ error: 'This order is not awaiting verification.' }, { status: 400 })
  }

  setAuditTarget({
    entityType: 'order',
    entityId: order.order_number,
    summary: `Verified UPI payment for #${order.order_number} (₹${order.total})`,
    metadata: { total: order.total, utr: order.utr_number ?? null },
  })

  await admin
    .from('orders')
    .update({ payment_status: 'paid', order_status: 'confirmed' })
    .eq('id', id)

  await admin.from('order_status_history').insert({
    order_id: id,
    status: 'confirmed',
    changed_by: auth.user.id,
    note: 'Payment verified by admin',
  })

  return NextResponse.json({ ok: true })
  }
)
