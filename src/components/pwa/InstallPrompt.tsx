'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Share, X } from 'lucide-react'

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
    <div
      role="dialog"
      aria-label="Install Patel Farsan"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border-2 border-gold/40 bg-cream p-4 shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:w-96"
    >
      <button
        onClick={() => hide(false)}
        aria-label="Close"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-200 hover:text-maroon"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-xl border border-gold/30"
        />
        <div className="min-w-0 pr-6">
          <p className="font-gujarati text-base font-bold leading-tight text-maroon">
            પટેલ ફરસાણ એપ ઉમેરો
          </p>
          <p className="font-serif text-sm font-semibold text-maroon/70">
            Add Patel Farsan to your phone
          </p>
        </div>
      </div>

      {showIosHint ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Tap the <Share className="mx-0.5 inline h-4 w-4 text-maroon" aria-label="Share" />{' '}
            button at the bottom of Safari, then choose{' '}
            <span className="font-semibold text-maroon">Add to Home Screen</span>.
          </p>
          {/* iOS tells a website nothing about what the customer did with that
              menu, so this button is the only way to stop asking them. */}
          <button onClick={() => hide(true)} className="btn-primary mt-3 w-full justify-center">
            I&apos;ve added it
          </button>
          <button
            onClick={() => hide(false)}
            className="mt-1 w-full py-1.5 text-sm font-semibold text-stone-500 hover:text-maroon"
          >
            Maybe later
          </button>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Order in one tap next time — it opens like an app, and takes no space from the
            Play Store.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleInstall} className="btn-primary flex-1 justify-center">
              Install
            </button>
            <button
              onClick={() => hide(false)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-stone-500 hover:text-maroon"
            >
              Not now
            </button>
          </div>
        </>
      )}
    </div>
  )
}
