/*
 * Patel Farsan service worker — deliberately minimal.
 *
 * Its job is to make the site installable and to show something friendlier
 * than the browser's dinosaur when a customer loses signal mid-order. It does
 * NOT cache pages, JavaScript or images: a stale hashed chunk served after a
 * deploy is how PWAs end up as a white screen nobody can clear, and no amount
 * of offline browsing is worth that on a shop whose prices and stock change.
 *
 * So: every request goes to the network. Only a failed *navigation* falls back
 * to the cached offline page.
 */

const CACHE = 'patel-farsan-v1'
const OFFLINE_URL = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Anything that isn't a page load is left entirely alone.
  if (request.method !== 'GET' || request.mode !== 'navigate') return

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL)
      return (
        cached ??
        new Response('You are offline.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        })
      )
    })
  )
})

/*
 * Push notifications. The server sends { title, body, url, tag }; this is what
 * turns that into a notification in the phone's tray, even with the app
 * closed.
 */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Patel Farsan'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      // The small status-bar icon. Android draws only its alpha channel, which
      // is why this is a white silhouette and not the full-colour logo.
      badge: '/icons/badge-96.png',
      tag: data.tag,
      // A replaced notification (same tag) should still buzz — "out for
      // delivery" matters as much as "confirmed" did.
      renotify: Boolean(data.tag),
      vibrate: [120, 60, 120],
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Reuse an open window of the app instead of stacking a new one.
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return client.navigate(target).then((c) => (c || client).focus())
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
