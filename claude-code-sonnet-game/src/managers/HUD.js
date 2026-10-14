import { GAME_W, HUD_HEIGHT, PLAYER_COLORS } from '../constants.js';

export class HUD {
  constructor(scene, players, mode) {
    this.scene = scene;
    this.players = players;
    this.mode = mode;

    this.playerCells = [];
    this.centerText = null;
    this.graphics = null;

    this._build();
  }

  _build() {
    const scene = this.scene;
    const n = this.players.length;
    const cellW = Math.floor(GAME_W / n);

    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(10);

    // Background
    this.graphics.fillStyle(0x111111, 1);
    this.graphics.fillRect(0, 0, GAME_W, HUD_HEIGHT);

    // Bottom border
    this.graphics.lineStyle(2, 0x444444, 1);
    this.graphics.strokeRect(0, 0, GAME_W, HUD_HEIGHT);

    // Player cells
    for (let i = 0; i < n; i++) {
      const x = i * cellW;
      const player = this.players[i];
      const color = PLAYER_COLORS[i];

      // Color bar on left
      this.graphics.fillStyle(color, 1);
      this.graphics.fillRect(x + 2, 4, 6, HUD_HEIGHT - 8);

      // Dividers
      if (i > 0) {
        this.graphics.lineStyle(1, 0x333333, 1);
        this.graphics.lineBetween(x, 0, x, HUD_HEIGHT);
      }

      // Player label
      const label = scene.add.text(x + 14, 6, `P${i + 1}`, {
        fontSize: '11px',
        color: '#' + color.toString(16).padStart(6, '0'),
        fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(11);

      // Lives text
      const livesText = scene.add.text(x + 14, 20, '♥♥♥', {
        fontSize: '11px',
        color: '#ff6666',
        fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(11);

      // Stats text
      const statsText = scene.add.text(x + 14, 36, 'B:1 R:1 S:0', {
        fontSize: '10px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(11);

      // Power-up indicators
      const puText = scene.add.text(x + 14, 50, '', {
        fontSize: '9px',
        color: '#ffdd44',
        fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(11);

      this.playerCells.push({ label, livesText, statsText, puText, player, x, cellW });
    }

    // Center mode text
    this.centerText = scene.add.text(GAME_W / 2, HUD_HEIGHT / 2, '', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(11).setOrigin(0.5, 0.5);
  }

  update(waveInfo) {
    for (const cell of this.playerCells) {
      const p = cell.player;

      // Lives
      if (!p.eliminated) {
        const hearts = '♥'.repeat(p.lives) + '♡'.repeat(Math.max(0, 3 - p.lives));
        cell.livesText.setText(hearts);
        cell.livesText.setColor(p.lives > 1 ? '#ff6666' : '#ff2222');
      } else {
        cell.livesText.setText('✗ OUT');
        cell.livesText.setColor('#666666');
      }

      // Stats
      cell.statsText.setText(`B:${p.maxBombs} R:${p.bombRange} S:${p.speedStacks}`);

      // Power-up indicators
      const pus = [];
      if (p.hasKick) pus.push('KICK');
      if (p.hasShield) pus.push('SHIELD');
      cell.puText.setText(pus.join(' '));
    }

    // Center text
    if (this.mode === 'coop') {
      if (waveInfo) {
        this.centerText.setText(`WAVE ${waveInfo.wave}/${waveInfo.max}`);
      }
    } else {
      const alive = this.players.filter(p => !p.eliminated).length;
      this.centerText.setText(`VERSUS · ${alive} alive`);
    }
  }

  showPopup(text, color = '#ffffff') {
    const popup = this.scene.add.text(GAME_W / 2, HUD_HEIGHT + 20, text, {
      fontSize: '18px',
      color,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(20).setOrigin(0.5, 0.5);

    this.scene.tweens.add({
      targets: popup,
      y: HUD_HEIGHT + 60,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
    if (this.centerText) this.centerText.destroy();
    for (const cell of this.playerCells) {
      cell.label.destroy();
      cell.livesText.destroy();
      cell.statsText.destroy();
      cell.puText.destroy();
    }
  }
}
