'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingInputProps {
  value: number
  onChange: (value: number) => void
  size?: 'sm' | 'lg'
}

export function StarRatingInput({ value, onChange, size = 'lg' }: StarRatingInputProps) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value
  const starSize = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4'

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              starSize,
              star <= display ? 'fill-gold text-gold' : 'fill-transparent text-stone-300'
            )}
          />
        </button>
      ))}
    </div>
  )
}
