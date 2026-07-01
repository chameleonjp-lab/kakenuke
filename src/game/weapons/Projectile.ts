// Generic pooled projectile used for both player and enemy fire.
// Positions are in world space; rendering is handled by GameScene via toScreen.

import Phaser from "phaser";

export class Projectile {
  worldX = 0;
  worldY = 0;
  vx = 0;
  vy = 0;
  damage = 1;
  radius = 6;
  life = 3; // scaled seconds remaining
  alive = false;

  // behaviour flags
  homing = false;
  turnRate = 0; // rad/sec (scaled)
  canHitEnemies = false; // for enemy bullets that damage other enemies
  fromEnemy = false;
  pierce = 0; // remaining pierces (0 = dies on first hit)
  aoeRadius = 0; // explosion radius on impact
  aoeDamage = 0;
  freeze = 0; // freeze seconds applied to hit enemy
  antiAir = false; // can hit airborne enemies
  color = 0xffffff;
  visualW = 6;
  visualH = 12;
  ownerId = -1; // enemy index that fired (to avoid self-hit)

  gfx: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.rectangle(0, 0, 8, 14, 0xffffff);
    this.gfx.setDepth(30);
    this.gfx.setVisible(false);
  }

  spawn(cfg: Partial<Projectile>): void {
    Object.assign(this, cfg);
    this.alive = true;
    this.gfx.setFillStyle(this.color, 1);
    this.gfx.setSize(this.visualW, this.visualH);
    this.gfx.setVisible(true);
  }

  kill(): void {
    this.alive = false;
    this.gfx.setVisible(false);
  }
}

export class ProjectilePool {
  private pool: Projectile[] = [];
  active: Projectile[] = [];
  constructor(private scene: Phaser.Scene) {}

  obtain(): Projectile {
    const p = this.pool.pop() ?? new Projectile(this.scene);
    this.active.push(p);
    return p;
  }

  release(p: Projectile): void {
    p.kill();
    const i = this.active.indexOf(p);
    if (i >= 0) this.active.splice(i, 1);
    this.pool.push(p);
  }

  clear(): void {
    for (const p of this.active) p.kill();
    this.pool.push(...this.active);
    this.active.length = 0;
  }
}
