'use client'

import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: () => void
  /** Describes what is being toggled, for screen readers. */
  label: string
  disabled?: boolean
}

/**
 * The knob is anchored with an explicit `left-0.5`, then moved with a
 * transform. The previous inline toggles omitted `left`, so `absolute` fell
 * back to the static position — inside a button that is the *centred* text
 * position — leaving the knob mid-track, and the "on" transform pushed it off
 * the right edge entirely: a white circle on a white table, invisible.
 *
 * Movement uses `translate` rather than animating `left`, so the transition is
 * composited instead of forcing layout on every frame.
 */
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked ? 'bg-green-500' : 'bg-stone-300'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}
