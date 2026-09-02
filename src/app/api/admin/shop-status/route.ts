import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAudit, setAuditTarget } from '@/lib/audit'
import { SHOP_STATUS_TAG } from '@/lib/data'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin.from('shop_settings').select('*').eq('id', true).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ shopSettings: data })
}

export const PUT = withAudit('shop.toggle', async (request: Request) => {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { is_open, closed_message } = await request.json()
  if (typeof is_open !== 'boolean') {
    return NextResponse.json({ error: 'is_open must be a boolean.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('shop_settings')
    .update({ is_open, closed_message: closed_message ?? null, updated_at: new Date().toISOString() })
    .eq('id', true)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  setAuditTarget({
    entityType: 'shop_settings',
    entityId: 'shop',
    summary: is_open ? 'Opened the shop' : 'Closed the shop',
  })
  revalidateTag(SHOP_STATUS_TAG, { expire: 0 })
  return NextResponse.json({ shopSettings: data })
})
