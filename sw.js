// Treasured's service worker. Hand-rolled, no build-time framework: the asset list and the
// cache name are injected by scripts/build-sw.mjs after each build (spec §5.16.2).
// Everything Treasured needs is precached, so the app runs with the radio off, forever.
const VERSION = 'edbffba17f61';
const CACHE = 'treasured-' + VERSION;
const ASSETS = [
  "./",
  "./CNAME",
  "./assets/index-BjhUlyDp.js",
  "./assets/index-DIpN6enb.css",
  "./fonts/DMSans-Italic-VariableFont.woff2",
  "./fonts/DMSans-VariableFont.woff2",
  "./fonts/Fraunces-Italic-VariableFont.woff2",
  "./fonts/Fraunces-VariableFont.woff2",
  "./fonts/OFL-DMSans.txt",
  "./fonts/OFL-Fraunces.txt",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon.svg",
  "./manifest.webmanifest"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.startsWith('treasured-')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page asks for the new worker when the person taps Reload.
self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

// Cache first: an offline app should never wait on a network that may not be there.
// Navigations fall back to the cached shell, so any in-app route opens cold.
// `ignoreVary` matters: some static hosts answer with `Vary: Origin`, and without it a
// precached asset would never match the request the page actually makes.
const MATCH = { ignoreVary: true };

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./', MATCH).then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(
    caches.match(req, MATCH).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match('./', MATCH)))
  );
});
