'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { EmailLog } from '@/types'

interface Quota {
  limit: number
  used: number
  remaining: number
  failedToday: number
  skippedToday: number
  resetsAt: string
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'failed', label: 'Failed' },
  { key: 'skipped', label: 'Skipped' },
] as const

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  skipped: 'bg-stone-200 text-stone-600',
}

export default function AdminEmailsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [quota, setQuota] = useState<Quota | null>(null)
  const [contexts, setContexts] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<string>('all')
  const [context, setContext] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), status, context })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/emails?${params}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
      setQuota(data.quota ?? null)
      setContexts(data.contexts ?? [])
      setTotal(data.total ?? 0)
      setPageSize(data.pageSize ?? 50)
    } finally {
      setLoading(false)
    }
  }, [page, status, context, search])

  useEffect(() => {
    load()
  }, [load])

  async function handleImport() {
    setImporting(true)
    try {
      const res = await fetch('/api/admin/emails/import', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not import from Brevo.')
        return
      }
      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} older email${data.imported === 1 ? '' : 's'}.`)
        setPage(0)
        await load()
      } else {
        toast(`Nothing new — all ${data.found} emails in Brevo's history are already logged.`)
      }
    } catch {
      toast.error('Network error while importing.')
    } finally {
      setImporting(false)
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const usedPct = quota ? Math.min(100, (quota.used / quota.limit) * 100) : 0
  const nearLimit = quota ? quota.remaining <= 30 : false

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-maroon">Email Audit Logs</h1>
          <p className="mt-1 text-sm text-stone-500">
            Every order confirmation, status update, OTP, and contact-form email sent by the shop.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-outline flex items-center gap-1.5 !py-2 text-sm disabled:opacity-50"
            title="Pull older emails from Brevo's own history into this log"
          >
            <Download className={cn('h-4 w-4', importing && 'animate-pulse')} />
            {importing ? 'Importing…' : 'Import history'}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="btn-outline flex items-center gap-1.5 !py-2 text-sm disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
          </button>
        </div>
      </div>

      {/* Daily quota */}
      {quota && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-stone-700">Today&apos;s sending quota</p>
            <p className="text-sm text-stone-500">
              <span className="font-serif text-xl font-bold text-maroon">{quota.used}</span> / {quota.limit}{' '}
              sent · <span className="font-semibold text-maroon">{quota.remaining}</span> left
            </p>
          </div>

          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                nearLimit ? 'bg-red-500' : usedPct > 60 ? 'bg-amber-500' : 'bg-green-500'
              )}
              style={{ width: `${usedPct}%` }}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
            <span>Resets {format(new Date(quota.resetsAt), 'd MMM, h:mm a')}</span>
            {quota.failedToday > 0 && (
              <span className="text-red-600">{quota.failedToday} failed today</span>
            )}
            {quota.skippedToday > 0 && <span>{quota.skippedToday} skipped today</span>}
          </div>

          {nearLimit && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Only {quota.remaining} email{quota.remaining === 1 ? '' : 's'} left on today&apos;s
                300/day plan. Further emails will fail until the quota resets — orders themselves
                still go through.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setStatus(t.key)
              setPage(0)
            }}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium',
              status === t.key ? 'bg-maroon text-white' : 'border border-maroon text-maroon'
            )}
          >
            {t.label}
          </button>
        ))}

        <select
          value={context}
          onChange={(e) => {
            setContext(e.target.value)
            setPage(0)
          }}
          className="input-base w-48 bg-white"
        >
          <option value="all">All types</option>
          {contexts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(searchInput.trim())
            setPage(0)
          }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search email or subject…"
            className="input-base w-60 bg-white pl-9"
          />
        </form>
      </div>

      {/* Log table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase text-stone-400">
              <th className="p-3">When</th>
              <th className="p-3">Recipient</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-stone-400">
                  No emails logged yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-stone-100 align-top last:border-0">
                  <td className="whitespace-nowrap p-3 text-stone-500">
                    {format(new Date(log.created_at), 'd MMM, h:mm a')}
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-stone-700">{log.recipient_email}</p>
                    {log.recipient_name && (
                      <p className="text-xs text-stone-400">{log.recipient_name}</p>
                    )}
                  </td>
                  <td className="max-w-xs p-3 text-stone-600">
                    <p className="truncate" title={log.subject}>
                      {log.subject}
                    </p>
                    {log.error && (
                      <p className="mt-0.5 text-xs text-red-600" title={log.error}>
                        {log.error.length > 90 ? `${log.error.slice(0, 90)}…` : log.error}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-maroon">
                      {log.context}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold capitalize',
                        STATUS_STYLES[log.status] ?? 'bg-stone-200 text-stone-600'
                      )}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="mt-3 flex items-center justify-between text-sm text-stone-500">
          <span>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="btn-outline flex items-center gap-1 !px-2.5 !py-1.5 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <span className="text-xs">
              Page {page + 1} of {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= pageCount || loading}
              className="btn-outline flex items-center gap-1 !px-2.5 !py-1.5 text-xs disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
