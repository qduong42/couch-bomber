import { Enemy } from './Enemy.js';
import { BASE_PLAYER_SPEED_TPS } from '../constants.js';
import { INIT_RANGE } from '../constants.js';

const BOMBER_PLANT_DIST = 4;
const BOMBER_BOMB_TIMER = 3000;
const RETREAT_TILES = 3;

export class BomberEnemy extends Enemy {
  constructor(scene, tx, ty) {
    super(scene, tx, ty, 'bomber');
    this.hp = 1;
    this._retreating = false;
    this._bombCooldown = 0;
  }

  getMoveMs() {
    // 0.6× base ≈ 417ms per tile
    return (1000 / BASE_PLAYER_SPEED_TPS) / 0.6;
  }

  onRepath(gameScene) {
    const target = this._nearestPlayer(gameScene);
    if (!target) return;

    const dist = Math.abs(target.tx - this.tx) + Math.abs(target.ty - this.ty);

    if (this._retreating) {
      // Move away from nearest player
      this._retreatFrom(target, gameScene);
      return;
    }

    if (dist <= BOMBER_PLANT_DIST && this._bombCooldown <= 0) {
      // Plant a bomb and retreat
      this._plantBomb(gameScene);
      this._retreating = true;
      this._retreatTimer = 2000;
      this._retreatFrom(target, gameScene);
    } else {
      this.repath(target.tx, target.ty, gameScene);
    }
  }

  _plantBomb(gameScene) {
    const { bombManager } = gameScene;
    if (bombManager) {
      bombManager.placeEnemyBomb(this.tx, this.ty, INIT_RANGE, BOMBER_BOMB_TIMER);
    }
  }

  _retreatFrom(target, gameScene) {
    // Find a tile farthest from the target
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const passableFn = this._makePassableFn(gameScene);

    let bestDir = null;
    let bestDist = -1;

    for (const [dx, dy] of dirs) {
      const nx = this.tx + dx;
      const ny = this.ty + dy;
      if (!passableFn(nx, ny)) continue;
      const d = Math.abs(nx - target.tx) + Math.abs(ny - target.ty);
      if (d > bestDist) {
        bestDist = d;
        bestDir = { tx: nx, ty: ny };
      }
    }

    if (bestDir) {
      this.path = [bestDir];
    }
  }

  update(time, delta, gameScene) {
    if (!this.alive) return;

    if (this._bombCooldown > 0) {
      this._bombCooldown -= delta;
      if (this._bombCooldown < 0) this._bombCooldown = 0;
    }

    if (this._retreating) {
      this._retreatTimer -= delta;
      if (this._retreatTimer <= 0) {
        this._retreating = false;
        this._bombCooldown = 3000; // cooldown before next bomb
      }
    }

    super.update(time, delta, gameScene);
  }
}
