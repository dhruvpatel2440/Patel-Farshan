import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redactSubject } from '@/lib/email'
import { withAudit, setAuditTarget } from '@/lib/audit'

const BREVO_PAGE_SIZE = 100
const MAX_PAGES = 100

interface BrevoEvent {
  email?: string
  subject?: string
  messageId?: string
  date?: string
  event?: string
  reason?: string
}

/** Brevo events that mean the email never landed. */
const FAILURE_EVENTS = new Set([
  'hardBounces',
  'softBounces',
  'blocked',
  'invalid',
  'error',
  'spam',
])

/**
 * Our email subjects are deterministic, so the original context can be
 * recovered from them. Anything unrecognised is labelled 'imported' rather
 * than guessed at.
 */
function inferContext(subject: string): string {
  const s = subject.toLowerCase()
  if (s.startsWith('order confirmed')) return 'order-confirmation'
  if (s.startsWith('new order')) return 'new-order-admin'
  if (s.startsWith('[contact form]')) return 'contact-form'
  if (s.includes('is out for delivery')) return 'out-for-delivery'
  if (s.includes('cancelled')) return 'order-cancelled'
  if (s.includes('verification code')) return 'signup-otp'
  if (s.includes('password reset code')) return 'password-reset-otp'
  if (s.includes('admin security code')) return 'admin-login-otp'
  return 'imported'
}

/**
 * Backfills email_logs from Brevo's own event history.
 *
 * The audit table only captures sends made after it existed; this recovers
 * everything before that. Rows are keyed on Brevo's messageId, so re-running
 * the import is safe and never duplicates — including against sends this app
 * logged itself.
 *
 * Brevo emits several events per email (requests, delivered, opened, …), so
 * events are collapsed by messageId, with any failure event winning over the
 * send itself.
 */
export const POST = withAudit('email.import_history', async () => {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'BREVO_API_KEY is not set on the server.' }, { status: 400 })
  }

  const byMessageId = new Map<
    string,
    { email: string; subject: string; date: string; status: 'sent' | 'failed'; error: string | null }
  >()

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL('https://api.brevo.com/v3/smtp/statistics/events')
      url.searchParams.set('limit', String(BREVO_PAGE_SIZE))
      url.searchParams.set('offset', String(page * BREVO_PAGE_SIZE))
      url.searchParams.set('sort', 'desc')

      const res = await fetch(url, {
        headers: { 'api-key': apiKey, Accept: 'application/json' },
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        return NextResponse.json(
          { error: `Brevo ${res.status}: ${body.slice(0, 300)}` },
          { status: 400 }
        )
      }

      const data = await res.json()
      const batch: BrevoEvent[] = data.events ?? []
      if (batch.length === 0) break

      for (const item of batch) {
        const messageId = item.messageId
        if (!messageId || !item.email) continue

        const isFailure = FAILURE_EVENTS.has(item.event ?? '')
        const existing = byMessageId.get(messageId)

        // A failure event outranks the send; otherwise keep the earliest
        // (oldest) timestamp seen, which is when the email actually went out.
        if (existing) {
          if (isFailure && existing.status !== 'failed') {
            existing.status = 'failed'
            existing.error = item.reason ?? item.event ?? 'Delivery failed'
          }
          if (item.date && item.date < existing.date) existing.date = item.date
          if (existing.subject === '(no subject)' && item.subject) existing.subject = item.subject
          continue
        }

        byMessageId.set(messageId, {
          email: item.email,
          subject: item.subject || '(no subject)',
          date: item.date ?? new Date().toISOString(),
          status: isFailure ? 'failed' : 'sent',
          error: isFailure ? (item.reason ?? item.event ?? 'Delivery failed') : null,
        })
      }

      if (batch.length < BREVO_PAGE_SIZE) break
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not reach Brevo.' },
      { status: 502 }
    )
  }

  if (byMessageId.size === 0) {
    return NextResponse.json({ imported: 0, found: 0 })
  }

  // Historical OTP emails carried the code in the subject. Redact before it
  // is written, so importing history can't reintroduce the leak.
  const rows = [...byMessageId.entries()].map(([messageId, e]) => {
    const context = inferContext(e.subject)
    return {
      context,
      recipient_email: e.email,
      recipient_name: null,
      subject: redactSubject(context, e.subject),
      status: e.status,
      error: e.error,
      created_at: new Date(e.date).toISOString(),
      provider_message_id: messageId,
    }
  })

  const admin = createAdminClient()

  // ignoreDuplicates leans on the unique index over provider_message_id, so
  // already-known emails are skipped instead of overwriting our own richer
  // rows (which carry recipient name and the true context).
  const { error, count } = await admin
    .from('email_logs')
    .upsert(rows, {
      onConflict: 'provider_message_id',
      ignoreDuplicates: true,
      count: 'exact',
    })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  setAuditTarget({
    summary: `Imported ${count ?? 0} email(s) from Brevo history`,
    metadata: { imported: count ?? 0, found: rows.length },
  })
  return NextResponse.json({ imported: count ?? 0, found: rows.length })
})
