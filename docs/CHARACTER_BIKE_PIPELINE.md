# Aboki Riders — 3D Character + Motorcycle Pipeline

## Runtime rule

The race renderer treats a rider and motorcycle as separate reusable 3D assets.

A rider is selected from:
- `public/assets/aboki_male_rider_stylized_v2.glb`
- `public/assets/aboki_female_rider_stylized_v2.glb`

A motorcycle is selected from the 3DAssets.dev CC0 catalogue or the project-local `dirt-bike.glb`.

The game clones skinned riders with Three.js `SkeletonUtils.clone`, tints the rider for the selected character, clones the bike, and then runs the generic rider-to-bike fitting solver.

## Rider fitting

The solver in `src/game/riderBikeFit.ts` does not use one fixed pose for every motorcycle.

It first looks for semantic bike parts such as:
- seat / saddle
- handlebar / grips
- foot pegs
- wheel / tyre nodes

When those are missing it derives mount points from the bike's real bounding box and wheel positions.

The rider rig mapper accepts the stable bone naming emitted by `build_characters.py` as well as common MakeHuman-style names.

Then two-bone IK places:
- both feet on the actual pegs
- both hands on the actual grips
- the hips on the actual seat
- the torso/head from the real seat-to-handlebar relationship

That means a new motorcycle does not need a custom rider pose just because its seat, handlebars, wheelbase, or geometry are different.

## Current motorcycle catalogue

Runtime sources now include:
- Supermoto single
- Road sportbike
- Full-fairing sport tourer
- Prototype grand prix bike
- Superbike
- Cafe racer
- Twin-cylinder scrambler
- Step-through commuter scooter
- Compact minibike
- project-local dirt bike

The first nine come from the CC0 "Motorcycle Racing and Street Bikes" pack. The pack currently lists 69 models, 10.0 MB total, metre-scale shared units, and individual GLBs with their own CDN URLs. citeturn232965search2

Examples:
- Road sportbike: 0.76 × 1.20 × 2.135 m, about 5.2k triangles. citeturn131109search3
- Superbike: 0.76 × 1.22 × 2.165 m, about 5.2k triangles. citeturn131109search0
- Cafe racer: 0.76 × 1.16 × 2.125 m, about 6.7k triangles. citeturn232965search0
- Twin-cylinder scrambler: 0.76 × 1.24 × 2.224 m, about 6.4k triangles. citeturn232965search1
- Step-through commuter: 0.76 × 1.12 × 1.817 m, about 5.0k triangles. citeturn534523search0
- Compact minibike: 0.76 × 1.00 × 1.497 m, about 4.8k triangles. citeturn534523search1

The catalogue is CC0 1.0 Universal for these contributed models; commercial use and modification are allowed without attribution. citeturn339254search7turn232965search2

## Making more unique bikes

`public/assets/build_bike_variants.py` takes one GLB source and generates multiple Aboki Riders liveries.

It also adds optional `AR_Mount_*` helper markers:
- `AR_Mount_Seat`
- `AR_Mount_Handle_L`
- `AR_Mount_Handle_R`
- `AR_Mount_Peg_L`
- `AR_Mount_Peg_R`

The runtime does not depend on these markers; they are an authoring convenience. Geometry-based detection remains the fallback for new bikes.

## Data strategy

The pack page explicitly supports loading individual GLBs from the CDN rather than downloading the entire 69-model pack. The individual bike files are small enough to keep the initial motorcycle library practical, while browser caching prevents repeat downloads after the asset is already cached. citeturn232965search2turn534523search0

## Source-of-truth rule

Do not manually move a rider by eye for each bike.

When we add a new motorcycle:
1. add its source URL or local GLB to the bike catalog;
2. optionally run `build_bike_variants.py` to create project liveries/markers;
3. let `fitRiderToBike()` solve the rider pose from the motorcycle geometry.

That keeps the character system scalable as the garage grows.
