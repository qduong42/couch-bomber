import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, MODES } from '../config.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 40, 'COUCH BOMBERS', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffeebb'
    }).setOrigin(0.5);
    this.add.text(cx, 70, 'post-grill build', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888'
    }).setOrigin(0.5);

    this.selection = { mode: MODES.VERSUS, players: 2 };

    this.modeText = this.add.text(cx, 120, '', { fontFamily: 'monospace', fontSize: '16px', color: '#fff' }).setOrigin(0.5);
    this.playersText = this.add.text(cx, 150, '', { fontFamily: 'monospace', fontSize: '16px', color: '#fff' }).setOrigin(0.5);

    const help = [
      'M: toggle mode    N: change player count',
      'ENTER: start',
      '',
      'P1: WASD + SPACE',
      'P2: Arrows + ENTER',
      '',
      '(3-4 players require gamepads — TODO)',
      'ESC in-game: pause'
    ];
    this.add.text(cx, GAME_HEIGHT - 110, help.join('\n'), {
      fontFamily: 'monospace', fontSize: '11px', color: '#aaa', align: 'center'
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-M', () => this.toggleMode());
    this.input.keyboard.on('keydown-N', () => this.cyclePlayers());
    this.input.keyboard.on('keydown-ENTER', () => this.start());
    this.input.keyboard.on('keydown-SPACE', () => this.start());
    this.refresh();
  }

  toggleMode() {
    this.selection.mode = this.selection.mode === MODES.VERSUS ? MODES.COOP : MODES.VERSUS;
    // Versus needs ≥2; Co-op allows 1.
    if (this.selection.mode === MODES.VERSUS && this.selection.players < 2) this.selection.players = 2;
    this.refresh();
  }

  cyclePlayers() {
    const min = this.selection.mode === MODES.VERSUS ? 2 : 1;
    const max = 2; // shared keyboard cap
    let n = this.selection.players + 1;
    if (n > max) n = min;
    this.selection.players = n;
    this.refresh();
  }

  refresh() {
    const modeLabel = this.selection.mode === MODES.VERSUS ? 'VERSUS — last bomber wins' : 'CO-OP — survive 20 waves';
    this.modeText.setText(`Mode:    ${modeLabel}`);
    this.playersText.setText(`Players: ${this.selection.players}`);
  }

  start() {
    this.scene.start('Game', this.selection);
  }
}
