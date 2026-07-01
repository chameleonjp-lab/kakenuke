// GameScene — the main gameplay loop (§5–§14). Owns the world simulation and
// the split between scaledDt (gameplay) and realDt (deadline / UI / input).

import Phaser from "phaser";
import {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  CAMERA,
  DEADLINE,
  ECONOMY,
  computeDifficulty,
  bossPoolForScore,
  type GameMode,
  type DifficultyState,
} from "../config/progression";
import { getCharacter, DEFAULT_CHARACTER_ID } from "../config/characters";
import { pickRandomWeapon, WEAPONS } from "../config/weapons";
import { save } from "./economy/SaveData";
import { TimeController } from "./TimeController";
import { Player } from "./Player";
import { Deadline } from "./Deadline";
import { EnemySpawner } from "./enemies/EnemySpawner";
import type { Enemy } from "./enemies/Enemy";
import { Boss } from "./bosses/Boss";
import { WeaponSystem } from "./weapons/WeaponSystem";
import { ProjectilePool, Projectile } from "./weapons/Projectile";
import { ItemSystem, Item } from "./items/ItemSystem";
import { Hud } from "./ui/Hud";
import { burst } from "./Shapes";

interface RunConfig {
  mode: GameMode;
  characterId: string;
}

type DropEnemy = Enemy & { dropCrate?: boolean; dropCoin?: boolean };

export class GameScene extends Phaser.Scene {
  private mode: GameMode = "normal";
  private characterId = DEFAULT_CHARACTER_ID;

  private time0 = new TimeController();
  private player!: Player;
  private deadline!: Deadline;
  private spawner!: EnemySpawner;
  private boss!: Boss;
  private weapons!: WeaponSystem;
  private playerBullets!: ProjectilePool;
  private enemyBullets!: ProjectilePool;
  private items!: ItemSystem;
  private hud!: Hud;

  private cameraY = 0;
  private difficulty!: DifficultyState;

  // scoring
  private killScore = 0;
  private bossScore = 0;
  private itemBonus = 0;
  private kills = 0;
  private bossKills = 0;
  private runCoins = 0;
  private score = 0;
  private nextBossScore = 0;

  // run state
  private running = false;
  private paused = false;
  private continued = false;

  // input
  private ptr = { isDown: false, x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT * 0.65 };
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // debug
  private debugMode = false;
  private invincible = false;

  private overlay?: Phaser.GameObjects.Container;

  constructor() {
    super("Game");
  }

  init(data: Partial<RunConfig>): void {
    this.mode = data.mode ?? "normal";
    this.characterId = data.characterId ?? DEFAULT_CHARACTER_ID;
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#05060a");
    this.drawBackground();

    const cfg = getCharacter(this.characterId);
    this.cameraY = -LOGICAL_HEIGHT * CAMERA.LOOKAHEAD;

    this.player = new Player(this, cfg);
    this.player.worldX = LOGICAL_WIDTH / 2;
    this.player.worldY = 0;
    this.player.maxForwardY = 0;
    this.time0.sensitivity = cfg.inputSensitivity * save.settings.sensitivity;

    this.deadline = new Deadline(this);
    this.deadline.reset(this.cameraY - 300);

    this.spawner = new EnemySpawner(this);
    this.spawner.reset(this.cameraY);

    this.boss = new Boss(this);
    this.weapons = new WeaponSystem(cfg.startingWeapons);
    this.playerBullets = new ProjectilePool(this);
    this.enemyBullets = new ProjectilePool(this);
    this.items = new ItemSystem(this);

    this.hud = new Hud(this);
    this.hud.onPause = () => this.togglePause();

    this.difficulty = computeDifficulty(this.mode, 0);
    this.nextBossScore = this.difficulty.bossFirstScore;

    this.setupInput();

    this.running = true;
    this.paused = false;
    this.continued = false;
    this.killScore = this.bossScore = this.itemBonus = 0;
    this.kills = this.bossKills = this.runCoins = this.score = 0;
  }

  // --- background grid ---
  private bgGfx!: Phaser.GameObjects.Graphics;
  private drawBackground(): void {
    this.bgGfx = this.add.graphics();
    this.bgGfx.setDepth(-10);
  }
  private renderBackground(): void {
    const g = this.bgGfx;
    g.clear();
    g.lineStyle(1, 0x141a26, 1);
    const spacing = 120;
    const offset = ((this.cameraY % spacing) + spacing) % spacing;
    for (let y = -offset; y <= LOGICAL_HEIGHT; y += spacing) {
      g.lineBetween(0, y, LOGICAL_WIDTH, y);
    }
    for (let x = 0; x <= LOGICAL_WIDTH; x += spacing) {
      g.lineBetween(x, 0, x, LOGICAL_HEIGHT);
    }
  }

  // --- coordinate transforms (§6) ---
  private screenX(worldX: number): number {
    return worldX;
  }
  private screenY(worldY: number): number {
    return LOGICAL_HEIGHT - (worldY - this.cameraY);
  }

  private setupInput(): void {
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.ptr.isDown = true;
      this.ptr.x = p.x;
      this.ptr.y = p.y;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.ptr.isDown) {
        this.ptr.x = p.x;
        this.ptr.y = p.y;
      }
    });
    const up = () => {
      this.ptr.isDown = false;
    };
    this.input.on("pointerup", up);
    this.input.on("pointerupoutside", up);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,P,ONE,BACKTICK,H,B,I,C,R"
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    kb.on("keydown-BACKTICK", () => this.toggleDebug());
    kb.on("keydown-P", () => this.togglePause());
    kb.on("keydown-B", () => {
      if (this.debugMode) this.trySpawnBoss(true);
    });
    kb.on("keydown-I", () => {
      if (this.debugMode) this.invincible = !this.invincible;
    });
    kb.on("keydown-H", () => {
      if (this.debugMode) this.player.setDebugHitbox(true);
    });
    kb.on("keydown-C", () => {
      if (this.debugMode) save.addCoins(500);
    });
    kb.on("keydown-R", () => {
      if (this.debugMode) save.reset();
    });
  }

  private toggleDebug(): void {
    this.debugMode = !this.debugMode;
    this.player.setDebugHitbox(this.debugMode);
    this.hud.setDebug(this.debugMode ? "" : null);
  }

  private togglePause(): void {
    if (!this.running) return;
    this.paused = !this.paused;
    if (this.paused) this.showPauseOverlay();
    else this.clearOverlay();
  }

  // ================= main loop =================
  update(_t: number, deltaMs: number): void {
    const realDt = Math.min(deltaMs / 1000, 0.05);
    if (!this.running || this.paused) {
      return;
    }

    // 1. input → time scale + player move delta (real time based)
    this.readInput(realDt);
    const timeScale = this.time0.timeScale;
    const scaledDt = realDt * timeScale;

    // 2. player moves by input delta (movement is the input, not scaled)
    this.player.move(this.time0.moveX, this.time0.moveY, this.cameraY);

    // 3. camera follows (real time smoothing)
    const targetCamY = Math.max(
      this.cameraY,
      this.player.worldY - LOGICAL_HEIGHT * CAMERA.LOOKAHEAD
    );
    this.cameraY = Phaser.Math.Linear(this.cameraY, targetCamY, CAMERA.FOLLOW_LERP);

    // 4. difficulty from score
    this.difficulty = computeDifficulty(this.mode, this.score);

    // 5. deadline advances in REAL time (never frozen)
    this.deadline.update(realDt, this.difficulty.deadlineSpeed);

    // 6. spawn generation (runs regardless of timeScale)
    this.spawner.update(this.cameraY, this.difficulty);
    this.trySpawnBoss(false);

    // 7. gameplay updates use scaledDt
    if (scaledDt > 0) {
      this.updateEnemies(scaledDt);
      this.updateBoss(scaledDt);
      this.updateWeapons(scaledDt);
      this.updateProjectiles(scaledDt);
      this.items.update(scaledDt, this.player.worldX, this.player.worldY);
    }

    // 8. collisions (only meaningful contact matters; run every frame so
    //    overlaps during frozen time still kill — §5.4)
    this.handleCollisions(this.time.now);

    // 9. score
    this.recomputeScore();

    // 10. render
    this.renderAll(scaledDt, realDt);

    // 11. deadline catch check (real time)
    if (!this.invincible && this.deadline.hits(this.player.worldY)) {
      this.onPlayerDeath();
      return;
    }
  }

  private readInput(realDt: number): void {
    const k = this.keys;
    const kbX =
      (k.A.isDown || k.LEFT.isDown ? -1 : 0) +
      (k.D.isDown || k.RIGHT.isDown ? 1 : 0);
    const kbY =
      (k.W.isDown || k.UP.isDown ? 1 : 0) +
      (k.S.isDown || k.DOWN.isDown ? -1 : 0); // forward = up = +worldY
    const usingKb = kbX !== 0 || kbY !== 0;

    if (usingKb && !this.ptr.isDown) {
      // keyboard produces worldY-forward directly; move() expects screen dy,
      // where negative screen dy = forward. Convert: screenDy = -worldDy.
      this.time0.updateFromKeyboard(kbX, -kbY, k.SHIFT.isDown, realDt);
    } else {
      this.time0.updateFromPointer(this.ptr, realDt);
    }
  }

  // ---- entity updates ----
  private updateEnemies(dt: number): void {
    const ctx = {
      playerX: this.player.worldX,
      playerY: this.player.worldY,
      cameraY: this.cameraY,
      fireBullet: (x: number, y: number, vx: number, vy: number, id: number) =>
        this.fireEnemyBullet(x, y, vx, vy, id),
    };
    for (const e of this.spawner.active) e.update(dt, ctx);
  }

  private updateBoss(dt: number): void {
    if (!this.boss.alive) return;
    this.boss.update(dt, {
      playerX: this.player.worldX,
      playerY: this.player.worldY,
      cameraY: this.cameraY,
      fireBullet: (x, y, vx, vy, id) => this.fireEnemyBullet(x, y, vx, vy, id),
    });
  }

  private updateWeapons(dt: number): void {
    this.weapons.update(dt, {
      playerX: this.player.worldX,
      playerY: this.player.worldY,
      nearest: (x, y, air) => this.nearestEnemy(x, y, air),
      fire: (cfg) => this.firePlayerBullet(cfg),
    });
  }

  private firePlayerBullet(cfg: Partial<Projectile>): void {
    if (this.playerBullets.active.length > 400) return;
    const p = this.playerBullets.obtain();
    p.spawn({ fromEnemy: false, canHitEnemies: false, pierce: 0, homing: false, ...cfg });
  }

  private fireEnemyBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    ownerId: number
  ): void {
    if (this.enemyBullets.active.length > 300) return;
    const p = this.enemyBullets.obtain();
    p.spawn({
      worldX: x,
      worldY: y,
      vx,
      vy,
      damage: 1,
      radius: 8,
      life: 4,
      color: 0xff5a6a,
      visualW: 12,
      visualH: 12,
      fromEnemy: true,
      canHitEnemies: true,
      ownerId,
    });
  }

  private updateProjectiles(dt: number): void {
    // player bullets
    for (let i = this.playerBullets.active.length - 1; i >= 0; i--) {
      const p = this.playerBullets.active[i];
      if (p.homing) {
        const t = this.nearestEnemy(p.worldX, p.worldY, p.antiAir ? false : undefined);
        if (t) {
          const dx = t.worldX - p.worldX;
          const dy = t.worldY - p.worldY;
          const d = Math.hypot(dx, dy) || 1;
          const spd = Math.hypot(p.vx, p.vy) || 1;
          const desiredVx = (dx / d) * spd;
          const desiredVy = (dy / d) * spd;
          const k = Math.min(1, p.turnRate * dt);
          p.vx = p.vx + (desiredVx - p.vx) * k;
          p.vy = p.vy + (desiredVy - p.vy) * k;
        }
      }
      p.worldX += p.vx * dt;
      p.worldY += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || this.offscreen(p.worldY)) this.playerBullets.release(p);
    }
    // enemy bullets
    for (let i = this.enemyBullets.active.length - 1; i >= 0; i--) {
      const p = this.enemyBullets.active[i];
      p.worldX += p.vx * dt;
      p.worldY += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || this.offscreen(p.worldY)) this.enemyBullets.release(p);
    }
  }

  private offscreen(worldY: number): boolean {
    const rel = worldY - this.cameraY;
    return rel < -LOGICAL_HEIGHT || rel > LOGICAL_HEIGHT * 2.2;
  }

  private nearestEnemy(
    x: number,
    y: number,
    airborneOnly?: boolean
  ): { worldX: number; worldY: number; airborne?: boolean } | null {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of this.spawner.active) {
      if (!e.alive) continue;
      if (airborneOnly && !e.def.airborne) continue;
      // only target things ahead-ish / on screen
      const d = (e.worldX - x) ** 2 + (e.worldY - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (this.boss.alive) {
      const d = (this.boss.worldX - x) ** 2 + (this.boss.worldY - y) ** 2;
      if (d < bestD) {
        return {
          worldX: this.boss.worldX,
          worldY: this.boss.worldY,
          airborne: false,
        };
      }
    }
    if (!best) return null;
    return { worldX: best.worldX, worldY: best.worldY, airborne: best.def.airborne };
  }

  // ---- boss spawning (§11.1) ----
  private trySpawnBoss(force: boolean): void {
    if (this.boss.alive) return;
    if (!force && this.score < this.nextBossScore) return;
    const pool = bossPoolForScore(this.score);
    const id = pool[Math.floor(Math.random() * pool.length)];
    this.boss.spawn(
      id,
      LOGICAL_WIDTH / 2,
      this.cameraY + LOGICAL_HEIGHT * 1.15
    );
    this.nextBossScore = this.score + Phaser.Math.Between(1400, 2400);
  }

  // ---- collisions ----
  private handleCollisions(nowMs: number): void {
    const enemies = this.spawner.active;

    // player bullets vs enemies / boss
    for (let i = this.playerBullets.active.length - 1; i >= 0; i--) {
      const p = this.playerBullets.active[i];
      let consumed = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (e.def.airborne && !(p.antiAir || p.homing)) continue;
        const rr = (p.radius + e.def.radius) ** 2;
        if ((p.worldX - e.worldX) ** 2 + (p.worldY - e.worldY) ** 2 <= rr) {
          this.damageEnemy(e, p.damage);
          if (p.freeze > 0) e.applyFreeze(p.freeze);
          if (p.aoeRadius > 0) this.explode(p.worldX, p.worldY, p.aoeRadius, p.aoeDamage, p.color);
          if (p.pierce > 0) {
            p.pierce--;
          } else {
            consumed = true;
            break;
          }
        }
      }
      if (!consumed && this.boss.alive) {
        const rr = (p.radius + this.boss.def.radius) ** 2;
        if (
          (p.worldX - this.boss.worldX) ** 2 +
            (p.worldY - this.boss.worldY) ** 2 <=
          rr
        ) {
          this.damageBoss(p.damage);
          if (p.freeze > 0) this.boss.applyFreeze(p.freeze * 0.5);
          if (p.aoeRadius > 0) this.explode(p.worldX, p.worldY, p.aoeRadius, p.aoeDamage, p.color);
          if (p.pierce > 0) p.pierce--;
          else consumed = true;
        }
      }
      if (consumed) this.playerBullets.release(p);
    }

    // enemy bullets vs OTHER enemies (§10.3) and vs boss
    for (let i = this.enemyBullets.active.length - 1; i >= 0; i--) {
      const p = this.enemyBullets.active[i];
      if (!p.canHitEnemies) continue;
      let consumed = false;
      for (const e of enemies) {
        if (!e.alive || e.id === p.ownerId) continue;
        const rr = (p.radius + e.def.radius) ** 2;
        if ((p.worldX - e.worldX) ** 2 + (p.worldY - e.worldY) ** 2 <= rr) {
          this.damageEnemy(e, p.damage);
          consumed = true;
          break;
        }
      }
      if (!consumed && this.boss.alive && p.ownerId !== this.boss.id) {
        const rr = (p.radius + this.boss.def.radius) ** 2;
        if (
          (p.worldX - this.boss.worldX) ** 2 +
            (p.worldY - this.boss.worldY) ** 2 <=
          rr
        ) {
          this.damageBoss(p.damage * 0.5); // 50% to boss
          consumed = true;
        }
      }
      if (consumed) this.enemyBullets.release(p);
    }

    // guard bits vs enemies (contact damage)
    for (const b of this.weapons.guardBits) {
      b.fireTimer -= 0.016;
      for (const e of enemies) {
        if (!e.alive) continue;
        const rr = (20 + e.def.radius) ** 2;
        if ((b.worldX - e.worldX) ** 2 + (b.worldY - e.worldY) ** 2 <= rr) {
          if (b.fireTimer <= 0) {
            this.damageEnemy(e, b.damage);
            b.fireTimer = 0.2;
          }
        }
      }
    }

    // player death checks (contact with enemies / bullets / frozen enemies)
    if (this.invincible || this.player.isInvulnerable(nowMs)) {
      // still collect items and coins below
    } else {
      for (const e of enemies) {
        if (!e.alive) continue;
        const rr = (this.player.hitboxRadius + e.def.radius) ** 2;
        if (
          (this.player.worldX - e.worldX) ** 2 +
            (this.player.worldY - e.worldY) ** 2 <=
          rr
        ) {
          this.onPlayerDeath();
          return;
        }
      }
      if (this.boss.alive) {
        const rr = (this.player.hitboxRadius + this.boss.def.radius * 0.85) ** 2;
        if (
          (this.player.worldX - this.boss.worldX) ** 2 +
            (this.player.worldY - this.boss.worldY) ** 2 <=
          rr
        ) {
          this.onPlayerDeath();
          return;
        }
      }
      for (const p of this.enemyBullets.active) {
        const rr = (this.player.hitboxRadius + p.radius) ** 2;
        if (
          (this.player.worldX - p.worldX) ** 2 +
            (this.player.worldY - p.worldY) ** 2 <=
          rr
        ) {
          this.onPlayerDeath();
          return;
        }
      }
    }

    // player vs items
    for (let i = this.items.items.length - 1; i >= 0; i--) {
      const it = this.items.items[i];
      if (!it.alive) continue;
      const rr = (this.player.hitboxRadius + it.radius + 20) ** 2;
      if (
        (this.player.worldX - it.worldX) ** 2 +
          (this.player.worldY - it.worldY) ** 2 <=
        rr
      ) {
        this.collectItem(it);
      }
    }
  }

  private damageEnemy(e: Enemy, dmg: number): void {
    if (dmg <= 0) return;
    if (e.hit(dmg)) this.killEnemy(e);
  }

  private killEnemy(e: DropEnemy): void {
    this.kills++;
    this.killScore += e.def.score;
    const sx = this.screenX(e.worldX);
    const sy = this.screenY(e.worldY);
    burst(this, sx, sy, 0xffffff, 14, 50);
    if (e.dropCrate) {
      this.items.spawn("crate", e.worldX, e.worldY);
    } else if (e.dropCoin || e.def.color === "green") {
      this.items.spawn("coin", e.worldX, e.worldY);
    }
    e.dropCrate = false;
    e.dropCoin = false;
    e.hide();
  }

  private damageBoss(dmg: number): void {
    if (dmg <= 0) return;
    if (this.boss.hit(dmg)) {
      this.bossKills++;
      this.bossScore += this.boss.def.score;
      const sx = this.screenX(this.boss.worldX);
      const sy = this.screenY(this.boss.worldY);
      burst(this, sx, sy, 0xff9a5a, 40, 120);
      this.cameras.main.shake(200, 0.01);
      // reward crate + coins
      this.items.spawn("crate", this.boss.worldX, this.boss.worldY);
      for (let i = 0; i < 5; i++) {
        this.items.spawn(
          "coin",
          this.boss.worldX + (Math.random() - 0.5) * 120,
          this.boss.worldY + (Math.random() - 0.5) * 120
        );
      }
      this.boss.hide();
    }
  }

  private explode(
    x: number,
    y: number,
    radius: number,
    dmg: number,
    color: number
  ): void {
    burst(this, this.screenX(x), this.screenY(y), color, 20, radius * 0.6);
    const rr = radius * radius;
    for (const e of this.spawner.active) {
      if (!e.alive) continue;
      if ((e.worldX - x) ** 2 + (e.worldY - y) ** 2 <= rr) {
        this.damageEnemy(e, dmg);
      }
    }
    if (this.boss.alive) {
      if ((this.boss.worldX - x) ** 2 + (this.boss.worldY - y) ** 2 <= rr) {
        this.damageBoss(dmg);
      }
    }
  }

  private collectItem(it: Item): void {
    if (it.kind === "coin") {
      this.runCoins++;
      burst(this, this.screenX(it.worldX), this.screenY(it.worldY), 0x3ddc84, 6, 20);
    } else {
      const id = pickRandomWeapon(Math.random, this.mode === "hardcore");
      const lv = this.weapons.add(id, 1);
      this.itemBonus += 50;
      this.showWeaponPopup(WEAPONS[id].name, lv, it.worldX, it.worldY);
    }
    this.items.release(it);
  }

  private showWeaponPopup(name: string, lv: number, wx: number, wy: number): void {
    const t = this.add
      .text(this.screenX(wx), this.screenY(wy), `${name} Lv${lv}`, {
        fontFamily: "monospace",
        fontSize: "40px",
        color: "#9fe8ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(120);
    this.tweens.add({
      targets: t,
      y: t.y - 120,
      alpha: 0,
      duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  private recomputeScore(): void {
    const dist = Math.max(0, this.player.maxForwardY) * 0.06;
    const raw = dist + this.killScore + this.bossScore + this.itemBonus;
    this.score = Math.floor(raw * this.difficulty.scoreMultiplier);
  }

  // ---- rendering ----
  private renderAll(scaledDt: number, _realDt: number): void {
    this.renderBackground();

    for (const e of this.spawner.active) {
      if (e.alive) e.render(this.screenX(e.worldX), this.screenY(e.worldY));
    }
    if (this.boss.alive) {
      this.boss.render(this.screenX(this.boss.worldX), this.screenY(this.boss.worldY));
    }
    for (const p of this.playerBullets.active) {
      p.gfx.setPosition(this.screenX(p.worldX), this.screenY(p.worldY));
    }
    for (const p of this.enemyBullets.active) {
      p.gfx.setPosition(this.screenX(p.worldX), this.screenY(p.worldY));
    }
    for (const it of this.items.items) {
      if (it.alive) it.render(this.screenX(it.worldX), this.screenY(it.worldY), scaledDt);
    }

    // guard bit & supporter visuals (draw simple markers via reuse of items? use graphics)
    this.renderOrbiters();

    // deadline edge
    const edgeScreenY = this.screenY(this.deadline.y);
    this.deadline.render(edgeScreenY);

    this.player.render(
      this.screenX(this.player.worldX),
      this.screenY(this.player.worldY),
      this.time.now
    );

    // HUD
    const distToDeadline = this.player.worldY - this.deadline.y;
    const warn = Phaser.Math.Clamp(1 - distToDeadline / 600, 0, 1);
    this.hud.update({
      score: this.score,
      best: save.bestScore,
      coins: this.runCoins,
      timeScale: this.time0.timeScale,
      deadlineWarn: warn,
      mode: this.mode,
    });

    if (this.debugMode) {
      this.hud.setDebug(
        [
          `ts=${this.time0.timeScale.toFixed(2)}`,
          `enemies=${this.spawner.active.length}`,
          `pBullets=${this.playerBullets.active.length}`,
          `eBullets=${this.enemyBullets.active.length}`,
          `density=${this.difficulty.enemyDensity.toFixed(1)}`,
          `deadlineSpd=${this.difficulty.deadlineSpeed.toFixed(0)}`,
          `boss=${this.boss.alive ? this.boss.def.name : "-"}`,
          `invinc=${this.invincible}`,
        ].join("\n")
      );
    }
  }

  private orbiterGfx?: Phaser.GameObjects.Graphics;
  private renderOrbiters(): void {
    if (!this.orbiterGfx) {
      this.orbiterGfx = this.add.graphics();
      this.orbiterGfx.setDepth(38);
    }
    const g = this.orbiterGfx;
    g.clear();
    g.fillStyle(WEAPONS.GUARD_BIT.color, 1);
    for (const b of this.weapons.guardBits) {
      g.fillCircle(this.screenX(b.worldX), this.screenY(b.worldY), 10);
    }
    g.fillStyle(WEAPONS.SUPPORTER.color, 1);
    for (const b of this.weapons.supporters) {
      g.fillRect(this.screenX(b.worldX) - 9, this.screenY(b.worldY) - 9, 18, 18);
    }
  }

  // ---- death / continue / result ----
  private onPlayerDeath(): void {
    if (!this.running) return;
    this.running = false;
    burst(
      this,
      this.screenX(this.player.worldX),
      this.screenY(this.player.worldY),
      0xffffff,
      30,
      120
    );
    this.cameras.main.shake(260, 0.015);

    const cost = this.continueCost();
    const canContinue =
      this.mode === "normal" && !this.continued && save.totalCoins >= cost;

    this.time.delayedCall(500, () => {
      if (canContinue) this.showContinueOffer(cost);
      else this.goToResult();
    });
  }

  private continueCost(): number {
    return (
      ECONOMY.CONTINUE_BASE_COST +
      Math.floor(this.score / 10000) * ECONOMY.CONTINUE_COST_PER_10K
    );
  }

  private showContinueOffer(cost: number): void {
    this.clearOverlay();
    const cx = LOGICAL_WIDTH / 2;
    const cy = LOGICAL_HEIGHT / 2;
    const bg = this.add.rectangle(cx, cy, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x000000, 0.7);
    const title = this.uiText(cx, cy - 260, "CONTINUE?", 80, "#ffffff");
    const info = this.uiText(cx, cy - 150, `コイン ${cost} を使用`, 40, "#3ddc84");
    const own = this.uiText(cx, cy - 90, `所持: ${save.totalCoins}`, 32, "#9fb2c8");

    const yes = this.makeButton(cx, cy + 30, 460, 110, "CONTINUE", 0x1f6f43, () => {
      if (save.spendCoins(cost)) {
        this.continued = true;
        this.resumeAfterContinue();
      }
    });
    const no = this.makeButton(cx, cy + 180, 460, 110, "GIVE UP", 0x5a2030, () => {
      this.goToResult();
    });

    this.overlay = this.add.container(0, 0, [bg, title, info, own, yes, no]);
    this.overlay.setDepth(300);
  }

  private resumeAfterContinue(): void {
    this.clearOverlay();
    this.player.grantInvuln(this.time.now, ECONOMY.CONTINUE_INVULN_SECONDS);
    this.deadline.pushBack(LOGICAL_HEIGHT * DEADLINE.CONTINUE_PUSHBACK);
    this.enemyBullets.clear();
    this.running = true;
  }

  private goToResult(): void {
    const newBest = save.recordRun(this.score, this.runCoins);
    this.scene.start("Result", {
      mode: this.mode,
      characterId: this.characterId,
      score: this.score,
      newBest,
      coins: this.runCoins,
      kills: this.kills,
      bossKills: this.bossKills,
      distance: Math.floor(this.player.maxForwardY),
      weapons: this.weapons.list(),
    });
  }

  // ---- pause overlay ----
  private showPauseOverlay(): void {
    this.clearOverlay();
    const cx = LOGICAL_WIDTH / 2;
    const cy = LOGICAL_HEIGHT / 2;
    const bg = this.add.rectangle(cx, cy, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x000000, 0.65);
    const title = this.uiText(cx, cy - 200, "PAUSED", 80, "#ffffff");
    const resume = this.makeButton(cx, cy, 460, 110, "RESUME", 0x1f4f6f, () =>
      this.togglePause()
    );
    const quit = this.makeButton(cx, cy + 150, 460, 110, "QUIT", 0x5a2030, () => {
      this.scene.start("Title");
    });
    this.overlay = this.add.container(0, 0, [bg, title, resume, quit]);
    this.overlay.setDepth(300);
  }

  private clearOverlay(): void {
    this.overlay?.destroy();
    this.overlay = undefined;
  }

  // ---- small UI helpers ----
  private uiText(x: number, y: number, text: string, size: number, color: string) {
    return this.add
      .text(x, y, text, {
        fontFamily: "monospace",
        fontSize: `${size}px`,
        color,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private makeButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.lineStyle(3, 0xffffff, 0.5);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    const t = this.add
      .text(0, 0, label, {
        fontFamily: "monospace",
        fontSize: "48px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const c = this.add.container(x, y, [g, t]);
    c.setSize(w, h);
    c.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );
    c.on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e?.stopPropagation?.();
      onClick();
    });
    return c;
  }
}
