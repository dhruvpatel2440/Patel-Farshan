import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueOtp } from '@/lib/issueOtp'
import { ADMIN_COOKIE, adminCookieOptions, createAdminToken, hasRecentOtpVerification } from '@/lib/adminSession'

/**
 * Admin login, step 1: verify the password and confirm the account is
 * actually an admin.
 *
 * If this device passed the emailed code within the last 5 hours
 * (hasRecentOtpVerification), the code step is skipped entirely — password
 * alone re-opens the panel, and this response mints the elevation cookie
 * directly. Otherwise a fresh code is emailed and the client proceeds to
 * step 2 as before. Either way, a session is established here, but it grants
 * nothing extra on its own — /admin requires the elevation cookie, which
 * only this "trusted device" path or a completed code step can mint.
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

  if (await hasRecentOtpVerification(data.user.id)) {
    const token = createAdminToken(data.user.id)
    const res = NextResponse.json({ ok: true, otpRequired: false })
    res.cookies.set(ADMIN_COOKIE, token.value, { ...adminCookieOptions, maxAge: token.maxAge })
    return res
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

  return NextResponse.json({ ok: true, otpRequired: true })
}
