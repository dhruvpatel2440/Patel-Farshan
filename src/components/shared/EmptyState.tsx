import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  emoji?: string
  heading: string
  subtext?: string
  ctaLabel?: string
  ctaHref?: string
  className?: string
}

export function EmptyState({
  emoji = '🍽️',
  heading,
  subtext,
  ctaLabel,
  ctaHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-16',
        className
      )}
    >
      <span className="text-6xl mb-4" aria-hidden="true">
        {emoji}
      </span>
      <h3 className="font-serif text-xl font-bold text-maroon mb-1">{heading}</h3>
      {subtext && <p className="text-sm text-stone-500 max-w-xs mb-6">{subtext}</p>}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn-primary">
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}
