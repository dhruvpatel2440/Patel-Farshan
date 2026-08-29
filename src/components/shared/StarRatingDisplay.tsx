import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRatingDisplay({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn('flex gap-0.5', className)} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= rating ? 'fill-gold text-gold' : 'fill-transparent text-stone-300'
          )}
        />
      ))}
    </div>
  )
}
