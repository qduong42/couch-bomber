import { tileToWorld } from '../util/Grid.js';

export const POWERUP_TYPES = ['bomb', 'range', 'speed', 'kick', 'shield'];

export class PowerUp {
  constructor(scene, tx, ty, type) {
    this.tx = tx;
    this.ty = ty;
    this.type = type;
    this.alive = true;

    const pos = tileToWorld(tx, ty);
    this.sprite = scene.add.image(pos.x, pos.y, `pu_${type}`).setDepth(1);

    // Gentle bob animation
    scene.tweens.add({
      targets: this.sprite,
      y: pos.y - 4,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  destroy() {
    this.alive = false;
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
