import { createHash, randomInt, timingSafeEqual } from 'crypto'

/** How long a code stays valid. */
export const OTP_TTL_MS = 10 * 60 * 1000
/** Wrong guesses allowed before the code is burned. */
export const OTP_MAX_ATTEMPTS = 5
/** Minimum gap between sends, so the endpoint can't be used to spam an inbox. */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000

/** Cryptographically random 6-digit code (not Math.random). */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/**
 * Codes are stored hashed, never in plaintext. The pepper matters: a bare
 * SHA-256 of a 6-digit code is trivially brute-forced from a leaked hash
 * (only a million candidates), so the server secret is mixed in.
 */
function pepper(): string {
  const value = process.env.OTP_PEPPER
  if (!value) {
    throw new Error(
      'OTP_PEPPER is not set. Generate one with `openssl rand -hex 32` and add it to your environment.'
    )
  }
  return value
}

export function hashOtp(code: string): string {
  return createHash('sha256').update(`${code}:${pepper()}`).digest('hex')
}

/** Constant-time compare, so response timing can't leak the code. */
export function otpMatches(code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtp(code), 'hex')
  let stored: Buffer
  try {
    stored = Buffer.from(storedHash, 'hex')
  } catch {
    return false
  }
  if (candidate.length !== stored.length) return false
  return timingSafeEqual(candidate, stored)
}
