// Coins and weapon crates (§9, §14). Coins are magnetized toward the player;
// weapon crates grant a random weapon on pickup. Both update with scaledDt.

import Phaser from "phaser";

export type ItemKind = "coin" | "crate";

export class Item {
  kind: ItemKind = "coin";
  worldX = 0;
  worldY = 0;
  vx = 0;
  vy = 0;
  alive = false;
  radius = 22;
  gfx: Phaser.GameObjects.Container;
  private shape: Phaser.GameObjects.Graphics;
  private spin = 0;

  constructor(scene: Phaser.Scene) {
    this.shape = scene.add.graphics();
    this.gfx = scene.add.container(0, 0, [this.shape]);
    this.gfx.setDepth(22);
    this.gfx.setVisible(false);
  }

  spawn(kind: ItemKind, x: number, y: number): void {
    this.kind = kind;
    this.worldX = x;
    this.worldY = y;
    this.alive = true;
    this.spin = 0;
    const g = this.shape;
    g.clear();
    if (kind === "coin") {
      this.radius = 18;
      g.fillStyle(0x3ddc84, 1);
      g.lineStyle(2, 0xffffff, 0.7);
      g.fillCircle(0, 0, 16);
      g.strokeCircle(0, 0, 16);
      g.fillStyle(0x0a3a1e, 0.6);
      g.fillCircle(0, 0, 7);
      this.vy = -30;
    } else {
      this.radius = 26;
      g.fillStyle(0x4aa8ff, 1);
      g.lineStyle(3, 0xffffff, 0.85);
      g.fillRoundedRect(-22, -22, 44, 44, 6);
      g.strokeRoundedRect(-22, -22, 44, 44, 6);
      g.lineStyle(3, 0xffffff, 0.9);
      g.strokeCircle(0, 0, 9);
      g.beginPath();
      g.moveTo(0, -4);
      g.lineTo(0, 4);
      g.strokePath();
      this.vy = -20;
    }
  }

  render(sx: number, sy: number, dt: number): void {
    this.spin += dt * 3;
    this.gfx.setPosition(sx, sy);
    this.gfx.setScale(1 + Math.sin(this.spin) * 0.06);
  }

  hide(): void {
    this.alive = false;
    this.gfx.setVisible(false);
  }

  show(): void {
    this.gfx.setVisible(true);
  }

  destroy(): void {
    this.gfx.destroy();
  }
}

export class ItemSystem {
  items: Item[] = [];
  private pool: Item[] = [];

  constructor(private scene: Phaser.Scene) {}

  private obtain(): Item {
    const it = this.pool.pop() ?? new Item(this.scene);
    it.show();
    this.items.push(it);
    return it;
  }

  spawn(kind: ItemKind, x: number, y: number): void {
    const it = this.obtain();
    it.spawn(kind, x, y);
  }

  release(it: Item): void {
    it.hide();
    const i = this.items.indexOf(it);
    if (i >= 0) this.items.splice(i, 1);
    this.pool.push(it);
  }

  /** Advance items; coins are pulled toward the player. */
  update(dt: number, playerX: number, playerY: number): void {
    for (const it of this.items) {
      if (!it.alive) continue;
      if (it.kind === "coin") {
        const dx = playerX - it.worldX;
        const dy = playerY - it.worldY;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 420) {
          const pull = 260 * (1 - d / 420) + 60;
          it.vx = (dx / d) * pull;
          it.vy = (dy / d) * pull;
        } else {
          it.vx *= 0.9;
          it.vy = -30;
        }
      }
      it.worldX += it.vx * dt;
      it.worldY += it.vy * dt;
    }
  }

  clear(): void {
    for (const it of this.items) it.hide();
    this.pool.push(...this.items);
    this.items.length = 0;
  }
}
