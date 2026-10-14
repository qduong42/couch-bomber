import {
  BASE_MOVE_MS, SPEED_PER_STACK, MAX_SPEED_STACKS,
  MAX_BOMBS, MAX_RANGE, INIT_BOMBS, INIT_RANGE,
  PLAYER_LIVES, INVULN_MS,
} from '../constants.js';
import { tileToWorld } from '../util/Grid.js';

export class Player {
  constructor(scene, playerIndex, tx, ty) {
    this.scene = scene;
    this.index = playerIndex;
    this.tx = tx;
    this.ty = ty;
    this.moving = false;
    this.facing = 'down';
    this.lives = PLAYER_LIVES;
    this.alive = true;
    this.eliminated = false;
    this.invulnUntil = 0;
    this.needsRespawn = false;
    this._respawnTime = 0;

    // Power-up state
    this.maxBombs = INIT_BOMBS;
    this.bombRange = INIT_RANGE;
    this.speedStacks = 0;
    this.hasKick = false;
    this.hasShield = false;
    this.activeBombs = 0;

    // Create sprite
    const pos = tileToWorld(tx, ty);
    this.sprite = scene.add.image(pos.x, pos.y, `player_${playerIndex}`).setDepth(3);

    // Input queuing
    this.queuedDir = null;
    this.currentDir = null;
    this.moveTween = null;

    // Invuln flicker tween
    this.flickerTween = null;
  }

  getMoveMs() {
    return BASE_MOVE_MS / (1 + this.speedStacks * SPEED_PER_STACK);
  }

  /**
   * Process input and movement each frame.
   */
  update(time, delta, inputState, tilemapManager, bombManager) {
    if (!this.alive || this.eliminated) return;

    // Queue direction from input
    if (inputState.up) this.queuedDir = 'up';
    else if (inputState.down) this.queuedDir = 'down';
    else if (inputState.left) this.queuedDir = 'left';
    else if (inputState.right) this.queuedDir = 'right';

    // If not moving, try to move in queued direction
    if (!this.moving && this.queuedDir) {
      this.tryMove(this.queuedDir, tilemapManager, bombManager);
    }

    // Update pass-through sets for all bombs
    // (handled in BombManager)

    // Invuln flicker
    if (time < this.invulnUntil) {
      // Flicker is handled by flickerTween
    } else if (this.sprite) {
      this.sprite.setAlpha(1);
    }
  }

  tryMove(dir, tilemapManager, bombManager) {
    const deltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = deltas[dir];
    const nx = this.tx + dx;
    const ny = this.ty + dy;

    this.facing = dir;

    // Check if target tile has a bomb
    const bombAtTarget = bombManager ? bombManager.getBomb(nx, ny) : null;

    if (bombAtTarget && this.hasKick) {
      // Kick the bomb instead of moving there
      bombAtTarget.kick(dir, tilemapManager, bombManager);
      this.queuedDir = null;
      return;
    }

    // Check passability
    const canOccupy = bombManager ? bombManager.canOccupy(this, nx, ny) : true;
    if (tilemapManager.isBlocked(nx, ny) || !canOccupy) {
      // Can't move — clear queue so we don't keep trying
      // But keep queued dir for next frame in case of timing
      return;
    }

    // Start movement tween
    this.moving = true;
    this.currentDir = dir;
    this.queuedDir = null;

    const targetPos = tileToWorld(nx, ny);
    const duration = this.getMoveMs();

    this.moveTween = this.scene.tweens.add({
      targets: this.sprite,
      x: targetPos.x,
      y: targetPos.y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        this.tx = nx;
        this.ty = ny;
        this.moving = false;
        this.moveTween = null;

        // Notify bombManager that player moved (for pass-through updates)
        if (bombManager) {
          bombManager.updatePassThrough(this);
        }
      },
    });
  }

  takeDamage(time) {
    if (!this.alive || this.eliminated) return;
    if (time < this.invulnUntil) return; // invulnerable

    // Shield absorbs one hit
    if (this.hasShield) {
      this.hasShield = false;
      // Flash briefly
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0.2,
        duration: 100,
        yoyo: true,
        repeat: 3,
      });
      return;
    }

    this.lives--;

    if (this.lives <= 0) {
      this.lives = 0;
      this.eliminate();
    } else {
      // Mark as needing respawn — GameScene will call respawn() with safe coords
      this.needsRespawn = true;
      this.alive = false; // temporarily dead until respawned
      if (this.moveTween) {
        this.moveTween.stop();
        this.moveTween = null;
        this.moving = false;
      }
      if (this.sprite) {
        this.sprite.setAlpha(0.3);
      }
    }
  }

  _startInvulnerability(time) {
    this.invulnUntil = time + INVULN_MS;

    if (this.flickerTween) {
      this.flickerTween.stop();
    }

    this.flickerTween = this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.1,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(INVULN_MS / 200),
      onComplete: () => {
        if (this.sprite) this.sprite.setAlpha(1);
        this.flickerTween = null;
      },
    });
  }

  eliminate() {
    this.alive = false;
    this.eliminated = true;
    if (this.moveTween) {
      this.moveTween.stop();
      this.moveTween = null;
    }
    if (this.flickerTween) {
      this.flickerTween.stop();
      this.flickerTween = null;
    }
    // Death animation
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        if (this.sprite) {
          this.sprite.setVisible(false);
        }
      },
    });
  }

  respawn(tx, ty, time) {
    this.tx = tx;
    this.ty = ty;
    this.alive = true;
    this.moving = false;
    this.moveTween = null;

    const pos = tileToWorld(tx, ty);
    if (this.sprite) {
      this.sprite.setPosition(pos.x, pos.y);
      this.sprite.setAlpha(1);
      this.sprite.setScale(1);
      this.sprite.setVisible(true);
    }

    this._startInvulnerability(time);
  }

  applyPowerUp(type) {
    switch (type) {
      case 'bomb':
        if (this.maxBombs < MAX_BOMBS) this.maxBombs++;
        break;
      case 'range':
        if (this.bombRange < MAX_RANGE) this.bombRange++;
        break;
      case 'speed':
        if (this.speedStacks < MAX_SPEED_STACKS) this.speedStacks++;
        break;
      case 'kick':
        this.hasKick = true;
        break;
      case 'shield':
        this.hasShield = true;
        break;
    }
  }

  destroy() {
    if (this.moveTween) this.moveTween.stop();
    if (this.flickerTween) this.flickerTween.stop();
    if (this.sprite) this.sprite.destroy();
  }
}
