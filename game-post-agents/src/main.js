// src/main.js – Minimal two‑player Bomberman prototype
console.log('Game script loaded');
// Phaser is loaded via CDN and available as global variable

const TILE_SIZE = 32;
const MAP_SIZE = 13; // 13x13 tiles (including border)
const PLAYER_SPEED = 150; // pixels per second (will be snapped to grid)

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    // Simple placeholder graphics generated at runtime
    // Player colors
    this.textures.generate('p1', { data: ['#ff0000'], pixelWidth: 1, pixelHeight: 1 });
    this.textures.generate('p2', { data: ['#0000ff'], pixelWidth: 1, pixelHeight: 1 });
    // Tiles
    this.textures.generate('wall', { data: ['#666666'], pixelWidth: 1, pixelHeight: 1 });
    this.textures.generate('soft', { data: ['#aaaaaa'], pixelWidth: 1, pixelHeight: 1 });
    this.textures.generate('floor', { data: ['#dddddd'], pixelWidth: 1, pixelHeight: 1 });
    // Bomb & explosion
    this.textures.generate('bomb', { data: ['#000000'], pixelWidth: 1, pixelHeight: 1 });
    this.textures.generate('explosion', { data: ['#ff8800'], pixelWidth: 1, pixelHeight: 1 });
  }
  create() { this.scene.start('Game');
    console.log('BootScene complete'); }
}

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  create() {
    // 1. Build tilemap (simple 2‑D array)
    console.log('Creating map');
    this.map = [];
    for (let y = 0; y < MAP_SIZE; y++) {
      this.map[y] = [];
      for (let x = 0; x < MAP_SIZE; x++) {
        const isBorder = x === 0 || y === 0 || x === MAP_SIZE - 1 || y === MAP_SIZE - 1;
        const isSoft = !isBorder && Phaser.Math.Between(0, 100) < 30; // 30% chance soft wall
        const tileKey = isBorder ? 'wall' : isSoft ? 'soft' : 'floor';
        const sprite = this.add.image(x * TILE_SIZE, y * TILE_SIZE, tileKey).setOrigin(0);
        sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
        this.map[y][x] = { sprite, type: isBorder ? 'wall' : isSoft ? 'soft' : 'floor' };
      }
    }

    // 2. Players
    this.players = [];
    const playerDefs = [
      { x: 1, y: 1, tex: 'p1', keys: { left: 'A', right: 'D', up: 'W', down: 'S', bomb: 'Q' } },
      { x: MAP_SIZE - 2, y: MAP_SIZE - 2, tex: 'p2', keys: { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', bomb: 'CTRL' } },
    ];
    playerDefs.forEach((def, idx) => {
      const sprite = this.physics.add.sprite(def.x * TILE_SIZE + TILE_SIZE/2, def.y * TILE_SIZE + TILE_SIZE/2, def.tex);
      sprite.setDisplaySize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
      sprite.setCollideWorldBounds(true);
      sprite.lives = 3;
      sprite.bombCount = 1; // max simultaneous bombs
      sprite.bombsPlaced = 0;
      sprite.lastMove = 0; // for grid snapping timing
      this.players.push({ sprite, def });
    console.log('Players created');
    this.add.text(10, 30, 'Game started', {font:'16px sans-serif', fill:'#fff'});
    });

    // 3. Input handling
    this.cursors = this.input.keyboard.addKeys({
      // Player 1
      A: 'A', D: 'D', W: 'W', S: 'S', Q: 'Q',
      // Player 2
      LEFT: 'LEFT', RIGHT: 'RIGHT', UP: 'UP', DOWN: 'DOWN', CTRL: 'CTRL'
    });

    // 4. Bomb group
    this.bombs = this.physics.add.group();
    this.explosions = this.physics.add.group();

    // 5. Simple HUD
    this.livesText = this.add.text(10, 10, '', { font: '16px sans-serif', fill: '#fff' });
    this.updateHUD();

    // 6. Collision – players vs walls (static)
    this.wallGroup = this.physics.add.staticGroup();
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (this.map[y][x].type === 'wall') {
          const w = this.add.rectangle(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE, TILE_SIZE, 0x666666);
          this.physics.add.existing(w, true);
          this.wallGroup.add(w);
        }
      }
    }
    this.players.forEach(p => this.physics.add.collider(p.sprite, this.wallGroup));

    // 7. Bomb vs walls (stop explosion propagation)
    this.physics.add.collider(this.bombs, this.wallGroup);
    this.physics.add.collider(this.explosions, this.wallGroup, (exp, wall) => {
      // stop further checks – explosion simply disappears on wall
      exp.destroy();
    });

    // 8. Bomb vs players (damage)
    this.players.forEach(p => {
      this.physics.add.overlap(p.sprite, this.explosions, (player, exp) => this.handlePlayerHit(player), null, this);
    });

    // 9. Game loop timer for bomb updates
    this.time.addEvent({ delay: 100, loop: true, callback: this.updateGame, callbackScope: this });
  }

  updateGame() {
    try {
    // ----- INPUT & MOVEMENT -----
    const dt = this.game.loop.delta / 1000; // seconds
    this.players.forEach(p => {
      const { sprite, def } = p;
      let vx = 0, vy = 0;
      if (this.cursors[def.keys.left].isDown) vx = -PLAYER_SPEED;
      else if (this.cursors[def.keys.right].isDown) vx = PLAYER_SPEED;
      if (this.cursors[def.keys.up].isDown) vy = -PLAYER_SPEED;
      else if (this.cursors[def.keys.down].isDown) vy = PLAYER_SPEED;

      // Apply velocity but snap to grid when close to a tile centre
      sprite.setVelocity(vx, vy);
      // If no input, stop moving and snap exactly to grid to avoid drift
      if (vx === 0 && vy === 0) {
        const gx = Math.round(sprite.x / TILE_SIZE) * TILE_SIZE;
        const gy = Math.round(sprite.y / TILE_SIZE) * TILE_SIZE;
        sprite.setPosition(gx, gy);
        sprite.setVelocity(0, 0);
      }

      // ----- BOMB PLACEMENT -----
      if (Phaser.Input.Keyboard.JustDown(this.cursors[def.keys.bomb])) {
        if (p.bombsPlaced < p.sprite.bombCount) {
          const tileX = Math.floor(sprite.x / TILE_SIZE);
          const tileY = Math.floor(sprite.y / TILE_SIZE);
          const bomb = this.bombs.create(tileX * TILE_SIZE + TILE_SIZE/2, tileY * TILE_SIZE + TILE_SIZE/2, 'bomb');
          bomb.setDisplaySize(TILE_SIZE * 0.6, TILE_SIZE * 0.6);
          bomb.setOrigin(0.5);
          bomb.timer = 2000; // 2 s until explode
          bomb.owner = p;
          p.bombsPlaced++;
        }
      }
    });

    // ----- BOMB TIMER & EXPLOSION -----
    this.bombs.getChildren().forEach(bomb => {
      bomb.timer -= this.game.loop.delta;
      if (bomb.timer <= 0) {
        // explode in four directions + center
        const cx = Math.floor(bomb.x / TILE_SIZE);
        const cy = Math.floor(bomb.y / TILE_SIZE);
        const radius = 2; // default blast radius (2 tiles)
        const positions = [{x: cx, y: cy}];
        for (let dir of [[1,0],[-1,0],[0,1],[0,-1]]) {
          for (let i=1; i<=radius; i++) {
            const nx = cx + dir[0]*i;
            const ny = cy + dir[1]*i;
            if (nx<0||ny<0||nx>=MAP_SIZE||ny>=MAP_SIZE) break;
            const tile = this.map[ny][nx];
            if (tile.type === 'wall') break; // indestructible stops blast
            positions.push({x:nx, y:ny});
            if (tile.type === 'soft') {
              // destroy soft wall and possibly spawn power‑up placeholder (just remove for now)
              tile.sprite.destroy();
              tile.type = 'floor';
              break; // blast stops after destroying a soft wall
            }
          }
        }
        // create explosion sprites (they are just visual; they also cause damage via overlap)
        positions.forEach(pos => {
          const exp = this.explosions.create(pos.x * TILE_SIZE + TILE_SIZE/2, pos.y * TILE_SIZE + TILE_SIZE/2, 'explosion');
          exp.setDisplaySize(TILE_SIZE, TILE_SIZE);
          exp.setOrigin(0.5);
          // auto‑destroy after short flash
          this.time.delayedCall(300, () => exp.destroy(), null, this);
        });
        // return bomb count to owner
        bomb.owner.bombsPlaced--;
        bomb.destroy();
      }
    });

    // ----- HUD UPDATE -----
    this.updateHUD();

    // ----- CHECK END OF MATCH -----
    const alive = this.players.filter(p => p.sprite.lives > 0);
    if (alive.length <= 1) {
      const winner = alive[0];
      const msg = winner ? `Player ${this.players.indexOf(winner)+1} wins!` : 'All eliminated';
      this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, msg, { font: '32px sans-serif', fill: '#fff' }).setOrigin(0.5);
      this.scene.pause();
    }
  } catch (e) {
    console.error('UpdateGame error', e);
  }

  handlePlayerHit(playerSprite) {
    if (playerSprite.getData('invul') === true) return; // ignore during invul period
    playerSprite.lives--;
    if (playerSprite.lives > 0) {
      // respawn at a corner, give 1 s invulnerability
      const idx = this.players.findIndex(p => p.sprite === playerSprite);
      const start = idx === 0 ? {x:1, y:1} : {x: MAP_SIZE-2, y: MAP_SIZE-2};
      playerSprite.setPosition(start.x * TILE_SIZE + TILE_SIZE/2, start.y * TILE_SIZE + TILE_SIZE/2);
      playerSprite.setData('invul', true);
      this.time.delayedCall(1000, () => playerSprite.setData('invul', false), null, this);
    } else {
      // remove sprite from play (show as dead)
      playerSprite.setVisible(false);
    }
  }

  updateHUD() {
    const parts = this.players.map((p,i) => `P${i+1}: ${p.sprite.lives}❤`).join('   ');
    this.livesText.setText(parts);
  }
}

const config = {
  type: Phaser.AUTO,
  width: MAP_SIZE * TILE_SIZE,
  height: MAP_SIZE * TILE_SIZE,
  backgroundColor: '#222222',

  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [BootScene, GameScene]
};

try {
  new Phaser.Game(config);
  console.log('Phaser game created');
} catch (e) {
  console.error('Phaser init error', e);
}
