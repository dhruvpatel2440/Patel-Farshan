'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Check, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { StarRatingDisplay } from '@/components/shared/StarRatingDisplay'
import { GoogleBadge } from '@/components/shared/GoogleBadge'
import { cn } from '@/lib/utils'
import type { Feedback } from '@/types'
import type { GooglePlaceReviews } from '@/lib/googleReviews'

const TABS = [
  { key: 'pending', label: 'Pending Review' },
  { key: 'approved', label: 'Published' },
  { key: 'all', label: 'All' },
] as const

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [google, setGoogle] = useState<GooglePlaceReviews | null>(null)

  async function load() {
    const res = await fetch('/api/admin/feedback')
    const data = await res.json()
    setItems(data.feedback ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    fetch('/api/admin/google-reviews')
      .then((r) => r.json())
      .then(setGoogle)
      .catch(() => setGoogle({ reviews: [], rating: null, totalReviews: null, mapsUrl: null }))
  }, [])

  const pendingCount = items.filter((f) => !f.is_approved).length

  const filtered = useMemo(() => {
    if (tab === 'pending') return items.filter((f) => !f.is_approved)
    if (tab === 'approved') return items.filter((f) => f.is_approved)
    return items
  }, [items, tab])

  async function handleAction(id: string, approve: boolean) {
    setBusyId(id)
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approve }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not update feedback.')
        return
      }
      toast.success(approve ? 'Published to the homepage.' : 'Feedback removed.')
      if (approve) {
        setItems((prev) => prev.map((f) => (f.id === id ? { ...f, is_approved: true } : f)))
      } else {
        setItems((prev) => prev.filter((f) => f.id !== id))
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-serif text-2xl font-bold text-maroon">Feedback</h1>
      <p className="mt-1 text-sm text-stone-500">
        Approved reviews appear in the testimonials section on the homepage.
      </p>

      {pendingCount > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <span>⚠ {pendingCount} review{pendingCount === 1 ? '' : 's'} awaiting review</span>
          <button onClick={() => setTab('pending')} className="font-semibold underline">
            Review Now
          </button>
        </div>
      )}

      {/* Google reviews are read-only here — Google, not us, moderates its
          own listing, so there's nothing to approve/reject. Shown for
          visibility, and because they also feed the homepage marquee. */}
      <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GoogleBadge className="h-5 w-5" />
            <h2 className="font-serif font-bold text-maroon">Google Reviews</h2>
          </div>
          {google?.mapsUrl && (
            <a
              href={google.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-maroon hover:text-gold"
            >
              View on Google <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {!google ? (
          <p className="mt-3 text-sm text-stone-400">Loading…</p>
        ) : !google.mapsUrl ? (
          <p className="mt-3 text-sm text-stone-400">
            Not connected yet — add <code className="text-xs">GOOGLE_PLACES_API_KEY</code> and{' '}
            <code className="text-xs">GOOGLE_PLACE_ID</code> to enable this.
          </p>
        ) : (
          <>
            {google.rating != null && (
              <div className="mt-2 flex items-center gap-2 text-sm text-stone-600">
                <StarRatingDisplay rating={Math.round(google.rating)} />
                <span className="font-semibold text-maroon">{google.rating.toFixed(1)}</span>
                <span>· {google.totalReviews ?? 0} total reviews on Google</span>
              </div>
            )}
            {google.reviews.length === 0 ? (
              <p className="mt-3 text-sm text-stone-400">No reviews returned by Google yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {google.reviews.map((r) => (
                  <div key={r.id} className="border-t border-stone-100 pt-3 first:border-0 first:pt-0">
                    <div className="flex items-center gap-2">
                      {r.authorPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.authorPhotoUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-xs font-bold text-maroon">
                          {r.authorName.trim().charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-maroon">{r.authorName}</p>
                        <div className="flex items-center gap-1.5">
                          <StarRatingDisplay rating={r.rating} />
                          <span className="text-xs text-stone-400">{r.relativeTime}</span>
                        </div>
                      </div>
                    </div>
                    {r.text && <p className="mt-1.5 text-sm text-stone-600">&ldquo;{r.text}&rdquo;</p>}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-stone-400">
              Google only exposes its 5 most relevant reviews via API — this isn&apos;t every
              review your shop has.
            </p>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium',
              tab === t.key ? 'bg-maroon text-white' : 'border border-maroon text-maroon'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-stone-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-6 text-center text-stone-400">
            Nothing here.
          </p>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-maroon">
                    {item.user_name.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <div>
                    <p className="font-semibold text-maroon">{item.user_name}</p>
                    <StarRatingDisplay rating={item.rating} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-bold',
                      item.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {item.is_approved ? 'Published' : 'Pending'}
                  </span>
                  {!item.is_approved && (
                    <button
                      onClick={() => handleAction(item.id, true)}
                      disabled={busyId === item.id}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(item.id, false)}
                    disabled={busyId === item.id}
                    className="flex items-center gap-1 rounded-lg border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {item.is_approved ? 'Unpublish' : 'Reject'}
                  </button>
                </div>
              </div>
              {item.message && <p className="mt-3 text-sm text-stone-600">&ldquo;{item.message}&rdquo;</p>}
              <p className="mt-2 text-xs text-stone-400">
                {format(new Date(item.created_at), "d MMM yyyy, h:mm a")}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
