/* Lyric Drop service worker - makes the app work offline after the first visit.
 *
 * Same-origin GETs only. Pages are network-first (a new deploy shows straight away, the cached
 * copy is used when offline). Everything else (hashed JS/CSS, fonts, images) is
 * stale-while-revalidate. Bump CACHE_VERSION to drop old caches.
 * Uploaded files never touch this: they are blob: URLs inside the page.
 */
const CACHE_VERSION = 'v1'
const CACHE = `lyric-drop-${CACHE_VERSION}`
const APP_SHELL = ['/', '/manifest.webmanifest', '/favicon.png', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match(request) || await cache.match('/')
    if (cached) return cached
    throw error
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  const refresh = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)
  return cached || (await refresh) || Response.error()
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Never cache the service worker itself
  if (url.pathname === '/sw.js') return

  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : staleWhileRevalidate(request))
})
