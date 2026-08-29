'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, Loader2, MessageSquareHeart, Sparkles, Star } from 'lucide-react'
import { toast } from 'sonner'
import { StarRatingInput } from '@/components/shared/StarRatingInput'
import { cn } from '@/lib/utils'
import type { Feedback } from '@/types'

/** One line per past review — a compact summary, not the full card, so a
 * reviewer with many entries doesn't turn this into a scroll-forever list. */
function FeedbackHistoryRow({ item }: { item: Feedback }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-cream px-3 py-2">
      <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-gold-dark">
        <Star className="h-3 w-3 fill-gold text-gold" /> {item.rating}
      </span>
      <p className="min-w-0 flex-1 truncate text-xs text-stone-600">
        {item.message || <span className="italic text-stone-400">No comment</span>}
      </p>
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          item.is_approved ? 'bg-green-500' : 'bg-amber-400'
        )}
        title={item.is_approved ? 'Published on our site' : 'Pending review'}
        aria-label={item.is_approved ? 'Published on our site' : 'Pending review'}
      />
      <span className="shrink-0 text-[10px] text-stone-400">
        {format(new Date(item.created_at), 'd MMM')}
      </span>
    </div>
  )
}

// Collapsed by default; a heavy reviewer's 10 entries would otherwise push
// the whole dashboard down a full screen before anyone reaches their orders.
const COLLAPSED_COUNT = 3

export function FeedbackForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<Feedback[]>([])
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState(false)

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
        <div className="relative mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold/80">
              Your Feedback History
            </p>
            <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-gold">
              {items.length}
            </span>
          </div>

          {/* Collapsed: just the most recent few, one compact line each.
              Expanded: the rest live in a capped, scrollable panel instead
              of stretching the page — a reviewer with 10 entries stays
              contained to one card's worth of height either way. */}
          <div className="mt-2 space-y-1.5">
            {items.slice(0, COLLAPSED_COUNT).map((item) => (
              <FeedbackHistoryRow key={item.id} item={item} />
            ))}
          </div>

          {items.length > COLLAPSED_COUNT && (
            <>
              {expanded && (
                <div className="scrollbar-thin mt-1.5 max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {items.slice(COLLAPSED_COUNT).map((item) => (
                    <FeedbackHistoryRow key={item.id} item={item} />
                  ))}
                </div>
              )}
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 flex w-full items-center justify-center gap-1 text-xs font-semibold text-gold hover:text-gold-dark"
              >
                {expanded ? 'Show less' : `Show ${items.length - COLLAPSED_COUNT} more`}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
