const CACHE_NAMESPACE = "aboki-riders-assets-v10";
const CACHE_PREFIX = `${CACHE_NAMESPACE}-`;
const RUNTIME_CACHE = `${CACHE_NAMESPACE}-runtime`;
const EXTERNAL_CDN_ORIGIN = "https://cdn.3dassets.dev";
const EXTERNAL_BIKE_URLS = new Set([
  "https://cdn.3dassets.dev/assets/15423/v1/model.glb",
  "https://cdn.3dassets.dev/assets/15424/v1/model.glb",
  "https://cdn.3dassets.dev/assets/15428/v1/model.glb",
  "https://cdn.3dassets.dev/assets/15416/v1/model.glb",
  "https://cdn.3dassets.dev/assets/15415/v1/model.glb",
  "https://cdn.3dassets.dev/assets/34194/v1/model.glb",
  "https://cdn.3dassets.dev/assets/34283/v1/model.glb",
  "https://cdn.3dassets.dev/assets/32490/v1/model.glb",
  "https://cdn.3dassets.dev/assets/32500/v1/model.glb",
  "https://cdn.3dassets.dev/assets/18680/v1/model.glb",
  "https://cdn.3dassets.dev/assets/34231/v1/model.glb",
  "https://cdn.3dassets.dev/assets/32529/v1/model.glb",
  "https://cdn.3dassets.dev/assets/32487/v1/model.glb",
  "https://cdn.3dassets.dev/assets/34231/v1/model.glb",
  "https://cdn.3dassets.dev/assets/34221/v1/model.glb",
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
  const sameOriginAssetApi = url.origin === self.location.origin && url.pathname === "/api/3dassets";
  const externalBikeAsset = EXTERNAL_BIKE_URLS.has(request.url);
  const externalCdnAsset = url.origin === EXTERNAL_CDN_ORIGIN && url.pathname.startsWith("/assets/");
  if (request.method !== "GET" || (!sameOriginAsset && !sameOriginAssetApi && !externalBikeAsset && !externalCdnAsset)) return;
  event.respondWith((async () => {
    const runtimeCache = await caches.open(RUNTIME_CACHE);
    const cached = await runtimeCache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      await runtimeCache.put(request, response.clone());
    }
    return response;
  })());
});