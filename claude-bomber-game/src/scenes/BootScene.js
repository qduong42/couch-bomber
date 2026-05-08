import Phaser from 'phaser';
import { TILE, PLAYER_COLORS, POWERUP_COLORS, POWERUP_LETTERS } from '../config.js';

// Generates simple textures procedurally so the game has no external asset deps.
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.makeTile('floor', 0x2a2a3a, 0x33334a);
    this.makeWall('wall', 0x555566, 0x33334a);
    this.makeWall('pillar', 0x4a4a5a, 0x2a2a3a);
    this.makeSoftWall('softWall');
    this.makeBomb('bomb');
    this.makeFlame('flame', 0xffaa33);
    this.makeFlame('flameCore', 0xffee88);

    PLAYER_COLORS.forEach((c, i) => this.makePlayer(`player${i}`, c));
    this.makeEnemy('enemyChaser', 0xb03030);

    Object.keys(POWERUP_COLORS).forEach((k) => {
      this.makePowerup(`pu_${k}`, POWERUP_COLORS[k], POWERUP_LETTERS[k]);
    });

    this.scene.start('Menu');
  }

  makeTile(key, fill, line) {
    const g = this.add.graphics();
    g.fillStyle(fill, 1).fillRect(0, 0, TILE, TILE);
    g.lineStyle(1, line, 0.6).strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  makeWall(key, fill, shadow) {
    const g = this.add.graphics();
    g.fillStyle(fill, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(shadow, 1).fillRect(0, TILE - 4, TILE, 4).fillRect(TILE - 4, 0, 4, TILE);
    g.lineStyle(1, 0x111118, 1).strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  makeSoftWall(key) {
    const g = this.add.graphics();
    g.fillStyle(0x8a5a2a, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x6a4520, 1);
    g.fillRect(2, 2, 12, 6).fillRect(16, 2, 14, 6);
    g.fillRect(2, 12, 16, 6).fillRect(20, 12, 10, 6);
    g.fillRect(2, 22, 12, 8).fillRect(16, 22, 14, 8);
    g.lineStyle(1, 0x2a1a08, 1).strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  makeBomb(key) {
    const g = this.add.graphics();
    g.fillStyle(0x111111, 1).fillCircle(TILE / 2, TILE / 2 + 2, TILE / 2 - 4);
    g.fillStyle(0x6a3a10, 1).fillRect(TILE / 2 - 1, 4, 2, 6);
    g.fillStyle(0xff5522, 1).fillCircle(TILE / 2, 4, 2);
    g.lineStyle(1, 0x444444, 1).strokeCircle(TILE / 2 - 4, TILE / 2, 2);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  makeFlame(key, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 1).fillRect(2, 2, TILE - 4, TILE - 4);
    g.fillStyle(0xffffff, 0.6).fillRect(8, 8, TILE - 16, TILE - 16);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  makePlayer(key, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 1).fillRoundedRect(4, 4, TILE - 8, TILE - 8, 4);
    g.fillStyle(0xffffff, 1).fillRect(10, 12, 4, 4).fillRect(18, 12, 4, 4);
    g.fillStyle(0x000000, 1).fillRect(11, 13, 2, 2).fillRect(19, 13, 2, 2);
    g.lineStyle(1, 0x000000, 0.7).strokeRoundedRect(4, 4, TILE - 8, TILE - 8, 4);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  makeEnemy(key, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 1).fillCircle(TILE / 2, TILE / 2, TILE / 2 - 4);
    g.fillStyle(0xffff00, 1).fillRect(10, 12, 3, 3).fillRect(19, 12, 3, 3);
    g.lineStyle(1, 0x000000, 0.7).strokeCircle(TILE / 2, TILE / 2, TILE / 2 - 4);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  makePowerup(key, color, letter) {
    const g = this.add.graphics();
    g.fillStyle(0x111122, 1).fillRoundedRect(2, 2, TILE - 4, TILE - 4, 4);
    g.fillStyle(color, 1).fillRoundedRect(5, 5, TILE - 10, TILE - 10, 3);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
    // letter is rendered separately as a Text object on pickup sprites.
  }
}
