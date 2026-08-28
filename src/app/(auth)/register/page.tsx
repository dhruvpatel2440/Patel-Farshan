'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterInput } from '@/lib/validations'
import { cn } from '@/lib/utils'

function passwordScore(password: string) {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}

const STRENGTH_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', email: '', password: '', confirmPassword: '' },
  })

  const password = watch('password') || ''
  const strength = passwordScore(password)

  async function onSubmit(values: RegisterInput) {
    setServerError(null)
    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signUp({
        email: values.email || `${values.phone}@patelfarsan.local`,
        password: values.password,
        options: {
          data: { name: values.name, phone: values.phone, role: 'user' },
        },
      })

      if (error) {
        if (error.message.toLowerCase().includes('already') || error.code === 'user_already_exists') {
          setServerError('This number is already registered.')
        } else {
          setServerError(error.message)
        }
        return
      }

      router.push('/dashboard')
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
          Create your account
        </h2>

        {serverError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Full Name</label>
            <input {...register('name')} className="input-base" placeholder="Ramesh Patel" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Mobile Number</label>
            <div className="flex">
              <span className="flex items-center rounded-l-lg border border-r-0 border-cream-dark bg-gold/20 px-3 text-sm font-semibold text-maroon">
                +91
              </span>
              <input
                {...register('phone')}
                inputMode="numeric"
                maxLength={10}
                className="input-base rounded-l-none"
                placeholder="9876543210"
              />
            </div>
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Email <span className="text-stone-400">(optional)</span>
            </label>
            <input {...register('email')} type="email" className="input-base" placeholder="you@example.com" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
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
            {password.length > 0 && (
              <div className="mt-2 flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full bg-stone-200',
                      i < strength && STRENGTH_COLORS[strength - 1]
                    )}
                  />
                ))}
              </div>
            )}
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Confirm Password</label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                className="input-base pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-maroon"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <label className="flex items-start gap-2 text-xs text-stone-600">
            <input type="checkbox" {...register('terms')} className="mt-0.5 accent-maroon" />
            I agree to the Terms of Service and Privacy Policy.
          </label>
          {errors.terms && <p className="text-xs text-red-600">{errors.terms.message}</p>}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center flex items-center gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-maroon hover:text-gold">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
