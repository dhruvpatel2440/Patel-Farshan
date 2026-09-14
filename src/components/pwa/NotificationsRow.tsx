'use client'

import { useState } from 'react'
import { Bell, BellOff, BellRing, Share } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { cn } from '@/lib/utils'

/**
 * A menu row that switches phone notifications on or off. Sits next to
 * InstallAppRow and matches it; `tone="dark"` is for the maroon admin sidebar.
 *
 * When the browser can't be asked directly — blocked earlier, or an iPhone
 * that hasn't added the app to its home screen — the row explains how instead
 * of doing nothing.
 */
export function NotificationsRow({
  className,
  tone = 'light',
  label = 'Notifications',
  enabledMessage = "Notifications on — we'll let you know when your order moves.",
}: {
  className?: string
  tone?: 'light' | 'dark'
  label?: string
  enabledMessage?: string
}) {
  const { state, busy, enable, disable } = usePushNotifications()
  const [help, setHelp] = useState<'needs-install' | 'denied' | null>(null)

  if (state === 'loading' || state === 'unsupported') return null

  const on = state === 'on'
  const dark = tone === 'dark'

  async function handleClick() {
    if (state === 'needs-install' || state === 'denied') {
      setHelp(state)
      return
    }
    if (on) {
      await disable()
      toast.success('Notifications turned off.')
      return
    }
    if (await enable()) toast.success(enabledMessage)
  }

  const Icon = on ? BellRing : state === 'denied' ? BellOff : Bell

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors disabled:opacity-60',
          dark ? 'text-gold hover:bg-gold/5' : 'text-stone-700 hover:bg-maroon/5',
          className
        )}
      >
        <span className="flex items-center gap-2">
          <Icon
            className={cn('h-4 w-4 shrink-0', on ? 'text-green-600' : dark ? 'text-gold' : 'text-maroon')}
          />
          {label}
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
            on
              ? 'bg-green-100 text-green-700'
              : state === 'denied'
                ? 'bg-red-100 text-red-700'
                : dark
                  ? 'bg-gold/20 text-gold'
                  : 'bg-gold/25 text-maroon'
          )}
        >
          {busy ? '…' : on ? 'On' : state === 'denied' ? 'Blocked' : 'Turn On'}
        </span>
      </button>

      <Dialog open={help !== null} onOpenChange={(open) => !open && setHelp(null)}>
        <DialogContent className="bg-cream sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-maroon">
              {help === 'denied' ? 'Notifications are blocked' : 'Add the app first'}
            </DialogTitle>
          </DialogHeader>
          {help === 'denied' ? (
            <p className="text-sm leading-relaxed text-stone-600">
              You blocked notifications for Patel Farsan earlier. Tap the{' '}
              <span className="font-semibold text-maroon">🔒</span> icon next to the address bar (or
              open your phone&apos;s <span className="font-semibold text-maroon">Settings → Apps →
              Patel Farsan</span>), allow <span className="font-semibold text-maroon">Notifications</span>,
              then come back and turn them on.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-stone-600">
              On iPhone, notifications only work from the installed app. Tap the{' '}
              <Share className="mx-0.5 inline h-4 w-4 text-maroon" aria-label="Share" /> button in
              Safari, choose <span className="font-semibold text-maroon">Add to Home Screen</span>,
              then open Patel Farsan from your home screen and turn notifications on there.
            </p>
          )}
          <DialogFooter className="mt-4">
            <DialogClose
              nativeButton={false}
              render={<button className="btn-primary">Got it</button>}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
