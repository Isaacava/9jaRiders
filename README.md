# Aboki Riders (9ja Riders)

Mobile-first 3D Nigerian street-racing game. Next.js + React + TypeScript + Three.js, with a WebSocket multiplayer server (`server/`).

## What's in v2 (full rebuild of the 3D client)

- **No external model downloads.** Bikes, riders and traffic are built procedurally in code (`src/game/models`), so nothing can 403 or fail to load. The old 3dassets.dev proxy, service worker and dead Phaser/SVG code were removed.
- **Bikes**: 9 bikes across 6 styles (sport, street, dirt, cafe, tourer, flat-track) with PBR clear-coat paint, spoked spinning wheels, forks, engine, exhaust, brake lights and nitro flames.
- **Riders**: 4 African riders (skin tones, afro / fade / braids / cap, sunglasses, jackets, shorts, boots) posed on the bike with IK arms and legs that follow the handlebars. "Ada" matches the purple-afro, yellow-jacket, white-shorts, purple-boots reference.
- **Camera**: critically-damped chase rig with lateral lag, speed-based pull-back and FOV, nitro pull, lean roll, speed shake and a countdown hero shot. Portrait and landscape tuned.
- **World**: textured asphalt, sidewalks, Lagos buildings, utility poles with wires, palms, billboards, market umbrellas, start/finish gantry, sky dome, fog, soft shadows, ACES tone mapping and image-based lighting.
- **Gameplay**: 8-rider race, CPU lane-changing AI, traffic (danfo, keke, sedan, SUV, truck), nitro pickups, close-call and overtake multiplier, crash penalty, results screen, engine audio.
- **Controls**: arrows / A D, Space or N for nitro, S for brake; touch buttons and drag-to-steer on phones.
- **Garage**: one interactive 3D preview of the chosen bike with the chosen rider (drag to rotate).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Realtime server (multiplayer):

```bash
cd server && npm install && npm run dev
```

Set `NEXT_PUBLIC_REALTIME_URL` to point the client at your server.

## Layout

- `src/game/threeRace.ts` race engine (physics, AI, camera, HUD, input)
- `src/game/world.ts` road and Lagos environment
- `src/game/models/` bike, rider, traffic builders
- `src/components/` React shells and the garage 3D preview
- `server/` authoritative multiplayer rooms
