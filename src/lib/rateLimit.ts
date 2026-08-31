/**
 * Fixed-window rate limiting for public endpoints.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * are set (over the REST API, so no extra dependency), and otherwise falls
 * back to an in-process Map.
 *
 * NOTE: in-memory limiter is per-instance on Vercel serverless — each lambda
 * keeps its own counters, so the effective limit is (instances x limit) and
 * counters reset on cold start. Fine as a speed bump; configure Upstash for a
 * limit that actually holds across the fleet.
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  /** Seconds until the window resets — sent back as Retry-After on a 429. */
  retryAfter: number
}

/** Counters for the in-memory fallback, keyed by `${prefix}:${identifier}`. */
const buckets = new Map<string, { count: number; expiresAt: number }>()

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
  const retryAfter = Math.ceil((bucket.expiresAt - now) / 1000)
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter,
  }
}

/**
 * Returns null when Upstash isn't configured or the call fails — the caller
 * then degrades to the in-memory limiter rather than failing the request.
 */
async function redisLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null

  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      // INCR creates the counter; PEXPIRE ... NX only sets the TTL on the
      // first hit, so the window is fixed rather than sliding forward.
      body: JSON.stringify([
        ['INCR', key],
        ['PEXPIRE', key, String(windowMs), 'NX'],
        ['PTTL', key],
      ]),
      cache: 'no-store',
    })

    if (!res.ok) return null

    const parts = (await res.json()) as Array<{ result?: number; error?: string }>
    const count = parts?.[0]?.result
    if (typeof count !== 'number') return null

    const pttl = parts?.[2]?.result
    const retryAfter = typeof pttl === 'number' && pttl > 0 ? Math.ceil(pttl / 1000) : Math.ceil(windowMs / 1000)

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfter,
    }
  } catch {
    return null
  }
}

/** Counts one hit against `identifier` and reports whether it's allowed. */
export async function rateLimit(
  identifier: string,
  { limit, windowMs, prefix = 'rl' }: { limit: number; windowMs: number; prefix?: string }
): Promise<RateLimitResult> {
  const key = `${prefix}:${identifier}`
  return (await redisLimit(key, limit, windowMs)) ?? memoryLimit(key, limit, windowMs)
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
