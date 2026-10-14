import Phaser from 'phaser';
import { ENEMY_PATH_INTERVAL_MS } from '../constants.js';
import { tileToWorld, DIRS, tileDistance } from '../utils/Grid.js';
import { bfsToNearest, bfsFleeNearest } from '../utils/Pathfinding.js';

// ── Base Enemy ────────────────────────────────────────────────────────

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, row, col, textureKey, speedMs, hp) {
    const { x, y } = tileToWorld(row, col);
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5);

    this.row = row;
    this.col = col;
    this.targetRow = row;
    this.targetCol = col;

    this.hp      = hp;
    this.speedMs = speedMs; // ms per tile
    this.moving  = false;
    this.alive   = true;

    this.pathTimer = 0;
    this.body.setSize(26, 26);
  }

  update(delta) {
    if (!this.alive || this.moving) return;
    this.pathTimer -= delta;
    if (this.pathTimer <= 0) {
      this.pathTimer = ENEMY_PATH_INTERVAL_MS;
      this._think();
    }
  }

  /** Override in subclasses */
  _think() {}

  _move(dr, dc) {
    const nr = this.row + dr;
    const nc = this.col + dc;
    if (!this._isPassable(nr, nc)) return;

    this.moving = true;
    this.targetRow = nr;
    this.targetCol = nc;
    const { x, y } = tileToWorld(nr, nc);
    this.scene.tweens.add({
      targets: this,
      x, y,
      duration: this.speedMs,
      ease: 'Linear',
      onComplete: () => {
        this.row = nr;
        this.col = nc;
        this.moving = false;
      },
    });
  }

  _isPassable(r, c) {
    if (!this.scene.tilemap.isWalkable(r, c)) return false;
    if (this.scene.getBombAt(r, c)) {
      const bomb = this.scene.getBombAt(r, c);
      if (this._isBombDangerous(bomb)) return false;
    }
    if (this.scene.hasFlameAt(r, c)) return false;
    return true;
  }

  _isBombDangerous(bomb) {
    // Treat tiles within range of a fused (< 1s) bomb as impassable
    return bomb.fuse < 1000 && (
      bomb.row === this.row ||
      bomb.col === this.col
    );
  }

  takeDamage(attacker = null) {
    if (!this.alive) return;
    this.hp--;
    if (this.hp <= 0) this._die(attacker);
    else {
      // Flash red
      this.scene.tweens.add({
        targets: this,
        tint: 0xff0000,
        duration: 80,
        yoyo: true,
        onComplete: () => this.clearTint(),
      });
    }
  }

  _die(attacker) {
    this.alive = false;
    if (attacker) attacker.statKOs++;
    this.scene.onEnemyKilled(this, attacker);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }

  _getAlivePlayers() {
    return this.scene.players.filter(p => p.alive);
  }

  _nearestPlayerPos() {
    const ps = this._getAlivePlayers();
    if (ps.length === 0) return null;
    ps.sort((a, b) =>
      tileDistance(this.row, this.col, a.row, a.col) -
      tileDistance(this.row, this.col, b.row, b.col)
    );
    return ps[0];
  }
}

// ── Chaser ────────────────────────────────────────────────────────────

export class Chaser extends Enemy {
  constructor(scene, row, col, waveScalar) {
    const BASE_MS = 500; // 2 tiles/s = 0.5× player base
    super(scene, row, col, 'enemy_chaser', Math.round(BASE_MS / waveScalar), 1);
  }

  _think() {
    const target = this._nearestPlayerPos();
    if (!target) return;
    const dir = bfsToNearest(
      this.row, this.col,
      [{ row: target.row, col: target.col }],
      (r, c) => this._isPassable(r, c)
    );
    if (dir) this._move(dir.dr, dir.dc);
  }
}

// ── Runner ────────────────────────────────────────────────────────────

export class Runner extends Enemy {
  constructor(scene, row, col, waveScalar) {
    const BASE_MS = 167; // 6 tiles/s ≈ 1.5× player
    super(scene, row, col, 'enemy_runner', Math.round(BASE_MS / waveScalar), 1);
    this._chasing = false;
  }

  _think() {
    const target = this._nearestPlayerPos();
    if (!target) { this._randomWalk(); return; }

    const dist = tileDistance(this.row, this.col, target.row, target.col);
    const los = this._lineOfSight(target, 4);

    if (los) {
      this._chasing = true;
      const dir = bfsToNearest(
        this.row, this.col,
        [{ row: target.row, col: target.col }],
        (r, c) => this._isPassable(r, c)
      );
      if (dir) this._move(dir.dr, dir.dc);
      else this._randomWalk();
    } else {
      this._chasing = false;
      this._randomWalk();
    }
  }

  _lineOfSight(player, maxDist) {
    if (this.row !== player.row && this.col !== player.col) return false;
    const dist = tileDistance(this.row, this.col, player.row, player.col);
    if (dist > maxDist) return false;
    // Check clear path
    const dr = Math.sign(player.row - this.row);
    const dc = Math.sign(player.col - this.col);
    for (let i = 1; i < dist; i++) {
      if (!this.scene.tilemap.isWalkable(this.row + dr * i, this.col + dc * i)) return false;
    }
    return true;
  }

  _randomWalk() {
    const dirs = [...DIRS].sort(() => Math.random() - 0.5);
    for (const { dr, dc } of dirs) {
      const nr = this.row + dr;
      const nc = this.col + dc;
      if (this._isPassable(nr, nc)) {
        this._move(dr, dc);
        return;
      }
    }
  }
}

// ── Zigzagger ─────────────────────────────────────────────────────────

export class Zigzagger extends Enemy {
  constructor(scene, row, col, waveScalar) {
    const BASE_MS = 313; // 3.2 tiles/s ≈ 0.8× player
    super(scene, row, col, 'enemy_zigzagger', Math.round(BASE_MS / waveScalar), 2);
    // Pick a random initial direction
    this.dr = DIRS[Math.floor(Math.random() * DIRS.length)].dr;
    this.dc = DIRS[Math.floor(Math.random() * DIRS.length)].dc;
    if (this.dr === 0 && this.dc === 0) { this.dr = 1; }
    this._paused = false;
  }

  update(delta) {
    if (!this.alive || this.moving || this._paused) return;
    this.pathTimer -= delta;
    if (this.pathTimer <= 0) {
      this.pathTimer = 0; // zigzagger moves every frame it can
      this._think();
    }
  }

  _think() {
    const nr = this.row + this.dr;
    const nc = this.col + this.dc;
    if (this._isPassable(nr, nc)) {
      this._move(this.dr, this.dc);
    } else {
      // Pause then change direction
      this._paused = true;
      this.scene.time.delayedCall(300, () => {
        this._paused = false;
        this._pickNewDir();
        this.pathTimer = 0;
      });
    }
  }

  _pickNewDir() {
    // Prefer 90° turns
    const perpDirs = DIRS.filter(d => {
      const dot = d.dr * this.dr + d.dc * this.dc;
      return dot === 0; // perpendicular
    });
    const tryOrder = [...perpDirs, ...DIRS].sort(() => Math.random() - 0.5);
    for (const { dr, dc } of tryOrder) {
      const nr = this.row + dr;
      const nc = this.col + dc;
      if (this._isPassable(nr, nc)) {
        this.dr = dr;
        this.dc = dc;
        return;
      }
    }
  }
}

// ── Bomber ────────────────────────────────────────────────────────────

export class Bomber extends Enemy {
  constructor(scene, row, col, waveScalar) {
    const BASE_MS = 417; // 2.4 tiles/s ≈ 0.6× player
    super(scene, row, col, 'enemy_bomber', Math.round(BASE_MS / waveScalar), 1);
    this._retreating = false;
    this._retreatUntil = 0;
    this._bombPlaced = false;
  }

  _think() {
    const target = this._nearestPlayerPos();
    if (!target) return;

    const dist = tileDistance(this.row, this.col, target.row, target.col);
    const now = this.scene.time.now;

    if (now > this._retreatUntil) this._retreating = false;

    if (dist <= 4 && !this._retreating && !this.scene.getBombAt(this.row, this.col)) {
      // Plant bomb and retreat
      this.scene.placeBombForEnemy(this, 3000);
      this._retreating = true;
      this._retreatUntil = now + 3200;
    }

    if (this._retreating) {
      const dir = bfsFleeNearest(
        this.row, this.col,
        [{ row: target.row, col: target.col }],
        (r, c) => this._isPassable(r, c)
      );
      if (dir) this._move(dir.dr, dir.dc);
    } else {
      const dir = bfsToNearest(
        this.row, this.col,
        [{ row: target.row, col: target.col }],
        (r, c) => this._isPassable(r, c)
      );
      if (dir) this._move(dir.dr, dir.dc);
    }
  }
}
