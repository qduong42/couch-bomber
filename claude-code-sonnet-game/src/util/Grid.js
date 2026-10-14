import { TILE, HUD_HEIGHT } from '../constants.js';

export function tileToWorld(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: HUD_HEIGHT + ty * TILE + TILE / 2 };
}

export function worldToTile(x, y) {
  return {
    tx: Math.floor(x / TILE),
    ty: Math.floor((y - HUD_HEIGHT) / TILE),
  };
}

export function dist(tx1, ty1, tx2, ty2) {
  return Math.abs(tx1 - tx2) + Math.abs(ty1 - ty2);
}
