// Boss entity (§11). Large, high-HP, always pursues the player until killed.

import Phaser from "phaser";
import type { EnemyContext } from "../enemies/Enemy";
import { ENEMY_BASE_SPEED } from "../../config/enemies";

export interface BossDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  radius: number;
  size: number;
  color: number;
  behavior: "chase" | "chase_shoot" | "fast_chase" | "tanky" | "dash";
  score: number;
}

export const BOSSES: Record<string, BossDef> = {
  BOSS_MAMMOTH: { id: "BOSS_MAMMOTH", name: "MAMMOTH", hp: 80, speed: 0.75, radius: 70, size: 180, color: 0x5a5f6b, behavior: "chase", score: 1500 },
  BOSS_BEAR: { id: "BOSS_BEAR", name: "BEAR", hp: 65, speed: 0.8, radius: 64, size: 168, color: 0x6b4a3a, behavior: "chase_shoot", score: 1800 },
  BOSS_GORILLA: { id: "BOSS_GORILLA", name: "GORILLA", hp: 70, speed: 1.35, radius: 60, size: 158, color: 0x3a3f4b, behavior: "fast_chase", score: 2200 },
  BOSS_DINO: { id: "BOSS_DINO", name: "DINO", hp: 120, speed: 0.7, radius: 84, size: 210, color: 0x2f6b4a, behavior: "tanky", score: 3000 },
  BOSS_INSECT: { id: "BOSS_INSECT", name: "INSECT", hp: 75, speed: 0.9, radius: 60, size: 160, color: 0x6b2f5a, behavior: "dash", score: 2400 },
};

export class Boss {
  def!: BossDef;
  worldX = 0;
  worldY = 0;
  hp = 1;
  maxHp = 1;
  alive = false;
  id = 9999;

  private t = 0;
  private fireTimer = 0;
  private dashTimer = 0;
  private dashing = false;
  private vx = 0;
  private vy = 0;
  freezeTimer = 0;

  container: Phaser.GameObjects.Container;
  private gfx: Phaser.GameObjects.Graphics;
  private hpBar: Phaser.GameObjects.Rectangle;
  private hpBarBg: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.hpBarBg = scene.add.rectangle(0, 0, 160, 8, 0x330000);
    this.hpBar = scene.add.rectangle(0, 0, 160, 8, 0xff3b3b);
    this.container = scene.add.container(0, 0, [this.gfx, this.hpBarBg, this.hpBar]);
    this.container.setDepth(25);
    this.container.setVisible(false);
  }

  spawn(defId: string, x: number, y: number): void {
    const def = BOSSES[defId];
    this.def = def;
    this.worldX = x;
    this.worldY = y;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.alive = true;
    this.t = 0;
    this.fireTimer = 1.5;
    this.dashTimer = 1.5;
    this.dashing = false;
    this.freezeTimer = 0;

    const g = this.gfx;
    const s = def.size;
    const h = s / 2;
    g.clear();
    g.fillStyle(def.color, 1);
    g.lineStyle(4, 0x000000, 0.4);
    g.fillRoundedRect(-h, -h * 0.9, s, s * 0.95, 20);
    g.fillStyle(0xff3b3b, 0.85);
    g.fillCircle(-h * 0.35, -h * 0.3, s * 0.08);
    g.fillCircle(h * 0.35, -h * 0.3, s * 0.08);
    g.fillStyle(0x000000, 0.3);
    g.fillRect(-h * 0.5, h * 0.2, s, s * 0.12);

    this.hpBarBg.setPosition(0, -h - 24).setSize(s * 0.95, 8);
    this.hpBar.setPosition(0, -h - 24).setSize(s * 0.95, 8);
    this.container.setVisible(true);
  }

  update(dt: number, ctx: EnemyContext): void {
    if (!this.alive) return;
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      return;
    }
    this.t += dt;
    const spd = this.def.speed * ENEMY_BASE_SPEED;
    const dx = ctx.playerX - this.worldX;
    const dy = ctx.playerY - this.worldY;
    const dist = Math.hypot(dx, dy) || 1;

    switch (this.def.behavior) {
      case "fast_chase":
        this.worldX += (dx / dist) * spd * dt;
        this.worldY += (dy / dist) * spd * dt;
        break;
      case "dash":
        this.dashTimer -= dt;
        if (!this.dashing && this.dashTimer <= 0) {
          this.dashing = true;
          this.dashTimer = 0.4;
          this.vx = (dx / dist) * spd * 3;
          this.vy = (dy / dist) * spd * 3;
        }
        if (this.dashing) {
          this.worldX += this.vx * dt;
          this.worldY += this.vy * dt;
          if (this.dashTimer <= 0) {
            this.dashing = false;
            this.dashTimer = 1.2 + Math.random();
          }
        } else {
          this.worldX += (dx / dist) * spd * 0.3 * dt;
          this.worldY += (dy / dist) * spd * 0.3 * dt;
        }
        break;
      case "chase_shoot":
        this.worldX += (dx / dist) * spd * dt;
        this.worldY += (dy / dist) * spd * dt;
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
          this.fireTimer = 1.8;
          for (let i = -1; i <= 1; i++) {
            ctx.fireBullet(this.worldX, this.worldY, i * 120, -260, this.id);
          }
        }
        break;
      case "chase":
      case "tanky":
      default:
        this.worldX += (dx / dist) * spd * dt;
        this.worldY += (dy / dist) * spd * dt;
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

  render(sx: number, sy: number): void {
    this.container.setPosition(sx, sy);
    this.hpBar.setScale(Math.max(0, this.hp / this.maxHp), 1);
  }

  hide(): void {
    this.container.setVisible(false);
    this.alive = false;
  }

  destroy(): void {
    this.container.destroy();
  }
}
