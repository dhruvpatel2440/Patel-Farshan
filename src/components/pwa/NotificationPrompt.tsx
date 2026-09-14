'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BellRing, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { usePushNotifications } from '@/hooks/usePushNotifications'

/** "Not now" keeps the popup away for this long, then it asks again. */
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000
const SNOOZE_KEY = 'pf-notify-snoozed-until'
/** Fired by InstallPrompt when its popup closes — this one waits its turn. */
export const INSTALL_PROMPT_HIDDEN_EVENT = 'pf:install-prompt-hidden'
/** Set by InstallPrompt while its popup is on screen. */
export const INSTALL_PROMPT_OPEN_FLAG = '__pfInstallPromptOpen'

/** Pages where a popup would get in the way of what the person is doing. */
const QUIET_PATHS = ['/login', '/register', '/forgot-password', '/admin-login', '/checkout']

function snoozed() {
  try {
    return Number(window.localStorage.getItem(SNOOZE_KEY) || 0) > Date.now()
  } catch {
    return false
  }
}

function snooze() {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
  } catch {
    // Storage blocked: it may ask again on the next page, nothing worse.
  }
}

/** The install popup gets the first word on a visit; two at once is too much. */
function installPromptOpen() {
  return (window as unknown as Record<string, unknown>)[INSTALL_PROMPT_OPEN_FLAG] === true
}

/**
 * Asks signed-in customers (and the shop, in admin) to allow notifications
 * without them having to find the switch in a menu. Phones only let a site
 * turn notifications on after one "Allow" tap, so this is as close to "on by
 * default" as the web allows.
 *
 * Shown only while notifications are off and askable — not when blocked or on
 * an iPhone outside the installed app, where the browser can't be asked.
 */
export function NotificationPrompt() {
  const pathname = usePathname() ?? '/'
  const { user } = useAuth()

  const quiet = QUIET_PATHS.some((p) => pathname.startsWith(p))
  if (!user || quiet) return null
  // Mounted only once someone is signed in: the hook may save a subscription.
  // Remounted on reaching order success, so that ask isn't skipped after a
  // "Not now" earlier in the same visit.
  const onOrderSuccess = pathname.startsWith('/order/success')
  return (
    <Prompt
      key={onOrderSuccess ? 'order-success' : 'default'}
      onAdmin={pathname.startsWith('/admin')}
      // Right after ordering is when "tell me when it's on its way" matters
      // most, so that page asks even if they said "Not now" before.
      ignoreSnooze={onOrderSuccess}
    />
  )
}

function Prompt({ onAdmin, ignoreSnooze }: { onAdmin: boolean; ignoreSnooze: boolean }) {
  const { state, busy, enable } = usePushNotifications()
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!ignoreSnooze && snoozed()) return
    let timer: number | undefined

    // A beat after the page settles, so it doesn't land on top of loading —
    // and never while the install popup is up; that one waits for it to close.
    function tryShow(delay: number) {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (!installPromptOpen()) setReady(true)
      }, delay)
    }
    function onInstallHidden() {
      tryShow(1500)
    }

    tryShow(2500)
    window.addEventListener(INSTALL_PROMPT_HIDDEN_EVENT, onInstallHidden)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(INSTALL_PROMPT_HIDDEN_EVENT, onInstallHidden)
    }
  }, [ignoreSnooze])

  const close = useCallback(() => {
    snooze()
    setDismissed(true)
  }, [])

  useEffect(() => {
    if (!ready || dismissed || state !== 'off') return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [ready, dismissed, state, close])

  if (!ready || dismissed || state !== 'off') return null

  async function handleAllow() {
    const on = await enable()
    setDismissed(true)
    if (on) {
      toast.success(
        onAdmin
          ? 'Alerts on — this phone will buzz for every new order.'
          : "Notifications on — we'll tell you when your order is on its way."
      )
    } else {
      // Declined in the system popup: don't re-ask on every page.
      snooze()
    }
  }

  return (
    <>
      <div
        onClick={close}
        aria-hidden="true"
        className="fixed inset-0 z-60 bg-black/60 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Turn on notifications"
        className="animate-fade-up fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-70 rounded-2xl border-2 border-gold bg-gradient-to-br from-maroon to-maroon-light p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] ring-4 ring-gold/20 md:inset-x-auto md:bottom-6 md:right-6 md:w-96"
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-cream/60 hover:bg-cream/10 hover:text-cream"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 pr-6">
          <span className="animate-status-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold text-maroon">
            <BellRing className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="font-serif text-lg font-bold leading-tight text-cream">
              {onAdmin ? 'Get new order alerts' : 'Get order updates'}
            </p>
            <p className="text-sm font-semibold text-gold">
              {onAdmin ? 'Never miss an order' : 'Know the moment it’s on its way'}
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-cream/90">
          {onAdmin
            ? 'This phone will buzz for every new order, message and review — even with the app closed.'
            : 'We’ll notify you when your order is confirmed, out for delivery and delivered — even with the app closed.'}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleAllow}
            disabled={busy}
            className="flex-1 rounded-lg bg-gold py-3 text-base font-bold text-maroon shadow-md transition-colors hover:bg-gold-light disabled:opacity-70"
          >
            {busy ? 'Turning on…' : 'Allow Notifications'}
          </button>
          <button
            onClick={close}
            className="rounded-lg px-4 py-3 text-sm font-semibold text-cream/70 hover:text-cream"
          >
            Not now
          </button>
        </div>
      </div>
    </>
  )
}
