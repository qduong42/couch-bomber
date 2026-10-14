export const TILE = 32;
export const COLS = 13;
export const ROWS = 13;
export const HUD_HEIGHT = 64;
export const GAME_W = COLS * TILE;       // 416
export const GAME_H = ROWS * TILE + HUD_HEIGHT; // 480

export const BASE_MOVE_MS = 250;
export const SPEED_PER_STACK = 0.15;
export const MAX_SPEED_STACKS = 5;
export const MAX_BOMBS = 8;
export const MAX_RANGE = 8;

export const BOMB_TIMER_MS = 2000;
export const FLAME_LIFETIME_MS = 400;

export const INIT_BOMBS = 1;
export const INIT_RANGE = 1;
export const PLAYER_LIVES = 3;
export const INVULN_MS = 1000;

export const SOFT_WALL_DENSITY = 0.70;
export const WALL_DROP_CHANCE = 0.30;
export const ENEMY_DROP_CHANCE = 0.15;

export const PLAYER_COLORS = [0x4488ff, 0xff4444, 0x44cc44, 0xffaa00];

export const SPAWN_CORNERS = [
  { tx: 1, ty: 1 },
  { tx: 11, ty: 1 },
  { tx: 1, ty: 11 },
  { tx: 11, ty: 11 },
];

export const SPAWN_SAFE_ZONES = [
  [{ tx: 1, ty: 1 }, { tx: 2, ty: 1 }, { tx: 1, ty: 2 }],
  [{ tx: 11, ty: 1 }, { tx: 10, ty: 1 }, { tx: 11, ty: 2 }],
  [{ tx: 1, ty: 11 }, { tx: 2, ty: 11 }, { tx: 1, ty: 10 }],
  [{ tx: 11, ty: 11 }, { tx: 10, ty: 11 }, { tx: 11, ty: 10 }],
];

export const BASE_PLAYER_SPEED_TPS = 4; // tiles per second, anchor for enemy speeds

export const WAVE_MAX = 20;
export const MAX_ENEMIES = 12;
export const ENEMY_PATH_INTERVAL_MS = 250;
