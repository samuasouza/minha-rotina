const SHELL = "rotina-shell-v1"
const SHELL_URLS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/offline.html"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(SHELL_URLS)))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting()
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")))
    return
  }
  if (!SHELL_URLS.includes(url.pathname)) return
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)))
})
