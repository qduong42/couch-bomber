import Phaser from 'phaser';
import { GAME_W, GAME_H, HUD_HEIGHT, TILE, COLS, ROWS, SPAWN_CORNERS, SPAWN_SAFE_ZONES, WAVE_MAX } from '../constants.js';
import { TilemapManager } from '../managers/TilemapManager.js';
import { BombManager } from '../managers/BombManager.js';
import { ExplosionManager } from '../managers/ExplosionManager.js';
import { PowerUpManager } from '../managers/PowerUpManager.js';
import { WaveManager } from '../managers/WaveManager.js';
import { HUD } from '../managers/HUD.js';
import { Player } from '../entities/Player.js';
import { tileToWorld, dist } from '../util/Grid.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.mode = data.mode || 'versus';
    this.playerCount = data.playerCount || 2;
    this.gamePaused = false;
    this.gameState = 'countdown'; // 'countdown' | 'playing' | 'paused' | 'game_over'
    this._startTime = 0;
  }

  create() {
    // Build tilemap
    this.tilemapManager = new TilemapManager();
    this.tilemapManager.create(this);

    // Create explosion manager first (needed by bomb manager)
    this.explosionManager = new ExplosionManager();

    // Create power-up manager
    this.powerUpManager = new PowerUpManager(this);

    // Create bomb manager
    this.bombManager = new BombManager(this, this.tilemapManager, this.explosionManager, this.powerUpManager);

    // Link bomb manager to tilemap
    this.tilemapManager.bombManager = this.bombManager;

    // Create players
    this.players = [];
    for (let i = 0; i < this.playerCount; i++) {
      const corner = SPAWN_CORNERS[i];
      const player = new Player(this, i, corner.tx, corner.ty);
      this.players.push(player);
    }

    // Wave manager for co-op
    this.waveManager = null;
    if (this.mode === 'coop') {
      this.waveManager = new WaveManager(this);
      this.waveManager.onWaveComplete = (wave) => {
        this.hud.showPopup(`WAVE ${wave}!`, '#ffaa00');
      };
      this.waveManager.onGameComplete = () => {
        this._endGame('win');
      };
    }

    // HUD
    this.hud = new HUD(this, this.players, this.mode);

    // Input setup
    this._setupInput();

    // Pause overlay
    this._pauseOverlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6)
      .setDepth(50)
      .setVisible(false)
      .setScrollFactor(0);

    this._pauseText = this.add.text(GAME_W / 2, GAME_H / 2, 'PAUSED\n\nPress ESC to resume', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
    }).setDepth(51).setOrigin(0.5, 0.5).setVisible(false).setScrollFactor(0);

    // ESC for pause
    this.input.keyboard.on('keydown-ESC', () => {
      this._togglePause();
    });

    // Start countdown
    this._startCountdown();
  }

  _setupInput() {
    // Player 0: WASD + Space
    this._p0Keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      bomb: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // Player 1: Arrows + Enter
    this._p1Keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      bomb: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });

    // Track bomb key presses (not holds)
    this._bombPressed = [false, false, false, false];
    this._bombWasDown = [false, false, false, false];

    this.input.keyboard.on('keydown-SPACE', () => { this._bombPressed[0] = true; });
    this.input.keyboard.on('keydown-ENTER', () => { this._bombPressed[1] = true; });
  }

  _getInputState(playerIndex) {
    if (playerIndex === 0) {
      return {
        up: this._p0Keys.up.isDown,
        down: this._p0Keys.down.isDown,
        left: this._p0Keys.left.isDown,
        right: this._p0Keys.right.isDown,
      };
    } else if (playerIndex === 1) {
      return {
        up: this._p1Keys.up.isDown,
        down: this._p1Keys.down.isDown,
        left: this._p1Keys.left.isDown,
        right: this._p1Keys.right.isDown,
      };
    } else {
      // Gamepad — playerIndex 2 uses pad1, playerIndex 3 uses pad2
      const padNum = playerIndex - 1; // 1-indexed pad
      const gp = this.input.gamepad;
      const pad = gp ? gp[`pad${padNum}`] : null;
      if (!pad) return { up: false, down: false, left: false, right: false };
      const lx = pad.leftStick ? pad.leftStick.x : 0;
      const ly = pad.leftStick ? pad.leftStick.y : 0;
      return {
        up: pad.up || ly < -0.5,
        down: pad.down || ly > 0.5,
        left: pad.left || lx < -0.5,
        right: pad.right || lx > 0.5,
      };
    }
  }

  _startCountdown() {
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;

    const countText = this.add.text(cx, cy, '3', {
      fontSize: '80px',
      color: '#ffaa00',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5, 0.5).setDepth(30).setScrollFactor(0);

    let count = 3;

    const tick = () => {
      count--;
      if (count > 0) {
        countText.setText(`${count}`);
        this.tweens.add({
          targets: countText,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0.5,
          duration: 400,
          ease: 'Power2',
          onComplete: () => {
            countText.setScale(1).setAlpha(1);
            this.time.delayedCall(600, tick);
          },
        });
      } else {
        countText.setText('GO!');
        countText.setColor('#44ff44');
        this.tweens.add({
          targets: countText,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 800,
          ease: 'Power2',
          onComplete: () => {
            countText.destroy();
            this.gameState = 'playing';
            this._startTime = this.time.now;

            // Start waves for co-op
            if (this.mode === 'coop' && this.waveManager) {
              this.waveManager.startWaves(this);
            }
          },
        });
      }
    };

    this.time.delayedCall(1000, tick);
  }

  _togglePause() {
    if (this.gameState !== 'playing' && this.gameState !== 'paused') return;

    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.gamePaused = true;
      this._pauseOverlay.setVisible(true);
      this._pauseText.setVisible(true);
    } else {
      this.gameState = 'playing';
      this.gamePaused = false;
      this._pauseOverlay.setVisible(false);
      this._pauseText.setVisible(false);
    }
  }

  update(time, delta) {
    if (this.gameState !== 'playing') return;

    // Process bomb placement input
    this._processBombInput();

    // Handle pending respawns
    this._processRespawns(time);

    // Update players
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (!player.alive || player.eliminated) continue;

      const inputState = this._getInputState(i);
      player.update(time, delta, inputState, this.tilemapManager, this.bombManager);
    }

    // Update bombs
    this.bombManager.update(time, delta);

    // Update explosions
    this.explosionManager.update(time);

    // Update powerups
    this.powerUpManager.checkPickup(this.players);

    // Check flame damage on players
    this._checkFlameDamage(time);

    // Co-op: update wave manager and enemies
    if (this.mode === 'coop' && this.waveManager) {
      this.waveManager.update(time, delta, this);
      this._checkFlameDamageOnEnemies(time);
    }

    // Check win/lose conditions
    this._checkWinConditions(time);

    // Update HUD
    const waveInfo = this.waveManager ? { wave: this.waveManager.wave, max: WAVE_MAX } : null;
    this.hud.update(waveInfo);
  }

  _processBombInput() {
    // Player 0 - space bar
    if (this._bombPressed[0]) {
      this._bombPressed[0] = false;
      const player = this.players[0];
      if (player && player.alive && !player.eliminated) {
        this.bombManager.placeBomb(player);
      }
    }

    // Player 1 - enter
    if (this._bombPressed[1]) {
      this._bombPressed[1] = false;
      const player = this.players[1];
      if (player && player.alive && !player.eliminated) {
        this.bombManager.placeBomb(player);
      }
    }

    // Players 2,3 - gamepad button A (index 0)
    for (let i = 2; i < this.players.length; i++) {
      const padIdx = i - 1;
      const gp = this.input.gamepad;
      const pad = gp ? gp[`pad${padIdx}`] : null;
      if (!pad) continue;
      // Phaser 3 Gamepad: pad.A is button index 0
      const isDown = pad.A ? pad.A.isDown : false;
      if (isDown && !this._bombWasDown[i]) {
        const player = this.players[i];
        if (player && player.alive && !player.eliminated) {
          this.bombManager.placeBomb(player);
        }
      }
      this._bombWasDown[i] = isDown;
    }
  }

  _processRespawns(time) {
    for (const player of this.players) {
      if (!player.needsRespawn) continue;

      // Check if we've waited at least 500ms since the death
      if (!player._respawnTime) {
        player._respawnTime = time + 500;
        continue;
      }
      if (time < player._respawnTime) continue;

      // Pick safest corner
      const corner = this._pickRespawnCorner(player.index, time);

      // Respawn player
      player.needsRespawn = false;
      player._respawnTime = 0;
      player.respawn(corner.tx, corner.ty, time);

      this.hud.showPopup(`P${player.index + 1} RESPAWNED`, '#4488ff');
    }
  }

  _checkFlameDamage(time) {
    for (const player of this.players) {
      if (!player.alive || player.eliminated) continue;
      if (this.explosionManager.isFlame(player.tx, player.ty, time)) {
        player.takeDamage(time);
      }
    }
  }

  _checkFlameDamageOnEnemies(time) {
    if (!this.waveManager) return;
    for (const enemy of this.waveManager.getAliveEnemies()) {
      if (!enemy.alive) continue;
      if (this.explosionManager.isFlame(enemy.tx, enemy.ty, time)) {
        enemy.hp--;
        if (enemy.hp <= 0) {
          enemy.die(this);
        }
      }
    }
  }

  _checkWinConditions(time) {
    if (this.mode === 'versus') {
      const alivePlayers = this.players.filter(p => !p.eliminated);
      if (alivePlayers.length <= 1) {
        if (alivePlayers.length === 0) {
          this._endGame('draw');
        } else {
          this._endGame('p' + (alivePlayers[0].index + 1) + 'wins');
        }
      }
    } else {
      // Co-op: check if all players KO'd
      const alivePlayers = this.players.filter(p => !p.eliminated);
      if (alivePlayers.length === 0) {
        this._endGame('loss');
      }
    }
  }

  _endGame(result) {
    if (this.gameState === 'game_over') return;
    this.gameState = 'game_over';

    const elapsed = Math.floor((this.time.now - this._startTime) / 1000);
    const wave = this.waveManager ? this.waveManager.wave : 0;

    // Brief delay then transition
    this.time.delayedCall(1500, () => {
      this.scene.start('GameOverScene', {
        result,
        mode: this.mode,
        playerCount: this.playerCount,
        elapsed,
        wave,
      });
    });

    // Show end message
    let msg = '';
    let color = '#ffffff';
    if (result === 'draw') { msg = 'DRAW!'; color = '#ffaa00'; }
    else if (result === 'win') { msg = 'CO-OP WIN!'; color = '#44ff44'; }
    else if (result === 'loss') { msg = 'GAME OVER'; color = '#ff4444'; }
    else {
      const pNum = result.replace('p', '').replace('wins', '');
      msg = `PLAYER ${pNum} WINS!`;
      color = '#ffff44';
    }

    this.add.text(GAME_W / 2, GAME_H / 2, msg, {
      fontSize: '36px',
      color,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5).setDepth(40).setScrollFactor(0);
  }

  /**
   * Pick the safest respawn corner for a player.
   */
  _pickRespawnCorner(playerIndex, time) {
    const corners = SPAWN_CORNERS.map((c, i) => ({ ...c, i }));

    const scored = corners.map(corner => {
      let score = 0;
      // Penalize flame
      if (this.explosionManager.isFlame(corner.tx, corner.ty, time)) score += 1000;
      // Penalize nearby enemies
      if (this.waveManager) {
        for (const enemy of this.waveManager.getAliveEnemies()) {
          const d = dist(corner.tx, corner.ty, enemy.tx, enemy.ty);
          score += Math.max(0, 10 - d);
        }
      }
      // Penalize nearby other players
      for (let i = 0; i < this.players.length; i++) {
        if (i === playerIndex) continue;
        const p = this.players[i];
        if (!p.alive || p.eliminated) continue;
        const d = dist(corner.tx, corner.ty, p.tx, p.ty);
        score += Math.max(0, 6 - d);
      }
      return { ...corner, score };
    });

    scored.sort((a, b) => a.score - b.score);
    return scored[0];
  }
}
