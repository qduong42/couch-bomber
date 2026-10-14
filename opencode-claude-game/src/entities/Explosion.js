import Phaser from 'phaser';
import { FLAME_LIFETIME_MS } from '../constants.js';
import { tileToWorld } from '../utils/Grid.js';

/**
 * A single flame tile sprite placed during an explosion.
 * Managed by GameScene; sits in physics group for overlap detection.
 */
export default class Explosion extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} row
   * @param {number} col
   * @param {'center'|'arm_h'|'arm_v'|'tip_up'|'tip_down'|'tip_left'|'tip_right'} variant
   * @param {Player|null} owner - player who placed the bomb (for KO credit)
   */
  constructor(scene, row, col, variant, owner) {
    const { x, y } = tileToWorld(row, col);
    const texKey = `flame_${variant}`;
    super(scene, x, y, texKey);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setDepth(4);

    this.row = row;
    this.col = col;
    this.owner = owner;
    this.lifeRemaining = FLAME_LIFETIME_MS;

    // Shrink body to avoid edges
    this.body.setSize(28, 28);

    // Fade out near end of life
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0 },
      duration: FLAME_LIFETIME_MS,
      ease: 'Linear',
    });
  }

  update(delta) {
    this.lifeRemaining -= delta;
    if (this.lifeRemaining <= 0) {
      this.destroy();
    }
  }

  destroy(fromScene) {
    try {
      if (this.scene && this.scene.onFlameDestroyed) {
        this.scene.onFlameDestroyed(this);
      }
    } catch (_) { /* scene already gone */ }
    super.destroy(fromScene);
  }
}
