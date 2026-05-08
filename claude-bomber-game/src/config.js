export const TILE = 32;
export const COLS = 13;
export const ROWS = 13;
export const HUD_HEIGHT = 64;
export const GAME_WIDTH = COLS * TILE;
export const GAME_HEIGHT = ROWS * TILE + HUD_HEIGHT;

export const BASE_TILE_MS = 250;
export const SPEED_STACK_PCT = 0.15;
export const MAX_SPEED_STACKS = 5;
export const MAX_BOMBS = 8;
export const MAX_RANGE = 8;

export const BOMB_FUSE_MS = 2000;
export const FLAME_LIFE_MS = 400;
export const KICK_TILES_PER_SEC = 8;

export const SOFT_WALL_DENSITY = 0.7;
export const DROP_FROM_WALL = 0.30;
export const DROP_FROM_ENEMY = 0.15;

export const RESPAWN_INVUL_MS = 1000;
export const POST_HIT_INVUL_MS = 1000;

export const WAVE_REST_MS = 2000;
export const WAVE_FORMULA = (n) => Math.ceil(1.5 * n);
export const ENEMY_SPEED_PER_WAVE = 0.05;
export const ENEMY_SPEED_CAP = 0.50;
export const SIM_ENEMY_CAP = 12;
export const COOP_FINAL_WAVE = 20;

export const PLAYER_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f];
export const PLAYER_NAMES = ['P1', 'P2', 'P3', 'P4'];

export const POWERUP_TYPES = ['bomb', 'range', 'speed', 'kick', 'shield'];
export const POWERUP_WEIGHTS_WALL = { bomb: 25, range: 25, speed: 25, kick: 25, shield: 0 };
export const POWERUP_WEIGHTS_ENEMY = { bomb: 20, range: 20, speed: 25, kick: 20, shield: 15 };
export const POWERUP_COLORS = {
  bomb: 0x4a90e2,
  range: 0xe74c3c,
  speed: 0x2ecc71,
  kick: 0x9b59b6,
  shield: 0xf1c40f
};
export const POWERUP_LETTERS = { bomb: 'B', range: 'R', speed: 'S', kick: 'K', shield: 'H' };

// Player input layouts (shared keyboard supports up to 2 reliably).
export const INPUT_LAYOUTS = [
  { up: 'W', down: 'S', left: 'A', right: 'D', bomb: 'SPACE' },
  { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', bomb: 'ENTER' }
];

export const MODES = { VERSUS: 'versus', COOP: 'coop' };
