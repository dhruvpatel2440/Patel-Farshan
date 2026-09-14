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
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const supported =
        'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

      if (!supported) {
        // iOS Safari hides PushManager entirely until the app is installed.
        return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
      }
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return 'unsupported'
      if (Notification.permission === 'denied') return 'denied'

      const subscription = await currentSubscription()
      if (!subscription || Notification.permission !== 'granted') return 'off'

      // Re-send it on every visit. Cheap, and it repairs the row if it was
      // cleaned up server-side or this phone changed hands between accounts.
      fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      }).catch(() => {})
      return 'on'
    }

    check()
      .then((result) => {
        if (!cancelled) setState(result)
      })
      .catch(() => {
        if (!cancelled) setState('unsupported')
      })

    return () => {
      cancelled = true
    }
  }, [])

  /** Resolves to whether notifications ended up on. */
  const enable = useCallback(async () => {
    setBusy(true)
    try {
      // Registered here too, not just by the install prompt: that one only
      // registers in production, and this must work wherever it is offered.
      await navigator.serviceWorker.register('/sw.js')
      const registration = await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off')
        return false
      }

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
        // The phone would think it is subscribed while the server has no
        // record — undo it so the switch shows the truth.
        await subscription.unsubscribe()
        setState('off')
        return false
      }

      setState('on')
      return true
    } catch {
      setState('off')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    await forgetPushSubscription()
    setState('off')
    setBusy(false)
  }, [])

  return { state, busy, enable, disable }
}
