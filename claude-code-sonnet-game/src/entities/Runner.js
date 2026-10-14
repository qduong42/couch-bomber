import { Enemy } from './Enemy.js';
import { BASE_PLAYER_SPEED_TPS } from '../constants.js';
import { tileToWorld } from '../util/Grid.js';

export class Runner extends Enemy {
  constructor(scene, tx, ty) {
    super(scene, tx, ty, 'runner');
    this.hp = 1;
    this._chasing = false;
  }

  getMoveMs() {
    // 1.5× base ≈ 167ms per tile
    return (1000 / BASE_PLAYER_SPEED_TPS) / 1.5;
  }

  onRepath(gameScene) {
    const target = this._nearestPlayer(gameScene);
    if (!target) {
      this._chasing = false;
      return;
    }

    const dist = Math.abs(target.tx - this.tx) + Math.abs(target.ty - this.ty);

    // Check line of sight (same row or column within 4 tiles)
    const los = (target.tx === this.tx || target.ty === this.ty) && dist <= 4;

    if (los || dist <= 4) {
      this._chasing = true;
      this.repath(target.tx, target.ty, gameScene);
    } else {
      this._chasing = false;
      // Random walk: pick a random adjacent passable tile
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      const passableFn = this._makePassableFn(gameScene);
      const valid = dirs.filter(([dx, dy]) => passableFn(this.tx + dx, this.ty + dy));
      if (valid.length > 0) {
        const [dx, dy] = valid[Math.floor(Math.random() * valid.length)];
        this.path = [{ tx: this.tx + dx, ty: this.ty + dy }];
      }
    }
  }

  onStep(gameScene) {
    this.stepPath(gameScene);
  }
}
