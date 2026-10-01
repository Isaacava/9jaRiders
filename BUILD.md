# Aboki Riders Build Log

## 2026-10-01 — Foundation

### Completed
- Created the `Isaacava/9jaRiders` repository.
- Added Next.js 16 + React 19 + TypeScript frontend foundation.
- Added Phaser 4.2.1 client game renderer.
- Added the first Lagos-inspired road prototype.
- Added intentionally minimal traffic.
- Added visible boost/item prototypes: Nitro, Shield and Multiplier Surge.
- Added game-first home screen inspired by the compact Danfo-game presentation.
- Added Render realtime-server skeleton using WebSockets.
- Added MongoDB driver to the realtime server package.
- Added `docs/GAME_DESIGN.md` as the current gameplay contract.

### Current prototype
The browser currently renders a vertical road scene with a rider, sparse NPC traffic, moving lane markers and collectible item visuals.

### Not built yet
- Real player input
- 2–8 player rooms
- WebSocket room state
- Server-authoritative movement
- Realtime interpolation
- Collision system
- Real item pickup/effects
- Race countdown/finish logic
- MongoDB persistence
- Garage
- Leaderboards
- Authentication/profile system
- Render deployment
- Vercel deployment
- Production assets/audio

## Next milestone

Build the first complete local race loop:

`start → steer → collect item → avoid traffic → build multiplier → finish → result screen`

Then connect the same race state to the Render multiplayer server.
