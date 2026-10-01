# Aboki Riders Architecture

## Runtime model

**Frontend:** Next.js 16 + React 19 + TypeScript.

**Game:** Phaser 4.2.1.

**Realtime:** Node.js + WebSockets on Render.

**Persistence:** MongoDB.

**Hosting:** Vercel frontend, Render realtime server.

## Client responsibilities

- Render the road, riders, traffic, pickups, VFX and UI.
- Read cached asset packs.
- Send player input to the realtime server.
- Interpolate/render remote riders from authoritative state.
- Keep the solo VS Computer mode fully playable without networking.

## Server responsibilities

- Room membership and host.
- Countdown and race lifecycle.
- Player movement state.
- Race progress and finish order.
- Future authoritative traffic, item spawning, collisions and item effects.

The server should send compact state messages, not artwork.

## Asset pipeline

Licensed reusable 3D sources can be customized and rendered into the fixed Aboki Riders racing camera. Original generated 2D artwork is used for characters, UI, VFX and brand-specific identity.

The browser caches packs locally so assets do not need to be downloaded for every race.

## Visual goal

Premium arcade-racing presentation with Nigerian street identity. The art direction is inspired by the readability and spectacle of top mobile racers without copying their proprietary art.
