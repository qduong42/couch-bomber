import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this._mode = 'versus';
    this._playerCount = 2;
    this._selectedItem = 0; // 0=mode, 1=playerCount, 2=start

    this._buildUI();
    this._bindKeys();
  }

  _buildUI() {
    const cx = GAME_W / 2;

    // Background
    this.add.rectangle(cx, GAME_H / 2, GAME_W, GAME_H, 0x111122);

    // Title
    this.add.text(cx, 60, 'COUCH BOMBERS', {
      fontSize: '28px',
      color: '#ffaa00',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    this.add.text(cx, 90, 'CLAUDE CODE EDITION', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    // Mode selection
    this.add.text(cx, 150, 'MODE', {
      fontSize: '14px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    this._modeText = this.add.text(cx, 175, '[ VERSUS ]', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    // Player count
    this.add.text(cx, 225, 'PLAYERS', {
      fontSize: '14px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    this._playerText = this.add.text(cx, 250, '[ 2 ]', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    // Controller info
    this.add.text(cx, 295, 'P1: WASD + SPACE', {
      fontSize: '11px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    this.add.text(cx, 310, 'P2: ARROWS + ENTER', {
      fontSize: '11px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    this.add.text(cx, 325, 'P3/P4: GAMEPAD REQUIRED', {
      fontSize: '11px',
      color: '#884444',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    // Start button
    this._startText = this.add.text(cx, 375, '▶  START GAME', {
      fontSize: '22px',
      color: '#44ff44',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);

    // Blink start text
    this.tweens.add({
      targets: this._startText,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // Cursor selector
    this._cursor = this.add.text(cx - 110, 175, '▶', {
      fontSize: '20px',
      color: '#ffaa00',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    this._updateUI();

    // Navigation instructions
    this.add.text(cx, 430, '↑↓ NAVIGATE   ←→ CHANGE   SPACE/ENTER START', {
      fontSize: '10px',
      color: '#555555',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);
  }

  _bindKeys() {
    this._keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.input.keyboard.on('keydown', (event) => {
      const key = event.keyCode;
      const UP = [Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.W];
      const DOWN = [Phaser.Input.Keyboard.KeyCodes.DOWN, Phaser.Input.Keyboard.KeyCodes.S];
      const LEFT = [Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.A];
      const RIGHT = [Phaser.Input.Keyboard.KeyCodes.RIGHT, Phaser.Input.Keyboard.KeyCodes.D];
      const CONFIRM = [Phaser.Input.Keyboard.KeyCodes.ENTER, Phaser.Input.Keyboard.KeyCodes.SPACE];

      if (UP.includes(key)) {
        this._selectedItem = Math.max(0, this._selectedItem - 1);
        this._updateUI();
      } else if (DOWN.includes(key)) {
        this._selectedItem = Math.min(2, this._selectedItem + 1);
        this._updateUI();
      } else if (LEFT.includes(key)) {
        this._handleLeft();
      } else if (RIGHT.includes(key)) {
        this._handleRight();
      } else if (CONFIRM.includes(key)) {
        if (this._selectedItem === 2) {
          this._startGame();
        }
      }
    });
  }

  _handleLeft() {
    if (this._selectedItem === 0) {
      this._mode = this._mode === 'versus' ? 'coop' : 'versus';
      this._clampPlayerCount();
    } else if (this._selectedItem === 1) {
      this._playerCount = Math.max(this._minPlayers(), this._playerCount - 1);
    }
    this._updateUI();
  }

  _handleRight() {
    if (this._selectedItem === 0) {
      this._mode = this._mode === 'versus' ? 'coop' : 'versus';
      this._clampPlayerCount();
    } else if (this._selectedItem === 1) {
      this._playerCount = Math.min(this._maxPlayers(), this._playerCount + 1);
    }
    this._updateUI();
  }

  _minPlayers() {
    return this._mode === 'versus' ? 2 : 1;
  }

  _maxPlayers() {
    return this._mode === 'versus' ? 4 : 3;
  }

  _clampPlayerCount() {
    this._playerCount = Math.max(this._minPlayers(), Math.min(this._maxPlayers(), this._playerCount));
  }

  _updateUI() {
    this._modeText.setText(this._mode === 'versus' ? '◀ VERSUS ▶' : '◀ CO-OP ▶');
    this._modeText.setColor(this._selectedItem === 0 ? '#ffff44' : '#ffffff');

    this._playerText.setText(`◀ ${this._playerCount} ▶`);
    this._playerText.setColor(this._selectedItem === 1 ? '#ffff44' : '#ffffff');

    this._startText.setColor(this._selectedItem === 2 ? '#88ff88' : '#44ff44');

    // Move cursor
    const yPositions = [175, 250, 375];
    this._cursor.setY(yPositions[this._selectedItem]);
    this._cursor.setX(GAME_W / 2 - 80);
  }

  _startGame() {
    this.scene.start('GameScene', {
      mode: this._mode,
      playerCount: this._playerCount,
    });
  }
}
