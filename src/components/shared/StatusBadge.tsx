import { cn } from '@/lib/utils'
import { ORDER_STATUS_LABELS } from '@/lib/constants'
import type { OrderStatus, PaymentStatus } from '@/types'

type Status = OrderStatus | PaymentStatus

const STATUS_STYLES: Record<string, string> = {
  awaiting_payment: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  awaiting_verification: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  placed: 'bg-slate-100 text-slate-700 border-slate-300',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-300',
  packed: 'bg-amber-100 text-amber-800 border-amber-300',
  out_for_delivery: 'bg-orange-100 text-orange-800 border-orange-300',
  delivered: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  paid: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-700 border-red-300',
}

const EXTRA_LABELS: Record<string, string> = {
  pending: 'Payment Pending',
  awaiting_verification: 'Verifying Payment',
  paid: 'Paid',
  failed: 'Payment Failed',
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = ORDER_STATUS_LABELS[status] ?? EXTRA_LABELS[status] ?? status
  const style = STATUS_STYLES[status] ?? 'bg-stone-100 text-stone-700 border-stone-300'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        style,
        className
      )}
    >
      {label}
    </span>
  )
}
