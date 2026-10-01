# Aboki Riders — Production Asset Bible

## Visual target

Aboki Riders is a premium mobile arcade motorcycle racer with the energy, readability and spectacle of top mobile racers, while keeping its own Nigerian street-racing identity.

**Master style**

> Premium mobile arcade racing game asset, stylized semi-3D cel-shaded game art, bold readable silhouettes, crisp clean edges, controlled highlights, two-tone shadows, subtle ambient occlusion, vibrant Nigerian-inspired palette, polished commercial mobile-game quality, exaggerated but believable proportions, strong material separation, high visual clarity at small mobile screen sizes, consistent fictional game universe, no photorealism, no anime, no generic AI aesthetic, no watermark, no baked UI text.

For isolated assets add:

> Transparent background, centered object, full object visible, production-ready game sprite, no cropped parts.

## Production rules
- Generate assets as a cohesive family with matching proportions, camera, lighting and outline treatment.
- Prefer modular pieces over giant baked scenes.
- Keep gameplay-critical objects visually distinct.
- Final runtime files should be optimized WebP/PNG and packed into Phaser atlases.
- Do not bake UI text into reusable gameplay art.
- Do not reproduce another game's logos, vehicles, characters or proprietary artwork.

## Runtime folder contract

```
public/assets/
  brand/
  riders/
  bikes/
  traffic/
  road/
  buildings/
  props/
  powerups/
  vfx/
  ui/
  environments/
  animation/
```

## Status
Current gameplay art is prototype placeholder geometry. Generated production art will replace it without changing race rules.

## Bike family
AR-01 Hero — bikes/hero.webp
AR-02 Hero alternate — bikes/hero-red.webp
AR-03 Hero side reference — bikes/hero-side.webp
AR-04 Hero front reference — bikes/hero-front.webp
AR-16 Beginner — bikes/beginner.webp
AR-17 Speed — bikes/speed.webp
AR-18 Heavy — bikes/heavy.webp
AR-19 Elite — bikes/elite.webp
AR-20 Legendary — bikes/legendary.webp

**Bike generation script**
> Same exact motorcycle design language across the complete family. Premium Nigerian street-racing motorcycle, stylized semi-3D cel-shaded mobile arcade racer, aggressive but believable proportions, thick rear tire, readable mechanical details, clean fairings, controlled highlights, two-tone shadows, consistent rear three-quarter camera, transparent background, full motorcycle visible.

## Rider family
AR-05 Main — riders/main.webp
AR-06 Female — riders/female.webp
AR-07 Street — riders/street.webp
AR-08 Veteran — riders/veteran.webp
AR-09 CPU 01 — riders/cpu-01.webp
AR-10 CPU 02 — riders/cpu-02.webp
AR-11 CPU 03 — riders/cpu-03.webp
AR-12 CPU 04 — riders/cpu-04.webp
AR-13 CPU 05 — riders/cpu-05.webp
AR-14 CPU 06 — riders/cpu-06.webp
AR-15 CPU 07 — riders/cpu-07.webp

**Rider generation script**
> Stylized Nigerian motorcycle racer, premium semi-3D cel-shaded arcade-game character, modern motorcycle helmet, protective racing gear, distinctive color identity, exaggerated but believable proportions, energetic racing posture, consistent lighting and camera with the Aboki Riders bike family, transparent background.

Animation set: idle, accelerate, lean-left, lean-right, brake, nitro, pickup, crash, airborne, land, finish, victory, defeat.

## Traffic family
AR-21 Lagos danfo — traffic/danfo.webp
AR-22 Modern minibus — traffic/minibus.webp
AR-23 Keke — traffic/keke.webp
AR-24 Sedan — traffic/sedan.webp
AR-25 SUV — traffic/suv.webp
AR-26 Delivery van — traffic/van.webp
AR-27 Taxi — traffic/taxi.webp
AR-28 Police patrol — traffic/patrol.webp

**Traffic generation script**
> Fictional Nigerian urban traffic vehicle, premium stylized semi-3D arcade racing game asset, readable silhouette at mobile scale, rear three-quarter view, consistent lighting and proportions, subtle wear, transparent background.

Traffic should normally show 2–4 vehicles and 4–6 only on busier sections.

## Road modules
straight, curve-left, curve-right, hard-left, hard-right, intersection, bridge, tunnel-in, tunnel, tunnel-out, split, merge, speed, finish, shoulder.

**Road generation script**
> Modular Nigerian urban arcade motorcycle racing road segment, seamless-compatible geometry, clean asphalt, lane markings, roadside drainage and barriers where appropriate, readable racing line, consistent perspective and lighting, premium mobile game environment, no vehicles, no characters, no baked text.

## Buildings and props
Buildings: roadside shop, 2-floor house, apartment, unfinished building, mechanic workshop, fuel station, supermarket, market, bus stop, restaurant, warehouse, construction site, office block.

Props: roadside stall, market umbrella, chair, bucket, crate, tire stack, cooler, basket, sacks, pallet, waste bin, cone, barrier, utility pole, street lamp, blank billboard, street sign, palm tree, vegetation cluster, parked motorcycle.

**Prop generation script**
> Nigerian roadside environment prop, premium stylized semi-3D cel-shaded arcade racing game asset, clean silhouette, believable materials, simplified detail for mobile readability, consistent lighting, transparent background.

## Power-ups
AR-49 Nitro — powerups/nitro.webp
AR-50 Shield — powerups/shield.webp
AR-51 Surge x2 — powerups/surge.webp
AR-52 Mega Boost — powerups/mega.webp
AR-53 Repair — powerups/repair.webp
AR-54 Magnet — powerups/magnet.webp
Ghost and Traffic Clear are planned expansion items.

**Power-up generation script**
> Floating arcade-racing collectible, strong readable silhouette, glowing energy core, polished semi-3D cel-shaded mobile-game design, dramatic but controlled emissive glow, transparent background.

## VFX
Nitro flame, speed streaks, dust trail, tire smoke, sparks, shield bubble, multiplier burst, minor crash, major crash, collision impact, road splash, rain, fog.

**VFX generation script**
> Premium arcade racing VFX, clean layered shapes, strong motion direction, crisp edges, transparent background, designed to remain readable at mobile resolution, no photorealism.

## UI and race presentation
Finish arch, checkered flag, podium, Nitro button, Brake button, Steering controls, Pause button, rank badge.

UI should feel like a premium arcade racer rather than a generic dashboard.

## Brand and menus
Logo, app icon, loading artwork, main menu artwork, garage artwork, multiplayer lobby artwork, results artwork.

## Route sets
1. Ojuelegba → Yaba — roadside shops, danfos, concrete buildings, utility poles, moderate traffic.
2. Expressway Rush — barriers, bridge, skyline, fast racing line.
3. Market Dash — stalls, umbrellas, tighter road.
4. Night Run — streetlights, shops, illuminated vehicles.
5. Rain Rush — tropical rain, puddles, splashes and headlights.
6. Festival Ride — colorful banners and distant crowds.
7. Industrial Route — warehouses, construction and delivery traffic.
8. Coastal Route — tropical vegetation and open road.

## Animation contract
Every playable bike/rider combination:
idle, accelerate, lean-left, lean-right, brake, nitro, pickup, crash, airborne, land, finish, victory, defeat.

Traffic:
drive, lane-change, brake, impact.

Power-ups:
float, pulse, rotate, pickup, burst.

## Generation order
1. Hero bike + hero rider
2. Seven CPU riders and matching bikes
3. Traffic family
4. Power-ups
5. Road modules
6. Core buildings
7. Reusable props
8. VFX
9. UI
10. Menu/route key art
11. Animation sheets
12. Runtime optimization and atlas packing

## Integration rule
Gameplay must not depend on generated art being available. Phaser vector placeholders remain the fallback until each production asset exists.

## Data usage and caching

The game does **not** download the full asset library on every race.

### Pack strategy

- `core` is the small first-run race pack.
- Route packs are loaded when a route is first selected and then kept in browser cache.
- Extra rider and vehicle packs are optional.
- Phaser runtime references stable asset paths; the browser cache prevents repeat downloads.
- Multiplayer WebSocket traffic contains player/race state only. It never streams bike, rider, road or traffic artwork.

### Target experience

First visit downloads the minimum core pack. Later races reuse cached assets. A new route or cosmetic pack is downloaded once when first needed.

### Source-to-runtime pipeline

`licensed 3D source model → customize/livery → fixed camera render → optimized WebP/PNG → Phaser atlas → browser cache`

Characters and Aboki Riders-specific identity art use original generated 2D assets.

The exact final download size will be measured after the first production art pass; the size hints in `src/game/assetPacks.ts` are planning estimates only.


## First route visual-source ledger

For the first Lagos route, the source layer is intentionally separated from the Nigerian identity layer.

- **Motorcycles:** 3DAssets.dev CC0 motorcycle models can serve as render sources. The Road sportbike entry is individually downloadable and the pack contains 69 CC0 motorcycle/racing models. citeturn555274search1turn555274search0
- **Road foundations:** Kenney City Kit (Roads) is CC0 and contains modular 3D city-road pieces. citeturn239895view1
- **Building foundations:** Kenney City Kit (Suburban) and City Kit (Industrial) are CC0 sources for reusable buildings and industrial structures. citeturn906414search1turn906414search7
- **Sky/lighting reference:** Poly Haven assets are CC0; its sky assets can be used commercially. citeturn930999search0turn930999search1

The game should keep a copy of the source URL and license in the repository even when the final runtime art is rendered/modified.

## Production art pass — bike + rider family

The first production-ready runtime art pass is now integrated.

- Bike SVGs: `public/assets/bikes/starter.svg`, `speed.svg`, `heavy.svg`, `elite.svg`, `legendary.svg`.
- Rider SVGs: `public/assets/riders/main.svg`, `ada.svg`, `kobby.svg`, `tobi.svg`.
- Phaser loads these assets as the primary race visuals and keeps the existing vector geometry as a fallback.
- Garage previews use the same runtime art files, keeping selection and race presentation visually consistent.
- The SVGs are original lightweight vector artwork with transparent backgrounds; no external game artwork is embedded.
