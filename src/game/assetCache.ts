import { ASSET_PACKS, type AssetPackId } from "./assetPacks";

const CACHE_NAME = "aboki-riders-assets-v1";

export async function isAssetCached(url: string) {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  const cache = await caches.open(CACHE_NAME);
  return Boolean(await cache.match(url));
}

export async function cacheAssetPack(packId: AssetPackId) {
  if (typeof window === "undefined" || !("caches" in window)) return false;

  const pack = ASSET_PACKS.find((candidate) => candidate.id === packId);
  if (!pack) throw new Error(`Unknown asset pack: ${packId}`);

  const cache = await caches.open(CACHE_NAME);
  const urls = [...pack.preload, ...pack.optional];

  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "force-cache" });
        if (response.ok) await cache.put(url, response.clone());
      } catch {
        // A failed optional asset should not block the race.
      }
    })
  );

  return true;
}

export async function getAssetPackStatus(packId: AssetPackId) {
  const pack = ASSET_PACKS.find((candidate) => candidate.id === packId);
  if (!pack) throw new Error(`Unknown asset pack: ${packId}`);

  const allUrls = [...pack.preload, ...pack.optional];
  const cached = await Promise.all(allUrls.map(isAssetCached));
  const cachedCount = cached.filter(Boolean).length;

  return {
    packId,
    total: allUrls.length,
    cached: cachedCount,
    complete: cachedCount === allUrls.length
  };
}
