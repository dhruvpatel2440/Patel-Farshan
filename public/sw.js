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
