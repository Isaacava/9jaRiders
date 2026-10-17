# Build log

## v10 bridge/road fix, GTA-style story destinations, faces
- FIX (the bridge bug): `trackMesh.ts` wound every ribbon/wall with ONE fixed triangle order, so road, sidewalks and kerbs faced DOWN and were back-face culled from above (and flyover walls only showed from one side / lit from below). Winding is now chosen per surface (up / down / left / right).
- Story missions (everything except proper races) no longer end on a finish line: `marker.ts` builds a GTA-style destination (glowing ring on the road, tall beam, floating diamond), the HUD shows a pin with metres to go, the bike rolls to a stop inside the ring, the screen fades and the cutscene starts (no result card on success; failures still get RETRY). `world.ts` takes `finishLine:false` to drop the banner/chequered line.
- Characters: head reshaped (narrower cranium, real jaw/chin, no moon-face), cheek blobs removed, eyelids, calmer brows tinted to the hair, smaller nose tip and lips; cutscene camera fill light so dark skin tones stay readable. Model pack re-baked (`pack.aed9f034.bin`), service worker cache `aboki-v10`.
- Story missions that shared a district now use route variants (`ojuelegba~m`, `apapa~r`, `vi_strip~rm`, `oshodi~r`): mirrored or driven the other way.
- NOT verified in a browser (no three.js / GPU in the build sandbox): look of the marker, face proportions, flyover shading.

## v9 finish pass: road, controls, voices, languages, sound, characters, new districts
- Road: kerb/bridge walls follow road height; `structure.ts` builds flyover retaining walls, piers, parapets, underside and ground shade; interpolated height + wheelbase grounding; blob contact shadows on every vehicle (all tiers).
- Controls: brake/nitro buttons were covered by the steering zone (fixed with z-index); steering ramp (55% instantly, full lock in ~0.1 s, fast recentre).
- Voices: `voice.ts` (device speech by gender/pitch/rate per character, synthesised offline voices, off), `audio.ts` radio chain + syllable synth.
- Languages: `story/lang.ts`, `story/cast.ts` (Yoruba/Igbo/Hausa/Pidgin per character, glossed).
- Mission sounds (start, win, fail, objective, warning ticks, package hit, ally, caught, roadblock, chapter).
- 6 new maps, 3 new themes, 3 new cutscene stages, 9 new looks, 11 new cutscenes + 5 missions (`story/script2.ts`), CAST + VOICES & LANGUAGE screens, save migration, cache v9.

## v8 sky, controls, Lagos routes, weather, STORY MODE
- Sky fix (dome scaled inside the camera far plane). Split-screen wide touch steering (instant response), brake/nitro buttons, snappier steering physics.
- Winding Lagos routes: `track.ts`, `maps.ts`, `trackMesh.ts` (ribbons + bend pass), 7 maps with themes (mainland, market, island, nightlife, port), flyovers, lagoon bridges.
- Weather + time of day (`weather.ts`): night, rain, storm, haze, overcast; lit windows, lamp glow, headlight beams, lightning, rain/thunder audio.
- Story mode "The Last Delivery": `story/` (script, mission rules, cutscene director, stages, save), `StoryApp.tsx`, `/story`. 21 cutscenes, 12 missions, standing characters (`character.ts`), 15 new looks, helmet/fila/kaftan.
- Offline: `/story` precached, cache version v8, model pack re-baked (new stocky female body).
- See docs/PROJECT_STATE.md for the full state, verification status and next steps.

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
