import {
  WAVE_FORMULA, WAVE_REST_MS, ENEMY_SPEED_PER_WAVE, ENEMY_SPEED_CAP,
  SIM_ENEMY_CAP, COOP_FINAL_WAVE, COLS, ROWS
} from '../config.js';
import ChaserEnemy from '../entities/Enemy.js';

export default class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.wave = 0;
    this.state = 'idle'; // idle | active | rest | done
    this.restUntil = 0;
    this.queueRemaining = 0;
  }

  start() {
    this.nextWave();
  }

  nextWave() {
    this.wave++;
    if (this.wave > COOP_FINAL_WAVE) { this.state = 'done'; this.scene.onCoopWin(); return; }
    const target = WAVE_FORMULA(this.wave);
    this.queueRemaining = target;
    this.state = 'active';
    this.spawnUpToCap();
    this.scene.hud.popup(`WAVE ${this.wave}`, '#ffaa44');
  }

  spawnUpToCap() {
    while (this.queueRemaining > 0 && this.scene.enemies.length < SIM_ENEMY_CAP) {
      const tile = this.findSpawnTile();
      if (!tile) break;
      const speedMult = Math.min(0.5 * (1 + Math.min(ENEMY_SPEED_CAP, ENEMY_SPEED_PER_WAVE * (this.wave - 1))), 0.5 * (1 + ENEMY_SPEED_CAP));
      this.scene.enemies.push(new ChaserEnemy(this.scene, tile.gx, tile.gy, speedMult));
      this.queueRemaining--;
    }
  }

  findSpawnTile() {
    for (let attempts = 0; attempts < 80; attempts++) {
      const gx = 1 + Math.floor(Math.random() * (COLS - 2));
      const gy = 1 + Math.floor(Math.random() * (ROWS - 2));
      if (this.scene.map.isBlocking(gx, gy)) continue;
      if (this.scene.bombs.some(b => b.gx === gx && b.gy === gy)) continue;
      const tooCloseToPlayer = this.scene.players.some(p =>
        p.alive && !p.eliminated && Math.abs(p.gx - gx) + Math.abs(p.gy - gy) < 4
      );
      if (tooCloseToPlayer) continue;
      return { gx, gy };
    }
    return null;
  }

  update(dt, now) {
    if (this.state === 'active') {
      // Top up if cap freed.
      if (this.queueRemaining > 0) this.spawnUpToCap();
      if (this.queueRemaining === 0 && this.scene.enemies.length === 0) {
        this.state = 'rest';
        this.restUntil = now + WAVE_REST_MS;
        this.scene.hud.popup(`WAVE ${this.wave} CLEAR`, '#88ff88');
      }
    } else if (this.state === 'rest') {
      if (now >= this.restUntil) this.nextWave();
    }
  }

  waveText() {
    if (this.state === 'done') return 'COMPLETE';
    if (this.state === 'rest') return `Wave ${this.wave} cleared`;
    return `Wave ${this.wave}  enemies:${this.scene.enemies.length + this.queueRemaining}`;
  }
}
