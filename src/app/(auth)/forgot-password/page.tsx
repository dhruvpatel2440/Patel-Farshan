'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Eye, EyeOff, Loader2, MailCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  async function requestCode(isResend = false) {
    if (!email.trim()) {
      setError('Enter your email.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      if (!isResend) setStep('reset')
      setResendIn(60)
    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function submitReset() {
    if (code.length !== 6 || password.length < 6) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not reset your password.')
        setCode('')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 1800)
    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-12">
      <div className="mb-6 flex animate-fade-up flex-col items-center gap-1">
        <Image
          src="/images/logo.png"
          alt="Patel Farsan"
          width={56}
          height={56}
          className="rounded-full border-2 border-gold object-cover"
        />
        <h1 className="font-serif text-2xl font-bold text-maroon">Patel Farsan</h1>
        <p className="text-xs italic text-gold">Since 1985 — Taste of Gujarat</p>
      </div>

      <div className="w-full max-w-md animate-fade-up rounded-2xl border-t-4 border-maroon bg-white p-6 shadow-[0_8px_30px_rgba(92,26,21,0.12)] md:p-8">
        {done ? (
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <MailCheck className="h-7 w-7 text-green-600" />
            </span>
            <h2 className="mt-4 font-serif text-xl font-bold text-maroon">Password updated!</h2>
            <p className="mt-1 text-sm text-stone-500">Taking you to the login page…</p>
          </div>
        ) : (
          <>
            <h2 className="mb-2 text-center font-serif text-xl font-bold text-maroon">
              {step === 'email' ? 'Forgot your password?' : 'Set a new password'}
            </h2>
            <p className="mb-6 text-center text-sm text-stone-500">
              {step === 'email'
                ? "Enter your email and we'll send you a 6-digit code."
                : `We sent a code to ${email}`}
            </p>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {step === 'email' ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && requestCode()}
                    className="input-base"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  onClick={() => requestCode()}
                  disabled={busy}
                  className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy ? 'Sending…' : 'Send Code'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    6-digit code
                  </label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    className="input-base text-center font-mono text-2xl tracking-[0.5em]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitReset()}
                      className="input-base pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-maroon"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 6 && (
                    <p className="mt-1 text-xs text-red-600">At least 6 characters.</p>
                  )}
                </div>

                <button
                  onClick={submitReset}
                  disabled={busy || code.length !== 6 || password.length < 6}
                  className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy ? 'Updating…' : 'Reset Password'}
                </button>

                <div className="text-center text-sm text-stone-600">
                  Didn&apos;t get it?{' '}
                  {resendIn > 0 ? (
                    <span className="text-stone-400">Resend in {resendIn}s</span>
                  ) : (
                    <button
                      onClick={() => requestCode(true)}
                      className="font-semibold text-maroon hover:text-gold"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <p className="mt-6 text-center text-sm text-stone-600">
          Remembered it?{' '}
          <Link href="/login" className="font-semibold text-maroon hover:text-gold">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
