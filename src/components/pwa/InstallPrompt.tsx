'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Share, X } from 'lucide-react'
import { INSTALL_PROMPT_HIDDEN_EVENT, INSTALL_PROMPT_OPEN_FLAG } from '@/components/pwa/NotificationPrompt'

/** Chrome's install event — still not in TypeScript's DOM lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Chrome-only, and likewise missing from the DOM lib. */
type NavigatorWithRelatedApps = Navigator & {
  getInstalledRelatedApps?: () => Promise<Array<{ id?: string; platform?: string; url?: string }>>
  standalone?: boolean
}

/** Permanent: once installed, never ask again on this device. */
const INSTALLED_KEY = 'pf-pwa-installed'
/** Per visit: a dismissal quietens this visit only, not the next one. */
const DISMISSED_KEY = 'pf-install-dismissed'

function markInstalled() {
  try {
    window.localStorage.setItem(INSTALLED_KEY, '1')
  } catch {
    // Private mode with storage blocked — the prompt may reappear, which is
    // the harmless end of getting this wrong.
  }
}

function alreadyInstalled() {
  try {
    return window.localStorage.getItem(INSTALLED_KEY) === '1'
  } catch {
    return false
  }
}

function dismissedThisVisit() {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/** True only while running as the installed app, not while browsing the site. */
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own flag, which predates display-mode.
    (window.navigator as NavigatorWithRelatedApps).standalone === true
  )
}

function isIos() {
  const ua = window.navigator.userAgent
  // iPadOS 13+ reports itself as a Mac, so a touch-capable "Mac" is an iPad.
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/**
 * Asks the customer to keep Patel Farsan on their home screen, and registers
 * the service worker that makes the site installable at all.
 *
 * Shown on the first visit and on later visits if it was waved away, but never
 * again once the app is installed. Installation is read from three signals,
 * because no single one is enough:
 *
 *  1. `appinstalled` / an accepted prompt — definitive, and recorded for good.
 *  2. Running in standalone display mode — they are *in* the installed app.
 *  3. `getInstalledRelatedApps()` — the only one that can tell, from an
 *     ordinary browser tab, that this PWA is installed from an earlier visit.
 *
 * Chrome also simply withholds `beforeinstallprompt` when the app is already
 * installed, so the Android banner is self-suppressing on top of all this.
 * iOS exposes nothing at all, which is why its card offers "I've added it".
 */
export function InstallPrompt() {
  const pathname = usePathname()
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [visible, setVisible] = useState(false)

  // The shop owner does not need to be nagged to install their own admin.
  const onAdmin = pathname?.startsWith('/admin') ?? false

  const hide = useCallback((permanent: boolean) => {
    setVisible(false)
    if (permanent) {
      markInstalled()
      return
    }
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Nothing to do; worst case it reappears on the next page.
    }
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // A failed registration costs the install prompt, nothing else — the
      // site works exactly as before, so there is nothing to tell the user.
    })
  }, [])

  useEffect(() => {
    if (onAdmin) return

    // Opened as the installed app: record it, so a later visit through the
    // browser knows too.
    if (isStandalone()) {
      markInstalled()
      return
    }
    if (alreadyInstalled() || dismissedThisVisit()) return

    let cancelled = false

    function onBeforeInstallPrompt(event: Event) {
      // Stops Chrome's own mini-infobar so there is only one ask on screen.
      event.preventDefault()
      if (cancelled) return
      setInstallEvent(event as BeforeInstallPromptEvent)
      setVisible(true)
    }

    function onInstalled() {
      markInstalled()
      setVisible(false)
      setInstallEvent(null)
    }

    // Captured before React hydrated, if Chrome fired it that early.
    const pending = (window as Window & { __pfInstallEvent?: BeforeInstallPromptEvent })
      .__pfInstallEvent
    if (pending) {
      setInstallEvent(pending)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // Chrome can confirm an install from a previous visit; everyone else
    // falls back to the signals above.
    const nav = window.navigator as NavigatorWithRelatedApps
    if (nav.getInstalledRelatedApps) {
      nav
        .getInstalledRelatedApps()
        .then((apps) => {
          if (apps.length === 0) return
          cancelled = true
          markInstalled()
          setVisible(false)
        })
        .catch(() => {})
    }

    if (isIos()) {
      setShowIosHint(true)
      setVisible(true)
    }

    return () => {
      cancelled = true
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [onAdmin])

  // Lets the notifications popup wait its turn instead of stacking on this one.
  useEffect(() => {
    const flags = window as unknown as Record<string, unknown>
    const open = visible && !onAdmin
    const wasOpen = flags[INSTALL_PROMPT_OPEN_FLAG] === true
    flags[INSTALL_PROMPT_OPEN_FLAG] = open
    if (wasOpen && !open) window.dispatchEvent(new Event(INSTALL_PROMPT_HIDDEN_EVENT))
  }, [visible, onAdmin])

  // With a backdrop up, Escape has to close it — on desktop there is nothing
  // else to reach for.
  useEffect(() => {
    if (!visible) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') hide(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible, hide])

  async function handleInstall() {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    // Chrome allows one prompt per event, so it is spent either way.
    setInstallEvent(null)
    hide(outcome === 'accepted')
  }

  if (!visible || onAdmin) return null

  return (
    <>
      {/* A cream card on a cream page read as part of the layout and got
          scrolled straight past. Dimming everything behind it is what makes it
          register as a popup at all; tapping the dimmed area is the same as
          "Not now". */}
      <div
        onClick={() => hide(false)}
        aria-hidden="true"
        // Above the bottom nav (z-50), which would otherwise sit lit up on
        // top of the dimmed page.
        className="fixed inset-0 z-60 bg-black/60 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Install Patel Farsan"
        className="animate-fade-up fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-70 rounded-2xl border-2 border-gold bg-gradient-to-br from-maroon to-maroon-light p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] ring-4 ring-gold/20 md:inset-x-auto md:bottom-6 md:right-6 md:w-96"
      >
        <button
          onClick={() => hide(false)}
          aria-label="Close"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-cream/60 hover:bg-cream/10 hover:text-cream"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          {/* Cream tile behind the mark: it was drawn to sit on cream, not on
              maroon, and its cut-out edge disappears against the gradient. */}
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cream p-1 shadow-md ring-2 ring-gold/40">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={64}
              height={64}
              className="h-full w-full rounded-xl object-contain"
            />
          </span>
          <div className="min-w-0 pr-6">
            <p className="font-gujarati text-lg font-bold leading-tight text-cream">
              પટેલ ફરસાણ એપ ઉમેરો
            </p>
            <p className="font-serif text-sm font-semibold text-gold">
              Add Patel Farsan to your phone
            </p>
          </div>
        </div>

        {showIosHint ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-cream/90">
              Tap the <Share className="mx-0.5 inline h-4 w-4 text-gold" aria-label="Share" />{' '}
              button at the bottom of Safari, then choose{' '}
              <span className="font-bold text-gold">Add to Home Screen</span>.
            </p>
            {/* iOS tells a website nothing about what the customer did with
                that menu, so this button is the only way to stop asking. */}
            <button
              onClick={() => hide(true)}
              className="mt-4 w-full rounded-lg bg-gold py-3 text-base font-bold text-maroon shadow-md transition-colors hover:bg-gold-light"
            >
              I&apos;ve added it
            </button>
            <button
              onClick={() => hide(false)}
              className="mt-1 w-full py-2 text-sm font-semibold text-cream/70 hover:text-cream"
            >
              Maybe later
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-cream/90">
              Order in one tap next time — it opens like an app, and takes no space from the
              Play Store.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 rounded-lg bg-gold py-3 text-base font-bold text-maroon shadow-md transition-colors hover:bg-gold-light"
              >
                Install
              </button>
              <button
                onClick={() => hide(false)}
                className="rounded-lg px-4 py-3 text-sm font-semibold text-cream/70 hover:text-cream"
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
