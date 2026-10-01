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

### Current playable prototype
The browser now contains a playable solo VS Computer race foundation. It has steering, braking, minimal traffic, collisions, a 5 KM finish target, multiplier growth, near-miss bonuses, four collectible power-ups, responsive touch/keyboard controls, seven CPU riders, live race position, CPU lane changes, overtaking behavior, traffic reactions and CPU item usage.

### Responsive work completed
- Portrait mode uses a 9:16 game composition.
- Landscape mode uses a 16:9 game composition.
- Phaser now resizes its game viewport to the available screen.
- Desktop/tablet layouts place the game beside compact controls when space allows.
- The road, rider, traffic and item positions recalculate when orientation changes.

### Not built yet
- Production art integration from /assets/
- 2–8 player rooms
- WebSocket room state
- Server-authoritative movement
- Realtime interpolation
- MongoDB persistence
- Garage
- Leaderboards
- Authentication/profile system
- Render deployment
- Vercel deployment
- Production assets/audio

## Next milestone

Replace gameplay placeholders with the generated asset family while continuing the realtime architecture, then build the first 2–8 player room loop:

`start → steer → collect item → avoid traffic → race CPU riders → build multiplier → finish → result screen`

Then connect the same race state to the Render multiplayer server.

### Verification note
The repository changes were committed successfully. A local frontend build could not be run in this environment because outbound DNS access to GitHub is unavailable.
