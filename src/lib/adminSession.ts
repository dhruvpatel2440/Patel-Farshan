import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

/**
 * Step-up authentication for the admin panel.
 *
 * Holding a Supabase session with role='admin' is deliberately NOT enough to
 * reach /admin. A second, short-lived cookie is minted only by the dedicated
 * admin login flow (password + emailed 6-digit code), so a stolen or
 * long-lived customer session can never be walked into the admin area — and
 * admin access re-expires every 8 hours regardless of the auth session.
 */

export const ADMIN_COOKIE = 'pf_admin'
const TTL_MS = 8 * 60 * 60 * 1000

function secret(): string {
  // Reuses an existing server-only secret so deployment needs no new env var.
  return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function createAdminToken(userId: string): { value: string; maxAge: number } {
  const expiresAt = Date.now() + TTL_MS
  const payload = `${userId}.${expiresAt}`
  return { value: `${payload}.${sign(payload)}`, maxAge: Math.floor(TTL_MS / 1000) }
}

/** Returns the user id the token was minted for, or null if it's invalid/expired. */
export function readAdminToken(token: string | undefined): string | null {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [userId, expiresAt, signature] = parts
  const payload = `${userId}.${expiresAt}`

  if (!safeEqual(signature, sign(payload))) return null
  if (!Number(expiresAt) || Number(expiresAt) < Date.now()) return null

  return userId
}

/** True only when the caller holds a valid, unexpired elevation for this user. */
export async function hasAdminElevation(userId: string): Promise<boolean> {
  const store = await cookies()
  return readAdminToken(store.get(ADMIN_COOKIE)?.value) === userId
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}
