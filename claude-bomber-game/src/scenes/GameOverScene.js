import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_COLORS, PLAYER_NAMES } from '../config.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    let title;
    let color = '#ffeebb';
    if (data.outcome === 'draw') { title = 'DRAW'; color = '#ffbb55'; }
    else if (data.outcome === 'winner') {
      title = `${PLAYER_NAMES[data.winner]} WINS`;
      color = Phaser.Display.Color.IntegerToColor(PLAYER_COLORS[data.winner]).rgba;
    }
    else if (data.outcome === 'coop_win') { title = 'CO-OP COMPLETE'; color = '#88ff88'; }
    else if (data.outcome === 'coop_loss') { title = 'GAME OVER'; color = '#ff8888'; }
    else title = 'GAME OVER';

    this.add.text(cx, cy - 40, title, {
      fontFamily: 'monospace', fontSize: '32px', color
    }).setOrigin(0.5);

    if (data.stats) {
      const lines = data.stats.map((s, i) =>
        `${PLAYER_NAMES[i]}  KOs:${s.kills}  walls:${s.walls}  bombs:${s.bombs}`
      );
      this.add.text(cx, cy + 10, lines.join('\n'), {
        fontFamily: 'monospace', fontSize: '12px', color: '#ccc', align: 'center'
      }).setOrigin(0.5);
    }

    this.add.text(cx, GAME_HEIGHT - 40, 'ENTER: rematch     ESC: menu', {
      fontFamily: 'monospace', fontSize: '12px', color: '#aaa'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Game', data.config));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));
  }
}
