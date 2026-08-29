/**
 * Transactional email via Brevo's HTTP API (https://api.brevo.com/v3/smtp/email).
 * Chosen over Resend because it sends from a single verified *sender address*
 * (e.g. a Gmail address) with no domain/DNS setup — Resend requires a
 * verified domain to send to anyone but the account owner.
 *
 * Every call fails soft: a missing key or a Brevo error is logged and
 * swallowed, never thrown. Email is a courtesy, not the request — an order
 * must still succeed even if the confirmation email doesn't send.
 *
 * Every attempt is also recorded in public.email_logs so the admin panel can
 * audit what went out and how much of the daily quota is left.
 */

import { createAdminClient } from '@/lib/supabase/admin'

/** Brevo's free plan allows 300 transactional emails per day. */
export const DAILY_EMAIL_LIMIT = 300

type EmailStatus = 'sent' | 'failed' | 'skipped'

interface SendEmailArgs {
  to: { email: string; name?: string }
  subject: string
  html: string
  text: string
  /** Distinguishes call sites in logs — not sent to Brevo. */
  context: string
}

/**
 * Records the attempt. Best-effort: an audit-log failure must never take down
 * the email path (which itself must never take down the caller's request).
 */
async function logAttempt(args: {
  context: string
  to: { email: string; name?: string }
  subject: string
  status: EmailStatus
  error?: string
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('email_logs').insert({
      context: args.context,
      recipient_email: args.to.email || '(none)',
      recipient_name: args.to.name ?? null,
      subject: args.subject,
      status: args.status,
      error: args.error ?? null,
    })
  } catch (err) {
    console.error(`[email:${args.context}] could not write audit log:`, err)
  }
}

export async function sendEmail({ to, subject, html, text, context }: SendEmailArgs): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME || 'Patel Farsan'

  if (!apiKey || !senderEmail) {
    const reason = 'BREVO_API_KEY or BREVO_SENDER_EMAIL not set'
    console.warn(`[email:${context}] skipped — ${reason}`)
    await logAttempt({ context, to, subject, status: 'skipped', error: reason })
    return false
  }

  if (!to.email) {
    const reason = 'recipient has no email address'
    console.warn(`[email:${context}] skipped — ${reason}`)
    await logAttempt({ context, to, subject, status: 'skipped', error: reason })
    return false
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [to],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[email:${context}] Brevo ${res.status}: ${body}`)
      await logAttempt({
        context,
        to,
        subject,
        status: 'failed',
        error: `Brevo ${res.status}: ${body.slice(0, 500)}`,
      })
      return false
    }

    await logAttempt({ context, to, subject, status: 'sent' })
    return true
  } catch (err) {
    console.error(`[email:${context}] request failed:`, err)
    await logAttempt({
      context,
      to,
      subject,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Request failed',
    })
    return false
  }
}
