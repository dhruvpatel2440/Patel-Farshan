import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { otpMatches, OTP_MAX_ATTEMPTS } from '@/lib/otp'

/** Step 2 of password reset: verify the code, then set the new password. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  // Past this point the caller already holds a code we emailed, so specific
  // errors are safe — they aren't usable for enumeration.
  const expired = NextResponse.json(
    { error: 'That code has expired. Request a new one.' },
    { status: 400 }
  )

  if (!profile) return expired

  const { data: row } = await admin
    .from('email_verification_codes')
    .select('code_hash, expires_at, attempts')
    .eq('user_id', profile.id)
    .eq('purpose', 'password_reset')
    .maybeSingle()

  if (!row) return expired

  const clear = () =>
    admin
      .from('email_verification_codes')
      .delete()
      .eq('user_id', profile.id)
      .eq('purpose', 'password_reset')

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await clear()
    return expired
  }

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await clear()
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Request a new code.' },
      { status: 429 }
    )
  }

  if (!otpMatches(code, row.code_hash)) {
    const attempts = row.attempts + 1
    await admin
      .from('email_verification_codes')
      .update({ attempts })
      .eq('user_id', profile.id)
      .eq('purpose', 'password_reset')

    const left = OTP_MAX_ATTEMPTS - attempts
    return NextResponse.json(
      {
        error:
          left > 0
            ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
            : 'Too many incorrect attempts. Request a new code.',
      },
      { status: 400 }
    )
  }

  const { error } = await admin.auth.admin.updateUserById(profile.id, { password })
  if (error) {
    return NextResponse.json({ error: 'Could not update your password.' }, { status: 500 })
  }

  // Burn the code so it can't be replayed to change the password again.
  await clear()

  return NextResponse.json({ ok: true })
}
