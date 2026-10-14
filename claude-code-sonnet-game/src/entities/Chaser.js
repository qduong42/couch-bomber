import { Enemy } from './Enemy.js';
import { BASE_PLAYER_SPEED_TPS } from '../constants.js';

export class Chaser extends Enemy {
  constructor(scene, tx, ty) {
    super(scene, tx, ty, 'chaser');
    this.hp = 1;
  }

  getMoveMs() {
    // 0.5× base = 500ms per tile
    return (1000 / BASE_PLAYER_SPEED_TPS) * 2;
  }

  onRepath(gameScene) {
    const target = this._nearestPlayer(gameScene);
    if (target) {
      this.repath(target.tx, target.ty, gameScene);
    }
  }

  onStep(gameScene) {
    this.stepPath(gameScene);
  }
}
