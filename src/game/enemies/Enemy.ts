// Enemy entity (§10). Behaviour is driven by its EnemyDef; all motion and
// firing use scaledDt so enemies freeze when the player stops.

import Phaser from "phaser";
import { ENEMIES, ENEMY_BASE_SPEED, COLOR_HEX, type EnemyDef } from "../../config/enemies";
import { drawEnemyShape } from "../Shapes";

export interface EnemyContext {
  playerX: number;
  playerY: number;
  cameraY: number;
  fireBullet: (
    x: number,
    y: number,
    vx: number,
    vy: number,
    ownerId: number
  ) => void;
}

export class Enemy {
  def!: EnemyDef;
  worldX = 0;
  worldY = 0;
  hp = 1;
  maxHp = 1;
  alive = false;
  id = -1; // index used to avoid friendly fire

  private vx = 0;
  private vy = 0;
  private t = 0; // local time accumulator (scaled)
  private phase = 0;
  private fireTimer = 0;
  private jumpTimer = 0;
  private jumping = false;
  freezeTimer = 0; // scaled seconds of frozen state (ICE)
  carrier: "none" | "crate" | "coin" = "none";
  private baseColorHex = 0x2b2f38;

  container: Phaser.GameObjects.Container;
  private gfx: Phaser.GameObjects.Graphics;
  private hpBar: Phaser.GameObjects.Rectangle;
  private frozenTint: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.frozenTint = scene.add.rectangle(0, 0, 10, 10, 0x9fe0ff, 0);
    this.hpBar = scene.add.rectangle(0, 0, 40, 4, 0xff5a5a);
    this.container = scene.add.container(0, 0, [this.gfx, this.frozenTint, this.hpBar]);
    this.container.setDepth(20);
    this.container.setVisible(false);
  }

  spawn(defId: string, x: number, y: number, id: number): void {
    const def = ENEMIES[defId];
    this.def = def;
    this.worldX = x;
    this.worldY = y;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.alive = true;
    this.id = id;
    this.t = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.fireTimer = 0.6 + Math.random() * 0.8;
    this.jumpTimer = 0.5 + Math.random();
    this.jumping = false;
    this.freezeTimer = 0;
    this.carrier = "none";

    this.baseColorHex = COLOR_HEX[def.color];
    drawEnemyShape(this.gfx, def, this.baseColorHex);

    this.frozenTint.setSize(def.width + 8, def.height + 8);
    this.frozenTint.setFillStyle(0x9fe0ff, 0);

    this.hpBar.setSize(def.width, 4);
    this.hpBar.setPosition(0, -def.height / 2 - 10);

    // initial velocity: forward means toward the player (down in world y).
    this.vx = 0;
    this.vy = -def.speed * ENEMY_BASE_SPEED;

    this.container.setVisible(true);
  }

  private speedPx(): number {
    return this.def.speed * ENEMY_BASE_SPEED;
  }

  update(dt: number, ctx: EnemyContext): void {
    if (!this.alive) return;

    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      this.frozenTint.setFillStyle(0x9fe0ff, 0.4);
      return; // frozen: no movement or firing
    }
    this.frozenTint.setFillStyle(0x9fe0ff, 0);

    this.t += dt;
    const spd = this.speedPx();
    const toPX = ctx.playerX - this.worldX;
    const toPY = ctx.playerY - this.worldY;
    const distToPlayer = Math.hypot(toPX, toPY) || 1;

    switch (this.def.behavior) {
      case "straight":
        this.worldY -= spd * dt;
        break;
      case "fast":
        this.worldY -= spd * dt;
        break;
      case "homing": {
        // steer toward player
        const desiredVx = (toPX / distToPlayer) * spd;
        const desiredVy = (toPY / distToPlayer) * spd;
        this.vx = Phaser.Math.Linear(this.vx, desiredVx, 0.04);
        this.vy = Phaser.Math.Linear(this.vy, desiredVy, 0.04);
        this.worldX += this.vx * dt;
        this.worldY += this.vy * dt;
        break;
      }
      case "weave":
        this.worldY -= spd * dt;
        this.worldX += Math.sin(this.t * 4 + this.phase) * spd * 0.9 * dt;
        break;
      case "stationary":
        this.worldY -= spd * dt; // barely moves
        break;
      case "jump": {
        this.jumpTimer -= dt;
        if (!this.jumping && this.jumpTimer <= 0) {
          this.jumping = true;
          this.jumpTimer = 0.35;
          // orange frogs jump toward player, others forward/random
          if (this.def.color === "orange") {
            this.vx = (toPX / distToPlayer) * spd * 2.4;
            this.vy = (toPY / distToPlayer) * spd * 2.4;
          } else if (this.def.color === "purple") {
            const a = Math.random() * Math.PI * 2;
            this.vx = Math.cos(a) * spd * 2.4;
            this.vy = Math.sin(a) * spd * 2.4;
          } else {
            this.vx = 0;
            this.vy = -spd * 2.4;
          }
        }
        if (this.jumping) {
          this.worldX += this.vx * dt;
          this.worldY += this.vy * dt;
          if (this.jumpTimer <= 0) {
            this.jumping = false;
            this.jumpTimer = 0.6 + Math.random() * 0.8;
          }
        }
        break;
      }
      case "turret_v":
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
          this.fireTimer = 1.1;
          ctx.fireBullet(this.worldX, this.worldY, 0, -260, this.id);
        }
        break;
      case "turret_h":
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
          this.fireTimer = 0.4;
          ctx.fireBullet(this.worldX, this.worldY, -300, 0, this.id);
          ctx.fireBullet(this.worldX, this.worldY, 300, 0, this.id);
        }
        break;
      case "tank": {
        this.worldY -= spd * dt;
        if (this.def.color === "orange") {
          this.worldX = Phaser.Math.Linear(this.worldX, ctx.playerX, 0.01);
        }
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
          this.fireTimer = 1.3;
          ctx.fireBullet(this.worldX, this.worldY, 0, -280, this.id);
        }
        break;
      }
      case "heli": {
        this.worldY -= spd * 0.4 * dt;
        this.worldX += Math.sin(this.t * 2 + this.phase) * spd * dt;
        if (this.def.color === "orange") {
          this.worldX = Phaser.Math.Linear(this.worldX, ctx.playerX, 0.008);
        }
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
          this.fireTimer = 1.0;
          // bombing: slow projectile that damages ground enemies too
          ctx.fireBullet(this.worldX, this.worldY, 0, -180, this.id);
        }
        break;
      }
      case "infantry":
        this.worldY -= spd * dt;
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
          this.fireTimer = 1.6 + Math.random();
          ctx.fireBullet(this.worldX, this.worldY, 0, -220, this.id);
        }
        break;
    }
  }

  hit(damage: number): boolean {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  applyFreeze(seconds: number): void {
    if (seconds > this.freezeTimer) this.freezeTimer = seconds;
  }

  /** Mark this enemy as a drop carrier and recolor it so players can read the drop (§10.1/§17.1). */
  setCarrier(kind: "crate" | "coin"): void {
    this.carrier = kind;
    const col = kind === "crate" ? 0x4aa8ff : 0x3ddc84;
    drawEnemyShape(this.gfx, this.def, col);
  }

  render(sx: number, sy: number): void {
    this.container.setPosition(sx, sy);
    if (this.maxHp > 1 && this.hp < this.maxHp) {
      this.hpBar.setVisible(true);
      this.hpBar.setScale(Math.max(0, this.hp / this.maxHp), 1);
    } else {
      this.hpBar.setVisible(false);
    }
  }

  hide(): void {
    this.container.setVisible(false);
    this.alive = false;
  }

  destroy(): void {
    this.container.destroy();
  }

  get color() {
    return this.def.color;
  }
}
