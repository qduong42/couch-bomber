import { Enemy } from './Enemy.js';
import { BASE_PLAYER_SPEED_TPS } from '../constants.js';

export class Zigzagger extends Enemy {
  constructor(scene, tx, ty) {
    super(scene, tx, ty, 'zigzagger');
    this.hp = 2;
    this._dir = this._randomDir();
    this._pauseTimer = 0;
    this._paused = false;
  }

  getMoveMs() {
    // 0.8× base = 313ms per tile
    return (1000 / BASE_PLAYER_SPEED_TPS) / 0.8;
  }

  _randomDir() {
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  onRepath(gameScene) {
    // Zigzagger doesn't use BFS — handled in onStep
  }

  onStep(gameScene) {
    if (this.moving) return;

    if (this._paused) return;

    const [dx, dy] = this._dir;
    const nx = this.tx + dx;
    const ny = this.ty + dy;

    const passableFn = this._makePassableFn(gameScene);
    if (passableFn(nx, ny)) {
      this._moveTo(nx, ny);
    } else {
      // Hit something — pause 300ms and pick new dir
      this._paused = true;
      this.scene.time.delayedCall(300, () => {
        this._paused = false;
        // Prefer 90° turn
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        const passable = dirs.filter(([ddx, ddy]) => passableFn(this.tx + ddx, this.ty + ddy));
        if (passable.length > 0) {
          // Prefer directions not opposite of current
          const [cdx, cdy] = this._dir;
          const notOpposite = passable.filter(([ddx, ddy]) => !(ddx === -cdx && ddy === -cdy));
          const choices = notOpposite.length > 0 ? notOpposite : passable;
          this._dir = choices[Math.floor(Math.random() * choices.length)];
        }
      });
    }
  }
}
