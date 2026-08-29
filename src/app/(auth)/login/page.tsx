'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations'

function resolveEmail(identifier: string) {
  const trimmed = identifier.trim()
  if (trimmed.includes('@')) return trimmed
  const digitsOnly = trimmed.replace(/\D/g, '')
  return `${digitsOnly}@patelfarsan.local`
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', remember: true },
  })

  async function onSubmit(values: LoginInput) {
    setServerError(null)
    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email: resolveEmail(values.identifier),
        password: values.password,
      })

      if (error || !data.user) {
        setServerError('Invalid mobile number / email or password.')
        return
      }

      // Customer sign-in only. Staff use /admin-login, which additionally
      // requires an emailed code — so this page never routes into /admin, and
      // an admin signing in here simply gets their own customer view.
      const next = searchParams.get('next')
      router.push(next && !next.startsWith('/admin') ? next : '/dashboard')
      router.refresh()
    } catch {
      setServerError('Unable to reach the server. Please try again in a moment.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-1 animate-fade-up">
        <Image src="/images/logo.png" alt="Patel Farsan" width={56} height={56} className="rounded-full border-2 border-gold object-cover" />
        <h1 className="font-serif text-2xl font-bold text-maroon">Patel Farsan</h1>
        <p className="text-xs italic text-gold">Since 1985 — Taste of Gujarat</p>
      </div>

      <div className="w-full max-w-md rounded-2xl border-t-4 border-maroon bg-white p-6 shadow-[0_8px_30px_rgba(92,26,21,0.12)] animate-fade-up md:p-8">
        <h2 className="mb-6 text-center font-serif text-xl font-bold text-maroon">
          Welcome back
        </h2>

        {serverError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Mobile Number or Email
            </label>
            <input {...register('identifier')} className="input-base" placeholder="9876543210 or you@example.com" />
            {errors.identifier && (
              <p className="mt-1 text-xs text-red-600">{errors.identifier.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Password</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
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
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-stone-600">
              <input type="checkbox" {...register('remember')} className="accent-maroon" />
              Remember me
            </label>
            <Link href="/forgot-password" className="font-medium text-gold hover:text-gold-dark">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center flex items-center gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          New here?{' '}
          <Link href="/register" className="font-semibold text-maroon hover:text-gold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
