import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueOtp } from '@/lib/issueOtp'
import { OTP_RESEND_COOLDOWN_MS } from '@/lib/otp'

/**
 * Step 1 of password reset: email a 6-digit code.
 *
 * Always answers `{ ok: true }`, even for an address that isn't registered.
 * Reporting "no such account" would turn this endpoint into an account
 * enumeration oracle — anyone could test which emails shop here.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email) return NextResponse.json({ error: 'Enter your email.' }, { status: 400 })

  const ok = NextResponse.json({ ok: true })
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, email_verified')
    .eq('email', email)
    .maybeSingle()

  // Unknown address, or one that never proved ownership — say nothing.
  if (!profile || !profile.email_verified) return ok

  // Throttle resends without leaking that the account exists.
  const { data: existing } = await admin
    .from('email_verification_codes')
    .select('last_sent_at')
    .eq('user_id', profile.id)
    .eq('purpose', 'password_reset')
    .maybeSingle()

  if (existing) {
    const elapsed = Date.now() - new Date(existing.last_sent_at).getTime()
    if (elapsed < OTP_RESEND_COOLDOWN_MS) return ok
  }

  await issueOtp({
    userId: profile.id,
    email,
    name: profile.name,
    purpose: 'password_reset',
  })

  return ok
}
