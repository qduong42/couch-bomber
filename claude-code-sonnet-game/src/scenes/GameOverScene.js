import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.result = data.result || 'draw';
    this.mode = data.mode || 'versus';
    this.playerCount = data.playerCount || 2;
    this.elapsed = data.elapsed || 0;
    this.wave = data.wave || 0;
  }

  create() {
    const cx = GAME_W / 2;

    // Background
    this.add.rectangle(cx, GAME_H / 2, GAME_W, GAME_H, 0x0a0a1a);

    // Determine result text
    let title = '';
    let titleColor = '#ffffff';

    if (this.result === 'draw') {
      title = 'DRAW!';
      titleColor = '#ffaa00';
    } else if (this.result === 'win') {
      title = 'CO-OP WIN!';
      titleColor = '#44ff44';
    } else if (this.result === 'loss') {
      title = 'GAME OVER';
      titleColor = '#ff4444';
    } else {
      const pNum = this.result.replace('p', '').replace('wins', '');
      title = `PLAYER ${pNum} WINS!`;
      titleColor = '#ffff44';
    }

    // Title with pulse effect
    const titleText = this.add.text(cx, 100, title, {
      fontSize: '40px',
      color: titleColor,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: titleText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Stats
    let statsY = 180;
    const statStyle = {
      fontSize: '14px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    };

    const minutes = Math.floor(this.elapsed / 60);
    const seconds = this.elapsed % 60;
    this.add.text(cx, statsY, `TIME: ${minutes}:${seconds.toString().padStart(2, '0')}`, statStyle).setOrigin(0.5, 0.5);
    statsY += 24;

    if (this.mode === 'coop') {
      this.add.text(cx, statsY, `WAVES SURVIVED: ${Math.max(0, this.wave - 1)}`, statStyle).setOrigin(0.5, 0.5);
      statsY += 24;
    }

    this.add.text(cx, statsY, `MODE: ${this.mode.toUpperCase()}  |  PLAYERS: ${this.playerCount}`, statStyle).setOrigin(0.5, 0.5);

    // Buttons
    this._selectedButton = 0;

    const btnStyle = {
      fontSize: '22px',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    };

    this._rematchBtn = this.add.text(cx - 80, 320, '▶ REMATCH', {
      ...btnStyle,
      color: '#44ff44',
    }).setOrigin(0.5, 0.5);

    this._menuBtn = this.add.text(cx + 80, 320, 'MENU', {
      ...btnStyle,
      color: '#aaaaaa',
    }).setOrigin(0.5, 0.5);

    this._updateButtons();

    // Input
    this.input.keyboard.on('keydown', (event) => {
      const LEFT = [Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.A];
      const RIGHT = [Phaser.Input.Keyboard.KeyCodes.RIGHT, Phaser.Input.Keyboard.KeyCodes.D];
      const CONFIRM = [
        Phaser.Input.Keyboard.KeyCodes.ENTER,
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.Z,
      ];

      if (LEFT.includes(event.keyCode)) {
        this._selectedButton = 0;
        this._updateButtons();
      } else if (RIGHT.includes(event.keyCode)) {
        this._selectedButton = 1;
        this._updateButtons();
      } else if (CONFIRM.includes(event.keyCode)) {
        this._confirm();
      }
    });

    // Decoration
    this.add.text(cx, 380, 'COUCH BOMBERS', {
      fontSize: '11px',
      color: '#333344',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);
  }

  _updateButtons() {
    this._rematchBtn.setColor(this._selectedButton === 0 ? '#ffff44' : '#44ff44');
    this._menuBtn.setColor(this._selectedButton === 1 ? '#ffff44' : '#aaaaaa');
  }

  _confirm() {
    if (this._selectedButton === 0) {
      // Rematch
      this.scene.start('GameScene', {
        mode: this.mode,
        playerCount: this.playerCount,
      });
    } else {
      // Menu
      this.scene.start('MenuScene');
    }
  }
}
