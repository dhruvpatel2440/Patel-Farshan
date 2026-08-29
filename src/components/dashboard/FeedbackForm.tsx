'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Loader2, MessageSquareHeart, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { StarRatingInput } from '@/components/shared/StarRatingInput'
import { StarRatingDisplay } from '@/components/shared/StarRatingDisplay'
import type { Feedback } from '@/types'

export function FeedbackForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<Feedback[]>([])
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/feedback')
      .then((r) => r.json())
      .then((data) => {
        setItems(data.feedback ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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
      setItems((prev) => [data.feedback, ...prev])
      setRating(0)
      setMessage('')
      toast.success('Thanks for your feedback!')
    } catch {
      toast.error('Unable to reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    // A plain white bordered box here read as just another list item and got
    // scrolled past — this is deliberately loud (maroon gradient, glowing
    // icon badge, decorative circles) so it reads as a distinct, unmissable
    // call to action rather than blending into the order cards around it.
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-maroon to-maroon-light p-5 shadow-lg md:p-6">
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

      {items.length > 0 && (
        <div className="relative mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold/80">
            Your Feedback History
          </p>
          {items.map((item) => (
            <div key={item.id} className="rounded-xl bg-cream p-4">
              <StarRatingDisplay rating={item.rating} />
              {item.message && (
                <p className="mt-2 text-sm italic text-stone-600">&ldquo;{item.message}&rdquo;</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={
                    item.is_approved
                      ? 'rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700'
                      : 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700'
                  }
                >
                  {item.is_approved ? '✓ Published on our site' : 'Pending review'}
                </span>
                <span className="text-[11px] text-stone-400">
                  {format(new Date(item.created_at), 'd MMM yyyy')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
