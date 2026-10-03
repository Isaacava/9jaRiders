# Build log

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
