import Phaser from 'phaser';
import {
  INITIAL_LIVES, INITIAL_BOMBS, INITIAL_RANGE, INITIAL_SPEED,
  BASE_MOVE_MS, MAX_BOMBS, MAX_RANGE, MAX_SPEED,
  POWERUP, INVULN_MS, RESPAWN_DELAY_MS,
} from '../constants.js';
import { tileToWorld } from '../utils/Grid.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} index  0-3
   * @param {number} row
   * @param {number} col
   */
  constructor(scene, index, row, col) {
    const { x, y } = tileToWorld(row, col);
    super(scene, x, y, `player_${index + 1}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5);

    this.playerIndex = index;
    this.row = row;
    this.col = col;
    this.targetRow = row;
    this.targetCol = col;

    // State
    this.moving = false;
    this.alive = true;
    this.invulnerable = false;
    this.justHit = false;

    // Stats
    this.lives    = INITIAL_LIVES;
    this.maxBombs = INITIAL_BOMBS;
    this.range    = INITIAL_RANGE;
    this.speedStacks = INITIAL_SPEED;
    this.hasKick  = false;
    this.shieldCount = 0;

    // Bombs placed by this player currently active
    this.placedBombCount = 0;

    // Input bindings (set by GameScene)
    this.keys    = null;   // {up, down, left, right, bomb}
    this.gamepad = null;

    // For "just pressed" bomb key debounce
    this._bombWasDown = false;

    // Physics body slightly smaller than tile for clean overlaps
    this.body.setSize(26, 26);

    // Stats tracking
    this.statBombs = 0;
    this.statWalls = 0;
    this.statKOs   = 0;
  }

  // ── Movement ────────────────────────────────────────────────────────

  getMoveMs() {
    return Math.round(BASE_MOVE_MS * Math.pow(0.85, this.speedStacks));
  }

  update() {
    if (!this.alive || this.moving || this.justHit) return;

    let dr = 0, dc = 0;

    if (this._keyDown('up'))    dr = -1;
    else if (this._keyDown('down'))  dr =  1;
    else if (this._keyDown('left'))  dc = -1;
    else if (this._keyDown('right')) dc =  1;

    if (dr !== 0 || dc !== 0) {
      const nr = this.row + dr;
      const nc = this.col + dc;
      if (this.scene.canPlayerMove(this, nr, nc)) {
        this._startMove(nr, nc, dr, dc);
      }
    }

    // Bomb placement — detect falling edge for debounce
    const bombNow = this._keyDown('bomb');
    if (bombNow && !this._bombWasDown) {
      this.scene.tryPlaceBomb(this);
    }
    this._bombWasDown = bombNow;
  }

  _keyDown(action) {
    if (this.keys && this.keys[action] && this.keys[action].isDown) return true;
    if (this.gamepad) {
      switch (action) {
        case 'up':    return this.gamepad.up    || this.gamepad.axes[1]?.getValue() < -0.5;
        case 'down':  return this.gamepad.down  || this.gamepad.axes[1]?.getValue() >  0.5;
        case 'left':  return this.gamepad.left  || this.gamepad.axes[0]?.getValue() < -0.5;
        case 'right': return this.gamepad.right || this.gamepad.axes[0]?.getValue() >  0.5;
        case 'bomb':  return this.gamepad.buttons[0]?.pressed || this.gamepad.buttons[2]?.pressed;
        default:      return false;
      }
    }
    return false;
  }

  _startMove(nr, nc, dr, dc) {
    this.moving = true;
    this.targetRow = nr;
    this.targetCol = nc;
    const { x, y } = tileToWorld(nr, nc);

    // Kick check: if there's a bomb at the destination, kick it
    const bombAtDest = this.scene.getBombAt(nr, nc);
    if (bombAtDest && this.hasKick) {
      this.scene.kickBomb(bombAtDest, dr, dc);
    }

    this.scene.tweens.add({
      targets: this,
      x, y,
      duration: this.getMoveMs(),
      ease: 'Linear',
      onComplete: () => {
        this.row = this.targetRow;
        this.col = this.targetCol;
        this.moving = false;
        // Clear pass-through for bombs we've left
        this.scene.onPlayerMoved(this);
      },
    });
  }

  // ── Damage / Lives ──────────────────────────────────────────────────

  takeDamage(attacker = null) {
    if (!this.alive || this.invulnerable || this.justHit) return;

    if (this.shieldCount > 0) {
      this.shieldCount--;
      this._flashShield();
      return;
    }

    this.justHit = true;
    this.lives--;

    if (attacker && attacker.playerIndex !== undefined && attacker.playerIndex !== this.playerIndex) {
      attacker.statKOs++;
    }

    if (this.lives <= 0) {
      this._kill();
    } else {
      // Fade out, wait, respawn
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          this.setVisible(false);
          this.scene.time.delayedCall(RESPAWN_DELAY_MS, () => this.scene.respawnPlayer(this));
        },
      });
    }
    this.scene.hud.update();
  }

  _kill() {
    this.alive = false;
    this.setVisible(false);
    if (this.body) this.body.enable = false;
    this.scene.onPlayerKilled(this);
  }

  startInvulnerability() {
    this.invulnerable = true;
    this.justHit = false;
    this.setTexture(`player_${this.playerIndex + 1}`);
    this.setAlpha(1);
    this.setVisible(true);

    // Blink effect
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.2 },
      duration: 100,
      yoyo: true,
      repeat: Math.floor(INVULN_MS / 200) - 1,
      onComplete: () => {
        this.alpha = 1;
        this.invulnerable = false;
      },
    });
  }

  _flashShield() {
    this.scene.tweens.add({
      targets: this,
      tint: { from: 0xffffff, to: 0x88aaff },
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.clearTint(),
    });
    this.justHit = true;
    this.scene.time.delayedCall(200, () => { this.justHit = false; });
  }

  // ── Power-ups ───────────────────────────────────────────────────────

  applyPowerUp(type) {
    switch (type) {
      case POWERUP.BOMB:
        this.maxBombs = Math.min(this.maxBombs + 1, MAX_BOMBS);
        break;
      case POWERUP.RANGE:
        this.range = Math.min(this.range + 1, MAX_RANGE);
        break;
      case POWERUP.SPEED:
        this.speedStacks = Math.min(this.speedStacks + 1, MAX_SPEED);
        break;
      case POWERUP.KICK:
        this.hasKick = true;
        break;
      case POWERUP.SHIELD:
        this.shieldCount = Math.min(this.shieldCount + 1, 1);
        break;
    }
    this.scene.hud.update();
    this.scene.showPickupPopup(this, type);
  }

  getStats() {
    return { bombs: this.statBombs, walls: this.statWalls, kos: this.statKOs };
  }
}
