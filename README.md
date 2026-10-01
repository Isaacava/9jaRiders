# Aboki Riders

Aboki Riders is a mobile-first multiplayer Nigerian street-racing game.

## Stack

- Next.js + React + TypeScript for the web/game client
- Phaser for the gameplay renderer
- Render for the authoritative realtime multiplayer server
- MongoDB for persistent game data

## Current direction

- 2–8 player races
- Minimal, intentional traffic
- Nigerian street environments
- Multiplier-based race scoring
- Collectible boosts and special items
- Friend room codes
- Garage and rider customization
- Leaderboards and race history

## Project layout

- `src/app` — Next.js application shell
- `src/components` — React UI components
- `src/game` — Phaser gameplay code
- `server` — realtime multiplayer server
- `docs/GAME_DESIGN.md` — locked gameplay specification

## Development

Frontend:

```bash
npm install
npm run dev
```

Realtime server:

```bash
cd server
npm install
npm run dev
```
