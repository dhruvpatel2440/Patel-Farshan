import { cn } from '@/lib/utils'

interface OrnamentalDividerProps {
  size?: 'sm' | 'lg'
  symbol?: string
  className?: string
}

export function OrnamentalDivider({
  size = 'lg',
  symbol = '❧',
  className,
}: OrnamentalDividerProps) {
  const isSmall = size === 'sm'

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3',
        isSmall ? 'my-2' : 'my-5',
        className
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          'h-px flex-1 bg-gradient-to-r from-transparent to-gold',
          isSmall ? 'max-w-10 opacity-50' : 'max-w-24 opacity-70'
        )}
      />
      <span
        className={cn(
          'text-gold',
          isSmall ? 'text-xs' : 'text-lg'
        )}
      >
        {symbol}
      </span>
      <span
        className={cn(
          'h-px flex-1 bg-gradient-to-l from-transparent to-gold',
          isSmall ? 'max-w-10 opacity-50' : 'max-w-24 opacity-70'
        )}
      />
    </div>
  )
}
