import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** All of the signed-in customer's own feedback, most recent first. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('feedback')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ feedback: data ?? [] })
}

/**
 * Submit a new piece of feedback. Customers can leave as many as they like —
 * e.g. one per order — each moderated independently.
 *
 * Uses the admin client for the write, deliberately: it is the only path
 * that can set `is_approved`, and it always forces it to false here. If a
 * regular authenticated client performed this write instead, a customer
 * could pass `is_approved: true` in the request body and RLS would allow it
 * (the row-ownership check would still pass), self-publishing straight past
 * moderation.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const rating = Number(body?.rating)
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 500) : null

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Choose a rating from 1 to 5 stars.' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('feedback')
    .insert({
      user_id: user.id,
      user_name: profile?.name || 'A customer',
      rating,
      message: message || null,
      is_approved: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Could not save your feedback.' }, { status: 500 })

  return NextResponse.json({ feedback: data })
}
