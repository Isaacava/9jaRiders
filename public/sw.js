/* Aboki Riders service worker: offline play + fast loads.
   - /_next/static/*, model pack, icons: cache-first (immutable, content-hashed)
   - pages: network-first with a short timeout, so a slow connection falls back to the cached copy instantly
   - everything else same-origin: stale-while-revalidate
   Bump VERSION to force clients to drop old caches. */
const VERSION = "aboki-v8";
const SHELL = VERSION + "-shell";
const RUNTIME = VERSION + "-runtime";
const ROUTES = ["/", "/play", "/garage", "/multiplayer", "/story", "/story/mission1"];
const CORE = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/models/pack.json"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.allSettled([...ROUTES, ...CORE].map((u) => cache.add(new Request(u, { cache: "reload" }))));
    try {
      const man = await (await fetch("/models/pack.json", { cache: "no-cache" })).json();
      await cache.add(new Request("/models/" + man.file, { cache: "reload" }));
    } catch (e) { /* offline install: the pack is picked up later by WARM */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const putSafe = async (cacheName, req, res) => {
  if (!res || !res.ok || res.type === "opaque") return;
  try { await (await caches.open(cacheName)).put(req, res.clone()); } catch (e) { /* quota */ }
};
const lookup = (req, ignoreSearch) => caches.match(req, { ignoreSearch: !!ignoreSearch, ignoreVary: true });

async function cacheFirst(req) {
  const hit = await lookup(req);
  if (hit) return hit;
  const res = await fetch(req);
  putSafe(RUNTIME, req, res);
  return res;
}

async function networkFirst(req, ms, ignoreSearch) {
  const net = fetch(req).then((res) => { putSafe(RUNTIME, req, res); return res; });
  net.catch(() => {});
  const hit = await lookup(req, ignoreSearch);
  if (!hit) return net.catch(async () => (await lookup(new Request("/"))) || Response.error());
  try {
    const res = await Promise.race([net, new Promise((r) => setTimeout(() => r(null), ms))]);
    return res || hit;
  } catch (e) { return hit; }
}

async function staleWhileRevalidate(req) {
  const hit = await lookup(req);
  const net = fetch(req).then((res) => { putSafe(RUNTIME, req, res); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.startsWith("/_next/static/") || p.startsWith("/icons/") || /^\/models\/pack\..+\.bin$/.test(p)) { event.respondWith(cacheFirst(req)); return; }
  if (p === "/models/pack.json" || p === "/manifest.webmanifest") { event.respondWith(networkFirst(req, 2500, false)); return; }
  if (req.mode === "navigate") { event.respondWith(networkFirst(req, 3000, true)); return; }
  event.respondWith(staleWhileRevalidate(req));
});

// The page asks us to pre-download everything the game needs for offline play.
async function warm(urls, client) {
  const cache = await caches.open(RUNTIME);
  const all = new Set(urls);
  // expand page routes: discover the script/style/font chunks their HTML references
  for (const u of urls) {
    if (!ROUTES.includes(u)) continue;
    try {
      const html = await (await fetch(u, { cache: "reload" })).text();
      for (const m of html.matchAll(/(?:\/_next\/)?static\/[A-Za-z0-9_\-./%~]+\.(?:js|css|woff2?|png|svg|webp)/g)) {
        all.add(m[0].startsWith("/_next/") ? m[0] : "/_next/" + m[0]);
      }
    } catch (e) { /* ignore */ }
  }
  try {
    const man = await (await fetch("/models/pack.json", { cache: "no-cache" })).json();
    all.add("/models/pack.json"); all.add("/models/" + man.file);
  } catch (e) { /* ignore */ }
  const list = [...all];
  let done = 0, fail = 0;
  const post = (type) => client && client.postMessage({ type, done, fail, total: list.length });
  for (let i = 0; i < list.length; i += 5) {
    await Promise.all(list.slice(i, i + 5).map(async (u) => {
      try {
        const req = new Request(u, { cache: "reload" });
        if (await caches.match(req, { ignoreVary: true }) && /^\/(_next\/static|models\/pack\..+\.bin)/.test(u)) { done++; return; }
        const res = await fetch(req);
        if (res.ok) { await cache.put(req, res.clone()); done++; } else fail++;
      } catch (e) { fail++; }
    }));
    post("WARM_PROGRESS");
  }
  post("WARM_DONE");
}

self.addEventListener("message", (event) => {
  const d = event.data || {};
  if (d.type === "SKIP_WAITING") self.skipWaiting();
  if (d.type === "WARM") event.waitUntil(warm(Array.isArray(d.urls) ? d.urls : ROUTES, event.source));
});
