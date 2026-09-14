'use client'

import { useState } from 'react'
import { Loader2, MessageSquareHeart, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { StarRatingInput } from '@/components/shared/StarRatingInput'

export function FeedbackForm() {
  const [saving, setSaving] = useState(false)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')

  async function handleSubmit() {
    if (rating === 0) {
      toast.error('Please choose a star rating.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not save your feedback.')
        return
      }
      // Customers can leave more than one review, so a successful submit
      // clears the compose box for the next one rather than "locking in" a
      // single answer the way the old one-review-per-user design did.
      setRating(0)
      setMessage('')
      toast.success('Thanks for your feedback!')
    } catch {
      toast.error('Unable to reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    // A plain white bordered box here read as just another list item and got
    // scrolled past — this is deliberately loud (maroon gradient, glowing
    // icon badge, decorative circles) so it reads as a distinct, unmissable
    // call to action rather than blending into the order cards around it.
    // id: the "Delivered — tap to rate us" notification links to #feedback.
    <div id="feedback" className="relative scroll-mt-20 overflow-hidden rounded-2xl bg-gradient-to-br from-maroon to-maroon-light p-5 shadow-lg md:p-6">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gold/10" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-gold/10" aria-hidden="true" />

      <div className="relative flex items-center gap-3">
        <span className="animate-status-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-maroon">
          <MessageSquareHeart className="h-5 w-5" />
        </span>
        <div>
          <h3 className="flex items-center gap-1.5 font-serif text-lg font-bold text-cream">
            We&apos;d Love Your Feedback!
            <Sparkles className="h-4 w-4 text-gold" />
          </h3>
          <p className="text-xs text-gold/90">Takes 10 seconds — great reviews get featured on our homepage</p>
        </div>
      </div>

      <div className="relative mt-4 space-y-3 rounded-xl bg-cream p-4">
        <p className="text-sm text-stone-500">
          How was your experience with Patel Farsan? Approved reviews are shown on our
          homepage.
        </p>
        <StarRatingInput value={rating} onChange={setRating} />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          placeholder="Tell us what you liked (optional)…"
          className="input-base min-h-20 resize-none bg-white"
        />
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving…' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  )
}
