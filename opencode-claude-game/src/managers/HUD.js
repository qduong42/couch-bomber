import Phaser from 'phaser';
import { GAME_WIDTH, HUD_HEIGHT, PLAYER_COLORS, PLAYER_COLOR_NAMES, MODE } from '../constants.js';

export default class HUD {
  /**
   * @param {Phaser.Scene} scene
   * @param {Player[]} players
   * @param {string} mode
   */
  constructor(scene, players, mode) {
    this.scene = scene;
    this.players = players;
    this.mode = mode;

    // Background strip
    scene.add.rectangle(GAME_WIDTH / 2, HUD_HEIGHT / 2, GAME_WIDTH, HUD_HEIGHT, 0x111122)
      .setDepth(10).setScrollFactor(0);
    scene.add.rectangle(GAME_WIDTH / 2, HUD_HEIGHT - 1, GAME_WIDTH, 2, 0x333355)
      .setDepth(10).setScrollFactor(0);

    // Per-player cells
    this._cells = [];
    const n = players.length;
    const cellW = Math.floor(GAME_WIDTH / n);

    players.forEach((p, i) => {
      const cx = cellW * i + cellW / 2;
      const colorHex = '#' + PLAYER_COLORS[i].toString(16).padStart(6, '0');

      // Color square
      scene.add.rectangle(cellW * i + 6, HUD_HEIGHT / 2, 10, 10, PLAYER_COLORS[i])
        .setOrigin(0, 0.5).setDepth(11).setScrollFactor(0);

      // Player label
      scene.add.text(cellW * i + 20, HUD_HEIGHT / 2 - 14, `P${i + 1}`, {
        fontSize: '9px', fontFamily: 'monospace', color: colorHex,
      }).setOrigin(0, 0.5).setDepth(11).setScrollFactor(0);

      // Lives text
      const livesText = scene.add.text(cellW * i + 20, HUD_HEIGHT / 2 - 2, '♥♥♥', {
        fontSize: '10px', fontFamily: 'monospace', color: '#ff6666',
      }).setOrigin(0, 0.5).setDepth(11).setScrollFactor(0);

      // Stats (bomb/range/speed)
      const statsText = scene.add.text(cellW * i + 20, HUD_HEIGHT / 2 + 12, '', {
        fontSize: '8px', fontFamily: 'monospace', color: '#aaaaaa',
      }).setOrigin(0, 0.5).setDepth(11).setScrollFactor(0);

      this._cells.push({ livesText, statsText });
    });

    // Center info (mode / wave)
    this._centerText = scene.add.text(GAME_WIDTH / 2, HUD_HEIGHT / 2, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#cccccc',
    }).setOrigin(0.5).setDepth(11).setScrollFactor(0);

    // Popup container
    this._popups = [];

    this.update();
  }

  update() {
    this.players.forEach((p, i) => {
      const cell = this._cells[i];
      if (!cell) return;

      // Lives hearts
      const hearts = p.alive ? '♥'.repeat(Math.max(0, p.lives)) : '✕';
      cell.livesText.setText(hearts);
      cell.livesText.setColor(p.alive ? '#ff6666' : '#555555');

      // Stats
      const statsLine = [
        `B:${p.maxBombs}`,
        `R:${p.range}`,
        `S:${p.speedStacks}`,
        p.hasKick    ? 'K' : '',
        p.shieldCount > 0 ? 'SH' : '',
      ].filter(Boolean).join(' ');
      cell.statsText.setText(statsLine);
    });
  }

  setCenter(text) {
    this._centerText.setText(text);
  }

  showPopup(text, color = '#ffffff') {
    const y0 = HUD_HEIGHT + 20;
    const popup = this.scene.add.text(GAME_WIDTH / 2, y0, text, {
      fontSize: '14px', fontFamily: 'monospace',
      color,
      stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

    // Slide up then fade
    this.scene.tweens.add({
      targets: popup,
      y: y0 - 40,
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: 'Sine.easeIn',
      onComplete: () => popup.destroy(),
    });
  }

  showPauseOverlay() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this._pauseOverlay = this.scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setDepth(30).setScrollFactor(0);

    this._pauseText = this.scene.add.text(cx, cy - 20, 'PAUSED', {
      fontSize: '32px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(31).setScrollFactor(0);

    this._pauseSub = this.scene.add.text(cx, cy + 24, 'Press ESC to resume', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(31).setScrollFactor(0);
  }

  hidePauseOverlay() {
    if (this._pauseOverlay) { this._pauseOverlay.destroy(); this._pauseOverlay = null; }
    if (this._pauseText)    { this._pauseText.destroy();    this._pauseText = null; }
    if (this._pauseSub)     { this._pauseSub.destroy();     this._pauseSub = null; }
  }
}
