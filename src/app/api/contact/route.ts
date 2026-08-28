import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

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

  // Where the shop actually reads contact-form submissions — separate from
  // BREVO_SENDER_EMAIL (the "from" identity Brevo has verified) in case the
  // shop wants form replies to land somewhere other than the sender inbox.
  const toEmail = process.env.CONTACT_TO_EMAIL || process.env.BREVO_SENDER_EMAIL

  if (toEmail) {
    const escaped = {
      name: escapeHtml(body.name),
      phone: escapeHtml(body.phone),
      subject: escapeHtml(body.subject || 'New message'),
      message: escapeHtml(body.message).replace(/\n/g, '<br />'),
    }

    await sendEmail({
      to: { email: toEmail },
      subject: `[Contact Form] ${body.subject || 'New message'} — ${body.name}`,
      text: `Name: ${body.name}\nPhone: ${body.phone}\nSubject: ${body.subject}\n\n${body.message}`,
      html: `
        <div style="font-family:Georgia,serif;color:#3d110e;">
          <p><strong>Name:</strong> ${escaped.name}</p>
          <p><strong>Phone:</strong> ${escaped.phone}</p>
          <p><strong>Subject:</strong> ${escaped.subject}</p>
          <p><strong>Message:</strong></p>
          <p>${escaped.message}</p>
        </div>`,
      context: 'contact-form',
    })
  }

  // Even without email configured, the form still "succeeds" — the shop
  // primarily follows up over WhatsApp/phone.
  return NextResponse.json({ ok: true })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
