import Phaser from 'phaser';
import { PLAYER_COLORS } from '../constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // floor — dark gray
    g.fillStyle(0x2a2a2a);
    g.fillRect(0, 0, 32, 32);
    g.lineStyle(1, 0x1a1a1a, 1);
    g.strokeRect(0, 0, 32, 32);
    g.generateTexture('floor', 32, 32);
    g.clear();

    // wall — charcoal with inner shadow
    g.fillStyle(0x555566);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x444455);
    g.fillRect(2, 2, 28, 28);
    g.fillStyle(0x333344);
    g.fillRect(4, 4, 24, 24);
    g.generateTexture('wall', 32, 32);
    g.clear();

    // softwall — brownish with lighter border
    g.fillStyle(0x886644);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0xaa8855);
    g.fillRect(3, 3, 26, 26);
    g.fillStyle(0x997755);
    g.fillRect(6, 6, 20, 20);
    g.generateTexture('softwall', 32, 32);
    g.clear();

    // bomb — dark with circle and fuse
    g.fillStyle(0x222222);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x111111);
    g.fillCircle(16, 18, 12);
    g.fillStyle(0x333333);
    g.fillCircle(16, 18, 10);
    g.fillStyle(0x888888);
    g.fillRect(15, 6, 2, 10); // fuse
    g.fillStyle(0xffffff);
    g.fillCircle(16, 6, 2); // fuse tip
    g.generateTexture('bomb', 32, 32);
    g.clear();

    // flame — orange/red layers
    g.fillStyle(0xff6600);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0xff3300);
    g.fillRect(4, 4, 24, 24);
    g.fillStyle(0xffaa00);
    g.fillCircle(16, 16, 8);
    g.fillStyle(0xffee00);
    g.fillCircle(16, 16, 4);
    g.generateTexture('flame', 32, 32);
    g.clear();

    // players — colored circles with eyes
    PLAYER_COLORS.forEach((color, i) => {
      g.fillStyle(0x111111);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(color);
      g.fillCircle(16, 16, 13);
      // Darker shade for body detail
      g.fillStyle(Math.max(0, color - 0x333333));
      g.fillCircle(16, 20, 8);
      // Eyes
      g.fillStyle(0xffffff);
      g.fillCircle(11, 13, 3);
      g.fillCircle(21, 13, 3);
      // Pupils
      g.fillStyle(0x111111);
      g.fillCircle(12, 13, 1.5);
      g.fillCircle(22, 13, 1.5);
      g.generateTexture(`player_${i}`, 32, 32);
      g.clear();
    });

    // enemies — colored squares with markings
    [
      ['enemy_chaser', 0xcc2222],
      ['enemy_runner', 0xff8888],
      ['enemy_zigzagger', 0xcc44cc],
      ['enemy_bomber', 0x882222],
    ].forEach(([key, color]) => {
      g.fillStyle(0x111111);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(color);
      g.fillRect(4, 4, 24, 24);
      g.fillStyle(0x111111);
      g.fillRect(8, 8, 16, 16);
      g.fillStyle(color);
      g.fillRect(10, 10, 12, 12);
      // Eyes
      g.fillStyle(0xffffff);
      g.fillRect(10, 10, 4, 4);
      g.fillRect(18, 10, 4, 4);
      g.generateTexture(key, 32, 32);
      g.clear();
    });

    // powerups — colored circles
    [
      ['pu_bomb', 0xffff00],
      ['pu_range', 0x00ffff],
      ['pu_speed', 0x00ff00],
      ['pu_kick', 0xaa00ff],
      ['pu_shield', 0xffd700],
    ].forEach(([key, color]) => {
      g.fillStyle(0x111111);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(color);
      g.fillCircle(16, 16, 12);
      g.fillStyle(0x111111);
      g.fillCircle(16, 16, 8);
      g.fillStyle(color);
      g.fillCircle(16, 16, 5);
      g.generateTexture(key, 32, 32);
      g.clear();
    });

    g.destroy();

    this.scene.start('MenuScene');
  }
}
