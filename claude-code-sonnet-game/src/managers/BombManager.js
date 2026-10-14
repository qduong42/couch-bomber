import { Bomb } from '../entities/Bomb.js';
import { BOMB_TIMER_MS } from '../constants.js';

export class BombManager {
  constructor(scene, tilemapManager, explosionManager, powerUpManager) {
    this.scene = scene;
    this.tilemapManager = tilemapManager;
    this.explosionManager = explosionManager;
    this.powerUpManager = powerUpManager;
    this.bombs = [];
    this.chainQueue = [];
  }

  /**
   * Place a bomb for a player.
   */
  placeBomb(player) {
    if (player.activeBombs >= player.maxBombs) return false;
    if (this.hasBomb(player.tx, player.ty)) return false;

    const bomb = new Bomb(this.scene, player.tx, player.ty, player, player.bombRange);
    bomb.passSet.add(player.index);
    this.bombs.push(bomb);
    player.activeBombs++;
    return true;
  }

  /**
   * Place a bomb for an enemy (no player owner).
   */
  placeEnemyBomb(tx, ty, range, timer = BOMB_TIMER_MS) {
    if (this.hasBomb(tx, ty)) return false;
    const bomb = new Bomb(this.scene, tx, ty, null, range);
    bomb.timeLeft = timer;
    this.bombs.push(bomb);
    return true;
  }

  hasBomb(tx, ty) {
    return this.bombs.some(b => b.alive && b.tx === tx && b.ty === ty);
  }

  getBomb(tx, ty) {
    return this.bombs.find(b => b.alive && b.tx === tx && b.ty === ty) || null;
  }

  getAllBombs() {
    return this.bombs.filter(b => b.alive);
  }

  /**
   * Check if a player can occupy a tile.
   * Returns false if there's a bomb there that the player can't pass through.
   */
  canOccupy(player, tx, ty) {
    const bomb = this.getBomb(tx, ty);
    if (!bomb) return true;
    return bomb.passSet.has(player.index);
  }

  /**
   * Called when a player finishes moving — remove from passSet if they left the bomb tile.
   */
  updatePassThrough(player) {
    for (const bomb of this.bombs) {
      if (!bomb.alive) continue;
      if (bomb.passSet.has(player.index)) {
        if (player.tx !== bomb.tx || player.ty !== bomb.ty) {
          bomb.passSet.delete(player.index);
        }
      }
    }
  }

  update(time, delta) {
    // Update all bombs
    for (const bomb of this.bombs) {
      if (!bomb.alive) continue;
      bomb.update(delta);
      if (bomb.timeLeft <= 0) {
        this.chainQueue.push(bomb);
      }
    }

    // Process chain queue (BFS order)
    const toProcess = [...this.chainQueue];
    this.chainQueue = [];

    for (const bomb of toProcess) {
      if (!bomb.alive) continue;
      this._detonate(bomb, time);
    }

    // Remove dead bombs
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      if (!this.bombs[i].alive) {
        this.bombs.splice(i, 1);
      }
    }
  }

  _detonate(bomb, time) {
    if (!bomb.alive) return;

    bomb.alive = false;

    // Decrement owner's active count
    if (bomb.owner) {
      bomb.owner.activeBombs = Math.max(0, bomb.owner.activeBombs - 1);
    }

    // Destroy bomb sprite
    bomb.destroy();

    const { tx, ty } = bomb;
    const range = bomb.range;
    const tm = this.tilemapManager;

    // Add flame at bomb center
    this.explosionManager.addFlame(this.scene, tx, ty, time);

    // Propagate in 4 directions
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    for (const [dx, dy] of dirs) {
      for (let i = 1; i <= range; i++) {
        const nx = tx + dx * i;
        const ny = ty + dy * i;

        if (tm.isHardWall(nx, ny)) {
          // Stop, no destruction
          break;
        }

        if (tm.isSoftWall(nx, ny)) {
          // Destroy soft wall, stop propagation
          tm.destroySoftWall(nx, ny);
          this.explosionManager.addFlame(this.scene, nx, ny, time);
          // Roll for powerup drop
          if (this.powerUpManager) {
            this.powerUpManager.tryDrop(nx, ny, 'wall');
          }
          break;
        }

        const chainBomb = this.getBomb(nx, ny);
        if (chainBomb && chainBomb.alive) {
          // Queue chain detonation
          this.explosionManager.addFlame(this.scene, nx, ny, time);
          this.chainQueue.push(chainBomb);
          break;
        }

        // Open tile — add flame and continue
        this.explosionManager.addFlame(this.scene, nx, ny, time);
      }
    }
  }

  /**
   * Queue a bomb for detonation next tick (chain).
   */
  triggerChain(bomb) {
    if (bomb.alive) {
      bomb.timeLeft = 0;
      this.chainQueue.push(bomb);
    }
  }

  destroy() {
    for (const bomb of this.bombs) bomb.destroy();
    this.bombs = [];
  }
}
