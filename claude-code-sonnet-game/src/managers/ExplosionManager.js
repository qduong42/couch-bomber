import { Explosion } from '../entities/Explosion.js';

export class ExplosionManager {
  constructor() {
    this.flames = []; // List of Explosion instances
  }

  addFlame(scene, tx, ty, time) {
    const explosion = new Explosion(scene, tx, ty, time);
    this.flames.push(explosion);
  }

  update(time) {
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const flame = this.flames[i];
      if (!flame.isActive(time)) {
        flame.destroy();
        this.flames.splice(i, 1);
      }
    }
  }

  isFlame(tx, ty, time) {
    for (const flame of this.flames) {
      if (flame.tx === tx && flame.ty === ty && flame.isActive(time)) {
        return true;
      }
    }
    return false;
  }

  getAllFlames(time) {
    return this.flames.filter(f => f.isActive(time));
  }

  destroy() {
    for (const flame of this.flames) flame.destroy();
    this.flames = [];
  }
}
