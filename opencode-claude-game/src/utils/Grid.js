import { TILE_SIZE, HUD_HEIGHT, GRID_ROWS, GRID_COLS } from '../constants.js';

/** Convert tile (row, col) to world-space pixel center */
export function tileToWorld(row, col) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: HUD_HEIGHT + row * TILE_SIZE + TILE_SIZE / 2,
  };
}

/** Convert world-space pixel to tile (row, col) */
export function worldToTile(x, y) {
  return {
    col: Math.floor(x / TILE_SIZE),
    row: Math.floor((y - HUD_HEIGHT) / TILE_SIZE),
  };
}

/** Check if (row, col) is inside the grid */
export function isValidTile(row, col) {
  return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
}

/** Taxicab distance between two tiles */
export function tileDistance(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

/** Cardinal direction vectors */
export const DIRS = [
  { dr: -1, dc:  0 }, // up
  { dr:  1, dc:  0 }, // down
  { dr:  0, dc: -1 }, // left
  { dr:  0, dc:  1 }, // right
];
