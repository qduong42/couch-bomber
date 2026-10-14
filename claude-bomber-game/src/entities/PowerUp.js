import { POWERUP_LETTERS } from '../config.js';
import { tileToPxX, tileToPxY } from '../managers/TilemapManager.js';

export default class PowerUp {
  constructor(scene, gx, gy, type) {
    this.scene = scene;
    this.gx = gx;
    this.gy = gy;
    this.type = type;
    this.alive = true;
    this.sprite = scene.add.image(tileToPxX(gx), tileToPxY(gy), `pu_${type}`).setDepth(3);
    this.label = scene.add.text(tileToPxX(gx), tileToPxY(gy), POWERUP_LETTERS[type] || '?', {
      fontFamily: 'monospace', fontSize: '14px', color: '#000', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(4);
    scene.tweens.add({
      targets: [this.sprite, this.label],
      y: '-=2', yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut'
    });
  }

  destroy() {
    this.alive = false;
    this.sprite.destroy();
    this.label.destroy();
  }
}
