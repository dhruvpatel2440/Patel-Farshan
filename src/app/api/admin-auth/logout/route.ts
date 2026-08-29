import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, OTP_TRUST_COOKIE, adminCookieOptions } from '@/lib/adminSession'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const res = NextResponse.json({ ok: true })
  // Drop both cookies so a deliberate sign-out actually signs out: without
  // clearing OTP_TRUST_COOKIE too, the next person on this device could log
  // in with just a password and skip the code entirely.
  res.cookies.set(ADMIN_COOKIE, '', { ...adminCookieOptions, maxAge: 0 })
  res.cookies.set(OTP_TRUST_COOKIE, '', { ...adminCookieOptions, maxAge: 0 })
  return res
}
