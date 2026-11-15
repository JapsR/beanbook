/* Beanbook offline support. The app shell is served from cache and refreshed in the
   background; the catalog is fetched fresh when online and falls back to the last copy. */
const CACHE = "beanbook-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const fresh = fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  });
  if (req.url.endsWith("catalog.json")) {
    e.respondWith(fresh.catch(() => caches.match(req)));
  } else {
    e.respondWith(caches.match(req).then(hit => { if (hit) { fresh.catch(() => {}); return hit; } return fresh; }));
  }
});
