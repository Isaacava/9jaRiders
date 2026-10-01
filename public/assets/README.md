# Aboki Riders Runtime Assets

The first Lagos route kit is now wired into Phaser.

## Current route assets

- environments/route-lagos-sky.svg
- traffic/danfo.svg
- traffic/keke.svg
- traffic/sedan.svg
- props/shop.svg
- props/palm.svg
- props/barrier.svg

These are lightweight interim vector assets. They give the game a real asset layer now while the final 3D-derived art pipeline is prepared.

## Production replacement path

licensed 3D source → Aboki Riders customization → fixed camera render → optimized WebP/PNG → Phaser atlas

See assets.md and src/game/routeVisualKit.ts for the source and license manifest.