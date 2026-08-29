import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { getGoogleReviews } from '@/lib/googleReviews'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const place = await getGoogleReviews()
  return NextResponse.json(place)
}
