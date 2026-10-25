// Habitable service worker: the app opens with no signal (basements, stairwells), using what this phone
// has already loaded. The case itself lives in IndexedDB; this only keeps the app's pages and code.
// Network first for pages (fresh when online), cache first for hashed static files, never for /api.
const VERSION = "v2"; // bump when a file under the same URL changes (v2: real sample photos)
const STATIC = `habitable-static-${VERSION}`;
const PAGES = `habitable-pages-${VERSION}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(PAGES).then((cache) => cache.addAll(["/", "/notice", "/heat", "/landlord", "/ask", "/next-steps", "/how-it-works"])).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("habitable-") && k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Content-hashed build output, fonts and sample images: cache first (bump VERSION if one changes under its URL).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/samples/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(STATIC).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // Pages and their RSC payloads: network first, then the last copy, then the home page shell.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req)) || (req.mode === "navigate" && (await caches.match("/"))) || Response.error()),
  );
});
