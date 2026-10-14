import Phaser from 'phaser';
import { GAME_WIDTH, HUD_HEIGHT, PLAYER_COLORS, PLAYER_NAMES, MODES } from '../config.js';

export default class HUD {
  constructor(scene) {
    this.scene = scene;
    this.bg = scene.add.rectangle(0, 0, GAME_WIDTH, HUD_HEIGHT, 0x111118).setOrigin(0).setDepth(20);
    this.cells = [];
    this.popups = [];
  }

  build(players, mode, waveText) {
    const n = players.length;
    const cellW = (GAME_WIDTH - 80) / n;
    players.forEach((p, i) => {
      const x = i * cellW + 8;
      const color = Phaser.Display.Color.IntegerToColor(PLAYER_COLORS[p.index]).rgba;
      const sw = this.scene.add.rectangle(x, 8, 14, 14, PLAYER_COLORS[p.index]).setOrigin(0).setDepth(21);
      const name = this.scene.add.text(x + 18, 5, PLAYER_NAMES[p.index], {
        fontFamily: 'monospace', fontSize: '12px', color
      }).setDepth(21);
      const lives = this.scene.add.text(x, 26, '', {
        fontFamily: 'monospace', fontSize: '11px', color: '#fff'
      }).setDepth(21);
      const stats = this.scene.add.text(x, 40, '', {
        fontFamily: 'monospace', fontSize: '10px', color: '#aaa'
      }).setDepth(21);
      this.cells.push({ player: p, sw, name, lives, stats });
    });

    this.modeLabel = this.scene.add.text(GAME_WIDTH - 8, 6, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffeebb'
    }).setOrigin(1, 0).setDepth(21);
    this.waveLabel = this.scene.add.text(GAME_WIDTH - 8, 22, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffeebb'
    }).setOrigin(1, 0).setDepth(21);
    this.modeLabel.setText(mode === MODES.VERSUS ? 'VERSUS' : 'CO-OP');
  }

  update(waveText) {
    for (const c of this.cells) {
      const p = c.player;
      const hearts = p.eliminated ? 'OUT' : '♥'.repeat(Math.max(0, p.lives));
      c.lives.setText(hearts);
      const flags = (p.kick ? 'K' : '·') + (p.shield ? 'H' : '·');
      c.stats.setText(`B${p.maxBombs} R${p.range} S${p.speedStacks} ${flags}`);
      c.sw.setAlpha(p.eliminated ? 0.3 : 1);
    }
    this.waveLabel.setText(waveText || '');
  }

  popup(text, color = '#ffee88') {
    const t = this.scene.add.text(this.scene.scale.width / 2, HUD_HEIGHT + 20, text, {
      fontFamily: 'monospace', fontSize: '14px', color, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(30);
    this.scene.tweens.add({
      targets: t, alpha: 0, y: '-=20', duration: 1500,
      onComplete: () => t.destroy()
    });
  }
}
