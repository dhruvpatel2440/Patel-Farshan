'use client'

import { useState } from 'react'
import { Check, Download, Share } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { cn } from '@/lib/utils'

/**
 * A menu row that both answers "is the app on my phone?" and installs it.
 *
 * `onInstalling` lets a parent menu close itself before the browser's own
 * install window opens on top of it. It deliberately does not fire for the
 * help dialog, which renders above the menu and would be unmounted with it.
 */
export function InstallAppRow({
  className,
  onInstalling,
}: {
  className?: string
  onInstalling?: () => void
}) {
  const { installed, ios, canPrompt, promptInstall } = usePwaInstall()
  const [helpOpen, setHelpOpen] = useState(false)

  async function handleClick() {
    if (canPrompt) {
      onInstalling?.()
      await promptInstall()
      return
    }
    // No install event to spend: Safari never offers one, and Chrome holds it
    // back until it decides the visit is genuine. Both leave the menu as the
    // only route in.
    setHelpOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={installed}
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
          installed ? 'text-stone-500' : 'text-stone-700 hover:bg-maroon/5',
          className
        )}
      >
        <span className="flex items-center gap-2">
          {installed ? (
            <Check className="h-4 w-4 shrink-0 text-green-600" />
          ) : (
            <Download className="h-4 w-4 shrink-0 text-maroon" />
          )}
          Install App
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
            installed ? 'bg-green-100 text-green-700' : 'bg-gold/25 text-maroon'
          )}
        >
          {installed ? 'Installed' : 'Download It'}
        </span>
      </button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="bg-cream sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-maroon">
              Add Patel Farsan to your phone
            </DialogTitle>
          </DialogHeader>
          {ios ? (
            <p className="text-sm leading-relaxed text-stone-600">
              Tap the <Share className="mx-0.5 inline h-4 w-4 text-maroon" aria-label="Share" />{' '}
              button at the bottom of Safari, then choose{' '}
              <span className="font-semibold text-maroon">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-stone-600">
              Tap the <span className="font-semibold text-maroon">⋮</span> menu at the top right of
              your browser, then choose{' '}
              <span className="font-semibold text-maroon">Install app</span> or{' '}
              <span className="font-semibold text-maroon">Add to Home screen</span>.
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
