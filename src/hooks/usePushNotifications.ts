'use client'

import { useCallback, useEffect, useState } from 'react'

export type PushState =
  /** Still checking — render nothing decisive yet. */
  | 'loading'
  /** This browser has no Web Push at all. */
  | 'unsupported'
  /** iPhone/iPad in Safari: push only exists once added to the home screen. */
  | 'needs-install'
  /** The customer blocked notifications; only browser settings can undo it. */
  | 'denied'
  | 'off'
  | 'on'

function isIos() {
  const ua = window.navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** The VAPID public key arrives base64url-encoded; PushManager wants bytes. */
function keyToBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = window.atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

/**
 * Set when the customer switches notifications off themselves. Without it,
 * the silent re-subscribe below would quietly turn them back on next visit,
 * since the browser permission is still "granted".
 */
const OPTED_OUT_KEY = 'pf-push-opted-out'
/** Tells every mounted copy of the hook (menu row, popup…) to re-check. */
const CHANGED_EVENT = 'pf:push-changed'

function optedOut() {
  try {
    return window.localStorage.getItem(OPTED_OUT_KEY) === '1'
  } catch {
    return false
  }
}

function setOptedOut(value: boolean) {
  try {
    if (value) window.localStorage.setItem(OPTED_OUT_KEY, '1')
    else window.localStorage.removeItem(OPTED_OUT_KEY)
  } catch {
    // Storage blocked: worst case, notifications come back on next visit.
  }
}

/**
 * Subscribes this device and saves it for the signed-in account. Needs the
 * permission to be granted already — it never asks.
 */
async function subscribeAndSave() {
  // Registered here too, not just by the install prompt: that one only
  // registers in production, and this must work wherever it is offered.
  await navigator.serviceWorker.register('/sw.js')
  const registration = await navigator.serviceWorker.ready

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    }))

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })
  if (!res.ok) {
    // The phone would think it is subscribed while the server has no record —
    // undo it so the switch shows the truth.
    await subscription.unsubscribe()
    return false
  }
  return true
}

let silentSubscribe: Promise<boolean> | null = null

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

/**
 * Call before signing out, so the next account to use this phone does not
 * receive the previous one's order updates. Never throws.
 */
export async function forgetPushSubscription() {
  try {
    if (!('serviceWorker' in navigator)) return
    const subscription = await currentSubscription()
    if (!subscription) return
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
    await subscription.unsubscribe()
  } catch {
    // Logging out matters more than tidying up a subscription.
  }
}

/**
 * Turns phone notifications on and off for the signed-in account. Only mount
 * it where someone is signed in — saving a subscription needs a session.
 *
 * Browsers never let a site switch notifications on without the person tapping
 * "Allow" once. So this does the next best thing: whenever permission is
 * already granted (allowed earlier, logged in again, reinstalled) it
 * subscribes silently, unless the customer turned notifications off here.
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check(): Promise<PushState> {
      const supported =
        'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

      if (!supported) {
        // iOS Safari hides PushManager entirely until the app is installed.
        return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
      }
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return 'unsupported'
      if (Notification.permission === 'denied') return 'denied'
      if (Notification.permission !== 'granted') return 'off'

      const subscription = await currentSubscription()
      if (!subscription) {
        if (optedOut()) return 'off'
        // The menu row and the popup can mount together; subscribe once.
        silentSubscribe ??= subscribeAndSave().finally(() => {
          silentSubscribe = null
        })
        return (await silentSubscribe) ? 'on' : 'off'
      }

      // Re-send it on every visit. Cheap, and it repairs the row if it was
      // cleaned up server-side or this phone changed hands between accounts.
      fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      }).catch(() => {})
      return 'on'
    }

    function run() {
      check()
        .then((result) => {
          if (!cancelled) setState(result)
        })
        .catch(() => {
          if (!cancelled) setState('unsupported')
        })
    }

    run()
    window.addEventListener(CHANGED_EVENT, run)
    return () => {
      cancelled = true
      window.removeEventListener(CHANGED_EVENT, run)
    }
  }, [])

  /** Asks for permission (must run from a tap). Resolves to whether it's on. */
  const enable = useCallback(async () => {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off')
        return false
      }

      setOptedOut(false)
      const ok = await subscribeAndSave()
      setState(ok ? 'on' : 'off')
      window.dispatchEvent(new Event(CHANGED_EVENT))
      return ok
    } catch {
      setState('off')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    setOptedOut(true)
    await forgetPushSubscription()
    setState('off')
    setBusy(false)
    window.dispatchEvent(new Event(CHANGED_EVENT))
  }, [])

  return { state, busy, enable, disable }
}
