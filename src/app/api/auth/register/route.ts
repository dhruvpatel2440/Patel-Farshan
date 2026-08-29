import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueOtp } from '@/lib/issueOtp'
import { registerSchema } from '@/lib/validations'

/**
 * Step 1 of signup. Creates the auth user with email_confirm: false — the
 * account exists but cannot be signed into until the emailed code is entered
 * at /api/auth/verify-otp.
 *
 * Deliberately does NOT return a session. Creating the user server-side (via
 * the admin client) rather than client-side signUp is what makes the code a
 * real gate: the client never receives credentials it could use to skip it.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  // Re-validate server-side; the client's zod check is a convenience, not a control.
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check your details.' },
      { status: 400 }
    )
  }

  const { name, phone, password } = parsed.data
  const email = parsed.data.email!.trim().toLowerCase()

  const admin = createAdminClient()

  // profiles.phone is UNIQUE NOT NULL, so a duplicate would blow up inside the
  // handle_new_user trigger with an opaque "Database error". Check up front to
  // return something the user can act on.
  const { data: phoneOwner } = await admin
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  if (phoneOwner) {
    return NextResponse.json(
      { error: 'This mobile number is already registered. Please log in instead.' },
      { status: 409 }
    )
  }

  const { data: existing } = await admin
    .from('profiles')
    .select('id, email_verified')
    .eq('email', email)
    .maybeSingle()

  if (existing?.email_verified) {
    return NextResponse.json(
      { error: 'This email is already registered. Please log in instead.' },
      { status: 409 }
    )
  }

  let userId: string

  if (existing) {
    // An abandoned, never-verified signup. Let them start over with the
    // password they just typed — the account is inert until someone proves
    // control of the inbox, so nothing is exposed by resetting it here.
    userId = existing.id
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { name, phone, role: 'user' },
    })
    if (error) {
      return NextResponse.json({ error: 'Could not restart signup. Please try again.' }, { status: 500 })
    }
    await admin.from('profiles').update({ name, phone }).eq('id', userId)
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name, phone, role: 'user' },
    })

    if (error || !created?.user) {
      const msg = error?.message?.toLowerCase() ?? ''
      if (msg.includes('already')) {
        return NextResponse.json(
          { error: 'This email is already registered. Please log in instead.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Could not create your account. Please try again.' },
        { status: 500 }
      )
    }
    userId = created.user.id
  }

  const sent = await issueOtp({ userId, email, name, purpose: 'signup' })
  if (!sent) {
    return NextResponse.json(
      { error: 'Account created, but we could not send the code. Tap resend in a moment.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true, email })
}
