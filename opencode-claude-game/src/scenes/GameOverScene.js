import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_COLORS, PLAYER_COLOR_NAMES, MODE } from '../constants.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) {
    this.result     = data.result     ?? 'draw';   // 'win' | 'draw' | 'loss' | 'coop_win'
    this.winner     = data.winner     ?? null;      // player index (0-based) or null
    this.wave       = data.wave       ?? 0;
    this.mode       = data.mode       ?? MODE.VERSUS;
    this.stats      = data.stats      ?? {};
    this.gameConfig = data.gameConfig ?? {};
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // Background
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050510);

    // Heading
    let heading = '';
    let headColor = '#ffffff';
    if (this.result === 'draw') {
      heading = "IT'S A DRAW!";
      headColor = '#ffee44';
    } else if (this.result === 'win' && this.winner !== null) {
      heading = `PLAYER ${this.winner + 1} WINS!`;
      headColor = '#' + PLAYER_COLORS[this.winner].toString(16).padStart(6, '0');
    } else if (this.result === 'coop_win') {
      heading = 'YOU WIN!';
      headColor = '#44ff88';
    } else {
      heading = 'GAME OVER';
      headColor = '#ff4444';
    }

    this.add.text(cx, 80, heading, {
      fontSize: '32px', fontFamily: 'monospace',
      color: headColor,
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);

    // Sub-text
    let sub = '';
    if (this.mode === MODE.COOP) {
      sub = this.result === 'coop_win'
        ? `Survived all ${this.wave} waves!`
        : `Survived ${this.wave} wave${this.wave !== 1 ? 's' : ''}`;
    } else if (this.result === 'draw') {
      sub = 'Simultaneous KO — both bombers eliminated!';
    } else if (this.result === 'win') {
      sub = `${PLAYER_COLOR_NAMES[this.winner]} bomber is the last one standing!`;
    }

    this.add.text(cx, 125, sub, {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Stats
    if (Object.keys(this.stats).length > 0) {
      this.add.text(cx, 170, '── STATS ──', {
        fontSize: '12px', fontFamily: 'monospace', color: '#666666',
      }).setOrigin(0.5);

      let y = 192;
      for (const [pIdx, pStats] of Object.entries(this.stats)) {
        const idx = parseInt(pIdx);
        const hex = '#' + PLAYER_COLORS[idx].toString(16).padStart(6, '0');
        const line = `P${idx + 1}  Bombs: ${pStats.bombs}  Walls: ${pStats.walls}  KOs: ${pStats.kos}`;
        this.add.text(cx, y, line, {
          fontSize: '11px', fontFamily: 'monospace', color: hex,
        }).setOrigin(0.5);
        y += 20;
      }
    }

    // Buttons
    const rematch = this.add.text(cx - 70, 380, 'REMATCH', {
      fontSize: '16px', fontFamily: 'monospace',
      color: '#000000', backgroundColor: '#ffee44',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rematch.on('pointerover', () => rematch.setStyle({ backgroundColor: '#ffffff' }));
    rematch.on('pointerout',  () => rematch.setStyle({ backgroundColor: '#ffee44' }));
    rematch.on('pointerdown', () => this.scene.start('GameScene', this.gameConfig));

    const menu = this.add.text(cx + 70, 380, 'MENU', {
      fontSize: '16px', fontFamily: 'monospace',
      color: '#000000', backgroundColor: '#aaaaaa',
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menu.on('pointerover', () => menu.setStyle({ backgroundColor: '#ffffff' }));
    menu.on('pointerout',  () => menu.setStyle({ backgroundColor: '#aaaaaa' }));
    menu.on('pointerdown', () => this.scene.start('MenuScene'));

    this.input.keyboard.on('keydown-R', () => this.scene.start('GameScene', this.gameConfig));
    this.input.keyboard.on('keydown-M', () => this.scene.start('MenuScene'));
    this.input.keyboard.on('keydown-SPACE', () => this.scene.start('GameScene', this.gameConfig));

    this.add.text(cx, 420, 'R / SPACE = Rematch   M = Menu', {
      fontSize: '10px', fontFamily: 'monospace', color: '#444444',
    }).setOrigin(0.5);
  }

}
