'use client'

import { useEffect, useState } from 'react'
import { Loader2, MessageSquareHeart } from 'lucide-react'
import { toast } from 'sonner'
import { StarRatingInput } from '@/components/shared/StarRatingInput'
import { StarRatingDisplay } from '@/components/shared/StarRatingDisplay'
import type { Feedback } from '@/types'

export function FeedbackForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existing, setExisting] = useState<Feedback | null>(null)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    fetch('/api/feedback')
      .then((r) => r.json())
      .then((data) => {
        if (data.feedback) {
          setExisting(data.feedback)
          setRating(data.feedback.rating)
          setMessage(data.feedback.message || '')
        }
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
      setExisting(data.feedback)
      setEditing(false)
      toast.success(existing ? 'Feedback updated!' : 'Thanks for your feedback!')
    } catch {
      toast.error('Unable to reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  const showForm = !existing || editing

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <MessageSquareHeart className="h-5 w-5 text-gold" />
        <h3 className="font-serif font-bold text-maroon">
          {existing ? 'Your Feedback' : 'Rate Your Experience'}
        </h3>
      </div>

      {!showForm && existing && (
        <div className="mt-3">
          <StarRatingDisplay rating={existing.rating} />
          {existing.message && (
            <p className="mt-2 text-sm italic text-stone-600">&ldquo;{existing.message}&rdquo;</p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span
              className={
                existing.is_approved
                  ? 'rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700'
                  : 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700'
              }
            >
              {existing.is_approved ? '✓ Published on our site' : 'Pending review'}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-maroon hover:text-gold"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-3 space-y-3">
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
            className="input-base min-h-20 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving…' : existing ? 'Update Feedback' : 'Submit Feedback'}
            </button>
            {existing && (
              <button
                onClick={() => {
                  setEditing(false)
                  setRating(existing.rating)
                  setMessage(existing.message || '')
                }}
                className="btn-outline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
