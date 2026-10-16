# ABOKI RIDERS — PROJECT STATE (single source of truth)

Last updated: this session (v8). Paste this file into the project knowledge. Everything below reflects the code in `9jaRiders-v8-story.zip`.

---------------------------------------------------------------------

## 1. What the project is
**Aboki Riders** (repo `Isaacava/9jaRiders`) is a Nigerian (Lagos) street-racing / motorbike-delivery game that runs in the browser on phones.
* Stack: **Next.js 16 (App Router) + React 19 + three.js 0.186 + TypeScript**, a small **Node `ws` realtime server** (`server/`), deployed on **Vercel** (client) and **Render** (server).
* Everything visual is **procedural** (no downloaded models/textures/audio), so the game is small and can work **offline**.
* Modes: Free race (solo), Multiplayer (rooms, server-authoritative), Garage, **Story Mode: "The Last Delivery"**, home-screen demo race.

## 2. Owner requirements and preferences (the "memory")
* Audience: Nigerian / Lagos players on **low-end Android phones**, often on slow data. Must feel smooth, play **offline**, and online must not lag.
* Look: realistic-feeling, clean modelling, **"no AI slop"**; characters must be **unique African characters** (hair, build, skin tone, outfits: dashiki, ankara, gele, kaftan, Super-Eagles green...). Two original character images (dashiki man with afro/beard/gold glasses; woman with purple afro/yellow crop jacket/white shorts) are the reference for `main` and `ada`.
* Bikes/traffic/world must look sculpted, not boxes: smooth riders, bikes, danfos, keke, trucks; handlebars/hands must be detailed and connected.
* Camera: like **Asphalt Nitro**: behind/above, bike low in frame, road ahead visible, follows to the edge lanes, works in portrait.
* Controls: left/right must respond instantly and be **wide, easy to hit**.
* Feel: **Lagos vibes** (environment, sounds, Afrobeats, horns, danfo conductors), **more boost**, **night, rain and other weather**, **maps that are not straight lines** (real Lagos routes).
* Story: **"ABOKI RIDERS: THE LAST DELIVERY"**: more mystery, more Lagos, emotional reason to keep riding; **cutscenes**, playable **offline**, new map sections. The owner's full outline is implemented (see section 7) with extra connective tissue added.
* Workflow notes: the owner tests on a real phone via Vercel and sends screenshots; earlier plan for Blender-quality sculpting exists as `build_characters.py` (not part of the game).

## 3. Version history (what was built, in order)
1. v1–v2 base game (Phaser -> rebuilt in three.js, procedural everything).
2. Blender script (`build_characters.py`) + web previews for realistic character plan.
3. **v3 smooth models**: SDF + surface-nets mesher, single skinned rider body on a 17-bone rig, sculpted bike bodywork, smooth traffic.
4. **v4**: 8 unique riders (builds: std/tall/stocky/slim; hair: afro/braids/cap/fade/gele/headscarf/locs), fingers on grips, detailed handlebars, camera rework.
5. **v5**: Asphalt-style chase camera (portrait aware, edge-lane tracking).
6. **v6**: arms/head fixed (all rider maths in LOCAL space), faces (eyes/brows/nose/lips/ears), shoes, boost economy + boost pads + slipstream, Lagos world pass (kerbs, footbridges, bus stops, kiosks, bunting, lagoon bridge, skyline), procedural audio.
7. **v7 performance/offline/netcode**: mesh merging, baked model pack, graphics tiers + dynamic resolution, pooled traffic, PWA/service worker, client-side prediction + compact snapshots.
8. **v8 (this version)**: sky fix, wide split-screen touch steering with snappy physics, **winding Lagos routes (7 maps)**, **weather + time of day**, **story mode** (21 cutscenes, 12 missions), standing characters, cutscene director, mission rules engine, offline story.

## 4. Architecture in one page
* **Track space vs world space.** All gameplay (physics, AI, collisions, traffic, pads) stays in straight "track space" (`x` lateral, `dist` forward). `track.ts` maps that onto a winding route with elevation. `world.ts` builds scenery along a straight road and `trackMesh.bendWorld()` re-places every instance/mesh/line on the route (hides scenery that would fold through the inside of a curve or sit under a flyover). Racers, traffic, pickups, pads and the camera are placed with `track.at(dist, x, y)`.
* **Models are generated, then baked.** `sdf.ts` blends capsules/ellipsoids/boxes into one smooth mesh (surface nets). `scripts/bake-models.ts` bakes riders/bikes/cars into `public/models/pack.<hash>.bin`; the browser only decodes it (`pack.ts`, `loadPack.ts`) so low-end phones never run the mesher (falls back to generating if the file is missing).
* **Rider rig.** One skinned body per (gender, build), 17 bones, auto skin weights, clothing colours as vertex colours per look. `rider.ts` seats the rider on the bike with two-bone IK in the rider group's local space; the rider slides on the seat / leans in to keep hands on the grips. `dress.ts` adds face/hair/shoes. `character.ts` reuses the same body for standing cutscene actors.
* **Weather.** `weather.ts`: 5 times x 5 weathers. Controls sky texture (stars+moon at night), fog, hemisphere/sun, exposure, lit windows, lamp glow, wet road, headlight beams, rain streaks (`Rain`), lightning + thunder. Story missions can change it mid-race (`comms[].env`).
* **Quality.** `quality.ts` picks low/medium/high from RAM/cores/GPU/save-data (HUD "GFX" button to override), adjusts pixel ratio live, caps weak phones to 30 fps.
* **Audio.** `audio.ts`: everything synthesized (no samples). Music modes: groove / tense / calm / off.
* **Story engine.** `story/script.ts` (data) + `story/mission.ts` (rules, pure) + `story/cutscene.ts` (3D director) + `story/stages.ts` (sets) + `components/StoryApp.tsx` (flow, saves). Missions run inside `threeRace.ts` via a `Host` interface.
* **Offline.** `public/sw.js` (cache-first static, network-first pages with 3 s timeout, WARM message to pre-download), `manifest.webmanifest`, icons, `PwaRegister.tsx`. Story saves in `localStorage` (`aboki:story:v1`).
* **Netcode.** Server 20 Hz authoritative sim; compact `room:snap` deltas + full state each second; client predicts the local bike and dead-reckons the others; input only sent on change; ping/pong + heartbeat; pre-wake of the Render server.

## 5. Maps (`maps.ts`)
`ojuelegba` (mainland, flyover), `surulere` (market, tight turns), `third_mainland` (bridge over water), `lekki` (island, Link-bridge pylon), `vi_strip` (nightlife neon), `apapa` (port: containers, cranes), `citywide` (all themes, 6.2 km, final ride). Each: segments (length, curvature, rise), themes per section, water ranges. Multiplayer forces `third_mainland` at exactly 5000 m to match the server.

## 6. Story sequence (play order)
Ch1 ₦30,000: `cracked_screen` -> **M1** -> `who_send_you`
Ch2 The Money: `morning_after`, `seyi_arrives` -> **M2** (race) -> `word_dey_go_round` -> **M3**
Ch3 Who Is Boss?: `who_is_boss` -> **M4** -> `boss_garage`
Ch4 Boss' Rider: `upgrades` -> **M5**, **M6** (race) -> `blue_helmet_teaser`
Ch5 The Blue Helmet: `nobody_talk` -> **M7** (follow) -> `zara`
Ch6 Who Is Aboki?: `baba_tells` -> **M8** (race) -> `seyi_secret`
Ch7 Everything Connects: `hidden_compartment`
Ch8 The OS: `os_lounge` -> **M9** (escape)
Ch9 Betrayal: `spanner` -> **M10** (escape, storm)
Ch10 Boss vs Aboki: `boss_vs_aboki`, `kelechi_bike`
Final: `ships_sleep` -> **M11 THE LAST DELIVERY** (citywide, no countdown, weather changes, allies join, roadblocks, shortcuts)
The End: `the_end` -> **M12** (proper race with Seyi) -> `last_scene` (credits + UNKNOWN message).
Connective tissue added to the owner's outline: the caller's voice is Boss; the first bag holds half a brass key (Baba keeps it; the other half is in the father's bike); the father's whistled tune (motif) recurs; Kelechi's slips ("Spanner" nickname, spanner engraved K.O.); Seyi's brother Tunde; Titi (Aboki's sister) as the emotional stake; Boss uses "Flash" (father's nickname) on the first delivery as a test.
Mission types: `deliver` (time + package integrity), `race` (needPlace), `follow` (stay near the leader), `escape` (pursuers, roadblocks), `final`. Roles: racer / pursuer / leader / ally / watcher.
Editing the story = edit only `src/game/story/script.ts` (+ `SPEAKERS` in `types.ts`). Run the validity checks described in section 9 after edits.

## 7. How to run / build
```
npm install
npm run dev            # http://localhost:3000   (story at /story, free race /play)
npm run build
npm run bake           # re-generate public/models/pack.* after changing any *Shape.ts or RIDER_LOOKS body types
```
URL helpers (free race): `?map=apapa&time=night&weather=storm`. HUD buttons: sound toggle, GFX (quality), nitro/brake.
Server: `server/` (`npm run build && node dist/index.js`); see `docs/PERFORMANCE.md` for hosting advice (region near Lagos / Johannesburg, always-on).

## 8. Verification status — be honest about what is and is not proven
**Verified (in Node with a hand-written three.js stand-in; real code, not copies):**
* TypeScript passes (strict) for all game files against a stub of three.
* Route maths (`track.ts`): arc length exact, lateral offset exact, no map crosses itself (closest distant approach >= 190 m), net heading balanced.
* Bend pass: instances land exactly at `track.at()`, heading rotation correct, folded scenery hidden, roadside items under flyovers hidden, pads follow flyover height. All 7 maps build (full and 30% crowd).
* Rider rig for all looks incl. story cast: wrist-to-grip error <= 8 cm with the bike moved/rotated/steering at the extreme; characters (22 looks) pose/walk/sit/track the head without errors.
* Cutscene director: all 21 cutscenes run to completion when tapped through; camera values stay finite; script integrity (looks, bikes, maps, cast references, sequence) = 0 errors.
* Mission rules (`mission.ts`): simulated deliver / timeout / bag ruined / pursuer catch / race placement / follow / escape / final; balance tuned (time limits, pursuer closing, leader pace).
* Net prediction/reconciliation simulated at 40–600 ms: no backward jumps.
* Baked model pack decodes accurately; pack is 2.6 MB raw (about 1.6 MB gzip).
* Audio code runs against a fake AudioContext.
**NOT verified (needs a real browser / phone):**
* The actual look and feel (screens, framing, colours, shadows, rain/night appearance, cutscene staging).
* Real frame rate on low-end phones, memory, shader compile time.
* Service worker behaviour, install/offline in a real browser.
* **The engine frame loop under the Node harness was NOT actually exercised yet.** A harness bug (the stand-in renderer ignored my `setAnimationLoop` override, so the loop callback was never called) means earlier "ran thousands of frames" claims only prove that `createThreeRace` constructs without throwing for demo / free race / story missions. Fixing the harness and running the loop is the first item in "In progress".
* Sound quality/mix, Afrobeats loop taste, speech-synthesis voice availability.
* Multiplayer with a live server after the netcode changes (client + server must be deployed together).

## 9. Handy checks (reproducible)
The Node harness lives outside the repo (stand-in `mock3.js`, `hook.js`, tests `test*.js`). To re-create: compile the TS files with `tsc --target es2020 --module commonjs`, stub `three` with a Proxy that implements Vector3/Quaternion/Matrix4/Object3D/Bone, and replace `./merge` with a no-op. Tests written: rider IK, world builds, bend pass, route maths, character poses, cutscene director (fake DOM), mission simulations, story script validator, audio scheduler, net simulation.

## 10. In progress (at the moment this was written)
1. Fixing the Node harness so `setAnimationLoop` captures the real loop, then running the free race and each story mission for thousands of frames (countdown -> racing -> mission tick -> result card -> `onMissionEnd`). Any real runtime errors found there get fixed before shipping.
2. After that: review mission balance by feel on a phone (time limits, pursuer aggression, leader pace) and cutscene framing.

## 11. Known limitations / risks / ideas
* Cutscene staging uses procedural props and a few poses; faces are stylised. No lip-sync (talking is a gesture + nod).
* Story missions reuse a few maps; scenery density is lower on low tier.
* Speech-synthesis "conductor shouts" depend on the device voices.
* Story bike stats are the normal bikes (no separate upgrade shop yet); cash is cosmetic for now.
* Multiplayer uses a fixed 5 km course; no weather sync between players yet.
* Ideas: bike upgrade shop using story cash, photo mode, more maps (Ikorodu, Ajegunle), Yoruba/Igbo/Hausa dialogue toggle, ghost laps, daily challenges.

## 12. File inventory (auto-generated this session)
| File | Size | Purpose |
|---|---|---|
| `BUILD.md` | 44 lines | Per-version change log |
| `README.md` | 38 lines |  |
| `docs/ARCHITECTURE.md` | 6 lines | Original architecture notes |
| `docs/GAME_DESIGN.md` | 104 lines | Original game design notes |
| `docs/PERFORMANCE.md` | 38 lines | Performance + offline + netcode guide |
| `next.config.ts` | 17 lines |  |
| `package.json` | 27 lines |  |
| `public/icons/apple-touch-icon.png` | 6 KB |  |
| `public/icons/icon-192.png` | 7 KB |  |
| `public/icons/icon-512.png` | 19 KB |  |
| `public/icons/icon-maskable-512.png` | 18 KB |  |
| `public/manifest.webmanifest` | 23 lines | PWA manifest |
| `public/models/pack.6318019f.bin` | 2646 KB |  |
| `public/models/pack.json` | 1 lines |  |
| `public/sw.js` | 113 lines | Service worker (offline play, cache strategies, WARM message) |
| `scripts/bake-models.ts` | 38 lines | Bakes riders/bikes/cars into public/models/pack.<hash>.bin (run: npm run bake) |
| `scripts/tsconfig.bake.json` | 7 lines |  |
| `server/src/index.ts` | 162 lines | Realtime server: WebSocket, ping/pong, heartbeat, 20 Hz tick with compact snapshots |
| `server/src/room.ts` | 376 lines | Room + race simulation (authoritative), compact snapshot builder |
| `src/app/garage/page.tsx` | 5 lines | Garage route |
| `src/app/globals.css` | 1119 lines | All global CSS incl. offline pill, story screens, home buttons |
| `src/app/layout.tsx` | 29 lines | Root layout, PWA metadata (manifest, theme colour), mounts PwaRegister |
| `src/app/multiplayer/page.tsx` | 13 lines | Multiplayer route |
| `src/app/page.tsx` | 50 lines | Home page: demo race behind the menu, STORY MODE / RACE / GARAGE / MULTIPLAYER buttons |
| `src/app/play/page.tsx` | 22 lines | Free solo race route |
| `src/app/story/page.tsx` | 11 lines | Story mode route (renders StoryApp) |
| `src/components/GameCanvas.tsx` | 73 lines | React wrapper that boots the three.js race (solo / demo / multiplayer / story mission) |
| `src/components/Garage.tsx` | 109 lines | Garage UI (pick bike + rider) |
| `src/components/LoadoutPreview3D.tsx` | 100 lines | 3D preview in the garage (quality-tier aware) |
| `src/components/MultiplayerLobby.tsx` | 199 lines | Lobby UI (rooms, offline notice) |
| `src/components/PwaRegister.tsx` | 80 lines | Registers the service worker, pre-downloads the game for offline play, offline/install pill, pre-wakes the server |
| `src/components/StoryApp.tsx` | 174 lines | Story state machine: menu, chapter select, chapter cards, mission briefs, cutscene host, saves, cash |
| `src/game/audio.ts` | 356 lines | Procedural audio: Afrobeats groove, mood music, engine, horns, rain, thunder, siren, phone, whistle motif, speech-synth conductor shouts |
| `src/game/lagos.ts` | 320 lines | Lagos props: footbridges, bus stops, kiosks, pedestrians, bunting, lagoon+bridge, stilt houses, pylon, towers, boost pads |
| `src/game/loadout.ts` | 216 lines | Bikes, riders, difficulties, saved loadout |
| `src/game/maps.ts` | 64 lines | PURE: 7 Lagos map definitions (segments, themes per section, water ranges) |
| `src/game/models/bike.ts` | 302 lines | Bike assembly: smooth bodywork, wheels, forks, handlebars (clip-ons/risers), levers, mirrors, dash, headlight beam |
| `src/game/models/bikeShape.ts` | 83 lines | PURE: sculpted bike bodywork (tank, tail, fairing, fenders, seat, engine) |
| `src/game/models/character.ts` | 167 lines | Standing/sitting/walking cutscene characters: poses, walk cycle, talking/laughing, head tracking |
| `src/game/models/dress.ts` | 222 lines | Face, hair styles (afro, braids, locs, gele, headscarf, helmet, fila...), glasses, beard, shoes (shared by riders and cutscene characters) |
| `src/game/models/geo.ts` | 12 lines | MeshData -> three geometry |
| `src/game/models/loadPack.ts` | 23 lines | Fetches + installs the baked model pack in the browser |
| `src/game/models/merge.ts` | 70 lines | Merges static meshes per material (about 1,400 -> 400 draw calls) |
| `src/game/models/pack.ts` | 99 lines | PURE: encode/decode the baked model pack |
| `src/game/models/racer.ts` | 35 lines | buildRacer(bikeId, riderLookId): bike + rider group |
| `src/game/models/rider.ts` | 221 lines | Rider on a bike: skinned mesh, local-space IK (arms/legs), seat fitting, fingers on grips |
| `src/game/models/riderShape.ts` | 255 lines | PURE: rider body, 17-bone skin weights, 8 free-play + 15 story looks, clothing colour zones |
| `src/game/models/sdf.ts` | 159 lines | PURE: signed-distance shapes + smooth union + surface-nets mesher (runtime Blender-Skin equivalent) |
| `src/game/models/traffic.ts` | 81 lines | Traffic cars (danfo, sedan, SUV, keke, truck, police variant) with wheels and lights |
| `src/game/models/trafficShape.ts` | 109 lines | PURE: smooth car bodies with wheel arches and window/trim colours |
| `src/game/models/util.ts` | 59 lines | Small three helpers (materials, rods) |
| `src/game/multiplayer.ts` | 186 lines | Realtime client: compact snapshot decoding, ping/RTT, server pre-wake |
| `src/game/quality.ts` | 99 lines | Graphics tiers (auto/low/medium/high) + dynamic resolution governor + fps cap |
| `src/game/story/cutscene.ts` | 300 lines | Cutscene director: cameras with auto close-ups, typewriter dialogue, actors, fades, titles, rain/lightning |
| `src/game/story/mission.ts` | 189 lines | PURE: mission rules (deliver/race/chase/follow/escape/final, pursuers, allies, comms, integrity, time, shortcuts) |
| `src/game/story/save.ts` | 15 lines | Story save in localStorage |
| `src/game/story/script.ts` | 645 lines | ALL story content: 21 cutscenes, 12 missions, the play order (SEQUENCE) |
| `src/game/story/stages.ts` | 201 lines | 9 cutscene sets (yard, street, workshop, foodspot, club, roof, oldgarage, port, skyline) |
| `src/game/story/types.ts` | 81 lines | Story types (cutscene, shot, camera specs, mission config, speakers) |
| `src/game/threeRace.ts` | 946 lines | THE game engine: scene, route mapping, racers, traffic, pickups/pads, camera, HUD, controls, audio hooks, weather, story mission glue |
| `src/game/track.ts` | 90 lines | PURE: winding route maths (curvature, elevation, track-space to world-space frames) |
| `src/game/trackMesh.ts` | 127 lines | three: ribbon/wall meshes along the route + bendWorld() that lays straight-built scenery onto the curves |
| `src/game/weather.ts` | 224 lines | Time of day (dawn/day/golden/dusk/night) x weather (clear/haze/overcast/rain/storm): sky, fog, lights, rain, lightning, wet road, beams; lightingFor() for cutscenes |
| `src/game/world.ts` | 438 lines | Builds a map: ribbons (road/sidewalk/kerb), themed buildings, port containers, neon, lamps with night glow, palms, billboards, bends everything onto the route |

