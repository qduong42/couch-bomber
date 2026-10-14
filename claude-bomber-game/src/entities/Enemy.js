import { BASE_TILE_MS } from '../config.js';
import { tileToPxX, tileToPxY } from '../managers/TilemapManager.js';
import { bfs } from '../util/Pathfinding.js';
import { COLS, ROWS } from '../config.js';

export default class ChaserEnemy {
  constructor(scene, gx, gy, speedMult = 0.5) {
    this.scene = scene;
    this.gx = gx;
    this.gy = gy;
    this.hp = 1;
    this.tileMs = BASE_TILE_MS / speedMult;
    this.sprite = scene.add.image(tileToPxX(gx), tileToPxY(gy), 'enemyChaser').setDepth(5);
    this.moving = false;
    this.fromX = this.sprite.x; this.fromY = this.sprite.y;
    this.toX = this.sprite.x; this.toY = this.sprite.y;
    this.targetGx = gx; this.targetGy = gy;
    this.tNow = 0; this.tDur = 0;
    this.repathAt = 0;
    this.alive = true;
  }

  update(dt, now) {
    if (!this.alive) return;
    if (this.moving) {
      this.tNow += dt;
      const p = Math.min(1, this.tNow / this.tDur);
      this.sprite.x = this.fromX + (this.toX - this.fromX) * p;
      this.sprite.y = this.fromY + (this.toY - this.fromY) * p;
      if (p >= 1) {
        this.moving = false;
        this.gx = this.targetGx;
        this.gy = this.targetGy;
        this.scene.onEnemyEnterTile(this);
      }
      return;
    }

    if (now < this.repathAt) return;
    this.repathAt = now + 250;

    const players = this.scene.players.filter(p => p.alive && !p.eliminated);
    if (!players.length) return;

    const isWalkable = (gx, gy) => this.scene.isWalkableForEnemy(gx, gy);
    const targetTiles = new Set(players.map(p => `${p.gx},${p.gy}`));
    const isGoal = (gx, gy) => targetTiles.has(`${gx},${gy}`);

    const path = bfs(this.gx, this.gy, isGoal, isWalkable, COLS, ROWS);
    if (!path || !path.length) return;

    const next = path[0];
    if (this.scene.isWalkableForEnemy(next.gx, next.gy)) {
      this.targetGx = next.gx;
      this.targetGy = next.gy;
      this.fromX = this.sprite.x; this.fromY = this.sprite.y;
      this.toX = tileToPxX(next.gx); this.toY = tileToPxY(next.gy);
      this.tNow = 0; this.tDur = this.tileMs;
      this.moving = true;
    }
  }

  takeHit(by) {
    this.hp--;
    if (this.hp <= 0) {
      this.alive = false;
      this.sprite.destroy();
      if (by) by.stats.kills++;
      return true;
    }
    return false;
  }
}
