import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'

const BREVO_PAGE_SIZE = 500
const MAX_PAGES = 20

interface BrevoEmail {
  email?: string
  subject?: string
  messageId?: string
  uuid?: string
  date?: string
}

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
 * Backfills email_logs from Brevo's own transactional history.
 *
 * The audit table only captures sends made after it existed; this recovers
 * everything before that. Rows are keyed on Brevo's messageId, so re-running
 * the import is safe and never duplicates — including against sends this app
 * logged itself.
 */
export async function POST() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'BREVO_API_KEY is not set on the server.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const rows: {
    context: string
    recipient_email: string
    recipient_name: null
    subject: string
    status: 'sent'
    error: null
    created_at: string
    provider_message_id: string
  }[] = []

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL('https://api.brevo.com/v3/smtp/emails')
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
      const batch: BrevoEmail[] = data.transactionalEmails ?? []
      if (batch.length === 0) break

      for (const item of batch) {
        const messageId = item.messageId ?? item.uuid
        if (!messageId || !item.email) continue
        const subject = item.subject ?? '(no subject)'
        rows.push({
          context: inferContext(subject),
          recipient_email: item.email,
          recipient_name: null,
          subject,
          status: 'sent',
          error: null,
          created_at: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
          provider_message_id: messageId,
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

  if (rows.length === 0) {
    return NextResponse.json({ imported: 0, found: 0 })
  }

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

  return NextResponse.json({ imported: count ?? 0, found: rows.length })
}
