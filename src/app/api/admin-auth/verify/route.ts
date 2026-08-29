import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { otpMatches, OTP_MAX_ATTEMPTS } from '@/lib/otp'
import { recordAudit } from '@/lib/audit'
import {
  ADMIN_COOKIE,
  OTP_TRUST_COOKIE,
  adminCookieOptions,
  createAdminToken,
  createOtpTrustToken,
} from '@/lib/adminSession'

/**
 * Admin login, step 2: check the emailed code, mint the elevation cookie that
 * /admin requires, and mark this device as having passed the code — so a
 * login within the next 5 hours can skip straight past this step.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 })
  }

  // Identity comes from the session created in step 1, never from the request
  // body — otherwise anyone could name an admin and brute-force their code.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Your session expired. Start again.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const { data: row } = await admin
    .from('email_verification_codes')
    .select('code_hash, expires_at, attempts')
    .eq('user_id', user.id)
    .eq('purpose', 'admin_login')
    .maybeSingle()

  const clear = () =>
    admin
      .from('email_verification_codes')
      .delete()
      .eq('user_id', user.id)
      .eq('purpose', 'admin_login')

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    if (row) await clear()
    return NextResponse.json(
      { error: 'That code has expired. Sign in again.' },
      { status: 400 }
    )
  }

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await clear()
    await supabase.auth.signOut()
    await recordAudit({
      action: 'admin.login_failed',
      actorId: user.id,
      actorEmail: user.email,
      status: 'failure',
      statusCode: 429,
      summary: 'Admin login blocked — too many incorrect codes',
      request,
    })
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Sign in again.' },
      { status: 429 }
    )
  }

  if (!otpMatches(code, row.code_hash)) {
    const attempts = row.attempts + 1
    await admin
      .from('email_verification_codes')
      .update({ attempts })
      .eq('user_id', user.id)
      .eq('purpose', 'admin_login')

    await recordAudit({
      action: 'admin.login_failed',
      actorId: user.id,
      actorEmail: user.email,
      status: 'failure',
      statusCode: 400,
      summary: `Incorrect admin login code (attempt ${attempts} of ${OTP_MAX_ATTEMPTS})`,
      request,
    })

    const left = OTP_MAX_ATTEMPTS - attempts
    return NextResponse.json(
      {
        error:
          left > 0
            ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
            : 'Too many incorrect attempts. Sign in again.',
      },
      { status: 400 }
    )
  }

  await clear()

  await recordAudit({
    action: 'admin.login',
    actorId: user.id,
    actorEmail: user.email,
    status: 'success',
    statusCode: 200,
    summary: 'Signed in to the admin panel',
    request,
  })

  const token = createAdminToken(user.id)
  const trust = createOtpTrustToken(user.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, token.value, { ...adminCookieOptions, maxAge: token.maxAge })
  res.cookies.set(OTP_TRUST_COOKIE, trust.value, { ...adminCookieOptions, maxAge: trust.maxAge })
  return res
}
