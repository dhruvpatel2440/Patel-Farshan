import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueOtp } from '@/lib/issueOtp'
import { OTP_RESEND_COOLDOWN_MS } from '@/lib/otp'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

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
    return NextResponse.json({ error: 'This email is already verified.' }, { status: 400 })
  }

  // Throttle so this endpoint can't be used to flood someone's inbox.
  const { data: existing } = await admin
    .from('email_verification_codes')
    .select('last_sent_at')
    .eq('user_id', profile.id)
    .eq('purpose', 'signup')
    .maybeSingle()

  if (existing) {
    const elapsed = Date.now() - new Date(existing.last_sent_at).getTime()
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000)
      return NextResponse.json(
        { error: `Please wait ${retryAfter}s before requesting another code.`, retryAfter },
        { status: 429 }
      )
    }
  }

  const sent = await issueOtp({ userId: profile.id, email, name: profile.name, purpose: 'signup' })
  if (!sent) {
    return NextResponse.json({ error: 'Could not send the code. Try again shortly.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
