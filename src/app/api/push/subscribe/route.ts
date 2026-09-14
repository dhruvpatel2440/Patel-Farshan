import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface SubscriptionBody {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

/** Saves this device's push subscription against the signed-in account. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: SubscriptionBody = await request.json().catch(() => ({}))
  const { endpoint, keys } = body
  if (!endpoint?.startsWith('https://') || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 })
  }

  const admin = createAdminClient()
  // Upsert on endpoint: the same phone signed in to a different account now
  // belongs to that account.
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )

  if (error) return NextResponse.json({ error: 'Could not save subscription.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/**
 * Forgets this device. Needs no session — it is called on logout, possibly
 * after the session is already gone — and knowing the endpoint is proof
 * enough: it is a long random URL only this browser holds.
 */
export async function DELETE(request: Request) {
  const { endpoint }: SubscriptionBody = await request.json().catch(() => ({}))
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint.' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('push_subscriptions').delete().eq('endpoint', endpoint)
  return NextResponse.json({ ok: true })
}
