import { PowerUp, POWERUP_TYPES } from '../entities/PowerUp.js';
import { WALL_DROP_CHANCE, ENEMY_DROP_CHANCE } from '../constants.js';

export class PowerUpManager {
  constructor(scene) {
    this.scene = scene;
    this.powerUps = [];
  }

  /**
   * Roll for a power-up drop at a tile.
   * source: 'wall' or 'enemy'
   */
  tryDrop(tx, ty, source) {
    const chance = source === 'enemy' ? ENEMY_DROP_CHANCE : WALL_DROP_CHANCE;
    if (Math.random() > chance) return;

    // Pick a random type
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];

    // Shield only from enemies
    if (type === 'shield' && source !== 'enemy') {
      // Re-roll without shield
      const types = POWERUP_TYPES.filter(t => t !== 'shield');
      const rerolled = types[Math.floor(Math.random() * types.length)];
      this._spawnPowerUp(tx, ty, rerolled);
      return;
    }

    this._spawnPowerUp(tx, ty, type);
  }

  _spawnPowerUp(tx, ty, type) {
    // Don't spawn if there's already one here
    if (this.powerUps.some(p => p.alive && p.tx === tx && p.ty === ty)) return;
    const pu = new PowerUp(this.scene, tx, ty, type);
    this.powerUps.push(pu);
  }

  /**
   * Check if any player is on a power-up tile and apply it.
   * Returns the power-up type collected or null.
   */
  checkPickup(players) {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      if (!pu.alive) {
        this.powerUps.splice(i, 1);
        continue;
      }

      // Find players on this tile (sorted by player index for tie-breaking)
      const playersOnTile = players
        .filter(p => p.alive && !p.eliminated && p.tx === pu.tx && p.ty === pu.ty)
        .sort((a, b) => a.index - b.index);

      if (playersOnTile.length > 0) {
        const winner = playersOnTile[0];
        winner.applyPowerUp(pu.type);
        pu.destroy();
        this.powerUps.splice(i, 1);
      }
    }
  }

  destroy() {
    for (const pu of this.powerUps) pu.destroy();
    this.powerUps = [];
  }
}
