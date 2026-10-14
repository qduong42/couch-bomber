import Phaser from 'phaser';
import { PLAYER_COLORS, TILE_SIZE } from '../constants.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    const g = this.make.graphics({ add: false });
    const S = TILE_SIZE; // 32

    // ── Floor ──────────────────────────────────────────────────────────
    g.fillStyle(0x3d5c3d);
    g.fillRect(0, 0, S, S);
    g.lineStyle(1, 0x2e4a2e);
    g.strokeRect(0.5, 0.5, S - 1, S - 1);
    g.generateTexture('floor', S, S);
    g.clear();

    // ── Hard Wall ──────────────────────────────────────────────────────
    g.fillStyle(0x444455);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x555566);
    g.fillRect(2, 2, S - 4, S - 4);
    g.lineStyle(1, 0x333344);
    g.strokeRect(0.5, 0.5, S - 1, S - 1);
    g.generateTexture('wall', S, S);
    g.clear();

    // ── Soft Wall (destructible) ────────────────────────────────────────
    g.fillStyle(0x8b5e3c);
    g.fillRect(0, 0, S, S);
    // Brick grid lines
    g.lineStyle(1, 0x5c3a1e);
    g.lineBetween(0, S / 2, S, S / 2);
    g.lineBetween(S / 2, 0, S / 2, S / 2);
    g.lineBetween(S / 4, S / 2, S / 4, S);
    g.lineBetween(3 * S / 4, S / 2, 3 * S / 4, S);
    g.lineStyle(1, 0x3d200a);
    g.strokeRect(0.5, 0.5, S - 1, S - 1);
    g.generateTexture('soft_wall', S, S);
    g.clear();

    // ── Bomb ───────────────────────────────────────────────────────────
    g.fillStyle(0x111111);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x222222);
    g.fillCircle(S / 2, S / 2 + 2, 12);
    g.fillStyle(0x888888);
    g.fillCircle(S / 2 - 3, S / 2 - 2, 3); // shine
    g.lineStyle(3, 0xffaa00);
    g.lineBetween(S / 2, S / 2 - 10, S / 2 + 5, S / 2 - 15);
    g.fillStyle(0xff6600);
    g.fillCircle(S / 2 + 6, S / 2 - 16, 3);
    g.generateTexture('bomb', S, S);
    g.clear();

    // ── Bomb ticking (slightly brighter) ───────────────────────────────
    g.fillStyle(0x221100);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x444444);
    g.fillCircle(S / 2, S / 2 + 2, 12);
    g.fillStyle(0xaaaaaa);
    g.fillCircle(S / 2 - 3, S / 2 - 2, 3);
    g.lineStyle(3, 0xff8800);
    g.lineBetween(S / 2, S / 2 - 10, S / 2 + 5, S / 2 - 15);
    g.fillStyle(0xffcc00);
    g.fillCircle(S / 2 + 6, S / 2 - 16, 4);
    g.generateTexture('bomb_lit', S, S);
    g.clear();

    // ── Flame center ───────────────────────────────────────────────────
    g.fillStyle(0xff3300);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0xff8800);
    g.fillRect(4, 4, S - 8, S - 8);
    g.fillStyle(0xffee00);
    g.fillRect(9, 9, S - 18, S - 18);
    g.generateTexture('flame_center', S, S);
    g.clear();

    // ── Flame arm horizontal ───────────────────────────────────────────
    g.fillStyle(0xff3300);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0xff8800);
    g.fillRect(0, 5, S, S - 10);
    g.fillStyle(0xffee00);
    g.fillRect(0, 10, S, S - 20);
    g.generateTexture('flame_arm_h', S, S);
    g.clear();

    // ── Flame arm vertical ─────────────────────────────────────────────
    g.fillStyle(0xff3300);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0xff8800);
    g.fillRect(5, 0, S - 10, S);
    g.fillStyle(0xffee00);
    g.fillRect(10, 0, S - 20, S);
    g.generateTexture('flame_arm_v', S, S);
    g.clear();

    // ── Flame tip up ───────────────────────────────────────────────────
    g.fillStyle(0xff3300);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0xff8800);
    g.fillRect(5, 0, S - 10, S);
    g.fillStyle(0xffee00);
    g.fillTriangle(S / 2, 2, 9, S - 6, S - 9, S - 6);
    g.generateTexture('flame_tip_up', S, S);
    g.clear();

    // ── Flame tip down ─────────────────────────────────────────────────
    g.fillStyle(0xff3300);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0xff8800);
    g.fillRect(5, 0, S - 10, S);
    g.fillStyle(0xffee00);
    g.fillTriangle(S / 2, S - 2, 9, 6, S - 9, 6);
    g.generateTexture('flame_tip_down', S, S);
    g.clear();

    // ── Flame tip left ─────────────────────────────────────────────────
    g.fillStyle(0xff3300);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0xff8800);
    g.fillRect(0, 5, S, S - 10);
    g.fillStyle(0xffee00);
    g.fillTriangle(2, S / 2, S - 6, 9, S - 6, S - 9);
    g.generateTexture('flame_tip_left', S, S);
    g.clear();

    // ── Flame tip right ────────────────────────────────────────────────
    g.fillStyle(0xff3300);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0xff8800);
    g.fillRect(0, 5, S, S - 10);
    g.fillStyle(0xffee00);
    g.fillTriangle(S - 2, S / 2, 6, 9, 6, S - 9);
    g.generateTexture('flame_tip_right', S, S);
    g.clear();

    // ── Players (4 palettes) ───────────────────────────────────────────
    const eyeOffsets = [[-5, -3], [5, -3]];
    for (let i = 0; i < 4; i++) {
      const col = PLAYER_COLORS[i];
      g.fillStyle(0x000000);
      g.fillRect(0, 0, S, S);
      g.fillStyle(col);
      g.fillRoundedRect(3, 3, S - 6, S - 6, 5);
      // Eyes
      g.fillStyle(0xffffff);
      for (const [ex, ey] of eyeOffsets) {
        g.fillCircle(S / 2 + ex, S / 2 + ey, 3);
      }
      g.fillStyle(0x000000);
      for (const [ex, ey] of eyeOffsets) {
        g.fillCircle(S / 2 + ex + 0.5, S / 2 + ey + 0.5, 1.5);
      }
      g.generateTexture(`player_${i + 1}`, S, S);
      g.clear();

      // Ghost (invulnerable) – lighter / semi-transparent look
      g.fillStyle(0x000000);
      g.fillRect(0, 0, S, S);
      g.fillStyle(col, 0.4);
      g.fillRoundedRect(3, 3, S - 6, S - 6, 5);
      g.generateTexture(`player_${i + 1}_ghost`, S, S);
      g.clear();
    }

    // ── Power-ups ──────────────────────────────────────────────────────
    const puDefs = [
      { key: 'powerup_bomb',   color: 0x00cc44, label: '+B' },
      { key: 'powerup_range',  color: 0x2266ff, label: '+R' },
      { key: 'powerup_speed',  color: 0xeeee00, label: '+S' },
      { key: 'powerup_kick',   color: 0xff6600, label: 'K'  },
      { key: 'powerup_shield', color: 0x88aaff, label: 'SH' },
    ];
    for (const { key, color } of puDefs) {
      g.fillStyle(0x000000);
      g.fillRect(0, 0, S, S);
      g.fillStyle(color);
      g.fillRoundedRect(3, 3, S - 6, S - 6, 6);
      g.lineStyle(2, 0xffffff);
      g.strokeRoundedRect(3, 3, S - 6, S - 6, 6);
      g.generateTexture(key, S, S);
      g.clear();
    }

    // ── Enemies ────────────────────────────────────────────────────────
    // Chaser – red rhombus
    g.fillStyle(0x000000);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0xcc0000);
    g.fillTriangle(S / 2, 2, S - 2, S / 2, S / 2, S - 2);
    g.fillTriangle(S / 2, 2, 2, S / 2, S / 2, S - 2);
    g.fillStyle(0xff4444);
    g.fillCircle(S / 2, S / 2, 5);
    g.generateTexture('enemy_chaser', S, S);
    g.clear();

    // Runner – green pentagon-ish
    g.fillStyle(0x000000);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x00aa44);
    g.fillCircle(S / 2, S / 2, 13);
    g.fillStyle(0x00ff88);
    g.fillCircle(S / 2, S / 2, 7);
    g.fillStyle(0xffffff);
    g.fillCircle(S / 2 - 3, S / 2 - 2, 2);
    g.fillCircle(S / 2 + 3, S / 2 - 2, 2);
    g.generateTexture('enemy_runner', S, S);
    g.clear();

    // Zigzagger – blue square rotated
    g.fillStyle(0x000000);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x2244cc);
    g.fillRect(4, 4, S - 8, S - 8);
    g.fillStyle(0x88aaff);
    g.fillRect(8, 8, S - 16, S - 16);
    g.generateTexture('enemy_zigzagger', S, S);
    g.clear();

    // Bomber – purple with bomb icon
    g.fillStyle(0x000000);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x882299);
    g.fillCircle(S / 2, S / 2, 13);
    g.fillStyle(0x333333);
    g.fillCircle(S / 2, S / 2 + 2, 7);
    g.lineStyle(2, 0xffaa00);
    g.lineBetween(S / 2, S / 2 - 6, S / 2 + 3, S / 2 - 10);
    g.generateTexture('enemy_bomber', S, S);
    g.clear();

    g.destroy();

    this.scene.start('MenuScene');
  }
}
