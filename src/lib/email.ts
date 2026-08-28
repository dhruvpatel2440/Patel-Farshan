/**
 * Transactional email via Brevo's HTTP API (https://api.brevo.com/v3/smtp/email).
 * Chosen over Resend because it sends from a single verified *sender address*
 * (e.g. a Gmail address) with no domain/DNS setup — Resend requires a
 * verified domain to send to anyone but the account owner.
 *
 * Every call fails soft: a missing key or a Brevo error is logged and
 * swallowed, never thrown. Email is a courtesy, not the request — an order
 * must still succeed even if the confirmation email doesn't send.
 */

interface SendEmailArgs {
  to: { email: string; name?: string }
  subject: string
  html: string
  text: string
  /** Distinguishes call sites in logs — not sent to Brevo. */
  context: string
}

export async function sendEmail({ to, subject, html, text, context }: SendEmailArgs): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME || 'Patel Farsan'

  if (!apiKey || !senderEmail) {
    console.warn(`[email:${context}] skipped — BREVO_API_KEY or BREVO_SENDER_EMAIL not set`)
    return false
  }

  if (!to.email) {
    console.warn(`[email:${context}] skipped — recipient has no email address`)
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
      return false
    }

    return true
  } catch (err) {
    console.error(`[email:${context}] request failed:`, err)
    return false
  }
}
