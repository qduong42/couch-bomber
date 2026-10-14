import { TILE, GRID_ROWS, GRID_COLS, SPAWN_SAFE, SOFT_WALL_DENSITY } from '../constants.js';
import { tileToWorld, isValidTile } from '../utils/Grid.js';

export default class TilemapManager {
  constructor(scene) {
    this.scene = scene;
    /** @type {number[][]} */
    this.grid = [];
    /** @type {Map<string, Phaser.GameObjects.Image>} */
    this.softSprites = new Map();

    this._buildGrid();
    this._render();
  }

  // ── Grid Init ───────────────────────────────────────────────────────

  _buildGrid() {
    const safeSet = new Set();
    for (const zone of SPAWN_SAFE) {
      for (const [r, c] of zone) safeSet.add(`${r},${c}`);
    }

    for (let r = 0; r < GRID_ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        if (this._isBorder(r, c) || this._isPillar(r, c)) {
          this.grid[r][c] = TILE.WALL;
        } else if (safeSet.has(`${r},${c}`)) {
          this.grid[r][c] = TILE.FLOOR;
        } else if (Math.random() < SOFT_WALL_DENSITY) {
          this.grid[r][c] = TILE.SOFT;
        } else {
          this.grid[r][c] = TILE.FLOOR;
        }
      }
    }
  }

  _isBorder(r, c) {
    return r === 0 || r === GRID_ROWS - 1 || c === 0 || c === GRID_COLS - 1;
  }

  _isPillar(r, c) {
    return r % 2 === 0 && c % 2 === 0 && !this._isBorder(r, c);
  }

  // ── Rendering ───────────────────────────────────────────────────────

  _render() {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const { x, y } = tileToWorld(r, c);
        const type = this.grid[r][c];

        // Floor is always drawn underneath
        this.scene.add.image(x, y, 'floor').setDepth(0);

        if (type === TILE.WALL) {
          this.scene.add.image(x, y, 'wall').setDepth(1);
        } else if (type === TILE.SOFT) {
          const img = this.scene.add.image(x, y, 'soft_wall').setDepth(1);
          this.softSprites.set(`${r},${c}`, img);
        }
      }
    }
  }

  // ── Queries ─────────────────────────────────────────────────────────

  isFloor(r, c) {
    if (!isValidTile(r, c)) return false;
    return this.grid[r][c] === TILE.FLOOR;
  }

  isWall(r, c) {
    if (!isValidTile(r, c)) return true; // out-of-bounds treated as wall
    return this.grid[r][c] === TILE.WALL;
  }

  isSoft(r, c) {
    if (!isValidTile(r, c)) return false;
    return this.grid[r][c] === TILE.SOFT;
  }

  /** True if a character can step onto this tile (ignores bombs — GameScene checks those) */
  isWalkable(r, c) {
    if (!isValidTile(r, c)) return false;
    return this.grid[r][c] === TILE.FLOOR;
  }

  // ── Mutation ────────────────────────────────────────────────────────

  /**
   * Destroy the soft wall at (r, c).
   * Returns true if a soft wall existed there.
   */
  destroySoftWall(r, c) {
    if (!this.isSoft(r, c)) return false;
    this.grid[r][c] = TILE.FLOOR;
    const key = `${r},${c}`;
    const sprite = this.softSprites.get(key);
    if (sprite) {
      // Quick destruction animation: scale down
      this.scene.tweens.add({
        targets: sprite,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 120,
        onComplete: () => sprite.destroy(),
      });
      this.softSprites.delete(key);
    }
    return true;
  }
}
