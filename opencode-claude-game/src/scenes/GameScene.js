import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, HUD_HEIGHT, TILE_SIZE,
  PLAYER_STARTS, PLAYER_COLORS, PLAYER_COLOR_NAMES,
  MODE, WALL_DROP_CHANCE, ENEMY_DROP_CHANCE,
  BOMB_TIMER_MS, BOMB_TIMER_HARD_MS,
  POWERUP, INITIAL_LIVES,
} from '../constants.js';
import { tileToWorld, tileDistance, DIRS, isValidTile } from '../utils/Grid.js';
import TilemapManager from '../managers/TilemapManager.js';
import HUD from '../managers/HUD.js';
import WaveManager from '../managers/WaveManager.js';
import Player from '../entities/Player.js';
import Bomb from '../entities/Bomb.js';
import Explosion from '../entities/Explosion.js';
import PowerUp, { pickWallDrop, pickEnemyDrop } from '../entities/PowerUp.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.mode        = data.mode        ?? MODE.VERSUS;
    this.playerCount = data.playerCount ?? 2;
    this._initData   = data;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  create() {
    // State
    this.paused = false;
    this._ended = false;

    // Collections
    /** @type {Player[]} */   this.players  = [];
    /** @type {Bomb[]} */     this.bombs    = [];
    /** @type {Explosion[]} */this.flames   = [];
    /** @type {PowerUp[]} */  this.powerUps = [];
    /** @type {import('../entities/Enemy.js').Enemy[]} */ this.enemies = [];

    // Bomb grid map: "row,col" → Bomb
    this._bombMap    = new Map();
    // Flame grid set: "row,col" → count of flames
    this._flameMap   = new Map();
    // Power-up grid map: "row,col" → PowerUp
    this._powerUpMap = new Map();
    // Chain queue: bombs to detonate this tick
    this._chainQueue = [];

    // ── Physics groups ────────────────────────────────────────────────
    this.playerGroup  = this.physics.add.group();
    this.bombGroup    = this.physics.add.group();
    this.flameGroup   = this.physics.add.group();
    this.powerUpGroup = this.physics.add.group();
    this.enemyGroup   = this.physics.add.group();

    // ── Map ───────────────────────────────────────────────────────────
    this.tilemap = new TilemapManager(this);

    // ── Players ───────────────────────────────────────────────────────
    this._createPlayers();

    // ── HUD ───────────────────────────────────────────────────────────
    this.hud = new HUD(this, this.players, this.mode);

    // ── Co-op wave manager ────────────────────────────────────────────
    if (this.mode === MODE.COOP) {
      this.waveManager = new WaveManager(this);
    }

    // ── Physics overlaps ──────────────────────────────────────────────
    this._setupOverlaps();

    // ── Input ─────────────────────────────────────────────────────────
    this._escKey = this.input.keyboard.addKey('ESC');

    // Mute toggle
    this.input.keyboard.on('keydown-M', () => {
      this.sound.mute = !this.sound.mute;
    });

    // ── HUD center ────────────────────────────────────────────────────
    if (this.mode === MODE.VERSUS) {
      this.hud.setCenter('VERSUS');
    }

    // ── Countdown ─────────────────────────────────────────────────────
    this._showCountdown(() => {
      if (this.mode === MODE.COOP && this.waveManager) {
        this.waveManager.start();
      }
    });
  }

  update(time, delta) {
    if (this.paused) return;

    // Process chain queue first
    this._processChainQueue();

    // Players
    for (const p of this.players) p.update(time, delta);

    // Bombs
    for (const b of [...this.bombs]) b.update(delta);

    // Flames
    for (const f of [...this.flames]) f.update(delta);

    // Enemies
    for (const e of this.enemies) if (e.alive) e.update(delta);

    // Pause toggle
    if (Phaser.Input.Keyboard.JustDown(this._escKey)) {
      this._togglePause();
    }
  }

  // ── Player creation ──────────────────────────────────────────────────

  _createPlayers() {
    const keyBindings = [
      { up: 'W', down: 'S', left: 'A', right: 'D', bomb: 'SPACE' },
      { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', bomb: 'ENTER' },
    ];

    for (let i = 0; i < this.playerCount; i++) {
      const { row, col } = PLAYER_STARTS[i];
      const p = new Player(this, i, row, col);
      this.players.push(p);
      this.playerGroup.add(p);

      if (i < 2) {
        // Keyboard
        p.keys = this.input.keyboard.addKeys(
          Object.fromEntries(
            Object.entries(keyBindings[i]).map(([k, v]) => [k, v])
          )
        );
      } else {
        // Gamepad (players 3 and 4 - indices 2 and 3)
        const padIndex = i - 2;
        this.input.gamepad.once('connected', () => {
          if (this.input.gamepad.total > padIndex) {
            p.gamepad = this.input.gamepad.getPad(padIndex);
          }
        });
        // Also check if already connected
        if (this.input.gamepad.total > padIndex) {
          p.gamepad = this.input.gamepad.getPad(padIndex);
        }
      }
    }
  }

  // ── Overlaps ─────────────────────────────────────────────────────────

  _setupOverlaps() {
    // Player ↔ flame
    this.physics.add.overlap(this.playerGroup, this.flameGroup, (player, flame) => {
      if (player.alive && !player.invulnerable && !player.justHit) {
        player.takeDamage(flame.owner);
      }
    });

    // Player ↔ power-up
    this.physics.add.overlap(this.playerGroup, this.powerUpGroup, (player, pu) => {
      if (player.alive && pu.active) {
        pu.setActive(false).setVisible(false);
        this._powerUpMap.delete(`${pu.row},${pu.col}`);
        player.applyPowerUp(pu.type);
        pu.destroy();
      }
    });

    // Enemy ↔ flame
    this.physics.add.overlap(this.enemyGroup, this.flameGroup, (enemy, flame) => {
      if (enemy.alive) {
        enemy.takeDamage(flame.owner);
      }
    });
  }

  /** Call after creating a new enemy (for overlap registration) */
  setupEnemyOverlaps(enemy) {
    this.physics.add.overlap(enemy, this.flameGroup, (e, flame) => {
      if (e.alive) e.takeDamage(flame.owner);
    });
    this.physics.add.overlap(enemy, this.playerGroup, () => {});
  }

  // ── Movement validation ──────────────────────────────────────────────

  /**
   * Can `player` move to (nr, nc)?
   * Checks tilemap walkability + bomb occupancy + kick availability.
   */
  canPlayerMove(player, nr, nc) {
    if (!isValidTile(nr, nc)) return false;

    // Tilemap must be walkable (no wall or soft wall)
    if (!this.tilemap.isWalkable(nr, nc)) return false;

    // Check for bomb
    const bomb = this.getBombAt(nr, nc);
    if (bomb) {
      // Player can walk through if still in pass-through set
      if (bomb.passThroughPlayers.has(player)) return true;
      // Or if player has Kick and the tile beyond is clear
      const dr = nr - player.row;
      const dc = nc - player.col;
      const nnr = nr + dr;
      const nnc = nc + dc;
      if (player.hasKick && this.tilemap.isWalkable(nnr, nnc) && !this.getBombAt(nnr, nnc)) {
        return true; // will kick
      }
      return false;
    }

    return true;
  }

  /** Called when a player's tween completes — remove from pass-through sets */
  onPlayerMoved(player) {
    for (const bomb of this.bombs) {
      if (bomb.passThroughPlayers.has(player)) {
        if (bomb.row !== player.row || bomb.col !== player.col) {
          bomb.passThroughPlayers.delete(player);
        }
      }
    }
  }

  // ── Bomb management ──────────────────────────────────────────────────

  tryPlaceBomb(player) {
    if (!player.alive) return;
    if (player.placedBombCount >= player.maxBombs) return;
    if (this.getBombAt(player.row, player.col)) return;

    const bomb = new Bomb(this, player.row, player.col, player, BOMB_TIMER_MS);
    this.bombs.push(bomb);
    this.bombGroup.add(bomb);
    this._bombMap.set(`${player.row},${player.col}`, bomb);
    player.placedBombCount++;
    player.statBombs++;
  }

  placeBombForEnemy(enemy, timerMs) {
    if (this.getBombAt(enemy.row, enemy.col)) return;
    const bomb = new Bomb(this, enemy.row, enemy.col, null, timerMs);
    bomb.range = 1;
    this.bombs.push(bomb);
    this.bombGroup.add(bomb);
    this._bombMap.set(`${enemy.row},${enemy.col}`, bomb);
  }

  getBombAt(r, c) {
    return this._bombMap.get(`${r},${c}`) ?? null;
  }

  moveBomb(bomb, nr, nc) {
    this._bombMap.delete(`${bomb.row},${bomb.col}`);
    bomb.row = nr;
    bomb.col = nc;
    this._bombMap.set(`${nr},${nc}`, bomb);
  }

  kickBomb(bomb, dr, dc) {
    if (bomb.kicked) return;
    // Remove from current position map while sliding
    this._bombMap.delete(`${bomb.row},${bomb.col}`);
    bomb.startKick(dr, dc);
    // bomb._slideStep will call moveBomb; when it stops it won't call again
  }

  detonateBomb(bomb) {
    if (bomb.exploded) return;
    bomb.exploded = true;

    // Remove from map
    this._bombMap.delete(`${bomb.row},${bomb.col}`);
    this.bombs = this.bombs.filter(b => b !== bomb);

    // Credit owner
    if (bomb.owner) bomb.owner.placedBombCount = Math.max(0, bomb.owner.placedBombCount - 1);

    // Stop blink tween
    this.tweens.killTweensOf(bomb);
    bomb.destroy();

    // Propagate explosion
    this._propagateExplosion(bomb.row, bomb.col, bomb.range, bomb.owner);
  }

  _processChainQueue() {
    if (this._chainQueue.length === 0) return;
    const toDetonate = [...this._chainQueue];
    this._chainQueue = [];
    for (const b of toDetonate) this.detonateBomb(b);
  }

  // ── Explosion propagation ────────────────────────────────────────────

  _propagateExplosion(row, col, range, owner) {
    // Center
    this._createFlame(row, col, 'center', owner);

    // 4 directions
    const tipKeys = { '-1,0': 'tip_up', '1,0': 'tip_down', '0,-1': 'tip_left', '0,1': 'tip_right' };
    const armKeys = { '-1,0': 'arm_v',  '1,0': 'arm_v',    '0,-1': 'arm_h',   '0,1': 'arm_h'    };

    for (const { dr, dc } of DIRS) {
      const dirKey = `${dr},${dc}`;
      for (let i = 1; i <= range; i++) {
        const r = row + dr * i;
        const c = col + dc * i;

        if (!isValidTile(r, c)) break;

        // Hard wall: stop, no destruction
        if (this.tilemap.isWall(r, c)) break;

        // Soft wall: destroy, roll drop, stop propagation
        if (this.tilemap.isSoft(r, c)) {
          this._createFlame(r, c, tipKeys[dirKey], owner); // always tip at the boundary
          const destroyed = this.tilemap.destroySoftWall(r, c);
          if (destroyed && owner) owner.statWalls++;
          // Roll power-up drop
          if (destroyed && Math.random() < WALL_DROP_CHANCE) {
            this.time.delayedCall(150, () => {
              if (!this.getBombAt(r, c) && !this._powerUpMap?.get(`${r},${c}`)) {
                this._spawnPowerUp(r, c, pickWallDrop());
              }
            });
          }
          break;
        }

        // Another bomb: chain-detonate next tick
        const chainBomb = this.getBombAt(r, c);
        if (chainBomb) {
          this._chainQueue.push(chainBomb);
          break;
        }

        // Normal flame tile (arm or tip at range end)
        const variant = (i === range) ? tipKeys[dirKey] : armKeys[dirKey];
        this._createFlame(r, c, variant, owner);
      }
    }
  }

  _createFlame(r, c, variant, owner) {
    // Map variant shorthands to texture keys
    const texMap = {
      center: 'flame_center',
      arm_h:  'flame_arm_h',
      arm_v:  'flame_arm_v',
      tip_up:    'flame_tip_up',
      tip_down:  'flame_tip_down',
      tip_left:  'flame_tip_left',
      tip_right: 'flame_tip_right',
    };
    const tex = texMap[variant] ?? 'flame_center';
    const flame = new Explosion(this, r, c, variant, owner);
    flame.setTexture(tex);
    this.flames.push(flame);
    this.flameGroup.add(flame);

    // Track in flame map
    const key = `${r},${c}`;
    this._flameMap.set(key, (this._flameMap.get(key) ?? 0) + 1);
  }

  hasFlameAt(r, c) {
    return (this._flameMap.get(`${r},${c}`) ?? 0) > 0;
  }

  onFlameDestroyed(flame) {
    this.flames = this.flames.filter(f => f !== flame);
    const key = `${flame.row},${flame.col}`;
    const cnt = this._flameMap.get(key) ?? 1;
    if (cnt <= 1) this._flameMap.delete(key);
    else this._flameMap.set(key, cnt - 1);
  }

  // ── Sprite proximity ─────────────────────────────────────────────────

  getSpriteAt(r, c) {
    for (const p of this.players) {
      if (p.alive && p.row === r && p.col === c) return p;
    }
    for (const e of this.enemies) {
      if (e.alive && e.row === r && e.col === c) return e;
    }
    return null;
  }

  // ── Power-ups ─────────────────────────────────────────────────────────

  _spawnPowerUp(r, c, type) {
    const key = `${r},${c}`;
    if (this._powerUpMap.has(key)) return;

    const pu = new PowerUp(this, r, c, type);
    this.powerUps.push(pu);
    this.powerUpGroup.add(pu);
    this._powerUpMap.set(key, pu);
  }

  showPickupPopup(player, type) {
    const labels = {
      [POWERUP.BOMB]:   '+Bomb!',
      [POWERUP.RANGE]:  '+Range!',
      [POWERUP.SPEED]:  '+Speed!',
      [POWERUP.KICK]:   'Kick!',
      [POWERUP.SHIELD]: 'Shield!',
    };
    const hex = '#' + PLAYER_COLORS[player.playerIndex].toString(16).padStart(6, '0');
    this.hud.showPopup(`P${player.playerIndex + 1} ${labels[type] ?? type}`, hex);
  }

  // ── Player events ─────────────────────────────────────────────────────

  onPlayerKilled(player) {
    this.hud.update();
    const hex = '#' + PLAYER_COLORS[player.playerIndex].toString(16).padStart(6, '0');
    this.hud.showPopup(`Player ${player.playerIndex + 1} eliminated!`, hex);
    this.time.delayedCall(300, () => this._checkGameOver());
  }

  respawnPlayer(player) {
    const pos = this._findRespawnCorner(player);
    player.row = pos.row;
    player.col = pos.col;
    const { x, y } = tileToWorld(pos.row, pos.col);
    player.setPosition(x, y);
    if (player.body) player.body.enable = true;
    player.startInvulnerability();
    this.hud.update();
  }

  _findRespawnCorner(player) {
    const corners = [
      { row: 1, col: 1  },
      { row: 1, col: 11 },
      { row: 11, col: 1 },
      { row: 11, col: 11 },
    ];

    const threats = [
      ...this.players.filter(p => p.alive && p !== player).map(p => ({ row: p.row, col: p.col })),
      ...this.enemies.filter(e => e.alive).map(e => ({ row: e.row, col: e.col })),
    ];

    // Score: max min-distance to any flame/enemy/player
    let best = null;
    let bestScore = -1;

    for (const corner of corners) {
      if (!this.tilemap.isWalkable(corner.row, corner.col)) continue;
      if (this.hasFlameAt(corner.row, corner.col)) continue;

      const score = threats.length > 0
        ? Math.min(...threats.map(t => tileDistance(corner.row, corner.col, t.row, t.col)))
        : 999;

      if (score > bestScore) {
        bestScore = score;
        best = corner;
      }
    }

    if (best) return best;

    // Retry after 0.5s if no safe corner
    return { row: 1, col: 1 }; // fallback
  }

  // ── Enemy events ──────────────────────────────────────────────────────

  onEnemyKilled(enemy, attacker) {
    this.enemies = this.enemies.filter(e => e !== enemy);

    // Power-up drop
    if (Math.random() < ENEMY_DROP_CHANCE) {
      this.time.delayedCall(200, () => {
        this._spawnPowerUp(enemy.row, enemy.col, pickEnemyDrop());
      });
    }

    if (this.mode === MODE.COOP && this.waveManager) {
      this.waveManager.onEnemyKilled();
    }
  }

  // ── Game over ─────────────────────────────────────────────────────────

  _checkGameOver() {
    if (this.mode === MODE.VERSUS) {
      const alive = this.players.filter(p => p.alive);
      if (alive.length <= 1) {
        const stats = {};
        this.players.forEach((p, i) => { stats[i] = p.getStats(); });

        if (alive.length === 0) {
          this.endGame({ result: 'draw', stats });
        } else {
          this.endGame({ result: 'win', winner: alive[0].playerIndex, stats });
        }
      }
    } else {
      // Co-op: check all players dead
      if (this.players.every(p => !p.alive)) {
        const wv = this.waveManager?.currentWave ?? 0;
        this.endGame({ result: 'loss', wave: wv });
      }
    }
  }

  endGame(data) {
    if (this._ended) return;
    this._ended = true;

    this.paused = true;
    this.time.delayedCall(1200, () => {
      this.scene.start('GameOverScene', {
        ...data,
        mode: this.mode,
        wave: data.wave ?? this.waveManager?.currentWave ?? 0,
        gameConfig: this._initData,
      });
    });
  }

  // ── Pause ─────────────────────────────────────────────────────────────

  _togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.tweens.pauseAll();
      this.time.paused = true;
      this.hud.showPauseOverlay();
    } else {
      this.tweens.resumeAll();
      this.time.paused = false;
      this.hud.hidePauseOverlay();
    }
  }

  // ── Countdown ─────────────────────────────────────────────────────────

  _showCountdown(onDone) {
    this.paused = true;
    const cx = GAME_WIDTH / 2;
    const cy = HUD_HEIGHT + (GAME_HEIGHT - HUD_HEIGHT) / 2;

    const show = (n, cb) => {
      const txt = this.add.text(cx, cy, n === 0 ? 'GO!' : `${n}`, {
        fontSize: '64px', fontFamily: 'monospace',
        color: n === 0 ? '#44ff88' : '#ffffff',
        stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(25);

      this.tweens.add({
        targets: txt,
        alpha: { from: 1, to: 0 },
        scaleX: { from: 1, to: 1.8 },
        scaleY: { from: 1, to: 1.8 },
        duration: 900,
        onComplete: () => { txt.destroy(); cb && cb(); },
      });
    };

    show(3, () => {
      this.time.delayedCall(900, () => {
        show(2, () => {
          this.time.delayedCall(900, () => {
            show(1, () => {
              this.time.delayedCall(900, () => {
                show(0, () => {
                  this.paused = false;
                  onDone?.();
                });
              });
            });
          });
        });
      });
    });
  }
}
