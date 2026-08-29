'use client'

import { useState } from 'react'
import { CheckCircle2, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { SHOP_PHONE, SHOP_WHATSAPP } from '@/lib/constants'

const SHOP_ADDRESS = 'Patel Farsan, Mota Gunda, Bhanvad, Dwarka — 360510'
const SHOP_EMAIL = 'patelfarsan@gmail.com'
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP_ADDRESS)}`

const SUBJECTS = ['Order Issue', 'Product Question', 'Delivery Query', 'Feedback', 'Other']

export default function ContactPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, subject, message }),
      })
    } finally {
      setSending(false)
      setSent(true)
    }
  }

  return (
    <div className="bg-cream px-4 py-10 md:px-6 md:py-14">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-[3fr_2fr]">
        {/* Left — contact info */}
        <div>
          <h1 className="font-serif text-2xl font-bold text-maroon md:text-3xl">Get in Touch</h1>
          <p className="text-sm italic text-stone-500">
            We&apos;re a family business — real people answer.
          </p>
          <OrnamentalDivider size="sm" className="!ml-0 !justify-start" />

          <div className="space-y-4">
            <div className="card-base p-4">
              <p className="flex items-center gap-1.5 font-serif font-bold text-maroon">
                <MapPin className="h-4 w-4 text-gold" /> Visit Us
              </p>
              <p className="mt-1 text-sm text-stone-600">{SHOP_ADDRESS}</p>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm font-semibold text-gold hover:text-gold-dark"
              >
                Open in Maps
              </a>
            </div>

            <div className="card-base p-4">
              <p className="flex items-center gap-1.5 font-serif font-bold text-maroon">
                <Phone className="h-4 w-4 text-gold" /> Call Us
              </p>
              <p className="mt-1 text-sm text-stone-600">{SHOP_PHONE || '+91 98765 43210'}</p>
              <a
                href={`tel:${SHOP_PHONE || '+919876543210'}`}
                className="mt-1 inline-block text-sm font-semibold text-gold hover:text-gold-dark"
              >
                Tap to Call
              </a>
              <p className="mt-1 text-xs text-stone-400">Mon–Sat: 7 AM – 8 PM · Sun: 8 AM – 2 PM</p>
            </div>

            <div className="card-base p-4">
              <p className="flex items-center gap-1.5 font-serif font-bold text-maroon">
                <MessageCircle className="h-4 w-4 text-gold" /> WhatsApp
              </p>
              <p className="mt-1 text-sm text-stone-600">Chat with us for quick help</p>
              <a
                href={`https://wa.me/${SHOP_WHATSAPP || '919876543210'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Open WhatsApp
              </a>
            </div>

            <div className="card-base p-4">
              <p className="flex items-center gap-1.5 font-serif font-bold text-maroon">
                <Mail className="h-4 w-4 text-gold" /> Email
              </p>
              <p className="mt-1 text-sm text-stone-600">{SHOP_EMAIL}</p>
              <a
                href={`mailto:${SHOP_EMAIL}`}
                className="mt-1 inline-block text-sm font-semibold text-gold hover:text-gold-dark"
              >
                Send Email
              </a>
            </div>
          </div>
        </div>

        {/* Right — contact form */}
        <div className="rounded-2xl border-t-4 border-maroon bg-white p-6 shadow-[0_8px_30px_rgba(92,26,21,0.10)]">
          {sent ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <p className="mt-3 font-serif text-lg font-bold text-maroon">Message sent!</p>
              <p className="mt-1 text-sm text-stone-500">We&apos;ll get back to you shortly.</p>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-lg font-bold text-maroon">Send us a Message</h2>
              <p className="text-xs text-stone-500">We reply within a few hours.</p>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  required
                  className="input-base"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile Number"
                  required
                  className="input-base"
                />
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input-base">
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your message…"
                  rows={4}
                  required
                  className="input-base resize-none"
                />
                <button type="submit" disabled={sending} className="btn-primary w-full justify-center">
                  {sending ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Map placeholder */}
      <div className="mx-auto mt-10 max-w-5xl">
        <h2 className="section-title text-xl md:text-2xl">Find Us</h2>
        <OrnamentalDivider size="sm" className="!ml-0 !justify-start" />
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-maroon bg-cream-dark/40 p-10 text-center">
          <span className="text-5xl">📍</span>
          <p className="mt-2 font-serif font-bold text-maroon">Patel Farsan</p>
          <p className="text-sm text-stone-600">{SHOP_ADDRESS}</p>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-sm font-semibold text-gold hover:text-gold-dark"
          >
            Get Directions on Google Maps
          </a>
        </div>
      </div>
    </div>
  )
}
