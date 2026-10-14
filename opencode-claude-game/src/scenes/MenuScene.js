import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, MODE, PLAYER_COLOR_NAMES, PLAYER_COLORS } from '../constants.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
    this.selectedMode = MODE.VERSUS;
    this.playerCount = 2;
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // Background
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e);

    // Title
    this.add.text(cx, 50, 'COUCH BOMBERS', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffee44',
      stroke: '#aa8800', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 82, '🧨 Bomberman-style arena brawler 🧨', {
      fontSize: '11px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Mode selection
    this.add.text(cx, 130, 'MODE', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);

    this.modeBtns = [];
    const modes = [
      { key: MODE.VERSUS, label: 'VERSUS  (2‑4 players)' },
      { key: MODE.COOP,   label: 'CO-OP   (1‑3 vs waves)' },
    ];
    modes.forEach((m, i) => {
      const btn = this.add.text(cx, 158 + i * 28, m.label, {
        fontSize: '13px', fontFamily: 'monospace',
        color: this.selectedMode === m.key ? '#ffee44' : '#666666',
        backgroundColor: this.selectedMode === m.key ? '#223322' : undefined,
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => { this.selectedMode = m.key; this.refreshUI(); });
      this.modeBtns.push({ btn, key: m.key });
    });

    // Player count
    this.add.text(cx, 230, 'PLAYERS', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);

    this.countBtns = [];
    for (let n = 1; n <= 4; n++) {
      const btn = this.add.text(cx - 60 + (n - 1) * 42, 258, `${n}`, {
        fontSize: '18px', fontFamily: 'monospace',
        color: this.playerCount === n ? '#ffee44' : '#555555',
        backgroundColor: this.playerCount === n ? '#223322' : undefined,
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => { this.playerCount = n; this.refreshUI(); });
      this.countBtns.push({ btn, n });
    }

    // Controls info
    this.add.text(cx, 305, 'CONTROLS', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    const ctrlLines = [
      { color: PLAYER_COLORS[0], text: 'P1  WASD + SPACE' },
      { color: PLAYER_COLORS[1], text: 'P2  Arrows + ENTER' },
      { color: PLAYER_COLORS[2], text: 'P3  Gamepad 1' },
      { color: PLAYER_COLORS[3], text: 'P4  Gamepad 2' },
    ];
    ctrlLines.forEach((c, i) => {
      const hex = '#' + c.color.toString(16).padStart(6, '0');
      this.add.text(cx, 325 + i * 18, c.text, {
        fontSize: '11px', fontFamily: 'monospace', color: hex,
      }).setOrigin(0.5);
    });

    this.add.text(cx, 404, '(Keyboard supports up to 2 players — P3/P4 need gamepad)', {
      fontSize: '9px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5);

    // Start button
    const startBtn = this.add.text(cx, 440, '▶  START GAME', {
      fontSize: '18px', fontFamily: 'monospace', color: '#000000',
      backgroundColor: '#ffee44',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setStyle({ backgroundColor: '#ffffff' }));
    startBtn.on('pointerout',  () => startBtn.setStyle({ backgroundColor: '#ffee44' }));
    startBtn.on('pointerdown', () => this.startGame());

    // Keyboard shortcut
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());

    this.refreshUI();
  }

  refreshUI() {
    this.modeBtns.forEach(({ btn, key }) => {
      const active = this.selectedMode === key;
      btn.setStyle({
        color: active ? '#ffee44' : '#555555',
        backgroundColor: active ? '#223322' : undefined,
      });
    });
    this.countBtns.forEach(({ btn, n }) => {
      const active = this.playerCount === n;
      btn.setStyle({
        color: active ? '#ffee44' : '#555555',
        backgroundColor: active ? '#223322' : undefined,
      });
    });
    // Enforce min player count per mode
    if (this.selectedMode === MODE.VERSUS && this.playerCount < 2) {
      this.playerCount = 2;
      this.refreshUI();
    }
  }

  startGame() {
    // Enforce constraints
    if (this.selectedMode === MODE.VERSUS && this.playerCount < 2) this.playerCount = 2;
    if (this.selectedMode === MODE.COOP   && this.playerCount < 1) this.playerCount = 1;
    if (this.selectedMode === MODE.COOP   && this.playerCount > 3) this.playerCount = 3;

    this.scene.start('GameScene', {
      mode: this.selectedMode,
      playerCount: this.playerCount,
    });
  }
}
