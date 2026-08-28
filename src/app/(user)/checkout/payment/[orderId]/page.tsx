'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import { Copy, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { OrderSuccessCard } from '@/components/order/OrderSuccessCard'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { UPI_ID } from '@/lib/constants'
import type { Order } from '@/types'

const WINDOW_SECONDS = 15 * 60
const HELP_STEPS = [
  'Open GPay/PhonePe',
  'Go to Transaction History',
  'Find this payment to Patel Farsan',
  'Copy the 12-digit UTR / reference number',
]

interface PaymentPageProps {
  params: Promise<{ orderId: string }>
}

export default function UpiPaymentPage({ params }: PaymentPageProps) {
  const { orderId } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [secondsLeft, setSecondsLeft] = useState(WINDOW_SECONDS)
  const [expired, setExpired] = useState(false)
  const [utr, setUtr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace(`/login?next=/checkout/payment/${orderId}`)
      return
    }

    const supabase = createClient()
    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          router.replace('/orders')
          return
        }
        if (data.order_status !== 'awaiting_payment') {
          router.replace('/orders')
          return
        }
        setOrder(data as Order)
        const elapsed = Math.floor((Date.now() - new Date(data.placed_at).getTime()) / 1000)
        setSecondsLeft(Math.max(0, WINDOW_SECONDS - elapsed))
        setLoading(false)
      })
  }, [authLoading, user, orderId, router])

  async function handleExpire() {
    setExpired(true)
    if (!order) return
    const supabase = createClient()
    await supabase
      .from('orders')
      .update({ order_status: 'cancelled', cancellation_reason: 'Payment timeout' })
      .eq('id', order.id)
  }

  useEffect(() => {
    if (!order || submitted || expired) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval)
          handleExpire()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, submitted, expired])

  function handleReturnToCart() {
    router.push('/cart')
  }

  async function handleSubmitUtr() {
    if (!order || utr.length !== 12) return
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('orders')
      .update({ utr_number: utr, payment_status: 'awaiting_verification' })
      .eq('id', order.id)
    setSubmitting(false)

    if (error) {
      toast.error('Could not submit. Please try again.')
      return
    }
    setSubmitted(true)
  }

  async function handleCopyUpi() {
    await navigator.clipboard.writeText(UPI_ID)
    toast.success('Copied!')
  }

  if (loading || !order) {
    return <div className="flex min-h-[60vh] items-center justify-center text-stone-500">Loading…</div>
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const progressPct = (secondsLeft / WINDOW_SECONDS) * 100

  const upiString = `upi://pay?pa=${UPI_ID}&pn=Patel%20Farsan&am=${order.total}&cu=INR&tn=${order.order_number}`

  if (expired) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 text-center">
        <span className="text-5xl">⏱️</span>
        <h1 className="mt-4 font-serif text-xl font-bold text-maroon">Order Cancelled</h1>
        <p className="mt-1 text-sm text-stone-500">Time expired — the payment window has closed.</p>
        <button onClick={handleReturnToCart} className="btn-primary mt-6 w-full justify-center">
          Return to Cart
        </button>
      </div>
    )
  }

  if (submitted) {
    return (
      <OrderSuccessCard
        title="Thank you for ordering!"
        subtitle="We'll verify your payment within 30 minutes and start preparing your order."
        orderNumber={order.order_number}
        onCopyOrderNumber={async () => {
          await navigator.clipboard.writeText(order.order_number)
          toast.success('Order number copied!')
        }}
        details={[
          { label: 'Amount', value: `₹${order.total}` },
          { label: 'Payment', value: 'Verification pending' },
        ]}
        note="Confirmation details sent to your mobile"
        primaryHref={`/orders/${order.id}`}
        primaryLabel="View Order"
        secondaryHref="/products"
      />
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8 md:py-10">
      <div className="card-base p-6 text-center">
        <h1 className="font-serif text-xl font-bold text-maroon">Complete Your Payment</h1>
        <p className="text-xs text-stone-400">#{order.order_number}</p>
        <p className="mt-2 font-serif text-4xl font-bold text-maroon">₹{order.total}</p>

        <div className="mt-4">
          <p className="text-sm font-medium text-amber-600">
            ⏱ Complete within {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mx-auto mt-5 flex w-fit flex-col items-center rounded-xl border-2 border-maroon bg-white p-4">
          <QRCode value={upiString} size={180} fgColor="#5C1A15" />
          <p className="mt-2 text-xs text-stone-500">Scan with any UPI app</p>
        </div>

        <button
          onClick={handleCopyUpi}
          className="mx-auto mt-3 flex items-center gap-1.5 rounded-lg border border-cream-dark px-3 py-1.5 font-mono text-sm text-stone-700 hover:border-maroon"
        >
          {UPI_ID} <Copy className="h-3.5 w-3.5" />
        </button>

        <div className="mt-4 flex justify-center gap-2">
          {['GPay', 'PhonePe', 'Paytm'].map((app) => (
            <a
              key={app}
              href={upiString}
              className="rounded-full border border-maroon px-3 py-1.5 text-xs font-semibold text-maroon hover:bg-maroon hover:text-cream"
            >
              {app}
            </a>
          ))}
        </div>

        <OrnamentalDivider size="sm" />
        <p className="text-xs text-stone-400">After completing payment</p>

        <div className="mt-4 text-left">
          <label className="text-[13px] font-semibold text-maroon">
            Enter UTR / Transaction Reference Number
          </label>
          <p className="mb-2 text-[11px] text-stone-400">
            12-digit number from your UPI app&apos;s payment history
          </p>

          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="mb-2 text-xs font-medium text-gold hover:text-gold-dark"
          >
            Where do I find this? {showHelp ? '▲' : '▼'}
          </button>
          {showHelp && (
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-xs text-stone-500">
              {HELP_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}

          <input
            value={utr}
            onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
            inputMode="numeric"
            placeholder="123456789012"
            className="input-base"
          />

          <button
            onClick={handleSubmitUtr}
            disabled={utr.length !== 12 || submitting}
            className="btn-primary mt-3 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? 'Submitting…' : "I've Paid — Verify Payment"}
          </button>
        </div>
      </div>
    </div>
  )
}
