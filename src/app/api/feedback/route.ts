import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** The signed-in customer's own feedback, or null if they haven't left any. */
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
    .maybeSingle()

  return NextResponse.json({ feedback: data })
}

/**
 * Submit or edit feedback. Always upserts on user_id — one review per
 * customer, editable rather than stackable.
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
    .upsert(
      {
        user_id: user.id,
        user_name: profile?.name || 'A customer',
        rating,
        message: message || null,
        is_approved: false,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Could not save your feedback.' }, { status: 500 })

  return NextResponse.json({ feedback: data })
}
