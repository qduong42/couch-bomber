import { ENEMY_PATH_INTERVAL_MS, BASE_PLAYER_SPEED_TPS, TILE } from '../constants.js';
import { tileToWorld } from '../util/Grid.js';
import { bfs } from '../util/Pathfinding.js';

export class Enemy {
  constructor(scene, tx, ty, type) {
    this.scene = scene;
    this.tx = tx;
    this.ty = ty;
    this.type = type;
    this.hp = 1;
    this.alive = true;
    this.moving = false;
    this.pathTimer = 0;
    this.path = null;
    this.moveTween = null;

    const pos = tileToWorld(tx, ty);
    this.sprite = scene.add.image(pos.x, pos.y, `enemy_${type}`).setDepth(3);
  }

  /**
   * Override in subclasses. Returns ms per tile.
   */
  getMoveMs() {
    return 1000 / BASE_PLAYER_SPEED_TPS; // base = 250ms
  }

  /**
   * Build passability function for BFS.
   */
  _makePassableFn(gameScene) {
    return (tx, ty) => {
      const tm = gameScene.tilemapManager;
      const bm = gameScene.bombManager;
      const em = gameScene.explosionManager;
      const time = gameScene.time ? gameScene.time.now : 0;

      if (tm.isBlocked(tx, ty)) return false;
      if (bm.hasBomb(tx, ty)) return false;
      if (em.isFlame(tx, ty, time)) return false;

      // Avoid tiles near bombs with fuses
      const bombs = bm.getAllBombs();
      for (const bomb of bombs) {
        if (bomb.timeLeft > 0 && bomb.range > 0) {
          const d = Math.abs(bomb.tx - tx) + Math.abs(bomb.ty - ty);
          if (d <= 1) return false;
        }
      }

      return true;
    };
  }

  /**
   * Recompute path to a target tile.
   */
  repath(goalTx, goalTy, gameScene) {
    const passableFn = this._makePassableFn(gameScene);
    this.path = bfs(this.tx, this.ty, goalTx, goalTy, passableFn);
  }

  /**
   * Step one tile along the current path.
   */
  stepPath(gameScene) {
    if (!this.path || this.path.length === 0) return;
    if (this.moving) return;

    const next = this.path[0];
    const tm = gameScene.tilemapManager;
    const bm = gameScene.bombManager;

    if (tm.isBlocked(next.tx, next.ty) || bm.hasBomb(next.tx, next.ty)) {
      this.path = null;
      return;
    }

    this.path.shift();
    this._moveTo(next.tx, next.ty);
  }

  _moveTo(nx, ny) {
    this.moving = true;
    const targetPos = tileToWorld(nx, ny);

    this.moveTween = this.scene.tweens.add({
      targets: this.sprite,
      x: targetPos.x,
      y: targetPos.y,
      duration: this.getMoveMs(),
      ease: 'Linear',
      onComplete: () => {
        this.tx = nx;
        this.ty = ny;
        this.moving = false;
        this.moveTween = null;
      },
    });
  }

  update(time, delta, gameScene) {
    if (!this.alive) return;

    this.pathTimer += delta;
    if (this.pathTimer >= ENEMY_PATH_INTERVAL_MS) {
      this.pathTimer = 0;
      this.onRepath(gameScene);
    }

    this.onStep(gameScene);
  }

  /**
   * Override in subclasses — called on repath interval.
   */
  onRepath(gameScene) {}

  /**
   * Override in subclasses — called every frame to decide next step.
   */
  onStep(gameScene) {
    this.stepPath(gameScene);
  }

  /**
   * Find the nearest player.
   */
  _nearestPlayer(gameScene) {
    let best = null;
    let bestDist = Infinity;
    for (const p of gameScene.players) {
      if (!p.alive || p.eliminated) continue;
      const d = Math.abs(p.tx - this.tx) + Math.abs(p.ty - this.ty);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  die(gameScene) {
    this.alive = false;
    if (this.moveTween) {
      this.moveTween.stop();
      this.moveTween = null;
    }

    // Death animation
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        if (this.sprite) {
          this.sprite.destroy();
          this.sprite = null;
        }
      },
    });

    // Possibly drop powerup
    if (gameScene.powerUpManager) {
      gameScene.powerUpManager.tryDrop(this.tx, this.ty, 'enemy');
    }
  }

  destroy() {
    this.alive = false;
    if (this.moveTween) this.moveTween.stop();
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
