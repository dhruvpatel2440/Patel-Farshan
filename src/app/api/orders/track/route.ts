import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientIp, rateLimit } from '@/lib/rateLimit'

/** Order numbers are sequential, so lookups are rate limited per IP. */
const TRACK_LIMIT = 5
const TRACK_WINDOW_MS = 10 * 60 * 1000

/**
 * Public order lookup — no auth required. Bypasses RLS via the service-role
 * client, but only ever returns a single order matched on BOTH the order
 * number and the phone number on its address snapshot.
 */
export async function GET(request: NextRequest) {
  const limit = await rateLimit(clientIp(request), {
    limit: TRACK_LIMIT,
    windowMs: TRACK_WINDOW_MS,
    prefix: 'track',
  })

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many lookups. Please try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  const { searchParams } = new URL(request.url)
  const orderNumber = searchParams.get('orderNumber')?.trim()
  const phone = searchParams.get('phone')?.trim()

  if (!orderNumber || !phone) {
    return NextResponse.json({ error: 'Order number and mobile number are required.' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { data: order, error } = await admin
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('order_number', orderNumber.toUpperCase())
      .single()

    if (error || !order || order.address_snapshot?.phone !== phone) {
      return NextResponse.json(
        { error: 'Order not found. Check your order number and mobile.' },
        { status: 404 }
      )
    }

    const { data: history } = await admin
      .from('order_status_history')
      .select('*')
      .eq('order_id', order.id)
      .order('changed_at', { ascending: true })

    return NextResponse.json({ order, history: history ?? [] })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
