import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { DAILY_EMAIL_LIMIT } from '@/lib/email'

const PAGE_SIZE = 50

/**
 * Strips the characters PostgREST uses as filter syntax — separators, quoting
 * parens, the column/operator dot, wildcards and the embedded-resource colon.
 * The search term is interpolated straight into `.or(...)`, so without this a
 * caller could append their own conditions and read rows the filter meant to
 * exclude.
 */
function sanitizeSearch(term: string): string {
  return term.replace(/[,().*:%]/g, '').trim()
}

/**
 * Email audit log for the admin panel: a page of recent attempts plus the
 * counts behind today's Brevo quota (300 sends/day on the free plan).
 *
 * Only 'sent' rows consume quota — 'failed' and 'skipped' never reached
 * Brevo's counter, so they're reported separately rather than folded in.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const page = Math.max(0, Number(searchParams.get('page')) || 0)
  const status = searchParams.get('status')
  const context = searchParams.get('context')
  const search = searchParams.get('search')?.trim()

  const admin = createAdminClient()

  let query = admin
    .from('email_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (status && status !== 'all') query = query.eq('status', status)
  if (context && context !== 'all') query = query.eq('context', context)
  if (search) {
    const safe = sanitizeSearch(search)
    if (safe) query = query.or(`recipient_email.ilike.%${safe}%,subject.ilike.%${safe}%`)
  }

  const { data: logs, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Quota resets daily — count from midnight in the shop's local timezone
  // (IST) rather than UTC, so "today" matches what the owner sees.
  const nowIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const istMidnight = new Date(
    Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate())
  )
  const since = new Date(istMidnight.getTime() - 5.5 * 60 * 60 * 1000).toISOString()

  const [sentToday, failedToday, skippedToday, allContexts] = await Promise.all([
    admin
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', since),
    admin
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', since),
    admin
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'skipped')
      .gte('created_at', since),
    admin.from('email_logs').select('context'),
  ])

  const contexts = [...new Set((allContexts.data ?? []).map((r) => r.context))].sort()
  const used = sentToday.count ?? 0

  return NextResponse.json({
    logs: logs ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    contexts,
    quota: {
      limit: DAILY_EMAIL_LIMIT,
      used,
      remaining: Math.max(0, DAILY_EMAIL_LIMIT - used),
      failedToday: failedToday.count ?? 0,
      skippedToday: skippedToday.count ?? 0,
      resetsAt: new Date(istMidnight.getTime() + 24 * 60 * 60 * 1000 - 5.5 * 60 * 60 * 1000).toISOString(),
    },
  })
}
