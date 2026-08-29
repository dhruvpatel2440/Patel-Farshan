import { AsyncLocalStorage } from 'async_hooks'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Admin activity audit trail.
 *
 * `withAudit` wraps a route handler, times it, and records the outcome in
 * public.audit_logs. Context that only the handler knows (which record was
 * touched, a human-readable summary) is attached mid-request via
 * `setAuditTarget`, using AsyncLocalStorage so handlers don't have to thread
 * an extra argument through every call.
 *
 * Writing the trail must never break the action it describes: a logging
 * failure is swallowed and reported to the server console only.
 */

interface AuditStore {
  actorId?: string
  actorName?: string
  actorEmail?: string
  entityType?: string
  entityId?: string
  summary?: string
  metadata?: Record<string, unknown>
}

const auditStorage = new AsyncLocalStorage<AuditStore>()

/** Called by requireAdmin so every audited admin route knows its actor. */
export function setAuditActor(actor: { id: string; name?: string | null; email?: string | null }) {
  const store = auditStorage.getStore()
  if (!store) return
  store.actorId = actor.id
  if (actor.name) store.actorName = actor.name
  if (actor.email) store.actorEmail = actor.email
}

/** Called by handlers to describe what the action actually touched. */
export function setAuditTarget(target: {
  entityType?: string
  entityId?: string
  summary?: string
  metadata?: Record<string, unknown>
}) {
  const store = auditStorage.getStore()
  if (!store) return
  if (target.entityType) store.entityType = target.entityType
  if (target.entityId) store.entityId = target.entityId
  if (target.summary) store.summary = target.summary
  if (target.metadata) store.metadata = { ...store.metadata, ...target.metadata }
}

async function write(row: Record<string, unknown>): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('audit_logs').insert(row)
  } catch (err) {
    console.error('[audit] could not write audit log:', err)
  }
}

/**
 * Pulls the error message out of a failed JSON response without disturbing
 * the response the caller receives (the clone is consumed, not the original).
 */
async function errorFromResponse(response: Response): Promise<string | null> {
  try {
    if (!response.headers.get('content-type')?.includes('application/json')) return null
    const body = await response.clone().json()
    return typeof body?.error === 'string' ? body.error.slice(0, 500) : null
  } catch {
    return null
  }
}

export function withAudit<A extends unknown[]>(
  action: string,
  handler: (request: Request, ...rest: A) => Promise<Response>
) {
  return async (request: Request, ...rest: A): Promise<Response> => {
    const startedAt = Date.now()
    const store: AuditStore = {}

    return auditStorage.run(store, async () => {
      const base = () => ({
        action,
        actor_id: store.actorId ?? null,
        actor_name: store.actorName ?? null,
        actor_email: store.actorEmail ?? null,
        entity_type: store.entityType ?? null,
        entity_id: store.entityId ?? null,
        summary: store.summary ?? null,
        duration_ms: Date.now() - startedAt,
        method: request.method,
        path: new URL(request.url).pathname,
        ip:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
        metadata: store.metadata ?? null,
      })

      let response: Response
      try {
        response = await handler(request, ...rest)
      } catch (err) {
        await write({
          ...base(),
          status: 'error',
          status_code: 500,
          error: err instanceof Error ? err.message.slice(0, 500) : 'Unhandled exception',
        })
        throw err
      }

      const ok = response.status >= 200 && response.status < 300
      await write({
        ...base(),
        status: ok ? 'success' : 'failure',
        status_code: response.status,
        error: ok ? null : await errorFromResponse(response),
      })

      return response
    })
  }
}

/**
 * Records an action that isn't a wrapped route — e.g. an admin sign-in, where
 * the actor is only known once credentials check out.
 */
export async function recordAudit(entry: {
  action: string
  actorId?: string | null
  actorName?: string | null
  actorEmail?: string | null
  status: 'success' | 'failure' | 'error'
  statusCode?: number
  durationMs?: number
  summary?: string
  error?: string
  request?: Request
  metadata?: Record<string, unknown>
}): Promise<void> {
  await write({
    action: entry.action,
    actor_id: entry.actorId ?? null,
    actor_name: entry.actorName ?? null,
    actor_email: entry.actorEmail ?? null,
    status: entry.status,
    status_code: entry.statusCode ?? null,
    duration_ms: entry.durationMs ?? 0,
    summary: entry.summary ?? null,
    error: entry.error?.slice(0, 500) ?? null,
    method: entry.request?.method ?? null,
    path: entry.request ? new URL(entry.request.url).pathname : null,
    ip:
      entry.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      entry.request?.headers.get('x-real-ip') ??
      null,
    user_agent: entry.request?.headers.get('user-agent')?.slice(0, 300) ?? null,
    metadata: entry.metadata ?? null,
  })
}
