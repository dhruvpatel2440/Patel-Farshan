'use client'

import { useCallback, useEffect, useState } from 'react'

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

/** Shared with the install popup, so either one marks the same "done". */
const INSTALLED_KEY = 'pf-pwa-installed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorWithRelatedApps).standalone === true
  )
}

function isIos() {
  const ua = window.navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/**
 * Lets any page offer its own "Install App" row, independent of the one-time
 * install popup — for a customer who waved that away and wants it back later
 * instead of waiting for it to reappear.
 *
 * This one also has to *state* whether the app is installed, so a wrong answer
 * is visible rather than merely quiet. The stored flag alone is not enough: it
 * is also set when an iPhone customer taps "I've added it", and it survives a
 * later uninstall. So a `beforeinstallprompt` overrules it — Chrome withholds
 * that event entirely while the app is installed, which makes firing it proof
 * of the opposite. The stored flag stays untouched either way; it belongs to
 * the popup, and rewriting it here would start the popup asking again.
 */
export function usePwaInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    let alreadyInstalled = false
    try {
      alreadyInstalled = window.localStorage.getItem(INSTALLED_KEY) === '1'
    } catch {
      // Private mode with storage blocked — fall through to the live check.
    }
    if (alreadyInstalled || isStandalone()) setInstalled(true)
    setIos(isIos())

    // Captured before React hydrated, if Chrome fired it that early.
    const pending = (window as Window & { __pfInstallEvent?: BeforeInstallPromptEvent })
      .__pfInstallEvent
    if (pending) {
      setInstallEvent(pending)
      setInstalled(false)
    }

    // Chrome can confirm an install from an earlier visit, which is the only
    // way to know from an ordinary tab.
    const nav = window.navigator as NavigatorWithRelatedApps
    nav
      .getInstalledRelatedApps?.()
      .then((apps) => {
        // Only a positive result counts: an empty list is also what a browser
        // that cannot answer returns.
        if (apps.length > 0) setInstalled(true)
      })
      .catch(() => {})

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setInstalled(false)
    }
    function onInstalled() {
      setInstalled(true)
      setInstallEvent(null)
      try {
        window.localStorage.setItem(INSTALLED_KEY, '1')
      } catch {
        // Nothing to persist to; the live standalone check still catches it.
      }
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!installEvent) return 'unavailable' as const
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    // Chrome allows one prompt per event, so it is spent either way.
    setInstallEvent(null)
    if (outcome === 'accepted') {
      setInstalled(true)
      try {
        window.localStorage.setItem(INSTALLED_KEY, '1')
      } catch {
        // Harmless: worst case the button reappears next visit.
      }
    }
    return outcome
  }, [installEvent])

  return { installed, ios, canPrompt: installEvent !== null, promptInstall }
}
