/* Anime Wiki — Service Worker (v2)
 *
 * Goals:
 *   • App-shell precache (HTML manifest + favicon only — NEVER cache hashed
 *     JS/CSS chunks because their hashes change on every deploy and stale
 *     cache + new index.html = MIME mismatch / blank screens).
 *   • Stale-while-revalidate cache for AniList/Jikan/Supabase image CDNs.
 *   • Network-first for API + auth routes (so users never see stale data).
 *   • Network-first for HTML routes (so deploys take effect immediately).
 *
 * The version constant is bumped on every deploy by the prerender script —
 * old caches are evicted on activate.
 */

const VERSION = 'animewiki-v2.1.0'
const SHELL_CACHE = `${VERSION}-shell`
const IMAGE_CACHE = `${VERSION}-img`
const RUNTIME_CACHE = `${VERSION}-runtime`

// Only precache things that DON'T have hash-based filenames so we don't have
// to update this list on every deploy.
const SHELL_ASSETS = ['/favicon.svg', '/manifest.webmanifest']

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

  // CRITICAL: Never intercept hashed assets / JS / CSS / sourcemap. Let the
  // browser fetch them directly so chunk hashes always resolve against the
  // current deploy. Without this, a stale SW will serve old chunks and the
  // new index.html will reference chunks the SW doesn't have → MIME error.
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.map')
  ) {
    return // browser handles it directly
  }

  // Never cache cross-origin POSTs/auth/realtime/anything from Supabase realtime.
  if (url.pathname.startsWith('/api/')) {
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
    /\.(png|jpe?g|webp|svg|gif|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE))
    return
  }

  // Same-origin HTML routes — NETWORK-FIRST so deploys are instant.
  if (url.origin === location.origin) {
    event.respondWith(networkFirst(req, SHELL_CACHE))
  }
})

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(req)
    if (response.ok && response.type === 'basic') {
      cache.put(req, response.clone())
    }
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
  } else if (event.data === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    )
  }
})
