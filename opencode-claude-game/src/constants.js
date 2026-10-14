// Grid
export const TILE_SIZE   = 32;
export const GRID_COLS   = 13;
export const GRID_ROWS   = 13;
export const HUD_HEIGHT  = 64;
export const GAME_WIDTH  = GRID_COLS * TILE_SIZE;          // 416
export const GAME_HEIGHT = GRID_ROWS * TILE_SIZE + HUD_HEIGHT; // 480

// Tile types
export const TILE = { FLOOR: 0, WALL: 1, SOFT: 2 };

// Player
export const PLAYER_COLORS = [0xff4444, 0x4488ff, 0x44dd44, 0xffaa22];
export const PLAYER_COLOR_NAMES = ['Red', 'Blue', 'Green', 'Orange'];
export const PLAYER_STARTS = [
  { row: 1, col: 1  },
  { row: 1, col: 11 },
  { row: 11, col: 1 },
  { row: 11, col: 11 },
];

// Spawn safe L-shapes (row, col pairs)
export const SPAWN_SAFE = [
  [[1,1],[2,1],[1,2]],
  [[1,11],[2,11],[1,10]],
  [[11,1],[10,1],[11,2]],
  [[11,11],[10,11],[11,10]],
];

// Initial player stats
export const INITIAL_LIVES  = 3;
export const INITIAL_BOMBS  = 1;
export const INITIAL_RANGE  = 1;
export const INITIAL_SPEED  = 0; // stacks
export const BASE_MOVE_MS   = 250; // ms per tile at base speed (4 tiles/s)

// Power-up caps
export const MAX_BOMBS = 8;
export const MAX_RANGE = 8;
export const MAX_SPEED = 5;

// Power-up types
export const POWERUP = {
  BOMB:   'bomb',
  RANGE:  'range',
  SPEED:  'speed',
  KICK:   'kick',
  SHIELD: 'shield',
};

// Drop chances
export const WALL_DROP_CHANCE  = 0.30;
export const ENEMY_DROP_CHANCE = 0.15;

// Bomb
export const BOMB_TIMER_MS      = 2000;
export const BOMB_TIMER_HARD_MS = 1500;
export const FLAME_LIFETIME_MS  = 400;
export const KICK_SPEED_MS      = 125; // 8 tiles/s → 125ms per tile

// Map
export const SOFT_WALL_DENSITY = 0.70;

// Respawn
export const RESPAWN_DELAY_MS  = 500;
export const INVULN_MS         = 1000;

// Enemy
export const ENEMY_PATH_INTERVAL_MS = 250;

// Modes
export const MODE = { VERSUS: 'versus', COOP: 'coop' };

// Co-op
export const MAX_WAVES     = 20;
export const REST_DURATION = 2000;
