'use client'

import { use, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { MessageCircle, Phone } from 'lucide-react'
import { format } from 'date-fns'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { OrderStepper } from '@/components/order/OrderStepper'
import { useRealtimeOrder } from '@/hooks/useRealtimeOrder'
import { useAuth } from '@/hooks/useAuth'
import { SHOP_PHONE, SHOP_WHATSAPP } from '@/lib/constants'

interface TrackingPageProps {
  params: Promise<{ orderId: string }>
}

export default function OrderTrackingPage({ params }: TrackingPageProps) {
  const { orderId } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { order, history, isLoading, error } = useRealtimeOrder(orderId)

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace(`/login?next=/orders/${orderId}`)
  }, [authLoading, user, orderId, router])

  useEffect(() => {
    if (order && user && order.user_id !== user.id) {
      router.replace('/orders')
    }
  }, [order, user, router])

  if (authLoading || isLoading || !user) {
    return <div className="flex min-h-[60vh] items-center justify-center text-stone-500">Loading…</div>
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-stone-500">Order not found.</p>
      </div>
    )
  }

  const address = order.address_snapshot

  const whatsappText = encodeURIComponent(`Hi, my order ${order.order_number}...`)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
      <div className="card-base flex flex-wrap items-center justify-between gap-2 p-5">
        <div>
          <p className="font-mono text-lg font-bold text-maroon">#{order.order_number}</p>
          <p className="text-xs text-stone-400">
            {format(new Date(order.placed_at), 'd MMM yyyy, h:mm a')}
          </p>
        </div>
        <StatusBadge status={order.order_status} className="!text-sm !px-3 !py-1.5" />
      </div>

      <div className="card-base mt-4 p-5">
        <OrderStepper
          currentStatus={order.order_status}
          history={history}
          orderId={order.id}
          orderNumber={order.order_number}
          paid={order.payment_status === 'paid'}
        />
        {order.payment_status === 'awaiting_verification' && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            ⏳ Payment submitted — verifying within 30 minutes
          </div>
        )}
      </div>

      <div className="card-base mt-4 p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-maroon">
          📍 Delivery Address
        </p>
        <p className="text-sm text-stone-700">{address?.full_name}</p>
        <p className="text-sm text-stone-600">Bus pickup — {address?.city?.name}</p>
      </div>

      <div className="card-base mt-4 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-maroon">Order Items</p>
        <div className="space-y-2">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-cream">
                {item.product_image_url ? (
                  <Image src={item.product_image_url} alt={item.product_name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm">🍽️</div>
                )}
              </div>
              <span className="flex-1 font-gujarati text-maroon">{item.product_name_gujarati}</span>
              <span className="text-stone-500">
                {item.quantity} × ₹{item.price_at_purchase}
              </span>
              <span className="w-14 text-right font-semibold text-maroon">₹{item.line_total}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-cream-dark pt-2 font-bold text-maroon">
          <span>Total</span>
          <span>₹{order.total}</span>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        {SHOP_PHONE && (
          <a href={`tel:${SHOP_PHONE}`} className="btn-outline flex flex-1 items-center justify-center gap-1.5">
            <Phone className="h-4 w-4" /> Call Us
          </a>
        )}
        {SHOP_WHATSAPP && (
          <a
            href={`https://wa.me/${SHOP_WHATSAPP}?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline flex flex-1 items-center justify-center gap-1.5"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
