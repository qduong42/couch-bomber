import { TILE, BOMB_FUSE_MS } from '../config.js';
import { tileToPxX, tileToPxY } from '../managers/TilemapManager.js';

export default class Bomb {
  constructor(scene, owner, gx, gy, range) {
    this.scene = scene;
    this.owner = owner;
    this.gx = gx;
    this.gy = gy;
    this.range = range;
    this.fuse = BOMB_FUSE_MS;
    this.exploded = false;
    this.kicking = false;
    this.kickDx = 0;
    this.kickDy = 0;
    this.passThroughPlayers = new Set([owner.index]);
    this.sprite = scene.add.image(tileToPxX(gx), tileToPxY(gy), 'bomb').setDepth(4);
  }

  update(dt) {
    if (this.exploded) return;
    this.fuse -= dt;
    // Pulse scale as fuse runs out.
    const t = Math.max(0, this.fuse) / BOMB_FUSE_MS;
    const scale = 1.0 + 0.12 * Math.sin(performance.now() / (60 + t * 240));
    this.sprite.setScale(scale, scale);
    if (this.fuse <= 0) this.scene.detonateBomb(this);
  }

  destroy() {
    this.exploded = true;
    this.sprite.destroy();
  }
}
