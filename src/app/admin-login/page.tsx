'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Eye, EyeOff, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'

/**
 * Staff-only sign-in. Deliberately unlinked from the storefront, dark-themed so
 * it reads as a different surface, and gated behind an emailed code before the
 * admin panel unlocks.
 */
export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'credentials' | 'code'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus()
  }, [step])

  async function submitCredentials() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid credentials.')
        return
      }
      // This device passed the code within the last 5 hours — the login
      // route already minted the elevation cookie, so there's nothing left
      // to verify here.
      if (data.otpRequired === false) {
        router.push('/admin')
        router.refresh()
        return
      }
      setCode('')
      setStep('code')
    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function submitCode() {
    if (code.length !== 6) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/admin-auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not verify that code.')
        setCode('')
        if (res.status === 401 || res.status === 429) setStep('credentials')
        return
      }
      router.push('/admin')
      router.refresh()
    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-maroon-dark px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-2">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold bg-maroon">
          <ShieldCheck className="h-7 w-7 text-gold" />
        </span>
        <h1 className="font-serif text-2xl font-bold text-gold">Patel Farsan Admin</h1>
        <p className="text-xs uppercase tracking-widest text-cream/50">Staff access only</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-gold/25 bg-maroon p-6 shadow-2xl md:p-7">
        <h2 className="mb-1 text-center font-serif text-lg font-bold text-cream">
          {step === 'credentials' ? 'Sign in' : 'Security code'}
        </h2>
        <p className="mb-5 text-center text-xs text-cream/60">
          {step === 'credentials'
            ? 'Authorised staff only. All attempts are logged.'
            : `We emailed a 6-digit code to ${email}`}
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2.5 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {step === 'credentials' ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-cream/70">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitCredentials()}
                autoComplete="username"
                className="w-full rounded-lg border border-gold/25 bg-maroon-dark px-3 py-2.5 text-sm text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-cream/70">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitCredentials()}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gold/25 bg-maroon-dark px-3 py-2.5 pr-10 text-sm text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 hover:text-gold"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={submitCredentials}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 text-sm font-bold text-maroon transition-colors hover:bg-gold-light disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? 'Verifying…' : 'Continue'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              ref={codeRef}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && submitCode()}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="w-full rounded-lg border border-gold/25 bg-maroon-dark px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] text-cream placeholder:text-cream/20 focus:border-gold focus:outline-none"
            />

            <button
              onClick={submitCode}
              disabled={busy || code.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 text-sm font-bold text-maroon transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? 'Unlocking…' : 'Unlock Admin Panel'}
            </button>

            <button
              onClick={() => {
                setStep('credentials')
                setError(null)
                setCode('')
              }}
              className="w-full text-center text-xs text-cream/40 hover:text-gold"
            >
              ← Start over
            </button>
          </div>
        )}

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-cream/35">
          <ShieldAlert className="h-3 w-3" />
          Admin access expires after 8 hours
        </p>
      </div>
    </div>
  )
}
