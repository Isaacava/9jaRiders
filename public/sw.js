const CACHE_NAMESPACE = "aboki-riders-assets-v8";
const CACHE_PREFIX = `${CACHE_NAMESPACE}-`;
const EXTERNAL_CDN_ORIGIN = "https://cdn.3dassets.dev";
const EXTERNAL_BIKE_URLS = new Set([
  "https://cdn.3dassets.dev/assets/15423/v1/model.glb",
  "https://cdn.3dassets.dev/assets/15424/v1/model.glb",
  "https://cdn.3dassets.dev/assets/15428/v1/model.glb",
  "https://cdn.3dassets.dev/assets/15416/v1/model.glb",
  "https://cdn.3dassets.dev/assets/15415/v1/model.glb",
  "https://cdn.3dassets.dev/assets/34194/v1/model.glb",
  "https://cdn.3dassets.dev/assets/34283/v1/model.glb",
  "https://cdn.3dassets.dev/assets/32486/v1/model.glb",
  "https://cdn.3dassets.dev/assets/32490/v1/model.glb",
  "https://cdn.3dassets.dev/assets/32529/v1/model.glb",
  "https://cdn.3dassets.dev/assets/32487/v1/model.glb",
  "https://cdn.3dassets.dev/assets/34231/v1/model.glb",
  "https://cdn.3dassets.dev/assets/34323/v1/model.glb"
]);

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
  const sameOriginAsset = url.origin === self.location.origin && url.pathname.startsWith("/assets/");
  const externalBikeAsset = EXTERNAL_BIKE_URLS.has(request.url);
  const externalCdnAsset = url.origin === EXTERNAL_CDN_ORIGIN && url.pathname.startsWith("/assets/");
  if (request.method !== "GET" || (!sameOriginAsset && !externalBikeAsset && !externalCdnAsset)) return;
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