// WeaponSystem (§9). Holds the player's owned weapons and fires them on
// per-weapon timers that advance with scaledDt, so firing halts when time
// stops. Duplicate pickups raise a weapon's level, scaling its output.

import { WEAPONS, type WeaponId } from "../../config/weapons";
import type { WeaponGrant } from "../../config/characters";
import { Projectile } from "./Projectile";

export interface EnemyTarget {
  worldX: number;
  worldY: number;
  airborne?: boolean;
}

export interface WeaponContext {
  playerX: number;
  playerY: number;
  nearest: (x: number, y: number, airborneOnly?: boolean) => EnemyTarget | null;
  fire: (cfg: Partial<Projectile>) => void;
}

interface OrbitBit {
  angle: number;
  worldX: number;
  worldY: number;
  radius: number;
  damage: number;
  fireTimer: number;
}

const FWD = 720; // base player bullet speed (world px/sec, scaled)

export class WeaponSystem {
  private levels = new Map<WeaponId, number>();
  private timers = new Map<WeaponId, number>();

  // GUARD_BIT orbiters and SUPPORTER drones exposed for collision in GameScene.
  guardBits: OrbitBit[] = [];
  supporters: OrbitBit[] = [];

  constructor(startingWeapons: WeaponGrant[]) {
    for (const g of startingWeapons) this.add(g.id, g.level);
  }

  add(id: WeaponId, levels = 1): number {
    const cur = this.levels.get(id) ?? 0;
    const next = cur + levels;
    this.levels.set(id, next);
    if (!this.timers.has(id)) this.timers.set(id, 0);
    this.syncOrbiters();
    return next;
  }

  has(id: WeaponId): boolean {
    return (this.levels.get(id) ?? 0) > 0;
  }

  level(id: WeaponId): number {
    return this.levels.get(id) ?? 0;
  }

  list(): { id: WeaponId; name: string; level: number }[] {
    const out: { id: WeaponId; name: string; level: number }[] = [];
    for (const [id, lv] of this.levels) {
      if (lv > 0) out.push({ id, name: WEAPONS[id].name, level: lv });
    }
    return out;
  }

  private syncOrbiters(): void {
    const guardLv = this.level("GUARD_BIT");
    const wantGuard = guardLv > 0 ? 2 + guardLv : 0;
    while (this.guardBits.length < wantGuard) {
      this.guardBits.push({
        angle: (this.guardBits.length / Math.max(1, wantGuard)) * Math.PI * 2,
        worldX: 0,
        worldY: 0,
        radius: 90 + guardLv * 6,
        damage: WEAPONS.GUARD_BIT.damage + guardLv,
        fireTimer: 0,
      });
    }
    this.guardBits.length = wantGuard;
    for (const b of this.guardBits) {
      b.radius = 90 + guardLv * 6;
      b.damage = WEAPONS.GUARD_BIT.damage + guardLv;
    }

    const supLv = this.level("SUPPORTER");
    const wantSup = supLv > 0 ? supLv : 0;
    while (this.supporters.length < wantSup) {
      this.supporters.push({
        angle: Math.random() * Math.PI * 2,
        worldX: 0,
        worldY: 0,
        radius: 70,
        damage: 0,
        fireTimer: 0,
      });
    }
    this.supporters.length = wantSup;
  }

  reset(startingWeapons: WeaponGrant[]): void {
    this.levels.clear();
    this.timers.clear();
    this.guardBits.length = 0;
    this.supporters.length = 0;
    for (const g of startingWeapons) this.add(g.id, g.level);
  }

  update(dt: number, ctx: WeaponContext): void {
    for (const [id, lv] of this.levels) {
      if (lv <= 0) continue;
      const def = WEAPONS[id];
      // higher level => shorter cooldown (min clamp)
      const cd = Math.max(0.08, def.cooldown * Math.pow(0.92, lv - 1));
      let t = (this.timers.get(id) ?? 0) - dt;
      while (t <= 0) {
        this.fireWeapon(id, lv, ctx);
        t += cd;
      }
      this.timers.set(id, t);
    }
    this.updateOrbiters(dt, ctx);
  }

  private updateOrbiters(dt: number, ctx: WeaponContext): void {
    const gLv = this.level("GUARD_BIT");
    for (const b of this.guardBits) {
      b.angle += dt * (2.2 + gLv * 0.1);
      b.worldX = ctx.playerX + Math.cos(b.angle) * b.radius;
      b.worldY = ctx.playerY + Math.sin(b.angle) * b.radius;
    }
    const sLv = this.level("SUPPORTER");
    for (const b of this.supporters) {
      b.angle += dt * 1.4;
      b.worldX = ctx.playerX + Math.cos(b.angle) * b.radius;
      b.worldY = ctx.playerY + Math.sin(b.angle) * b.radius;
      b.fireTimer -= dt;
      if (b.fireTimer <= 0) {
        b.fireTimer = 0.5;
        const target = ctx.nearest(b.worldX, b.worldY);
        if (target) {
          const dx = target.worldX - b.worldX;
          const dy = target.worldY - b.worldY;
          const d = Math.hypot(dx, dy) || 1;
          ctx.fire({
            worldX: b.worldX,
            worldY: b.worldY,
            vx: (dx / d) * FWD,
            vy: (dy / d) * FWD,
            damage: 1 + sLv,
            radius: 6,
            life: 1.4,
            color: WEAPONS.SUPPORTER.color,
            visualW: 8,
            visualH: 8,
          });
        }
      }
    }
  }

  private fireWeapon(id: WeaponId, lv: number, ctx: WeaponContext): void {
    const def = WEAPONS[id];
    const px = ctx.playerX;
    const py = ctx.playerY;
    const dmg = def.damage;

    switch (id) {
      case "STANDARD_SHOT": {
        const count = 1 + Math.floor((lv - 1) / 2);
        for (let i = 0; i < count; i++) {
          const off = (i - (count - 1) / 2) * 16;
          ctx.fire({
            worldX: px + off,
            worldY: py,
            vx: 0,
            vy: FWD,
            damage: dmg + Math.floor(lv / 3),
            color: def.color,
            radius: 6,
            visualW: 8,
            visualH: 16,
            life: 2,
          });
        }
        break;
      }
      case "TWIN_SHOT": {
        const pairs = 1 + Math.floor((lv - 1) / 2);
        for (let i = 0; i < pairs; i++) {
          const spread = 14 + i * 12;
          for (const s of [-1, 1]) {
            ctx.fire({
              worldX: px + s * spread,
              worldY: py,
              vx: 0,
              vy: FWD,
              damage: dmg,
              color: def.color,
              radius: 6,
              visualW: 7,
              visualH: 15,
              life: 2,
            });
          }
        }
        break;
      }
      case "WIDE_SHOT": {
        const angles = lv >= 3 ? [-45, -25, 0, 25, 45] : [-25, 0, 25];
        for (const deg of angles) {
          const a = (deg * Math.PI) / 180;
          ctx.fire({
            worldX: px,
            worldY: py,
            vx: Math.sin(a) * FWD,
            vy: Math.cos(a) * FWD,
            damage: dmg,
            color: def.color,
            radius: 5,
            visualW: 7,
            visualH: 12,
            life: 1.6,
          });
        }
        break;
      }
      case "SIDE_SHOT": {
        const per = 1 + Math.floor((lv - 1) / 2);
        for (let i = 0; i < per; i++) {
          const spread = i * 30;
          for (const dir of [-1, 1]) {
            ctx.fire({
              worldX: px,
              worldY: py,
              vx: dir * FWD,
              vy: spread * dir * 0.2,
              damage: dmg,
              color: def.color,
              radius: 5,
              visualW: 14,
              visualH: 7,
              life: 1.4,
            });
          }
        }
        break;
      }
      case "HOMING_SHOT": {
        const count = 1 + Math.floor((lv - 1) / 2);
        for (let i = 0; i < count; i++) {
          const target = ctx.nearest(px, py);
          let vx = (i - (count - 1) / 2) * 120;
          let vy = FWD * 0.8;
          if (target) {
            const dx = target.worldX - px;
            const dy = target.worldY - py;
            const d = Math.hypot(dx, dy) || 1;
            vx = (dx / d) * FWD * 0.8;
            vy = (dy / d) * FWD * 0.8;
          }
          ctx.fire({
            worldX: px,
            worldY: py,
            vx,
            vy,
            damage: dmg,
            color: def.color,
            radius: 6,
            visualW: 9,
            visualH: 9,
            life: 2.4,
            homing: true,
            turnRate: 3 + lv * 0.4,
          });
        }
        break;
      }
      case "ROCKET": {
        ctx.fire({
          worldX: px,
          worldY: py,
          vx: 0,
          vy: FWD * 0.55,
          damage: dmg + lv,
          color: def.color,
          radius: 8,
          visualW: 12,
          visualH: 20,
          life: 2.4,
          aoeRadius: 90 + lv * 14,
          aoeDamage: dmg + lv,
        });
        break;
      }
      case "MISSILE": {
        const count = 1 + Math.floor((lv - 1) / 2);
        for (let i = 0; i < count; i++) {
          const target = ctx.nearest(px, py);
          let vx = (i - (count - 1) / 2) * 100;
          let vy = FWD * 0.7;
          if (target) {
            const dx = target.worldX - px;
            const dy = target.worldY - py;
            const d = Math.hypot(dx, dy) || 1;
            vx = (dx / d) * FWD * 0.7;
            vy = (dy / d) * FWD * 0.7;
          }
          ctx.fire({
            worldX: px,
            worldY: py,
            vx,
            vy,
            damage: dmg + Math.floor(lv / 2),
            color: def.color,
            radius: 7,
            visualW: 10,
            visualH: 16,
            life: 2.6,
            homing: true,
            turnRate: 4,
            antiAir: true,
            aoeRadius: 60 + lv * 8,
            aoeDamage: dmg,
          });
        }
        break;
      }
      case "BEAM": {
        // short-lived fast piercing lance
        ctx.fire({
          worldX: px,
          worldY: py,
          vx: 0,
          vy: FWD * 2.2,
          damage: dmg + Math.floor(lv / 2),
          color: def.color,
          radius: 10 + lv,
          visualW: 14 + lv * 4,
          visualH: 120 + lv * 20,
          life: 0.5,
          pierce: 999,
        });
        break;
      }
      case "LINE": {
        ctx.fire({
          worldX: px,
          worldY: py,
          vx: 0,
          vy: FWD * 1.3,
          damage: dmg + Math.floor(lv / 2),
          color: def.color,
          radius: 9 + lv,
          visualW: 12 + lv * 3,
          visualH: 40,
          life: 2,
          pierce: 2 + lv,
        });
        break;
      }
      case "ICE_CANNON": {
        const count = 1 + Math.floor((lv - 1) / 2);
        for (let i = 0; i < count; i++) {
          const off = (i - (count - 1) / 2) * 20;
          ctx.fire({
            worldX: px + off,
            worldY: py,
            vx: 0,
            vy: FWD * 0.9,
            damage: 0,
            color: def.color,
            radius: 8,
            visualW: 12,
            visualH: 12,
            life: 1.8,
            freeze: 1.6 + lv * 0.3,
          });
        }
        break;
      }
      case "MINE_BOT": {
        // drop a slow homing mine that drifts and explodes on contact
        const target = ctx.nearest(px, py);
        let vx = (Math.random() - 0.5) * 120;
        let vy = FWD * 0.2;
        if (target) {
          const dx = target.worldX - px;
          const dy = target.worldY - py;
          const d = Math.hypot(dx, dy) || 1;
          vx = (dx / d) * 160;
          vy = (dy / d) * 160;
        }
        ctx.fire({
          worldX: px,
          worldY: py,
          vx,
          vy,
          damage: dmg,
          color: def.color,
          radius: 9,
          visualW: 12,
          visualH: 12,
          life: 3,
          homing: true,
          turnRate: 2,
          aoeRadius: 70 + lv * 10,
          aoeDamage: dmg,
        });
        break;
      }
      case "GUARD_BIT":
        // handled via orbiters (contact damage), no projectile fired
        break;
      case "SUPPORTER":
        // handled via supporter drones
        break;
    }
  }
}
