import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, adminCookieOptions } from '@/lib/adminSession'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const res = NextResponse.json({ ok: true })
  // Drop the elevation too, so a re-login must pass the code again.
  res.cookies.set(ADMIN_COOKIE, '', { ...adminCookieOptions, maxAge: 0 })
  return res
}
