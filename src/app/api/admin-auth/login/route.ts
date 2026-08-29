import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueOtp } from '@/lib/issueOtp'

/**
 * Admin login, step 1: verify the password, confirm the account is actually an
 * admin, then email a 6-digit code. A session is established here, but it
 * grants nothing extra — /admin additionally requires the elevation cookie
 * that only step 2 can mint.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  // One message for every failure mode below, so this endpoint can't be used
  // to discover which addresses are admin accounts.
  const denied = NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })

  if (!email || !password) return denied

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) return denied

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, name')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    // A real customer's credentials — drop the session we just created so this
    // page can't be used as a back door into a normal account.
    await supabase.auth.signOut()
    return denied
  }

  const sent = await issueOtp({
    userId: data.user.id,
    email,
    name: profile.name || 'Admin',
    purpose: 'admin_login',
  })

  if (!sent) {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: 'Could not send your security code. Please try again.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
