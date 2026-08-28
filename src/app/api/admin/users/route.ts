import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Every customer, with their order history rolled up.
 *
 * Cancelled orders are excluded from the spend/count totals so "Total Spent"
 * reflects real revenue from that customer rather than abandoned attempts.
 */
export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const [{ data: profiles, error: profilesError }, { data: orders }] = await Promise.all([
    admin.from('profiles').select('*').order('created_at', { ascending: false }),
    admin.from('orders').select('user_id, total, placed_at, order_status'),
  ])

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 400 })
  }

  const stats = new Map<
    string,
    { orderCount: number; totalSpent: number; lastOrderAt: string | null }
  >()

  for (const order of orders ?? []) {
    if (order.order_status === 'cancelled') continue
    const entry = stats.get(order.user_id) ?? {
      orderCount: 0,
      totalSpent: 0,
      lastOrderAt: null,
    }
    entry.orderCount += 1
    entry.totalSpent += Number(order.total)
    if (!entry.lastOrderAt || order.placed_at > entry.lastOrderAt) {
      entry.lastOrderAt = order.placed_at
    }
    stats.set(order.user_id, entry)
  }

  const users = (profiles ?? []).map((profile) => ({
    ...profile,
    ...(stats.get(profile.id) ?? { orderCount: 0, totalSpent: 0, lastOrderAt: null }),
  }))

  return NextResponse.json({ users })
}

/** Promote a customer to admin, or demote an admin back to customer. */
export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id, role } = await request.json()

  if (!id) return NextResponse.json({ error: 'User id is required.' }, { status: 400 })
  if (role !== 'user' && role !== 'admin') {
    return NextResponse.json({ error: 'Role must be "user" or "admin".' }, { status: 400 })
  }

  // Guard against locking yourself out of the admin panel.
  if (id === auth.user.id && role !== 'admin') {
    return NextResponse.json(
      { error: 'You cannot remove your own admin access. Ask another admin to do it.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Never allow removing the last admin — that would leave the panel unreachable.
  if (role !== 'admin') {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'This is the only admin left. Promote someone else first.' },
        { status: 400 }
      )
    }
  }

  const { data, error } = await admin
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ user: data })
}
