'use client'

import { useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { OrderStepper } from '@/components/order/OrderStepper'
import type { Order, OrderStatusHistory } from '@/types'

export default function PublicTrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ order: Order; history: OrderStatusHistory[] } | null>(null)

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Order not found.')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-cream px-4 py-10 md:px-6">
        <div className="mx-auto max-w-md">
          <h1 className="section-title text-center text-2xl md:text-3xl">Track Your Order</h1>
          <p className="mt-1 text-center text-sm text-stone-500">
            Enter your order number and mobile number to check status.
          </p>

          <form onSubmit={handleTrack} className="card-base mt-6 space-y-4 p-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Order Number</label>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD202508001"
                className="input-base"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Mobile Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric"
                placeholder="9876543210"
                className="input-base"
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
              <Search className="h-4 w-4" />
              {loading ? 'Searching…' : 'Track Order'}
            </button>
          </form>

          {result && (
            <div className="mt-6 space-y-4">
              <div className="card-base flex items-center justify-between p-4">
                <p className="font-mono font-bold text-maroon">#{result.order.order_number}</p>
                <StatusBadge status={result.order.order_status} />
              </div>
              <div className="card-base p-4">
                <OrderStepper
                  currentStatus={result.order.order_status}
                  history={result.history}
                  orderId={result.order.id}
                  orderNumber={result.order.order_number}
                  paid={result.order.payment_status === 'paid'}
                />
              </div>
            </div>
          )}
        </div>
    </div>
  )
}
