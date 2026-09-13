'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Share, X } from 'lucide-react'

/** Chrome's install event — still not in TypeScript's DOM lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pf-install-dismissed-at'
/** Asked once, then left alone for a month. */
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000
/** Long enough that the banner never lands mid-tap on a page just opened. */
const APPEAR_DELAY_MS = 4000

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own flag, which predates display-mode.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  const ua = window.navigator.userAgent
  // iPadOS 13+ reports itself as a Mac, so a touch-capable "Mac" is an iPad.
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/**
 * Offers to put Patel Farsan on the customer's home screen, and registers the
 * service worker that makes the site installable at all.
 *
 * Chrome hands us an install event we can trigger directly; iOS has no such
 * API, so there the banner explains the Share -> Add to Home Screen steps
 * instead of pretending a button will do it.
 */
export function InstallPrompt() {
  const pathname = usePathname()
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [visible, setVisible] = useState(false)

  // The shop owner does not need to be nagged to install their own admin.
  const onAdmin = pathname?.startsWith('/admin') ?? false

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // A failed registration costs the install prompt, nothing else — the
      // site works exactly as before, so there is nothing to tell the user.
    })
  }, [])

  useEffect(() => {
    if (onAdmin || isStandalone()) return

    const dismissedAt = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0)
    if (Date.now() - dismissedAt < SNOOZE_MS) return

    let timer: ReturnType<typeof setTimeout>

    function onBeforeInstallPrompt(event: Event) {
      // Stops Chrome's own mini-infobar so there is only one ask on screen.
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      timer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS)
    }

    function onInstalled() {
      setVisible(false)
      setInstallEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    if (isIos()) {
      setShowIosHint(true)
      timer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      clearTimeout(timer)
    }
  }, [onAdmin])

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setVisible(false)
  }

  async function handleInstall() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    // Chrome allows one prompt per event, so it is spent either way.
    setInstallEvent(null)
    setVisible(false)
  }

  if (!visible || onAdmin) return null

  return (
    <div
      role="dialog"
      aria-label="Install Patel Farsan"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border-2 border-gold/40 bg-cream p-4 shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:w-96"
    >
      <button
        onClick={dismiss}
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
          <button onClick={dismiss} className="btn-primary mt-3 w-full justify-center">
            Got it
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
              onClick={dismiss}
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
