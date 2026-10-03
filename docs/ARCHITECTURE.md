# Architecture

- **Client**: Next.js app. `/play` mounts `GameCanvas`, which dynamically imports `src/game/threeRace.ts` and runs a Three.js renderer. `/` runs the same engine in `demo` mode (CPU-driven, no HUD). `/garage` uses `LoadoutPreview3D`.
- **Models**: `src/game/models/{bike,rider,traffic,racer}.ts` build everything procedurally.
- **World**: `src/game/world.ts` builds road, props and lighting; positions run along -Z, distance = -z.
- **Multiplayer**: `src/game/multiplayer.ts` + `server/`. The client renders server-authoritative lane/distance.
