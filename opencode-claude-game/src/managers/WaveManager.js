import { MAX_WAVES, REST_DURATION } from '../constants.js';
import { Chaser, Runner, Zigzagger, Bomber } from '../entities/Enemy.js';
import { isValidTile, tileDistance } from '../utils/Grid.js';
import { GRID_ROWS, GRID_COLS } from '../constants.js';

const MAX_ON_MAP = 12;

export default class WaveManager {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.wave = 0;
    this.resting = false;
    this._queue = []; // enemies waiting to spawn due to MAX_ON_MAP cap
    this._spawnTimer = null;
  }

  /** Begin wave 1 */
  start() {
    this._startNextWave();
  }

  get currentWave() { return this.wave; }

  onEnemyKilled() {
    const alive = this.scene.enemies.filter(e => e.alive).length;

    // Flush queue
    while (this._queue.length > 0 && alive + (MAX_ON_MAP - alive) > 0) {
      if (this.scene.enemies.filter(e => e.alive).length < MAX_ON_MAP) {
        const fn = this._queue.shift();
        fn();
      } else break;
    }

    if (alive === 0 && this._queue.length === 0) {
      this._onWaveClear();
    }
  }

  _onWaveClear() {
    if (this.wave >= MAX_WAVES) {
      this.scene.endGame({ result: 'coop_win', wave: this.wave });
      return;
    }

    this.resting = true;
    this.scene.hud.setCenter(`Wave ${this.wave} clear! Next in...`);

    let countdown = REST_DURATION / 1000;
    const tick = () => {
      if (countdown <= 0) {
        this.resting = false;
        this._startNextWave();
      } else {
        this.scene.hud.setCenter(`Wave ${this.wave} clear! Next in ${countdown.toFixed(0)}s`);
        countdown -= 0.5;
        this.scene.time.delayedCall(500, tick);
      }
    };
    this.scene.time.delayedCall(0, tick);
  }

  _startNextWave() {
    this.wave++;
    const n = Math.ceil(1.5 * this.wave);
    // Wave speed scalar: +5% per wave, cap +50%
    const scalar = Math.min(1 + 0.05 * (this.wave - 1), 1.5);

    this.scene.hud.setCenter(`Wave ${this.wave}`);
    this.scene.hud.showPopup(`Wave ${this.wave}`, '#ffee44');

    // Build enemy list
    const list = [];
    for (let i = 0; i < n; i++) {
      list.push(this._pickEnemyType(scalar));
    }

    // Spawn with small delay between each
    list.forEach((fn, idx) => {
      this.scene.time.delayedCall(idx * 400, () => {
        if (this.scene.enemies.filter(e => e.alive).length < MAX_ON_MAP) {
          fn();
        } else {
          this._queue.push(fn);
        }
      });
    });
  }

  _pickEnemyType(scalar) {
    const types = [
      { wave: 1, Class: Chaser,    w: 40 },
      { wave: 2, Class: Runner,    w: 30 },
      { wave: 3, Class: Zigzagger, w: 20 },
      { wave: 5, Class: Bomber,    w: 10 },
    ].filter(t => this.wave >= t.wave);

    const total = types.reduce((s, t) => s + t.w, 0);
    let r = Math.random() * total;
    let chosen = types[0];
    for (const t of types) {
      r -= t.w;
      if (r <= 0) { chosen = t; break; }
    }

    return () => {
      const pos = this._safeSpawnPos();
      if (!pos) return;
      const enemy = new chosen.Class(this.scene, pos.row, pos.col, scalar);
      this.scene.enemies.push(enemy);
      this.scene.enemyGroup.add(enemy);
      this.scene.setupEnemyOverlaps(enemy);
    };
  }

  _safeSpawnPos() {
    const players = this.scene.players.filter(p => p.alive);
    const candidates = [];

    for (let r = 1; r < GRID_ROWS - 1; r++) {
      for (let c = 1; c < GRID_COLS - 1; c++) {
        if (!this.scene.tilemap.isWalkable(r, c)) continue;
        if (this.scene.getBombAt(r, c)) continue;

        const tooClose = players.some(p => tileDistance(r, c, p.row, p.col) < 4);
        if (!tooClose) candidates.push({ row: r, col: c });
      }
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
}
