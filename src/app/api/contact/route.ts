import { NextResponse } from 'next/server'

interface ContactBody {
  name: string
  phone: string
  subject: string
  message: string
}

export async function POST(request: Request) {
  const body: ContactBody = await request.json()

  if (!body.name || !body.phone || !body.message) {
    return NextResponse.json({ error: 'Please fill all required fields.' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  // The verified sender identity Resend actually accepts mail "from".
  // Free/unverified Resend accounts can only send from this address —
  // sending from an unverified custom domain (e.g. a Gmail address)
  // is rejected with a 403.
  const fromEmail = process.env.RESEND_FROM_ADDRESS || 'Patel Farsan <onboarding@resend.dev>'
  // Where the shop actually reads contact-form submissions.
  const toEmail = process.env.RESEND_FROM_EMAIL

  if (apiKey && toEmail) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: toEmail,
          subject: `[Contact Form] ${body.subject || 'New message'} — ${body.name}`,
          text: `Name: ${body.name}\nPhone: ${body.phone}\nSubject: ${body.subject}\n\n${body.message}`,
        }),
      })
      if (!res.ok) throw new Error('Resend request failed')
    } catch {
      // Fall through — still report success to the visitor; admin can
      // follow up via WhatsApp/phone if email delivery failed.
    }
  }

  // Without RESEND_API_KEY configured, the form still "succeeds" — the
  // shop primarily follows up over WhatsApp/phone.
  return NextResponse.json({ ok: true })
}
