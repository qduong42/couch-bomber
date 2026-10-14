import Phaser from 'phaser';
import {
  TILE, COLS, ROWS, GAME_WIDTH, GAME_HEIGHT, HUD_HEIGHT,
  FLAME_LIFE_MS, KICK_TILES_PER_SEC, RESPAWN_INVUL_MS,
  POWERUP_WEIGHTS_WALL, POWERUP_WEIGHTS_ENEMY,
  DROP_FROM_WALL, DROP_FROM_ENEMY,
  MODES, PLAYER_NAMES
} from '../config.js';
import TilemapManager, { tileToPxX, tileToPxY } from '../managers/TilemapManager.js';
import HUD from '../managers/HUD.js';
import WaveManager from '../managers/WaveManager.js';
import Player from '../entities/Player.js';
import Bomb from '../entities/Bomb.js';
import PowerUp from '../entities/PowerUp.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.config = data;
    this.mode = data.mode;
    this.playerCount = data.players;
  }

  create() {
    this.paused = false;
    this.over = false;
    this.clock = 0; // monotonic scene clock that respects pause

    this.map = new TilemapManager(this);
    this.map.build(this.playerCount);

    this.players = [];
    for (let i = 0; i < this.playerCount; i++) {
      const c = this.map.spawnCorners[i];
      this.players.push(new Player(this, i, c.gx, c.gy));
    }

    this.bombs = [];
    this.flames = []; // {gx, gy, expiresAt, sprite}
    this.flameByTile = new Map(); // 'gx,gy' -> flame
    this.powerups = []; // PowerUp[]
    this.enemies = [];

    this.hud = new HUD(this);
    this.hud.build(this.players, this.mode);

    if (this.mode === MODES.COOP) {
      this.wave = new WaveManager(this);
      this.wave.start();
    } else {
      this.wave = null;
    }

    this.input.keyboard.on('keydown-ESC', () => this.togglePause());

    this.pauseText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PAUSED\n(Esc to resume)', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', align: 'center',
      backgroundColor: '#000000aa', padding: { x: 16, y: 12 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);
  }

  togglePause() {
    if (this.over) return;
    this.paused = !this.paused;
    this.pauseText.setVisible(this.paused);
    if (this.paused) this.tweens.pauseAll(); else this.tweens.resumeAll();
  }

  update(_timeNow, dt) {
    if (this.paused || this.over) return;
    this.clock += dt;
    const now = this.clock;

    for (const b of this.bombs) b.update(dt);

    // Expire flames.
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      if (now >= f.expiresAt) {
        this.flameByTile.delete(`${f.gx},${f.gy}`);
        f.sprite.destroy();
        this.flames.splice(i, 1);
      }
    }

    for (const p of this.players) p.update(dt, now);
    for (const e of this.enemies) e.update(dt, now);

    // Cleanup dead entities.
    this.bombs = this.bombs.filter(b => !b.exploded);
    this.enemies = this.enemies.filter(e => e.alive);
    this.powerups = this.powerups.filter(pu => pu.alive);

    if (this.wave) this.wave.update(dt, now);
    this.hud.update();
    if (this.wave) this.hud.waveLabel.setText(this.wave.waveText());

    this.checkWinConditions();
  }

  nowMs() { return this.clock; }

  // ---------- Player API ----------

  isBlockedForPlayer(player, ngx, ngy) {
    if (this.map.isWall(ngx, ngy) || this.map.isSoftWall(ngx, ngy)) return true;
    const bomb = this.bombs.find(b => !b.exploded && b.gx === ngx && b.gy === ngy);
    if (bomb) {
      // Owner can step off, but to ENTER a bomb tile (i.e. coming back), block unless kick.
      if (player.gx === bomb.gx && player.gy === bomb.gy) return false;
      if (player.kick) {
        const kicked = this.kickBomb(bomb, ngx - player.gx, ngy - player.gy);
        return !kicked; // if bomb successfully vacated, allow move; else blocked
      }
      return true;
    }
    return false;
  }

  tryPlaceBomb(player) {
    if (player.bombsAlive >= player.maxBombs) return;
    if (this.bombs.some(b => b.gx === player.gx && b.gy === player.gy)) return;
    const bomb = new Bomb(this, player, player.gx, player.gy, player.range);
    this.bombs.push(bomb);
    player.bombsAlive++;
    player.stats.bombs++;
  }

  onPlayerEnterTile(player) {
    // Pickup power-up, take flame damage.
    const pu = this.powerups.find(p => p.alive && p.gx === player.gx && p.gy === player.gy);
    if (pu) {
      player.applyPowerUp(pu.type);
      pu.destroy();
      this.hud.popup(`${PLAYER_NAMES[player.index]} +${pu.type.toUpperCase()}`, '#88ddff');
    }
    const fl = this.flameByTile.get(`${player.gx},${player.gy}`);
    if (fl) this.applyHitToPlayer(player);
  }

  onEnemyEnterTile(enemy) {
    const fl = this.flameByTile.get(`${enemy.gx},${enemy.gy}`);
    if (fl) this.killEnemy(enemy, fl.owner);
  }

  // ---------- Enemy walkability ----------

  isWalkableForEnemy(gx, gy) {
    if (this.map.isWall(gx, gy) || this.map.isSoftWall(gx, gy)) return false;
    if (this.bombs.some(b => !b.exploded && b.gx === gx && b.gy === gy)) return false;
    // Avoid live flame tiles. Avoid tiles that are within fuse-radius of a fused bomb.
    if (this.flameByTile.has(`${gx},${gy}`)) return false;
    for (const b of this.bombs) {
      if (b.exploded) continue;
      if (gx === b.gx && Math.abs(gy - b.gy) <= b.range) return false;
      if (gy === b.gy && Math.abs(gx - b.gx) <= b.range) return false;
    }
    return true;
  }

  // ---------- Bomb / flame ----------

  detonateBomb(bomb) {
    if (bomb.exploded) return;
    bomb.exploded = true;
    const owner = bomb.owner;
    if (owner) owner.bombsAlive = Math.max(0, owner.bombsAlive - 1);
    bomb.sprite.destroy();

    const tiles = [{ gx: bomb.gx, gy: bomb.gy }];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      for (let r = 1; r <= bomb.range; r++) {
        const gx = bomb.gx + dx * r;
        const gy = bomb.gy + dy * r;
        if (this.map.isWall(gx, gy)) break;
        tiles.push({ gx, gy });
        if (this.map.isSoftWall(gx, gy)) {
          this.map.destroySoftWall(gx, gy);
          if (owner) owner.stats.walls++;
          this.maybeDropFromWall(gx, gy);
          break;
        }
        // Chain another bomb.
        const other = this.bombs.find(b => !b.exploded && b.gx === gx && b.gy === gy);
        if (other) { other.fuse = 0; break; }
      }
    }

    const now = this.clock;
    for (const t of tiles) this.spawnFlame(t.gx, t.gy, now, owner);
  }

  spawnFlame(gx, gy, now, owner) {
    // If a flame already exists, refresh it and apply damage again (rare).
    const key = `${gx},${gy}`;
    if (this.flameByTile.has(key)) {
      const f = this.flameByTile.get(key);
      f.expiresAt = Math.max(f.expiresAt, now + FLAME_LIFE_MS);
    } else {
      const sprite = this.add.image(tileToPxX(gx), tileToPxY(gy), 'flameCore').setDepth(6);
      this.tweens.add({ targets: sprite, alpha: 0.6, duration: 120, yoyo: true, repeat: 2 });
      const flame = { gx, gy, expiresAt: now + FLAME_LIFE_MS, sprite, owner };
      this.flames.push(flame);
      this.flameByTile.set(key, flame);
    }
    this.applyDamageOnTile(gx, gy, owner);
  }

  applyDamageOnTile(gx, gy, owner) {
    // Players present.
    for (const p of this.players) {
      if (!p.alive || p.eliminated) continue;
      if (p.gx === gx && p.gy === gy) this.applyHitToPlayer(p);
    }
    // Enemies present.
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.gx === gx && e.gy === gy) this.killEnemy(e, owner);
    }
    // Pre-existing power-ups on this tile are destroyed by flame.
    for (const pu of this.powerups) {
      if (pu.alive && pu.gx === gx && pu.gy === gy) pu.destroy();
    }
  }

  applyHitToPlayer(player) {
    const now = this.clock;
    const took = player.takeHit(now);
    if (!took) return;
    if (player.eliminated) {
      this.hud.popup(`${PLAYER_NAMES[player.index]} ELIMINATED`, '#ff8888');
    } else {
      this.hud.popup(`${PLAYER_NAMES[player.index]} -1 LIFE`, '#ffaaaa');
      const corner = this.pickRespawnCorner(player);
      player.respawn(corner.gx, corner.gy, now);
    }
  }

  pickRespawnCorner(player) {
    const corners = this.map.spawnCorners;
    let best = corners[0];
    let bestScore = -Infinity;
    for (const c of corners) {
      let s = 0;
      // Prefer corners with no flame.
      if (!this.flameByTile.has(`${c.gx},${c.gy}`)) s += 1000;
      // Prefer corners far from fused bombs.
      for (const b of this.bombs) if (!b.exploded) s -= Math.max(0, 6 - (Math.abs(c.gx - b.gx) + Math.abs(c.gy - b.gy)));
      // Prefer corners far from enemies.
      for (const e of this.enemies) s -= Math.max(0, 8 - (Math.abs(c.gx - e.gx) + Math.abs(c.gy - e.gy)));
      // Prefer corners far from other live players.
      for (const op of this.players) {
        if (op === player || !op.alive || op.eliminated) continue;
        s -= Math.max(0, 4 - (Math.abs(c.gx - op.gx) + Math.abs(c.gy - op.gy)));
      }
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return best;
  }

  killEnemy(enemy, owner) {
    if (enemy.takeHit(owner)) {
      this.maybeDropFromEnemy(enemy.gx, enemy.gy);
    }
  }

  // ---------- Power-up drops ----------

  maybeDropFromWall(gx, gy) {
    if (Math.random() >= DROP_FROM_WALL) return;
    this.scheduleDrop(gx, gy, POWERUP_WEIGHTS_WALL, FLAME_LIFE_MS + 80);
  }

  maybeDropFromEnemy(gx, gy) {
    if (Math.random() >= DROP_FROM_ENEMY) return;
    this.scheduleDrop(gx, gy, POWERUP_WEIGHTS_ENEMY, 0);
  }

  scheduleDrop(gx, gy, weights, delayMs) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    if (total <= 0) return;
    let r = Math.random() * total;
    let chosen = null;
    for (const [type, w] of Object.entries(weights)) {
      r -= w;
      if (r <= 0) { chosen = type; break; }
    }
    if (!chosen) return;
    if (delayMs <= 0) {
      this.powerups.push(new PowerUp(this, gx, gy, chosen));
    } else {
      this.time.delayedCall(delayMs, () => {
        // Don't drop on a wall or another power-up.
        if (this.over) return;
        if (this.map.isBlocking(gx, gy)) return;
        if (this.powerups.some(p => p.alive && p.gx === gx && p.gy === gy)) return;
        this.powerups.push(new PowerUp(this, gx, gy, chosen));
        // If a player is standing on this tile, pick up immediately.
        for (const p of this.players) {
          if (p.alive && !p.eliminated && p.gx === gx && p.gy === gy) {
            this.onPlayerEnterTile(p);
            break;
          }
        }
      });
    }
  }

  // ---------- Kick ----------

  kickBomb(bomb, dx, dy) {
    if (bomb.kicking) return false;
    const origGx = bomb.gx, origGy = bomb.gy;
    let cx = origGx + dx, cy = origGy + dy;
    let last = { gx: origGx, gy: origGy };
    while (true) {
      if (this.map.isWall(cx, cy) || this.map.isSoftWall(cx, cy)) break;
      if (this.bombs.some(b => b !== bomb && !b.exploded && b.gx === cx && b.gy === cy)) break;
      last = { gx: cx, gy: cy };
      cx += dx; cy += dy;
    }
    if (last.gx === origGx && last.gy === origGy) return false;
    bomb.kicking = true;
    bomb.gx = last.gx; bomb.gy = last.gy;
    const dist = Math.abs(last.gx - origGx) + Math.abs(last.gy - origGy);
    const duration = (dist * 1000) / KICK_TILES_PER_SEC;
    this.tweens.add({
      targets: bomb.sprite,
      x: tileToPxX(last.gx),
      y: tileToPxY(last.gy),
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => { bomb.kicking = false; }
    });
    return true;
  }

  // ---------- Win conditions ----------

  checkWinConditions() {
    if (this.over) return;
    if (this.mode === MODES.VERSUS) {
      const alive = this.players.filter(p => !p.eliminated);
      if (alive.length === 0) return this.endGame({ outcome: 'draw' });
      if (alive.length === 1 && this.players.length > 1) return this.endGame({ outcome: 'winner', winner: alive[0].index });
    } else {
      // Co-op: all KO'd → loss.
      const alive = this.players.filter(p => !p.eliminated);
      if (alive.length === 0) return this.endGame({ outcome: 'coop_loss' });
      // Win is signalled by WaveManager via onCoopWin().
    }
  }

  onCoopWin() {
    this.endGame({ outcome: 'coop_win' });
  }

  endGame(outcome) {
    if (this.over) return;
    this.over = true;
    const stats = this.players.map(p => p.stats);
    this.time.delayedCall(1200, () => {
      this.scene.start('GameOver', { ...outcome, stats, config: this.config });
    });
  }
}
