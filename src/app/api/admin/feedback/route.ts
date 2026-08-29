import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { FEEDBACK_TAG } from '@/lib/data'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ feedback: data })
}

/** Approve or reject one piece of feedback. Rejecting deletes it outright. */
export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id, approve } = await request.json()
  if (!id) return NextResponse.json({ error: 'Feedback id is required.' }, { status: 400 })

  const admin = createAdminClient()

  if (approve) {
    const { error } = await admin.from('feedback').update({ is_approved: true }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    const { error } = await admin.from('feedback').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  revalidateTag(FEEDBACK_TAG, { expire: 0 })
  return NextResponse.json({ ok: true })
}
