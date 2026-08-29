'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AuditLog } from '@/types'

interface PerAction {
  action: string
  count: number
  avgMs: number
  maxMs: number
  failures: number
}

interface Stats {
  sampleSize: number
  last24h: number
  failures: number
  avgMs: number
  p95Ms: number
  maxMs: number
  perAction: PerAction[]
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Success' },
  { key: 'failure', label: 'Failed' },
  { key: 'error', label: 'Errors' },
] as const

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  failure: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
}

/** Slow work should be obvious at a glance, not something you have to compare. */
function durationStyle(ms: number): string {
  if (ms >= 3000) return 'text-red-600 font-semibold'
  if (ms >= 1000) return 'text-amber-600 font-medium'
  return 'text-stone-500'
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [actions, setActions] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<string>('all')
  const [action, setAction] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showTimings, setShowTimings] = useState(false)
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), status, action })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/audit?${params}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
      setStats(data.stats ?? null)
      setActions(data.actions ?? [])
      setTotal(data.total ?? 0)
      setPageSize(data.pageSize ?? 50)
    } finally {
      setLoading(false)
    }
  }, [page, status, action, search])

  useEffect(() => {
    load()
  }, [load])

  async function handleImport() {
    setImporting(true)
    try {
      const res = await fetch('/api/admin/audit/import', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not rebuild history.')
        return
      }
      if (data.imported > 0) {
        toast.success(`Recovered ${data.imported} past activity record${data.imported === 1 ? '' : 's'}.`)
        setPage(0)
        await load()
      } else {
        toast(`Nothing new — all ${data.found} recoverable records are already here.`)
      }
    } catch {
      toast.error('Network error while rebuilding history.')
    } finally {
      setImporting(false)
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-maroon">Audit Logs</h1>
          <p className="mt-1 text-sm text-stone-500">
            Every admin action — who did it, what changed, and how long it took.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-outline flex items-center gap-1.5 !py-2 text-sm disabled:opacity-50"
            title="Rebuild past activity from order history and existing records"
          >
            <Download className={cn('h-4 w-4', importing && 'animate-pulse')} />
            {importing ? 'Rebuilding…' : 'Rebuild history'}
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

      {/* Summary */}
      {stats && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-stone-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-stone-400">Last 24 hours</p>
              <p className="font-serif text-2xl font-bold text-maroon">{stats.last24h}</p>
              <p className="text-xs text-stone-400">actions</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-stone-400">Avg time</p>
              <p className={cn('font-serif text-2xl font-bold', durationStyle(stats.avgMs))}>
                {formatDuration(stats.avgMs)}
              </p>
              <p className="text-xs text-stone-400">p95 {formatDuration(stats.p95Ms)}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-stone-400">Slowest</p>
              <p className={cn('font-serif text-2xl font-bold', durationStyle(stats.maxMs))}>
                {formatDuration(stats.maxMs)}
              </p>
              <p className="text-xs text-stone-400">single action</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-stone-400">Failures</p>
              <p
                className={cn(
                  'font-serif text-2xl font-bold',
                  stats.failures > 0 ? 'text-red-600' : 'text-maroon'
                )}
              >
                {stats.failures}
              </p>
              <p className="text-xs text-stone-400">of last {stats.sampleSize} timed</p>
            </div>
          </div>

          {/* Per-action timing breakdown */}
          {stats.perAction.length > 0 && (
            <div className="mt-3 rounded-xl border border-stone-200 bg-white">
              <button
                onClick={() => setShowTimings((v) => !v)}
                className="flex w-full items-center justify-between p-3 text-left"
              >
                <span className="text-sm font-semibold text-stone-700">
                  Time taken by each process
                  <span className="ml-2 font-normal text-xs text-stone-400">
                    live-measured actions only
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-stone-400 transition-transform',
                    showTimings && 'rotate-180'
                  )}
                />
              </button>
              {showTimings && (
                <div className="overflow-x-auto border-t border-stone-100">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-stone-400">
                        <th className="p-3">Process</th>
                        <th className="p-3">Runs</th>
                        <th className="p-3">Avg</th>
                        <th className="p-3">Slowest</th>
                        <th className="p-3">Failures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.perAction.map((row) => (
                        <tr key={row.action} className="border-t border-stone-100">
                          <td className="p-3 font-medium text-maroon">{row.action}</td>
                          <td className="p-3 text-stone-500">{row.count}</td>
                          <td className={cn('p-3', durationStyle(row.avgMs))}>
                            {formatDuration(row.avgMs)}
                          </td>
                          <td className={cn('p-3', durationStyle(row.maxMs))}>
                            {formatDuration(row.maxMs)}
                          </td>
                          <td
                            className={cn(
                              'p-3',
                              row.failures > 0 ? 'font-semibold text-red-600' : 'text-stone-400'
                            )}
                          >
                            {row.failures}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
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
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setPage(0)
          }}
          className="input-base w-52 bg-white"
        >
          <option value="all">All processes</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
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
            placeholder="Search action, admin, or record…"
            className="input-base w-64 bg-white pl-9"
          />
        </form>
      </div>

      {/* Log table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase text-stone-400">
              <th className="p-3">When</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Action</th>
              <th className="p-3">Details</th>
              <th className="p-3">Time</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-stone-400">
                  No activity logged yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="cursor-pointer border-b border-stone-100 align-top last:border-0 hover:bg-cream/40"
                >
                  <td className="whitespace-nowrap p-3 text-stone-500">
                    {format(new Date(log.created_at), 'd MMM, h:mm:ss a')}
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-stone-700">{log.actor_name ?? '—'}</p>
                    {log.actor_email && (
                      <p className="text-xs text-stone-400">{log.actor_email}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-maroon">
                      {log.action}
                    </span>
                  </td>
                  <td className="max-w-sm p-3 text-stone-600">
                    <p>{log.summary ?? '—'}</p>
                    {log.error && <p className="mt-0.5 text-xs text-red-600">{log.error}</p>}
                    {expandedId === log.id && (
                      <div className="mt-2 space-y-0.5 rounded-lg bg-stone-50 p-2 text-xs text-stone-500">
                        {log.is_reconstructed ? (
                          <p className="text-stone-400">
                            Rebuilt from existing records — the original request was never timed.
                          </p>
                        ) : (
                          <p>
                            {log.method} {log.path}
                            {log.status_code ? ` → ${log.status_code}` : ''}
                          </p>
                        )}
                        {log.entity_type && (
                          <p>
                            {log.entity_type}
                            {log.entity_id ? `: ${log.entity_id}` : ''}
                          </p>
                        )}
                        {log.ip && <p>IP {log.ip}</p>}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <p className="break-all">{JSON.stringify(log.metadata)}</p>
                        )}
                      </div>
                    )}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap p-3',
                      log.is_reconstructed ? 'text-stone-300' : durationStyle(log.duration_ms)
                    )}
                    title={log.is_reconstructed ? 'Rebuilt from records — not timed at the time' : undefined}
                  >
                    {log.is_reconstructed ? '—' : formatDuration(log.duration_ms)}
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
