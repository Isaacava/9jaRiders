const CACHE_NAMESPACE = "aboki-riders-assets-v6";
const CACHE_PREFIX = `${CACHE_NAMESPACE}-`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.filter((name) => name.startsWith("aboki-riders-assets-v") && !name.startsWith(CACHE_PREFIX)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith("/assets/")) return;
  event.respondWith((async () => {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      if (!name.startsWith(CACHE_PREFIX)) continue;
      const cached = await caches.open(name).then((cache) => cache.match(request));
      if (cached) return cached;
    }
    return fetch(request);
  })());
});