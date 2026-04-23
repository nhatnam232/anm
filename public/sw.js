/* Anime Wiki — Service Worker
 *
 * Goals:
 *   • App-shell precache (HTML/CSS/JS)
 *   • Stale-while-revalidate cache for AniList/Jikan/Supabase image CDNs
 *   • Network-first for API + auth routes (so users never see stale data)
 *
 * The version constant is bumped on every deploy via the prerender script —
 * old caches are then evicted on activate.
 */

const VERSION = 'animewiki-v1.0.0'
const SHELL_CACHE = `${VERSION}-shell`
const IMAGE_CACHE = `${VERSION}-img`
const RUNTIME_CACHE = `${VERSION}-runtime`

const SHELL_ASSETS = ['/', '/favicon.svg', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => null)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Never cache cross-origin POSTs/auth/realtime/anything from Supabase realtime.
  if (url.pathname.startsWith('/api/')) {
    // Network-first for API routes (still cache fallback).
    event.respondWith(networkFirst(req, RUNTIME_CACHE))
    return
  }

  // Image CDNs — stale-while-revalidate
  if (
    url.hostname.endsWith('media.kitsu.io') ||
    url.hostname.endsWith('cdn.myanimelist.net') ||
    url.hostname.endsWith('s4.anilist.co') ||
    url.hostname.endsWith('img.anili.st') ||
    url.hostname.endsWith('cdn.jsdelivr.net') ||
    /\.(png|jpe?g|webp|svg|gif)$/i.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE))
    return
  }

  // Same-origin static assets — cache-first
  if (url.origin === location.origin) {
    event.respondWith(cacheFirst(req, SHELL_CACHE))
  }
})

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(req)
  if (cached) return cached
  try {
    const response = await fetch(req)
    if (response.ok) cache.put(req, response.clone())
    return response
  } catch {
    return cached || Response.error()
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(req)
    if (response.ok) cache.put(req, response.clone())
    return response
  } catch {
    const cached = await cache.match(req)
    return cached || new Response('Offline', { status: 503 })
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(req)
  const fetchPromise = fetch(req).then((response) => {
    if (response && response.ok) cache.put(req, response.clone())
    return response
  }).catch(() => cached)
  return cached || fetchPromise
}

// Allow page to ask SW to update immediately (used by PWAInstaller).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
