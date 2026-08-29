import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, OTP_TRUST_COOKIE, adminCookieOptions } from '@/lib/adminSession'
import { recordAudit } from '@/lib/audit'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.auth.signOut()

  if (user) {
    await recordAudit({
      action: 'admin.logout',
      actorId: user.id,
      actorEmail: user.email,
      status: 'success',
      statusCode: 200,
      summary: 'Signed out of the admin panel',
      request,
    })
  }

  const res = NextResponse.json({ ok: true })
  // Drop both cookies so a deliberate sign-out actually signs out: without
  // clearing OTP_TRUST_COOKIE too, the next person on this device could log
  // in with just a password and skip the code entirely.
  res.cookies.set(ADMIN_COOKIE, '', { ...adminCookieOptions, maxAge: 0 })
  res.cookies.set(OTP_TRUST_COOKIE, '', { ...adminCookieOptions, maxAge: 0 })
  return res
}
