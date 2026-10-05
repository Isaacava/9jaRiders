# Performance, offline play and online lag

## What was slowing the game (and what changed)

| Problem | Effect | Fix |
|---|---|---|
| Every rider/bike was ~100 / ~80 separate meshes (8 racers = ~1,400 draw calls) | CPU-bound stutter on phones | `models/merge.ts` merges static parts per material: ~23 per rider, ~28 per bike, ~6 per car (about 400 total) |
| Smooth meshes were generated in the browser at launch | 1-3 s freezes per mesh on weak phones | Baked once into `public/models/pack.<hash>.bin` (1.5 MB gzip) by `npm run bake`; the browser only decodes it |
| Same quality for every device (DPR 2, 2048 shadows, MSAA, 420 m fog) | GPU-bound lag | `quality.ts`: auto Low/Medium/High from RAM, cores, GPU and Save-Data, plus a live resolution governor and 30 fps cap on Low. HUD button `GFX` cycles Auto/Low/Medium/High |
| Home-screen demo ran a full 8-racer race behind the menu | Wasted GPU/CPU | Demo = 3 CPU racers, Low tier, 30 fps |
| Cars were built and thrown away while racing | GC + upload hitches | Pooled; shaders pre-compiled before the race starts |
| IK allocated vectors every frame for 8 racers | GC stutter | Zero-allocation IK, re-solved only when steering changes; far CPU riders update 1 frame in 3 |
| GL contexts were not released | Garage <-> race slowdowns | `forceContextLoss()` on teardown |

## Online (multiplayer)

* **Client-side prediction**: your own bike now responds instantly; the server state only corrects it gently (no rubber-banding, verified in a 40-600 ms latency simulation).
* **Other riders** are dead-reckoned from the last update, so 20 Hz updates look fluid.
* **Compact updates**: during a race the server sends ~10x smaller `room:snap` deltas (full state once a second). Lobby/finished rooms no longer broadcast 20x/second.
* **Input is sent only when it changes** (plus a 0.4 s heartbeat).
* Heartbeat (ping/pong) drops dead mobile connections; the HUD shows live ping.
* The home page pre-wakes the server so the first multiplayer click is not a cold start.

### Hosting the realtime server (biggest remaining factor)
1. **Free hosting sleeps** (Render free spins down after ~15 min idle: 30-60 s cold start). Use an always-on instance (Render paid, Fly.io, Railway) or an uptime pinger on `/health`.
2. **Region matters more than code.** From Lagos pick the closest region: Africa (Johannesburg / Cape Town) first, otherwise Europe (London / Frankfurt). Check the in-game PING: under 90 ms is great, over 180 ms will feel slow in any game.
3. Keep rooms to <= 8 players per server process; scale by running more instances.

## Offline play
* `public/sw.js` + `manifest.webmanifest` make the game installable (Add to Home Screen) and playable offline.
* On the first online visit the page pre-downloads every route, script chunk and the model pack (home screen shows PREPARING OFFLINE, then WORKS OFFLINE).
* Solo races, garage and settings work with no connection. Multiplayer shows an offline notice.
* Cached assets are content-hashed; pages use network-first with a 3 s timeout, so a slow connection falls back to the cached copy instantly. Bump `VERSION` in `sw.js` and `PwaRegister.tsx` to force a refresh.

## Developer checklist
* After changing anything in `src/game/models/*Shape.ts` run `npm run bake` and commit `public/models/*`.
* Keep `NET_BASE` in `threeRace.ts` equal to `BASE_SPEED` in `server/src/room.ts`.
* Test on a real low-end Android phone with `GFX LOW` and `GFX AUTO`; watch PING in multiplayer.
