import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAudit, setAuditTarget } from '@/lib/audit'

type AdminClient = ReturnType<typeof createAdminClient>

interface Row {
  action: string
  actor_id: string | null
  actor_name: string | null
  actor_email: string | null
  entity_type: string | null
  entity_id: string | null
  summary: string
  status: 'success'
  duration_ms: number
  created_at: string
  source_ref: string
  is_reconstructed: boolean
  metadata: Record<string, unknown> | null
}

function base(
  action: string,
  sourceRef: string,
  createdAt: string,
  summary: string,
  extra: Partial<Row> = {}
): Row {
  return {
    action,
    actor_id: null,
    actor_name: null,
    actor_email: null,
    entity_type: null,
    entity_id: null,
    summary,
    status: 'success',
    // Nothing measured these at the time — never invent a number.
    duration_ms: 0,
    created_at: createdAt,
    source_ref: sourceRef,
    is_reconstructed: true,
    metadata: null,
    ...extra,
  }
}

/**
 * Rebuilds an activity history from records the app already kept.
 *
 * Everything here comes from real stored rows — the status trail admins
 * generated on orders, and the creation timestamps of orders, accounts,
 * products, categories, cities and reviews. Nothing is inferred beyond
 * mapping a stored row to the event that created it.
 *
 * Timing is genuinely unavailable for these, so duration stays 0 and the row
 * is flagged `is_reconstructed` — the UI shows "—" rather than pretending the
 * action was instant, and the performance stats ignore them.
 */
export const POST = withAudit('audit.import_history', async () => {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin: AdminClient = createAdminClient()
  const rows: Row[] = []

  // Who each actor was, for attributing the rows below.
  const { data: profiles } = await admin.from('profiles').select('id, name, email, created_at, role')
  const people = new Map((profiles ?? []).map((p) => [p.id, p]))

  const attribute = (userId: string | null) => {
    const p = userId ? people.get(userId) : null
    return {
      actor_id: p?.id ?? null,
      actor_name: p?.name ?? null,
      actor_email: p?.email ?? null,
    }
  }

  // 1. The real admin trail: every order status change ever recorded.
  const { data: history } = await admin
    .from('order_status_history')
    .select('id, order_id, status, changed_by, changed_at, note')
  const { data: orders } = await admin
    .from('orders')
    .select('id, order_number, total, payment_mode, order_status, placed_at, user_id')
  const orderById = new Map((orders ?? []).map((o) => [o.id, o]))

  for (const h of history ?? []) {
    const order = orderById.get(h.order_id)
    const label = order ? `#${order.order_number}` : 'an order'
    rows.push(
      base(
        'order.status_change',
        `order_status_history:${h.id}`,
        h.changed_at,
        `Order ${label} → ${h.status}`,
        {
          ...attribute(h.changed_by),
          entity_type: 'order',
          entity_id: order?.order_number ?? h.order_id,
          metadata: { status: h.status, ...(h.note ? { note: h.note } : {}) },
        }
      )
    )
  }

  // 2. Customer activity that shaped the shop's records.
  for (const o of orders ?? []) {
    rows.push(
      base('order.placed', `order:${o.id}`, o.placed_at, `Placed order #${o.order_number} (₹${o.total})`, {
        ...attribute(o.user_id),
        entity_type: 'order',
        entity_id: o.order_number,
        metadata: { total: o.total, paymentMode: o.payment_mode },
      })
    )
  }

  for (const p of profiles ?? []) {
    if (!p.created_at) continue
    rows.push(
      base('user.registered', `profile:${p.id}`, p.created_at, `${p.name} created an account`, {
        actor_id: p.id,
        actor_name: p.name,
        actor_email: p.email,
        entity_type: 'user',
        entity_id: p.id,
        ...(p.role === 'admin' ? { metadata: { role: 'admin' } } : {}),
      })
    )
  }

  const { data: feedback } = await admin.from('feedback').select('id, user_id, user_name, rating, created_at')
  for (const f of feedback ?? []) {
    rows.push(
      base('feedback.submitted', `feedback:${f.id}`, f.created_at, `${f.user_name} left a ${f.rating}★ review`, {
        ...attribute(f.user_id),
        entity_type: 'feedback',
        entity_id: f.id,
        metadata: { rating: f.rating },
      })
    )
  }

  // 3. Catalog records. Their creation time is stored; who created them is
  //    not, so the actor is left blank rather than guessed at.
  const { data: products } = await admin
    .from('products')
    .select('id, name, created_at, is_deleted')
  for (const p of products ?? []) {
    if (!p.created_at) continue
    rows.push(
      base('product.create', `product:${p.id}`, p.created_at, `Product "${p.name}" added`, {
        entity_type: 'product',
        entity_id: p.id,
        ...(p.is_deleted ? { metadata: { sinceDeleted: true } } : {}),
      })
    )
  }

  const { data: categories } = await admin.from('categories').select('id, name, created_at')
  for (const c of categories ?? []) {
    if (!c.created_at) continue
    rows.push(
      base('category.create', `category:${c.id}`, c.created_at, `Category "${c.name}" added`, {
        entity_type: 'category',
        entity_id: c.id,
      })
    )
  }

  const { data: cities } = await admin.from('cities').select('id, name, created_at')
  for (const c of cities ?? []) {
    if (!c.created_at) continue
    rows.push(
      base('city.create', `city:${c.id}`, c.created_at, `Delivery city "${c.name}" added`, {
        entity_type: 'city',
        entity_id: c.id,
      })
    )
  }

  if (rows.length === 0) {
    return NextResponse.json({ imported: 0, found: 0 })
  }

  // Keyed on source_ref, so re-running only adds what's genuinely new and
  // never overwrites entries this app recorded live.
  const { error, count } = await admin
    .from('audit_logs')
    .upsert(rows, { onConflict: 'source_ref', ignoreDuplicates: true, count: 'exact' })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  setAuditTarget({
    summary: `Rebuilt ${count ?? 0} historical activity record(s)`,
    metadata: { imported: count ?? 0, found: rows.length },
  })

  return NextResponse.json({ imported: count ?? 0, found: rows.length })
})
