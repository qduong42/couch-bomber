import { TILE, COLS, ROWS, HUD_HEIGHT, SOFT_WALL_DENSITY } from '../config.js';

// Tile coordinate ↔ pixel coordinate. World y is offset by HUD strip.
export const tileToPxX = (gx) => gx * TILE + TILE / 2;
export const tileToPxY = (gy) => HUD_HEIGHT + gy * TILE + TILE / 2;
export const pxToTileX = (px) => Math.floor(px / TILE);
export const pxToTileY = (py) => Math.floor((py - HUD_HEIGHT) / TILE);

export default class TilemapManager {
  constructor(scene) {
    this.scene = scene;
    this.walls = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    this.softWalls = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    this.softWallSprites = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    this.spawnCorners = [
      { gx: 1, gy: 1 },
      { gx: COLS - 2, gy: ROWS - 2 },
      { gx: COLS - 2, gy: 1 },
      { gx: 1, gy: ROWS - 2 }
    ];
  }

  build(playerCount) {
    for (let gy = 0; gy < ROWS; gy++) {
      for (let gx = 0; gx < COLS; gx++) {
        this.scene.add.image(tileToPxX(gx), tileToPxY(gy), 'floor').setDepth(0);
        const isBorder = gx === 0 || gy === 0 || gx === COLS - 1 || gy === ROWS - 1;
        const isPillar = gx % 2 === 0 && gy % 2 === 0 && !isBorder;
        if (isBorder) {
          this.walls[gy][gx] = true;
          this.scene.add.image(tileToPxX(gx), tileToPxY(gy), 'wall').setDepth(2);
        } else if (isPillar) {
          this.walls[gy][gx] = true;
          this.scene.add.image(tileToPxX(gx), tileToPxY(gy), 'pillar').setDepth(2);
        }
      }
    }

    const safe = new Set();
    const corners = this.spawnCorners.slice(0, Math.max(2, playerCount));
    for (const c of corners) {
      // L-shape: corner + 2 adjacent floor tiles (away from border).
      const dx = c.gx === 1 ? 1 : -1;
      const dy = c.gy === 1 ? 1 : -1;
      safe.add(`${c.gx},${c.gy}`);
      safe.add(`${c.gx + dx},${c.gy}`);
      safe.add(`${c.gx},${c.gy + dy}`);
    }

    for (let gy = 1; gy < ROWS - 1; gy++) {
      for (let gx = 1; gx < COLS - 1; gx++) {
        if (this.walls[gy][gx]) continue;
        if (safe.has(`${gx},${gy}`)) continue;
        if (Math.random() < SOFT_WALL_DENSITY) {
          this.softWalls[gy][gx] = true;
          this.softWallSprites[gy][gx] = this.scene.add.image(
            tileToPxX(gx), tileToPxY(gy), 'softWall'
          ).setDepth(2);
        }
      }
    }
  }

  isWall(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return true;
    return this.walls[gy][gx];
  }

  isSoftWall(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return false;
    return this.softWalls[gy][gx];
  }

  destroySoftWall(gx, gy) {
    if (!this.softWalls[gy][gx]) return false;
    this.softWalls[gy][gx] = false;
    const s = this.softWallSprites[gy][gx];
    if (s) {
      this.scene.tweens.add({
        targets: s, alpha: 0, scaleX: 0.6, scaleY: 0.6, duration: 180,
        onComplete: () => s.destroy()
      });
      this.softWallSprites[gy][gx] = null;
    }
    return true;
  }

  // Tile is blockerForMovement: walls and soft walls block. Bombs handled separately.
  isBlocking(gx, gy) {
    return this.isWall(gx, gy) || this.isSoftWall(gx, gy);
  }
}
