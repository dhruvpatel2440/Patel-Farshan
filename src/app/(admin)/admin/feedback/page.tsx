'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { StarRatingDisplay } from '@/components/shared/StarRatingDisplay'
import { cn } from '@/lib/utils'
import type { Feedback } from '@/types'

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

  async function load() {
    const res = await fetch('/api/admin/feedback')
    const data = await res.json()
    setItems(data.feedback ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
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

      <div className="mt-4 flex flex-wrap gap-2">
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
