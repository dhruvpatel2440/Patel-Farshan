import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAudit, setAuditTarget } from '@/lib/audit'

export const PATCH = withAudit(
  'order.payment_reject',
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { note } = await request.json().catch(() => ({ note: null }))
  const admin = createAdminClient()

  const { data: order } = await admin.from('orders').select('*').eq('id', id).single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  setAuditTarget({
    entityType: 'order',
    entityId: order.order_number,
    summary: `Rejected payment for #${order.order_number}`,
    metadata: note ? { note } : undefined,
  })

  await admin.from('orders').update({ payment_status: 'failed' }).eq('id', id)

  await admin.from('order_status_history').insert({
    order_id: id,
    status: order.order_status,
    changed_by: auth.user.id,
    note: note || 'Payment rejected by admin — UTR did not match',
  })

  return NextResponse.json({ ok: true })
  }
)
