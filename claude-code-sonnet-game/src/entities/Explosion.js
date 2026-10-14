import { FLAME_LIFETIME_MS } from '../constants.js';
import { tileToWorld } from '../util/Grid.js';

export class Explosion {
  constructor(scene, tx, ty, time) {
    this.tx = tx;
    this.ty = ty;
    this.expiresAt = time + FLAME_LIFETIME_MS;
    this.alive = true;

    const pos = tileToWorld(tx, ty);
    this.sprite = scene.add.image(pos.x, pos.y, 'flame').setDepth(2).setAlpha(0.9);

    // Fade out near end
    scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: FLAME_LIFETIME_MS * 0.4,
      delay: FLAME_LIFETIME_MS * 0.6,
    });
  }

  isActive(time) {
    return this.alive && time < this.expiresAt;
  }

  destroy() {
    this.alive = false;
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
