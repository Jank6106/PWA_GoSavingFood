const CACHE_NAME = "gosavingfood-v4";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Preserve native byte-range responses. Never return HTML as a video fallback.
  if (event.request.destination === "video" || event.request.headers.has("range") || new URL(event.request.url).pathname.endsWith(".mp4")) return;
  // A saved homepage must not hide newly deployed CSS/JS from returning users.
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
      }
      return response;
    }).catch(async () => (await caches.match(event.request)) || (await caches.match("/")) || Response.error()));
    return;
  }
  // Missing images, fonts and scripts must never receive an HTML fallback.
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(event.request)) || Response.error()));
});


