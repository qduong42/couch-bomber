# Couch Bombers — Multiplayer Party Bomber Game

## Overview
A fast‑paced, local‑multiplayer **Bomberman‑style** arena where **2‑4 players** battle each other while fending off **waves of AI enemies**. Players earn power‑ups from destroyed soft walls and defeated foes. The goal is to be the **last bomber alive**.

---

## Core Design Decisions

| Aspect | Choice |
|---|---|
| **Movement** | Grid‑snapped, tile‑by‑tile (classic Bomberman feel) |
| **Map size** | 13 × 13 tiles (including indestructible border) |
| **Map composition** | Outer wall (indestructible) + interior soft walls (breakable) |
| **Players** | 2‑4, each starts with **3 lives**; lose a life on flame hit, respawn with 1 s invulnerability at a safe corner |
| **Enemies** | Wave‑based spawning; each wave increases enemy count and speed |
| **Win condition** | Last player with ≥1 life wins the match |
| **Power‑ups** | Drop from **both** broken walls and killed enemies |
| **Controls** | Keyboard per player (WASD/Space, Arrows/Enter, IJKL/Shift, Numpad/0) **or** gamepad support |
| **Engine** | **Phaser 3** – Tilemap, Arcade Physics, Scene system |

---

## Power‑Ups
| Icon | Effect | Source |
|---|---|---|
| `+Bomb` | Increase max simultaneous bombs by 1 | Wall or enemy drop |
| `+Range` | Increase blast radius by 1 tile | Wall or enemy drop |
| `+Speed` | Increase movement speed (15 % per stack) | Wall or enemy drop |
| `Kick` | Bombs can be pushed; they slide until hitting a wall/enemy | Wall or enemy drop |
| `Shield` | 2 s immunity after respawn (rare) | Enemy‑only drop |

*Drop rates:* soft walls → 30 % chance for a power‑up; enemies → 15 % chance (higher‑tier items rarer).

---

## Enemy Types & Scaling
| Type | Behaviour | HP | Speed | Introduced |
|---|---|---|---|---|
| **Chaser** | Simple A*‑like path to nearest player (ignores bombs) | 1 | 0.5× player | Wave 1 |
| **Runner** | Random wandering, rebounces off walls; fast chase when near player | 1 | 1.5× player | Wave 2 |
| **Zigzagger** | Moves in a fixed direction, changes on wall collision; occasionally pauses | 2 | 0.8× player | Wave 3+ |
| **Bomber** (optional) | Places its own bombs on a longer timer | 1 | 0.6× player | Wave 5 |

**Wave progression formula** (example):
- Wave `n` spawns `⌈1.5 × n⌉` enemies.
- Every 3rd wave adds a new enemy type.
- Enemy speed increments by 5 % each wave.
- Every 5th wave introduces a **mini‑boss** (higher HP, drops extra power‑ups).

---

## Detailed Bomb Mechanics
- **Placement** – Player can place a bomb on the tile they occupy; max simultaneous bombs limited by `+Bomb` power‑up.
- **Timer** – 2 s default (configurable per bomb type).
- **Explosion** – Propagates up to **range** tiles in the four cardinal directions; stopped by indestructible walls, destroys soft walls and damages anything in its path.
- **Chain reaction** – Bombs caught in another bomb’s flame explode instantly, allowing combo chains.
- **Kick** – If player has `Kick`, pressing the movement key toward a placed bomb pushes it one tile forward, sliding until an obstruction.
- **Visuals** – Bomb sprite with a blinking fuse; explosion animates 4 frames per direction.
- **Audio** – Tick tick (placement), whoosh (kick), boom (detonation).

---

## Game Loop & State Machine
```
Boot → Asset preload → Menu (player count, controls) → Countdown (3‑2‑1)
  ├─► Wave 1 start
  │   • Spawn enemies (according to wave formula)
  │   • Enable player input
  │   • Run Wave Manager
  │   └─► When all enemies are dead → Brief rest (2 s) → Next wave
  └─► Continue until only one player retains lives
Victory → Show winner, stats, option to replay or return to menu
```
**Key states** within the `Game` scene:
- **PLAYING** – Normal gameplay, bombs, enemies active.
- **WAVE_CLEAR** – No enemies left, display “Wave X Complete”.
- **PLAYER_DEAD** – Handle life loss, respawn timer, possible elimination.
- **GAME_OVER** – Triggered when ≤1 player alive.

---

## Architecture (Phaser Scenes & Modules)
```
BootScene      – Load assets, start MenuScene
MenuScene      – Player count, key mapping, start GameScene
GameScene      – Core gameplay
   ├─ Tilemap (layer: floor, walls, soft walls)
   ├─ PlayerGroup (Arcade sprites, lives, power‑up state)
   ├─ EnemyGroup (AI controllers)
   ├─ BombGroup & ExplosionGroup
   ├─ PowerUpGroup
   ├─ HUDOverlay (Lives, Wave #, Power‑up icons)
   └─ WaveManager (spawning, difficulty scaling)
GameOverScene – Winner screen, stats, replay button
```
**Modules** (separate files for clarity):
- `Player.js` – movement, bomb placement, life handling.
- `Enemy.js` – base AI, subclasses for each enemy type.
- `Bomb.js` – timer, explosion logic, kick handling.
- `WaveManager.js` – calculates enemy count, types, spawn positions.
- `PowerUp.js` – spawn, apply to player.
- `HUD.js` – draws UI elements.

---

## Asset & Audio Checklist
- **Tileset** – 32 px tiles: indestructible wall, soft wall, floor.
- **Sprites** – Player colors (4), enemy colors, bomb, explosion, power‑up icons.
- **Sounds** – Placement tick, kick slide, explosion boom, power‑up pickup, player death, wave start, victory jingle.
- **Music** – Loopable upbeat track (8‑12 s) that can be toggled.

---

## UI / HUD Details
- Top‑left: Player 1 life icons (hearts) and bomb count.
- Top‑right: Wave number and timer until next wave.
- Bottom centre: Mini‑map (optional) showing player and enemy positions as colored dots.
- Pop‑up notifications: “+Bomb!”, “Shield!”, “Player 2 eliminated”.

---

## Difficulty & Balancing Tips
- **Bomb timer** can be lowered (1.5 s) for a harder mode.
- Increase **enemy speed** or **spawn count** per wave for difficulty scaling.
- Limit **max bomb count** to prevent bomb‑spamming dominance.
- Provide **dynamic power‑up rarity**: higher‑tier items become rarer in later waves.

---

## Development Milestones (Weekend Sprint)
1. **Setup** – Install Phaser, scaffold project structure, create empty scenes.
2. **Tilemap & Grid** – Build 13 × 13 map, implement grid‑snapped movement.
3. **Bomb System** – Placement, timer, explosion propagation, basic visual/audio.
4. **Player Lives & Respawn** – 3‑life system, invulnerability window.
5. **Wave Manager** – Simple wave spawning with Chaser enemies only.
6. **Power‑Ups** – Drop from walls, apply to player.
7. **Enemy AI** – Implement Chaser behaviour; later add Runner/Zigzagger.
8. **HUD** – Lives, wave counter, power‑up icons.
9. **Polish** – Sound effects, victory screen, quick‑restart.
10. **Play‑test** – Iterate on bomb timer, enemy speed, power‑up frequencies.

---

## Build & Run
```bash
npm install            # install Phaser and dev dependencies
npm run dev            # start local dev server (http://localhost:8080)
npm run build          # create production bundle in /dist
```

---

## Future Extensions (Post‑MVP)
- **Online multiplayer** (WebRTC or socket.io) for remote parties.
- **Additional bomb types** (remote‑detonate, sticky, delayed).
- **Custom maps** via level editor.
- **Achievements** and leaderboards.
- **Theme packs** (fantasy, sci‑fi) with different tile assets.

---

*Prepared for a rapid weekend prototype while leaving clear pathways for later feature expansion.*
