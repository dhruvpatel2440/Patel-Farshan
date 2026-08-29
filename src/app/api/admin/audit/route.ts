import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_SIZE = 50
/** Rows scanned for the timing/perf summary. Bounded so the page stays fast. */
const STATS_SAMPLE = 1000

/**
 * Admin activity log: a filtered page of actions, plus performance stats
 * derived from the most recent entries so slow operations stand out.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const page = Math.max(0, Number(searchParams.get('page')) || 0)
  const status = searchParams.get('status')
  const action = searchParams.get('action')
  const search = searchParams.get('search')?.trim()

  const admin = createAdminClient()

  let query = admin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (status && status !== 'all') query = query.eq('status', status)
  if (action && action !== 'all') query = query.eq('action', action)
  if (search) {
    query = query.or(
      `summary.ilike.%${search}%,actor_name.ilike.%${search}%,actor_email.ilike.%${search}%,entity_id.ilike.%${search}%`
    )
  }

  const { data: logs, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Timing stats come only from live-measured rows. Backfilled history has no
  // duration (nothing timed it), so including it would drag every average
  // toward zero and make the numbers meaningless.
  const [{ data: sample }, { data: allActions }] = await Promise.all([
    admin
      .from('audit_logs')
      .select('action, duration_ms, status, created_at')
      .eq('is_reconstructed', false)
      .order('created_at', { ascending: false })
      .limit(STATS_SAMPLE),
    admin.from('audit_logs').select('action'),
  ])

  const rows = sample ?? []
  const actions = [...new Set((allActions ?? []).map((r) => r.action))].sort()

  // Per-action timing, so the admin can see which operations are slow.
  const grouped = new Map<string, { count: number; total: number; max: number; failures: number }>()
  for (const row of rows) {
    const entry = grouped.get(row.action) ?? { count: 0, total: 0, max: 0, failures: 0 }
    entry.count += 1
    entry.total += row.duration_ms
    entry.max = Math.max(entry.max, row.duration_ms)
    if (row.status !== 'success') entry.failures += 1
    grouped.set(row.action, entry)
  }

  const perAction = [...grouped.entries()]
    .map(([name, e]) => ({
      action: name,
      count: e.count,
      avgMs: Math.round(e.total / e.count),
      maxMs: e.max,
      failures: e.failures,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const durations = rows.map((r) => r.duration_ms).sort((a, b) => a - b)

  // Counted across everything, backfilled history included — this answers
  // "what happened recently", not "what did we time".
  const { count: last24h } = await admin
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', dayAgo)

  return NextResponse.json({
    logs: logs ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    actions,
    stats: {
      sampleSize: rows.length,
      last24h: last24h ?? 0,
      failures: rows.filter((r) => r.status !== 'success').length,
      avgMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      p95Ms: durations.length ? durations[Math.floor(durations.length * 0.95)] ?? 0 : 0,
      maxMs: durations.length ? durations[durations.length - 1] : 0,
      perAction,
    },
  })
}
