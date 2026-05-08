# Couch Bombers — Plan, Post‑Grill

This is `plan.md` after a critical pass. Every change below is a fix for a gap, contradiction, or under‑specified rule that would have caused real implementation pain or produced an incorrect game.

---

## 0. What the original plan got wrong (summary)

| # | Issue in `plan.md` | Why it matters | Fix |
|---|---|---|---|
| 1 | "Grid‑snapped movement" + "Arcade Physics" both prescribed | Arcade Physics moves freely; grid‑snap needs a tween/state machine. They fight each other. | Use Arcade Physics **only for overlap detection**; movement is a tween‑per‑tile state machine. |
| 2 | Bomb is placed "on the tile the player occupies" | Players can never walk off their own bomb if collision is on at placement time. | Bomb collider is **disabled for any sprite currently overlapping it**; re‑enabled per‑sprite once that sprite leaves the tile. |
| 3 | Explosion "destroys soft walls and damages anything in its path" | Ambiguous: does flame stop at the first soft wall or pass through? Classic Bomberman stops. | Flame **stops at the first soft wall in each direction** (destroys it, no further propagation that direction). Indestructible walls also stop flame, without being destroyed. |
| 4 | Chain reactions mentioned, no detail | Order of evaluation determines whether chained bombs use original range or their own. | Chained bombs detonate **immediately on the next tick** using **their own range, owner, and power‑ups**. Resolved breadth‑first to avoid recursion blowups. |
| 5 | Respawn "at a safe corner" | What if corner is occupied/in flame? Which of the 4 corners? | Pick the **corner farthest from any flame, enemy, and other player**, in that priority order. If still unsafe, defer respawn 0.5 s and retry. |
| 6 | Enemy speed "0.5× player" | Player speed scales with `+Speed`. Does enemy track current speed? | Enemy speed is `multiplier × base_player_speed` (constant), **not** the buffed value. |
| 7 | Chaser uses "simple A*‑like path" and "ignores bombs" | A* every tick × N enemies is wasteful, and ignoring bombs makes them dumb. | Use **BFS on the grid**, recomputed every 0.25 s or on bomb/wall change. Treat current flame tiles and tiles within `range` of a fused bomb as **impassable**. |
| 8 | Power‑ups have no caps | `+Speed` 15 % per stack uncapped → 4× speed; bomb count uncapped → bomb spam. | Caps: `+Bomb` ≤ 8, `+Range` ≤ 8, `+Speed` ≤ 5 stacks (≈ 2× base), `Kick` is binary, `Shield` is consumable. |
| 9 | Friendly fire / self‑damage unstated | Players will absolutely set off their own bomb and ask "is that supposed to hurt me?" | Yes — **own bombs, other players' bombs, and enemy bombs all damage the player.** Standard Bomberman. |
| 10 | "Last player alive wins" applied to single‑player too | Single‑player vs waves never ends. | Mode split: **Versus** (2‑4) ends on last bomber; **Co‑op/Solo** (1‑3) ends on all‑player KO or completing wave N (configurable, default 20). |
| 11 | 4 players on one keyboard | USB keyboards routinely fail past 6‑key rollover; 4‑player on shared keyboard breaks. | Cap **shared‑keyboard** mode at **2 players**. Players 3 and 4 require **gamepad**. Surface this in the menu. |
| 12 | Build section says `npm install` Phaser | Repo currently loads Phaser via CDN. Mismatch with reality. | Pin tooling: **Vite + ES modules**, Phaser as an npm dep. Drop CDN script. |
| 13 | "Top‑left: Player 1 life icons" | HUD only describes P1. | One HUD strip per active player, color‑keyed, evenly distributed across the top. |
| 14 | Tie‑break unspecified | Two players KO'd by the same explosion → both eliminated → no winner. | Simultaneous final KO ⇒ **draw**. Show "Draw" screen, offer rematch. |
| 15 | Soft wall placement | Plan says "interior soft walls" without density or spawn‑safety. | 70 % fill of interior tiles, **excluding** each spawn corner's L‑shaped 3‑tile safe zone. |
| 16 | Initial player stats | `+Bomb`/`+Range`/`+Speed` increment from … what? | Start values: max bombs **1**, range **1**, speed **4 tiles/s**. |
| 17 | Pause | Not mentioned. | `Esc` pauses everything (timers, AI, flames freeze in place). Resume restores full state. |
| 18 | Mini‑boss every 5 waves | One‑line mention, no design. | Cut from MVP. Move to Future Extensions. |
| 19 | Mini‑map | Whole 13×13 fits on screen. | Cut from MVP. |
| 20 | A* import library | Phaser doesn't ship pathfinding. | Use a tiny in‑repo BFS; don't pull `easystarjs` for one feature. |

The rest of this document is the corrected plan, integrating every fix above.

---

## 1. Overview
A fast‑paced **Bomberman‑style** arena. **Versus mode** (2‑4 players) is the default; **Co‑op mode** (1‑3 players vs. waves) is a separate mode that ends on wave 20 or all‑player KO. Both modes share the same arena, bomb, and power‑up logic.

---

## 2. Core Design Decisions

| Aspect | Choice |
|---|---|
| **Movement** | Tile‑by‑tile **tween‑per‑step** state machine (200 ms / tile at base speed). Arcade Physics is used **only for overlap detection** between sprites, flames, and pickups — not for motion. |
| **Map size** | 13 × 13 tiles, including the indestructible border. Playable interior 11 × 11. |
| **Map composition** | Outer indestructible border, fixed indestructible pillars on every even/even interior coord (classic Bomberman grid), soft walls filling 70 % of remaining interior tiles, **always excluding** spawn‑corner safe zones. |
| **Spawn safe zones** | L‑shape of 3 tiles at each of the four corners, guaranteed empty. |
| **Players** | 2‑4. Each has 3 lives. Lose a life on any flame hit (own, ally, or enemy). On respawn: 1 s invulnerability, picked corner = farthest from flame/enemies/players. |
| **Friendly fire** | On. Own bombs damage the placer. |
| **Enemies** | Wave‑based; only spawn in **Co‑op mode**. Versus has no enemies in MVP. |
| **Win condition (Versus)** | Last bomber alive. Simultaneous KO = draw. |
| **Win condition (Co‑op)** | Survive wave 20 → win. All players KO'd → loss. |
| **Power‑ups** | Drop from soft walls (30 %) and enemies (15 %). Capped (see §4). |
| **Controls** | Shared keyboard supports up to 2 players (WASD/Space, Arrows/Enter). Players 3 and 4 require gamepads. Menu surfaces this. |
| **Engine** | Phaser 3 + Vite, Phaser as an npm dependency. |

---

## 3. Map & Tilemap

- Tile size: 32 px. Viewport: 13 × 32 = 416 px game area + 64 px HUD strip = **416 × 480** logical, scaled up 2× by Phaser's `Scale.FIT`.
- Three tilemap layers:
  - **floor** (always present),
  - **walls** (indestructible — border + pillars),
  - **softWalls** (destructible).
- When a soft wall is destroyed: remove its tile from the `softWalls` layer (no replacement; floor below is already there). Then roll for power‑up drop on that tile.
- Soft wall density: 70 % of eligible interior tiles. Eligible = not border, not pillar, not in any spawn safe zone.

---

## 4. Power‑Ups

| Icon | Effect | Source | Cap |
|---|---|---|---|
| `+Bomb` | +1 max simultaneous bombs | Wall or enemy | 8 |
| `+Range` | +1 flame tile per direction | Wall or enemy | 8 |
| `+Speed` | −15 % tile traversal time per stack | Wall or enemy | 5 stacks |
| `Kick` | Bombs slide when walked into | Wall or enemy | binary |
| `Shield` | Consumable: absorbs the next flame hit | Enemy only | stacks to 1 (rare) |

- Initial values: bombs 1, range 1, speed 4 tiles/s (250 ms/tile).
- Drop tier weighting: in later waves, `+Bomb` and `+Range` rarefy; `+Speed` and `Kick` stay common.
- Pickup is by walking onto the tile. Multiple players landing same tick: **earlier tween‑arrival wins**, ties broken by player index.

---

## 5. Bomb & Explosion Mechanics

- **Placement** — Player presses bomb key. If `placed_count < max_bombs` and tile is empty of other bombs, spawn a bomb on the player's current tile.
- **Pass‑through after placement** — Bomb's overlap with the placer is ignored until the placer leaves the tile, then collision turns on for that player too.
- **Timer** — 2 s (configurable; "Hard" mode = 1.5 s).
- **Explosion** —
  - 4 cardinal directions, up to `range` tiles each.
  - Each direction propagates one tile at a time. Indestructible wall: stop, no destruction. Soft wall: stop, destroy that wall, roll drop. Other bomb: stop, **chain‑detonate that bomb on next tick** (BFS, not recursion). Player or enemy: damage applied, propagation continues.
- **Flame lifetime** — 400 ms; flame tiles are damaging the entire duration.
- **Chain ordering** — Resolved breadth‑first per tick. A bomb caught in a flame this frame is queued, fuse cleared, detonates next frame using **its own owner / range / power‑ups**.
- **Kick** — When a player with `Kick` walks into a bomb's tile, the bomb tweens forward at 8 tiles/s until it hits a wall, soft wall, bomb, or sprite. If it hits a sprite, the sprite takes a hit (damage = same as flame). If it hits a wall, it stops on the last clear tile.
- **Visuals** — Sprite blink rate increases as fuse approaches 0; explosion is a 4‑frame animation per direction with a distinct "tip" frame at the end of each arm.
- **Audio** — Place tick, kick whoosh, boom, soft‑wall crunch, pickup chime.

---

## 6. Enemy Types & Wave Scaling (Co‑op only)

| Type | Behaviour | HP | Speed | Introduced |
|---|---|---|---|---|
| **Chaser** | BFS to nearest player. Treats current flame tiles and tiles within `range` of a fused bomb as impassable; recomputes path every 0.25 s or on map change. | 1 | 0.5× base player | Wave 1 |
| **Runner** | Random walk; if player within 4 tiles in line of sight, switches to BFS chase. | 1 | 1.5× base | Wave 2 |
| **Zigzagger** | Holds direction until wall/bomb; pauses 0.3 s on collision then picks a new direction (90° preferred). | 2 | 0.8× base | Wave 3 |
| **Bomber** | BFS chase, but at 4‑tile distance, plants its own bomb (3 s timer) and retreats. | 1 | 0.6× base | Wave 5 |

- Enemy speed multipliers are anchored to **base** player speed (4 tiles/s) — they do not scale with player `+Speed`.
- **Wave formula**: wave `n` spawns `⌈1.5 × n⌉` enemies, capped at 12 simultaneously on the 11 × 11 grid (queue overflow into next wave). Speed of each enemy type scales by +5 % per wave, cap +50 %.
- Enemies spawn from random non‑occupied floor tiles ≥ 4 tiles from any player.
- Player contact does **not** damage the player. Only flame/bomb hits do. Enemies die in flame.
- Mini‑boss → **deferred to Future Extensions**.

---

## 7. Game Loop & State Machine

```
Boot → Preload → Menu (mode, players, controls) → Countdown (3‑2‑1)
  ├─► Versus: PLAYING → on KO, mark eliminated → if ≤1 alive → GAME_OVER
  └─► Co‑op:  PLAYING → wave clear → REST(2 s) → next wave → repeat to 20 → WIN
       (any time all players KO'd → GAME_OVER)
Pause: Esc toggles PAUSED (freezes timers, AI, tweens, flame lifetimes)
```

States within `GameScene`:
- `PLAYING`, `WAVE_CLEAR`, `PLAYER_DEAD` (per player), `PAUSED`, `GAME_OVER`.

---

## 8. Architecture

```
BootScene       – Load assets, then MenuScene
MenuScene       – Mode (Versus / Co‑op), player count, control assignment
GameScene       – Core
   ├─ TilemapManager     (floor / walls / softWalls layers + destroy API)
   ├─ PlayerGroup        (movement state machine, lives, power‑ups)
   ├─ EnemyGroup         (Co‑op only)
   ├─ BombGroup          (timers, chain queue)
   ├─ ExplosionGroup     (flame tiles, lifetime)
   ├─ PowerUpGroup
   ├─ HUDOverlay         (per‑player strip, wave counter)
   └─ WaveManager        (Co‑op only)
GameOverScene   – Winner / Draw / Co‑op result, stats, replay
```

Modules:
- `Player.js`, `Enemy.js` (+ subclasses), `Bomb.js`, `Explosion.js`, `PowerUp.js`, `WaveManager.js`, `HUD.js`, `Pathfinding.js` (BFS), `Grid.js` (world↔tile conversion).

---

## 9. Asset & Audio Checklist

- **Tileset** — 32 px: floor variants, indestructible wall, indestructible pillar, soft wall (+ break frames), flame core/arm/tip.
- **Sprites** — 4 player palettes (idle, walk N/S/E/W, hurt, ghost/respawn), 4 enemy types, bomb (idle + 3 fuse‑tick frames), 5 power‑up icons.
- **SFX** — place tick, kick whoosh, boom, crunch, pickup, player hurt, wave start, victory.
- **Music** — one 8‑12 s loop, mute toggle in HUD.
- **Sourcing** — Kenney's CC0 packs (1‑bit pack + UI pack) for first pass; replace later if desired.

---

## 10. UI / HUD

- Top strip 64 px tall, divided into N equal cells (N = active players).
- Each cell shows: player color square, life hearts (×3), live `+Bomb` / `+Range` / `+Speed` numeric badges, Kick/Shield indicator if held.
- Center top: Wave number + countdown to next wave (Co‑op) or "Versus" + alive count (Versus).
- Pop‑ups (slide‑in for 1.5 s): `+Bomb!`, `Kick!`, `Shield!`, `Player N eliminated`.

---

## 11. Difficulty & Balancing Levers

- Bomb timer (2 s default, 1.5 s hard).
- Soft wall density (70 % default).
- Power‑up drop rates (30 % wall / 15 % enemy default).
- Enemy speed wave scalar (+5 %/wave, cap +50 %).
- Caps in §4 prevent late‑game lockouts.

---

## 12. Build & Run

```bash
npm install        # Vite + Phaser as deps
npm run dev        # Vite dev server, default http://localhost:5173
npm run build      # production bundle in /dist
npm run preview    # preview the built bundle
```

(Drop the CDN `<script src="phaser…">` from `index.html`. Import Phaser from `node_modules` via ES modules.)

---

## 13. Milestones (Weekend Sprint)

1. **Setup** — Vite + Phaser, scene scaffolding, ES module imports.
2. **Grid & Tilemap** — 13 × 13 with border + pillars + soft wall density, spawn safe zones honored.
3. **Movement** — tween‑per‑tile state machine, queued direction input.
4. **Bomb system** — placement, pass‑through‑then‑solid, fuse, explosion propagation with stop‑at‑first‑soft‑wall, chain queue.
5. **Players & lives** — KO, respawn‑corner picker, invulnerability flicker.
6. **Versus mode end‑to‑end** — including Draw on simultaneous KO. Ship this first; it's the smallest playable game.
7. **Power‑ups** — drops + caps + pickup conflict resolution.
8. **Co‑op + WaveManager** — Chaser only, then Runner/Zigzagger/Bomber.
9. **HUD** — per‑player strip, pop‑ups, pause overlay.
10. **Polish** — SFX, victory/draw screens, restart, controller hotplug.
11. **Playtest** — tune bomb timer, drop rates, wave 5 difficulty cliff.

---

## 14. Future Extensions (Post‑MVP)

- Mini‑bosses every 5 waves (HP, attack patterns).
- Mini‑map for larger custom maps.
- Online multiplayer (WebRTC / socket.io).
- Bomb variants (remote, sticky, delayed).
- Custom map editor.
- Achievements / leaderboards.
- Theme packs.
- Stats screen (kills, walls broken, bombs placed, longest chain).
