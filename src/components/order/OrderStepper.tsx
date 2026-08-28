import Link from 'next/link'
import { Check, Phone, Star } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { OrderStatus, OrderStatusHistory } from '@/types'
import { SHOP_PHONE } from '@/lib/constants'

const MAIN_STEPS: { status: OrderStatus; label: string; message: string }[] = [
  { status: 'placed', label: 'Order Placed', message: "We've received your order" },
  { status: 'confirmed', label: 'Confirmed', message: 'Your order is confirmed and being prepared' },
  { status: 'packed', label: 'Packed', message: 'Your farsan is freshly packed and ready' },
  {
    status: 'out_for_delivery',
    label: 'Out for Delivery',
    message: 'On the way! Our delivery partner will call shortly.',
  },
  { status: 'delivered', label: 'Delivered', message: 'Delivered! Enjoy your farsan. 🎉' },
]

interface OrderStepperProps {
  currentStatus: OrderStatus
  history: OrderStatusHistory[]
  orderId: string
  orderNumber: string
  paid: boolean
}

export function OrderStepper({ currentStatus, history, orderId, orderNumber, paid }: OrderStepperProps) {
  if (currentStatus === 'cancelled') {
    const cancelledEntry = history.find((h) => h.status === 'cancelled')
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-center">
        <h3 className="font-serif text-lg font-bold text-red-700">Order Cancelled</h3>
        {cancelledEntry?.note && <p className="mt-1 text-sm text-red-600">{cancelledEntry.note}</p>}
        {paid && (
          <p className="mt-1 text-xs text-red-500">Refund will be processed in 3-5 days.</p>
        )}
        <Link href="/products" className="btn-outline mt-4 inline-flex !border-red-500 !text-red-600 hover:!bg-red-500 hover:!text-white">
          Reorder
        </Link>
      </div>
    )
  }

  const currentIndex = MAIN_STEPS.findIndex((s) => s.status === currentStatus)
  const activeIndex = currentIndex === -1 ? 0 : currentIndex

  return (
    <div>
      {currentStatus === 'awaiting_payment' && (
        <div className="mb-4 flex flex-col items-start justify-between gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 sm:flex-row sm:items-center">
          <span>⏳ Waiting for payment to be completed</span>
          <Link href={`/checkout/payment/${orderId}`} className="font-semibold text-maroon underline">
            Complete Payment
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-0 md:flex-row md:items-start md:gap-0">
        {MAIN_STEPS.map((step, i) => {
          const done = i < activeIndex || (i === activeIndex && currentStatus === 'delivered')
          const isCurrent = i === activeIndex && currentStatus !== 'delivered' && currentIndex !== -1
          const upcoming = !done && !isCurrent
          const entry = history.find((h) => h.status === step.status)

          return (
            <div key={step.status} className="flex flex-1 md:flex-col">
              {/* line + circle column */}
              <div className="flex flex-col items-center md:w-full md:flex-row">
                <div className="flex flex-col items-center md:w-full md:flex-row">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                      done && 'border-maroon bg-maroon text-white',
                      isCurrent && 'border-maroon bg-white',
                      upcoming && 'border-stone-300 bg-white'
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : isCurrent ? (
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-maroon" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-stone-300" />
                    )}
                  </div>
                  {i < MAIN_STEPS.length - 1 && (
                    <span
                      className={cn(
                        'mx-0 my-1 w-0.5 flex-1 md:mx-2 md:my-0 md:h-0.5 md:w-full',
                        done ? 'bg-maroon' : isCurrent ? 'bg-gradient-to-r from-maroon to-stone-300 md:bg-gradient-to-r' : 'bg-stone-200'
                      )}
                    />
                  )}
                </div>
              </div>

              {/* label column */}
              <div className="mb-5 ml-3 md:ml-0 md:mt-2 md:mb-0">
                <p className={cn('text-sm font-semibold', done || isCurrent ? 'text-maroon' : 'text-stone-400')}>
                  {step.label}
                </p>
                <p className="text-[11px] text-stone-400">
                  {entry ? format(new Date(entry.changed_at), 'd MMM, h:mm a') : '—'}
                </p>
                {(done || isCurrent) && (
                  <p className="mt-0.5 max-w-[160px] text-xs text-stone-500">{step.message}</p>
                )}

                {isCurrent && step.status === 'out_for_delivery' && SHOP_PHONE && (
                  <a
                    href={`tel:${SHOP_PHONE}`}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-gold px-2.5 py-1 text-xs font-semibold text-gold hover:bg-gold hover:text-maroon"
                  >
                    <Phone className="h-3 w-3" /> Call Delivery Partner
                  </a>
                )}
                {step.status === 'delivered' && currentStatus === 'delivered' && (
                  <button className="mt-2 inline-flex items-center gap-1 rounded-lg bg-gold px-2.5 py-1 text-xs font-semibold text-maroon">
                    <Star className="h-3 w-3" /> Rate Your Order
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="sr-only">Order {orderNumber}</p>
    </div>
  )
}
