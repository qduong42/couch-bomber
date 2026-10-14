import { WAVE_MAX, MAX_ENEMIES, COLS, ROWS } from '../constants.js';
import { Chaser } from '../entities/Chaser.js';
import { Runner } from '../entities/Runner.js';
import { Zigzagger } from '../entities/Zigzagger.js';
import { BomberEnemy } from '../entities/BomberEnemy.js';

const WAVE_REST_MS = 2000;

export class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.wave = 0;
    this.enemies = [];
    this.state = 'idle'; // 'idle' | 'active' | 'rest' | 'complete'
    this.restTimer = 0;
    this.onWaveComplete = null; // callback
    this.onGameComplete = null; // callback
  }

  startWaves(gameScene) {
    this.gameScene = gameScene;
    this.wave = 0;
    this._startNextWave();
  }

  _startNextWave() {
    this.wave++;

    if (this.wave > WAVE_MAX) {
      this.state = 'complete';
      if (this.onGameComplete) this.onGameComplete();
      return;
    }

    this.state = 'active';
    const count = Math.min(Math.ceil(1.5 * this.wave), MAX_ENEMIES);

    // Announce wave
    if (this.onWaveComplete) this.onWaveComplete(this.wave);

    for (let i = 0; i < count; i++) {
      this._spawnEnemy();
    }
  }

  _spawnEnemy() {
    const { tilemapManager, players } = this.gameScene;
    const wave = this.wave;

    // Find valid spawn tile: not blocked, ≥ 4 tiles from any player
    const candidates = [];
    for (let ty = 1; ty < ROWS - 1; ty++) {
      for (let tx = 1; tx < COLS - 1; tx++) {
        if (tilemapManager.isBlocked(tx, ty)) continue;
        const tooClose = players.some(
          p => p.alive && Math.abs(p.tx - tx) + Math.abs(p.ty - ty) < 4
        );
        if (tooClose) continue;
        const occupied = this.enemies.some(e => e.alive && e.tx === tx && e.ty === ty);
        if (occupied) continue;
        candidates.push({ tx, ty });
      }
    }

    if (candidates.length === 0) return;

    const { tx, ty } = candidates[Math.floor(Math.random() * candidates.length)];

    // Pick enemy type based on wave
    let enemy;
    if (wave >= 5 && Math.random() < 0.2) {
      enemy = new BomberEnemy(this.scene, tx, ty);
    } else if (wave >= 3 && Math.random() < 0.3) {
      enemy = new Zigzagger(this.scene, tx, ty);
    } else if (wave >= 2 && Math.random() < 0.4) {
      enemy = new Runner(this.scene, tx, ty);
    } else {
      enemy = new Chaser(this.scene, tx, ty);
    }

    this.enemies.push(enemy);
  }

  update(time, delta, gameScene) {
    if (this.state === 'idle' || this.state === 'complete') return;

    if (this.state === 'rest') {
      this.restTimer -= delta;
      if (this.restTimer <= 0) {
        this._startNextWave();
      }
      return;
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.alive) {
        this.enemies.splice(i, 1);
        continue;
      }
      enemy.update(time, delta, gameScene);
    }

    // Check if wave is cleared
    if (this.enemies.length === 0 && this.state === 'active') {
      this.state = 'rest';
      this.restTimer = WAVE_REST_MS;
    }
  }

  getAliveEnemies() {
    return this.enemies.filter(e => e.alive);
  }

  destroy() {
    for (const enemy of this.enemies) enemy.destroy();
    this.enemies = [];
  }
}
