# Aboki Riders — Game Design v0.1

## Core fantasy

Friends race motorcycles together through a recognizable Nigerian street environment. The road is relatively open, traffic is minimal and intentional, and players build a multiplier through skillful driving and item usage.

The game must feel like a game first. Menus should remain compact and the road/game world should dominate the experience.

## Race format

- 2–8 players
- Create a room or join by code
- Shared realtime race
- Countdown begins after the host starts
- Race ends at the finish line
- Final results combine race position, driving performance and multiplier

## Traffic

Traffic is intentionally sparse.

Normal road sections:
- 2–4 NPC vehicles visible

Busy sections:
- 4–6 NPC vehicles visible

Traffic exists to create overtaking decisions without turning the road into a traffic jam.

## Multiplier

Every rider starts at 1.00x.

The multiplier grows from successful driving actions and clean race performance:
- clean overtakes
- near misses
- perfect dodges
- clean streaks
- drafting
- shortcuts

Crashes reduce the multiplier and can reduce speed.

## Items

Players can collect items placed along the route. Carry capacity is limited.

Initial item set:
- Nitro — short speed burst
- Shield — blocks one collision
- Mega Boost — stronger short burst with higher control risk
- Magnet — pulls nearby collectibles
- Ghost — temporary collision immunity
- Multiplier Surge — increases multiplier growth for a limited time
- Oil — drops a short-lived trap behind the rider
- Traffic Clear — briefly opens a clean racing line

Items should create tactical choices without overpowering driving skill.

## MVP route

First route:
- Lagos-inspired
- Ojuelegba to Yaba
- Dense visual identity but moderate traffic
- Wide enough lanes for overtaking and side-by-side racing

## Multiplayer authority

The Render server is authoritative for:
- room membership
- race countdown
- player state
- traffic state
- collisions
- item spawning
- item effects
- multiplier calculations
- race progress
- finish order

MongoDB persists durable records such as:
- player profiles
- race results
- statistics
- unlocks
- leaderboards

The browser does not get to authoritatively set its own position, speed or score.

## Product principle

Do not turn Aboki Riders into a generic casino-style multiplier screen. The multiplier is part of the racing game loop.

The road, riders, traffic, items and competition are always the primary visual focus.
