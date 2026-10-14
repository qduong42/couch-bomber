import { TILE, COLS, ROWS, HUD_HEIGHT, SPAWN_SAFE_ZONES, SOFT_WALL_DENSITY } from '../constants.js';
import { tileToWorld } from '../util/Grid.js';

export class TilemapManager {
  constructor() {
    this.wallMap = []; // wallMap[ty][tx] = 'hard' | 'soft' | null
    this.floorSprites = [];
    this.wallSprites = {}; // key: `${tx},${ty}` -> sprite
    this.scene = null;
    this.bombManager = null; // set after creation
  }

  create(scene) {
    this.scene = scene;

    // Init wall map
    for (let ty = 0; ty < ROWS; ty++) {
      this.wallMap[ty] = [];
      for (let tx = 0; tx < COLS; tx++) {
        this.wallMap[ty][tx] = null;
      }
    }

    // Place floor tiles
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const pos = tileToWorld(tx, ty);
        const sprite = scene.add.image(pos.x, pos.y, 'floor').setDepth(0);
        this.floorSprites.push(sprite);
      }
    }

    // Place border walls (hard)
    for (let tx = 0; tx < COLS; tx++) {
      this._placeHardWall(scene, tx, 0);
      this._placeHardWall(scene, tx, ROWS - 1);
    }
    for (let ty = 1; ty < ROWS - 1; ty++) {
      this._placeHardWall(scene, 0, ty);
      this._placeHardWall(scene, COLS - 1, ty);
    }

    // Place interior pillars on even/even coordinates
    for (let tx = 2; tx <= COLS - 2; tx += 2) {
      for (let ty = 2; ty <= ROWS - 2; ty += 2) {
        this._placeHardWall(scene, tx, ty);
      }
    }

    // Build list of safe zone tiles
    const safeSet = new Set();
    for (const zone of SPAWN_SAFE_ZONES) {
      for (const tile of zone) {
        safeSet.add(`${tile.tx},${tile.ty}`);
      }
    }

    // Collect eligible interior tiles for soft walls
    const eligible = [];
    for (let ty = 1; ty < ROWS - 1; ty++) {
      for (let tx = 1; tx < COLS - 1; tx++) {
        if (this.wallMap[ty][tx] === 'hard') continue;
        if (safeSet.has(`${tx},${ty}`)) continue;
        eligible.push({ tx, ty });
      }
    }

    // Shuffle eligible tiles
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }

    // Fill SOFT_WALL_DENSITY of eligible tiles with soft walls
    const softCount = Math.floor(eligible.length * SOFT_WALL_DENSITY);
    for (let i = 0; i < softCount; i++) {
      const { tx, ty } = eligible[i];
      this._placeSoftWall(scene, tx, ty);
    }
  }

  _placeHardWall(scene, tx, ty) {
    this.wallMap[ty][tx] = 'hard';
    const pos = tileToWorld(tx, ty);
    const sprite = scene.add.image(pos.x, pos.y, 'wall').setDepth(1);
    this.wallSprites[`${tx},${ty}`] = sprite;
  }

  _placeSoftWall(scene, tx, ty) {
    this.wallMap[ty][tx] = 'soft';
    const pos = tileToWorld(tx, ty);
    const sprite = scene.add.image(pos.x, pos.y, 'softwall').setDepth(1);
    this.wallSprites[`${tx},${ty}`] = sprite;
  }

  isHardWall(tx, ty) {
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
    return this.wallMap[ty][tx] === 'hard';
  }

  isSoftWall(tx, ty) {
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return false;
    return this.wallMap[ty][tx] === 'soft';
  }

  isBlocked(tx, ty) {
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
    return this.wallMap[ty][tx] !== null;
  }

  isBombHere(tx, ty) {
    if (!this.bombManager) return false;
    return this.bombManager.hasBomb(tx, ty);
  }

  /**
   * Destroy a soft wall. Returns { tx, ty } for powerup roll.
   */
  destroySoftWall(tx, ty) {
    if (!this.isSoftWall(tx, ty)) return null;

    this.wallMap[ty][tx] = null;

    const key = `${tx},${ty}`;
    const sprite = this.wallSprites[key];
    if (sprite) {
      // Brief crumble animation then destroy
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 150,
        ease: 'Power2',
        onComplete: () => sprite.destroy(),
      });
      delete this.wallSprites[key];
    }

    return { tx, ty };
  }

  destroy() {
    for (const sprite of this.floorSprites) sprite.destroy();
    for (const key in this.wallSprites) this.wallSprites[key].destroy();
  }
}
