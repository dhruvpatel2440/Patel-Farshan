import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const CONFETTI_DOTS = [
  { top: '4%', left: '14%', size: 6, color: 'bg-gold', opacity: 'opacity-70' },
  { top: '10%', left: '82%', size: 4, color: 'bg-maroon', opacity: 'opacity-40' },
  { top: '22%', left: '6%', size: 3, color: 'bg-maroon', opacity: 'opacity-30' },
  { top: '18%', left: '92%', size: 6, color: 'bg-gold', opacity: 'opacity-60' },
  { top: '2%', left: '48%', size: 3, color: 'bg-gold', opacity: 'opacity-50' },
  { top: '34%', left: '90%', size: 3, color: 'bg-maroon', opacity: 'opacity-30' },
  { top: '30%', left: '2%', size: 5, color: 'bg-gold', opacity: 'opacity-50' },
  { top: '46%', left: '10%', size: 3, color: 'bg-maroon', opacity: 'opacity-25' },
  { top: '44%', left: '86%', size: 4, color: 'bg-gold', opacity: 'opacity-40' },
]

interface OrderSuccessCardProps {
  title: string
  subtitle: string
  orderNumber: string
  onCopyOrderNumber?: () => void
  details?: { label: string; value: string }[]
  note?: string
  primaryHref: string
  primaryLabel: string
  secondaryHref: string
  secondaryLabel?: string
}

export function OrderSuccessCard({
  title,
  subtitle,
  orderNumber,
  onCopyOrderNumber,
  details = [],
  note,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel = 'Continue Shopping',
}: OrderSuccessCardProps) {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col items-center justify-center px-4 py-10">
      <div className="w-full rounded-3xl bg-white p-8 text-center shadow-xl shadow-maroon/10">
        <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
          {CONFETTI_DOTS.map((dot, i) => (
            <span
              key={i}
              className={cn('absolute rounded-full', dot.color, dot.opacity)}
              style={{ top: dot.top, left: dot.left, width: dot.size, height: dot.size }}
            />
          ))}
          <div className="animate-checkmark-pop flex h-16 w-16 items-center justify-center rounded-full bg-gold">
            <Check className="h-8 w-8 text-white" strokeWidth={3} />
          </div>
        </div>

        <h1 className="font-serif text-xl font-bold text-maroon">{title}</h1>
        <p className="mt-1.5 text-sm text-stone-500">{subtitle}</p>

        <button
          onClick={onCopyOrderNumber}
          disabled={!onCopyOrderNumber}
          className="mx-auto mt-4 block font-mono text-sm font-semibold text-stone-400"
        >
          #{orderNumber}
        </button>

        {details.length > 0 && (
          <div className="mt-4 space-y-1.5 rounded-xl bg-cream/60 p-3 text-left text-sm">
            {details.map((d) => (
              <div key={d.label} className="flex justify-between">
                <span className="text-stone-500">{d.label}</span>
                <span className="font-semibold text-maroon">{d.value}</span>
              </div>
            ))}
          </div>
        )}

        {note && <p className="mt-3 text-xs text-stone-400">{note}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href={secondaryHref}
            className="rounded-xl border-2 border-cream-dark px-4 py-2.5 text-sm font-semibold text-maroon transition-colors hover:border-maroon"
          >
            {secondaryLabel}
          </Link>
          <Link
            href={primaryHref}
            className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-dark"
          >
            {primaryLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
