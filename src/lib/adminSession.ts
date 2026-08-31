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
 *
 * Separately, a "this device recently passed the code" cookie lets a login
 * within 5 hours of the last successful OTP skip straight past the code step
 * (password only) — see OTP_TRUST_COOKIE below. It is deliberately shorter
 * than the 8-hour elevation and tracked independently: it governs whether the
 * *login page* re-demands a code, not how long an already-open panel stays
 * open.
 */

function secret(): string {
  // Deliberately its own secret: signing keys must not double as database
  // credentials, and rotating one must not force rotating the other.
  const value = process.env.ADMIN_SESSION_SECRET
  if (!value) {
    throw new Error(
      'ADMIN_SESSION_SECRET is not set. Generate one with `openssl rand -hex 32` and add it to your environment.'
    )
  }
  return value
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

/**
 * The purpose tag is baked into the signed payload so a token minted for one
 * cookie can't be replayed into the other just by copying the cookie value —
 * `readToken` rejects it unless the tag matches what it's checking for.
 */
function createToken(purpose: string, userId: string, ttlMs: number): { value: string; maxAge: number } {
  const expiresAt = Date.now() + ttlMs
  const payload = `${purpose}.${userId}.${expiresAt}`
  return { value: `${payload}.${sign(payload)}`, maxAge: Math.floor(ttlMs / 1000) }
}

function readToken(purpose: string, token: string | undefined): string | null {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 4) return null

  const [tokenPurpose, userId, expiresAt, signature] = parts
  if (tokenPurpose !== purpose) return null

  const payload = `${tokenPurpose}.${userId}.${expiresAt}`
  if (!safeEqual(signature, sign(payload))) return null
  if (!Number(expiresAt) || Number(expiresAt) < Date.now()) return null

  return userId
}

export const ADMIN_COOKIE = 'pf_admin'
const ADMIN_TTL_MS = 8 * 60 * 60 * 1000

export function createAdminToken(userId: string) {
  return createToken('admin', userId, ADMIN_TTL_MS)
}

export function readAdminToken(token: string | undefined): string | null {
  return readToken('admin', token)
}

/** True only when the caller holds a valid, unexpired elevation for this user. */
export async function hasAdminElevation(userId: string): Promise<boolean> {
  const store = await cookies()
  return readAdminToken(store.get(ADMIN_COOKIE)?.value) === userId
}

export const OTP_TRUST_COOKIE = 'pf_admin_otp_trust'
const OTP_TRUST_TTL_MS = 5 * 60 * 60 * 1000

export function createOtpTrustToken(userId: string) {
  return createToken('otp_trust', userId, OTP_TRUST_TTL_MS)
}

export function readOtpTrustToken(token: string | undefined): string | null {
  return readToken('otp_trust', token)
}

/** True when this admin passed the emailed code within the last 5 hours. */
export async function hasRecentOtpVerification(userId: string): Promise<boolean> {
  const store = await cookies()
  return readOtpTrustToken(store.get(OTP_TRUST_COOKIE)?.value) === userId
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}
