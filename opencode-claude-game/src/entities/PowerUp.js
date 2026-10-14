import Phaser from 'phaser';
import { POWERUP } from '../constants.js';
import { tileToWorld } from '../utils/Grid.js';

export default class PowerUp extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} row
   * @param {number} col
   * @param {string} type - one of POWERUP values
   */
  constructor(scene, row, col, type) {
    const { x, y } = tileToWorld(row, col);
    super(scene, x, y, `powerup_${type}`);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(3);

    this.row = row;
    this.col = col;
    this.type = type;

    this.body.setSize(24, 24);

    // Gentle bob animation
    scene.tweens.add({
      targets: this,
      y: y - 4,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Label text
    const labels = {
      [POWERUP.BOMB]:   '+B',
      [POWERUP.RANGE]:  '+R',
      [POWERUP.SPEED]:  '+S',
      [POWERUP.KICK]:   'K',
      [POWERUP.SHIELD]: 'SH',
    };
    this._label = scene.add.text(x, y, labels[type] ?? '?', {
      fontSize: '9px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4);

    scene.tweens.add({
      targets: this._label,
      y: y - 4,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  destroy(fromScene) {
    try {
      if (this._label && this._label.scene) this._label.destroy();
    } catch (_) { /* already gone */ }
    super.destroy(fromScene);
  }
}

// ── Weighted random power-up picker ──────────────────────────────────

const WALL_WEIGHTS = [
  { type: POWERUP.BOMB,  w: 30 },
  { type: POWERUP.RANGE, w: 30 },
  { type: POWERUP.SPEED, w: 25 },
  { type: POWERUP.KICK,  w: 15 },
];

const ENEMY_WEIGHTS = [
  { type: POWERUP.BOMB,   w: 20 },
  { type: POWERUP.RANGE,  w: 20 },
  { type: POWERUP.SPEED,  w: 25 },
  { type: POWERUP.KICK,   w: 20 },
  { type: POWERUP.SHIELD, w: 15 },
];

function pickWeighted(table) {
  const total = table.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const entry of table) {
    r -= entry.w;
    if (r <= 0) return entry.type;
  }
  return table[table.length - 1].type;
}

export function pickWallDrop()  { return pickWeighted(WALL_WEIGHTS); }
export function pickEnemyDrop() { return pickWeighted(ENEMY_WEIGHTS); }
