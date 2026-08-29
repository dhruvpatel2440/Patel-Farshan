import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { otpMatches, OTP_MAX_ATTEMPTS } from '@/lib/otp'

/**
 * Step 2 of signup. On success the auth user is marked email-confirmed, which
 * is what finally allows sign-in, and the code row is deleted so it can't be
 * replayed.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const code = typeof body?.code === 'string' ? body.code.trim() : ''

  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, email_verified')
    .eq('email', email)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'No pending signup for this email.' }, { status: 404 })
  }
  if (profile.email_verified) {
    return NextResponse.json({ ok: true, alreadyVerified: true })
  }

  const { data: row } = await admin
    .from('email_verification_codes')
    .select('code_hash, expires_at, attempts')
    .eq('user_id', profile.id)
    .eq('purpose', 'signup')
    .maybeSingle()

  if (!row) {
    return NextResponse.json(
      { error: 'That code has expired. Request a new one.' },
      { status: 400 }
    )
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin.from('email_verification_codes').delete().eq('user_id', profile.id).eq('purpose', 'signup')
    return NextResponse.json(
      { error: 'That code has expired. Request a new one.' },
      { status: 400 }
    )
  }

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await admin.from('email_verification_codes').delete().eq('user_id', profile.id).eq('purpose', 'signup')
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
      .eq('purpose', 'signup')

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

  // Correct. Confirming the email is what lifts the sign-in block.
  const { error: confirmError } = await admin.auth.admin.updateUserById(profile.id, {
    email_confirm: true,
  })

  if (confirmError) {
    return NextResponse.json({ error: 'Could not verify. Please try again.' }, { status: 500 })
  }

  await admin.from('profiles').update({ email_verified: true }).eq('id', profile.id)
  await admin.from('email_verification_codes').delete().eq('user_id', profile.id).eq('purpose', 'signup')

  return NextResponse.json({ ok: true })
}
