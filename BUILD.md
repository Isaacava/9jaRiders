# Build log

## v7 performance, offline, netcode
- Draw calls: static parts of riders/bikes/cars merged per material (about 1,400 -> 400 draw calls for 8 racers).
- Baked model pack (`npm run bake` -> public/models/pack.<hash>.bin, loaded by `loadPack.ts`): no mesh generation on the player's device.
- Graphics tiers + dynamic resolution + 30 fps cap on weak devices (`quality.ts`, HUD GFX button), cheaper home demo, pooled traffic, shader pre-compile, zero-allocation rider IK.
- Offline/PWA: service worker, manifest, icons, install + offline status, offline notice in the multiplayer lobby.
- Online: client-side prediction, interpolation/dead-reckoning, compact server snapshots, change-only inputs, ping HUD, heartbeat, server pre-wake. See docs/PERFORMANCE.md.

## v6 fixes + boost + Lagos
- FIX: arms/head were computed in world space, so they missed the grips whenever the bike root was moved/rotated (garage drag, every race frame). All rider maths is now in the rider group's local space; the rider also slides on the seat / leans in to keep both hands on the grips while steering.
- FIX: faces: real eyes (sclera + iris), brows, nose, lips, chin, ears. Hair caps/headwrap/headscarf now leave the face open (the old headscarf covered it).
- Shoes: boots or sneakers with sole, toe box, tongue, laces and side stripe on the foot bones.
- Boost: nitro hits harder (x1.32 top speed, x2.4 accel), drains slower, refills faster; BOOST PADS on the road (free 1.7 s burst), slipstream behind traffic refills nitro, bigger close-call / overtake / pickup rewards, speed-line overlay.
- Lagos: warm golden-hour sky + fog, yellow/black kerbs, pedestrian footbridges, danfo bus stops (Oshodi, Yaba, Ikeja...), kiosks (pure water, POS, suya, agege bread...), people on the pavements, green-white-green bunting + flags, lagoon bridge stretch (z -1800..-3000) with stilt houses, canoes and a cable-stayed pylon, Victoria Island glass towers, Lagos billboards.
- Sound (src/game/audio.ts, all synthesized): original Afrobeats groove that opens up with nitro, engine with gear shifts, wind, turbo, danfo/keke/truck horns, city ambience, conductor shouts via speech synthesis, countdown beeps, pickup/pad/crash/finish sfx. Mute button on the HUD (remembered).

## v4 characters, hands, bars, camera
- 8 unique African riders (main/Mazi, ada, kobby, tobi, ngozi, emeka, zainab, chidi): different builds (std/tall/stocky/slim), skin tones, hair (afro, braids, cap, fade, gele headwrap, headscarf, locs), outfits (dashiki, crop jacket, Ankara print, Super-Eagles green/white, leather).
- CPU racers are now all different characters (shuffled, never the player's own); server allow-list updated.
- Hands: real fingers + thumb wrap the grips and follow steering.
- Handlebars: clip-ons (sport/cafe) or risers + bar, grips with end caps, throttle/switch housings, brake/clutch levers, mirrors, dash pod, top clamp.
- Camera (Asphalt-style chase cam): behind/above the bike, bike in the lower part of the frame, looks far down the road so traffic ahead is visible, tracks sideways (clamped to the tarmac) so edge lanes stay framed, portrait/landscape-aware FOV.

## v3 smooth models
- Riders, bikes and traffic are no longer stacks of cylinders/spheres/rounded boxes.
- New `src/game/models/sdf.ts`: signed-distance shapes + smooth blending + surface-nets mesher (the runtime equivalent of Blender Skin + Subdivision).
- Riders (`riderShape.ts`, `rider.ts`): ONE continuous smooth body per body type, a 17-bone armature, automatic skin weights, clothing colour zones baked into vertex colours, IK for legs/arms. `main` = afro/beard/dashiki man, `ada` = purple-afro/yellow-crop-jacket woman (from the character art); `kobby` (braids) and `tobi` (cap) share the same body system.
- Bikes (`bikeShape.ts`, `bike.ts`): tank, tail, fairing, fenders, seat and engine are sculpted blended meshes (cached per style).
- Traffic (`trafficShape.ts`, `traffic.ts`): danfo, sedan, SUV, keke and truck are smooth bodies with wheel arches and baked window/trim colours; wheels use rounded lathe tyres.
- Riders slide forward up to 12 cm on the seat if the handlebars are out of reach, so hands always meet the grips.
- Meshes are generated in the browser on first use and cached (about 0.1-0.4 s per body/bike/car type).

## v2 rebuild
- Replaced the broken 3dassets.dev / GLB / Phaser pipeline with fully procedural 3D (bikes, riders, traffic, world).
- New race engine, chase camera rig, CPU AI, traffic, nitro pickups, results screen.
- New garage preview (bike + rider together, drag to rotate).
- Removed dead code: asset cache, manifest, packs, service worker, SVG assets, old Phaser game.

## Known limits / next steps
- Multiplayer renders server state (lane + distance); server does not simulate traffic or items yet.
- Road is straight; curves/hills are the next big realism step.
- For hero-quality characters, sculpt in Blender (see build_characters.py from the design chat) and load the glTF with GLTFLoader in `src/game/models/racer.ts`.
- Add MongoDB persistence and leaderboards on the server.
