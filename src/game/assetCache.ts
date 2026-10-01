import {
  ASSET_CACHE_VERSION,
  ASSET_PACKS,
  getAssetPack,
  type AssetPackId
} from "./assetPacks";

const CACHE_NAMESPACE = `aboki-riders-assets-v${ASSET_CACHE_VERSION}`;

function getPackCacheName(packId: AssetPackId, version: number) {
  return `${CACHE_NAMESPACE}-${packId}-v${version}`;
}

async function ensureServiceWorkerControl() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("caches" in window)
  ) {
    return false;
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    if (navigator.serviceWorker.controller) return true;

    await new Promise<void>((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        navigator.serviceWorker.removeEventListener("controllerchange", finish);
        resolve();
      };

      navigator.serviceWorker.addEventListener("controllerchange", finish);
      window.setTimeout(finish, 1500);
    });

    return Boolean(navigator.serviceWorker.controller);
  } catch {
    return false;
  }
}

async function isAssetCachedInPack(packId: AssetPackId, url: string) {
  if (typeof window === "undefined" || !("caches" in window)) return false;

  const pack = getAssetPack(packId);
  const cache = await caches.open(getPackCacheName(pack.id, pack.version));
  return Boolean(await cache.match(url));
}

export async function isAssetCached(url: string, packId: AssetPackId = "core") {
  return isAssetCachedInPack(packId, url);
}

export async function cacheAssetPack(
  packId: AssetPackId,
  options: { includeOptional?: boolean } = {}
) {
  if (typeof window === "undefined" || !("caches" in window)) {
    return { packId, cached: 0, failed: 0, total: 0 };
  }

  const pack = getAssetPack(packId);
  const urls = options.includeOptional
    ? [...pack.preload, ...pack.optional]
    : pack.preload;

  const cache = await caches.open(getPackCacheName(pack.id, pack.version));
  let cached = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-cache" });
      if (!response.ok) {
        failed += 1;
        continue;
      }

      await cache.put(url, response.clone());
      cached += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    packId,
    cached,
    failed,
    total: urls.length
  };
}

export async function prepareAssetPacks(packIds: AssetPackId[]) {
  await ensureServiceWorkerControl();

  const results = [];
  for (const packId of [...new Set(packIds)]) {
    results.push(await cacheAssetPack(packId));
  }

  return results;
}

export async function getAssetPackStatus(packId: AssetPackId) {
  const pack = getAssetPack(packId);
  const urls = [...pack.preload, ...pack.optional];
  const cached = await Promise.all(urls.map((url) => isAssetCachedInPack(packId, url)));

  const cachedCount = cached.filter(Boolean).length;

  return {
    packId,
    total: urls.length,
    cached: cachedCount,
    complete: cachedCount === urls.length
  };
}

export function getAssetCacheNamespace() {
  return CACHE_NAMESPACE;
}

export function getKnownAssetPackIds(): AssetPackId[] {
  return ASSET_PACKS.map((pack) => pack.id);
}
