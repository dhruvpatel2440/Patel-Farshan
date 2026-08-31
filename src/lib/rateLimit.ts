import { Ratelimit, type Duration } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiting for public endpoints, backed by Upstash Redis.
 *
 * Upstash is used whenever UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * are present, which is the case in every deployed environment. It gives a
 * sliding window shared across every serverless instance, so the limit is a
 * real ceiling rather than a per-instance one.
 *
 * NOTE: in-memory limiter is per-instance on Vercel serverless — it is the
 * fallback for local development and for preview builds that have no Upstash
 * credentials, and it also catches an Upstash outage rather than failing the
 * request. It is a fixed window and its counters die with the instance, so it
 * is a speed bump, not the real control.
 */

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

/**
 * How long the limiter may spend talking to Upstash before the request gives
 * up and uses the local fallback. The rate limit must never become the slowest
 * part of an order lookup: the client's default is 5 retries with exponential
 * backoff, which turns an Upstash outage into a 5-second hang on every
 * request. One quick retry, then fall back.
 */
const UPSTASH_TIMEOUT_MS = 1000

export interface RateLimitOptions {
  limit: number
  /** Upstash duration string, e.g. '10 m', '30 s', '1 h'. */
  window: Duration
  prefix?: string
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  /** Seconds until the window resets — sent back as Retry-After on a 429. */
  retryAfter: number
}

/**
 * Limiters are cached per configuration: constructing one opens a client, and
 * route modules are re-entered on every request in dev.
 */
const limiters = new Map<string, Ratelimit>()

function getLimiter({ limit, window, prefix = 'rl' }: RateLimitOptions): Ratelimit {
  const key = `${prefix}:${limit}:${window}`
  let limiter = limiters.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv({ retry: { retries: 1, backoff: () => 100 } }),
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix,
      // Short-circuits repeat offenders in-process, so a blocked caller
      // hammering the endpoint doesn't cost a Redis round trip each time.
      ephemeralCache: new Map(),
    })
    limiters.set(key, limiter)
  }
  return limiter
}

/** Counters for the in-memory fallback, keyed by `${prefix}:${identifier}`. */
const buckets = new Map<string, { count: number; expiresAt: number }>()

const DURATION_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
}

function windowToMs(window: Duration): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(window)
  if (!match) throw new Error(`Unrecognised rate limit window: ${window}`)
  return Number(match[1]) * DURATION_MS[match[2]]
}

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.expiresAt <= now) {
    // Sweep expired entries so a long-lived instance can't grow unbounded.
    for (const [k, v] of buckets) if (v.expiresAt <= now) buckets.delete(k)
    buckets.set(key, { count: 1, expiresAt: now + windowMs })
    return { allowed: true, limit, remaining: limit - 1, retryAfter: 0 }
  }

  bucket.count += 1
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: Math.ceil((bucket.expiresAt - now) / 1000),
  }
}

/** Counts one hit against `identifier` and reports whether it's allowed. */
export async function rateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { limit, window, prefix = 'rl' } = options

  if (hasUpstash) {
    try {
      // Racing the call bounds a hung connection too, not just a failing one.
      const pending = getLimiter(options).limit(identifier)
      pending.catch(() => {}) // the loser of the race must not go unhandled
      const result = await Promise.race([
        pending,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), UPSTASH_TIMEOUT_MS)),
      ])

      if (result) {
        return {
          allowed: result.success,
          limit,
          remaining: result.remaining,
          // `reset` is a unix timestamp in ms.
          retryAfter: Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)),
        }
      }
    } catch {
      // Fall through to the in-memory limiter rather than failing the request.
    }
  }

  return memoryLimit(`${prefix}:${identifier}`, limit, windowToMs(window))
}

/**
 * Best-effort client IP. Behind Vercel the left-most x-forwarded-for entry is
 * the real client; 'unknown' buckets together anything we can't identify.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}
