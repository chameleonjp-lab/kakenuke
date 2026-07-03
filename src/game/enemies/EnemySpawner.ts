// EnemySpawner (§12). Procedurally generates chunks of enemies ahead of the
// camera and recycles enemies that fall far behind the deadline.

import Phaser from "phaser";
import { Enemy } from "./Enemy";
import { enemyPoolForScore, ENEMIES } from "../../config/enemies";
import {
  SPAWN,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  PLAY_AREA,
  type DifficultyState,
} from "../../config/progression";

export class EnemySpawner {
  active: Enemy[] = [];
  private pool: Enemy[] = [];
  private generatedUntilY = 0;
  private nextId = 0;

  constructor(private scene: Phaser.Scene) {}

  reset(startY: number): void {
    for (const e of this.active) e.hide();
    this.pool.push(...this.active);
    this.active.length = 0;
    this.generatedUntilY = startY;
    this.nextId = 0;
  }

  private obtain(): Enemy {
    const e = this.pool.pop() ?? new Enemy(this.scene);
    this.active.push(e);
    return e;
  }

  private release(e: Enemy): void {
    e.hide();
    const i = this.active.indexOf(e);
    if (i >= 0) this.active.splice(i, 1);
    this.pool.push(e);
  }

  nextEnemyId(): number {
    return this.nextId++;
  }

  /** Generate chunks up to 2 screens ahead; despawn stragglers behind. */
  update(cameraY: number, difficulty: DifficultyState): void {
    while (this.generatedUntilY < cameraY + LOGICAL_HEIGHT * 2) {
      this.generateChunk(
        this.generatedUntilY,
        this.generatedUntilY + SPAWN.CHUNK_HEIGHT,
        difficulty
      );
      this.generatedUntilY += SPAWN.CHUNK_HEIGHT;
    }

    const cutoff = cameraY - SPAWN.DESPAWN_MARGIN;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      if (!e.alive || e.worldY < cutoff) {
        this.release(e);
      }
    }
  }

  private generateChunk(
    fromY: number,
    toY: number,
    difficulty: DifficultyState
  ): void {
    const pool = enemyPoolForScore(difficulty.score);
    // Hardcore biases the roster toward orange (homing) / purple (fast,
    // weave) enemies for extra pressure (§12.3).
    const isHardcore = difficulty.mode === "hardcore";
    const hotPool = isHardcore
      ? pool.filter((id) => ENEMIES[id].color === "orange" || ENEMIES[id].color === "purple")
      : [];
    const count = Math.round(
      difficulty.enemyDensity * (0.7 + Math.random() * 0.6)
    );
    const halfW = LOGICAL_WIDTH * PLAY_AREA.HALF_WIDTH_FRACTION;
    const centerX = LOGICAL_WIDTH / 2;

    for (let i = 0; i < count; i++) {
      const useHotPool = isHardcore && hotPool.length > 0 && Math.random() < 0.45;
      const rollPool = useHotPool ? hotPool : pool;
      const defId = rollPool[Math.floor(Math.random() * rollPool.length)];
      // Occasionally drop a coin (green) or weapon crate (blue) enemy by
      // tagging a normal enemy as a drop carrier.
      const x = centerX + (Math.random() * 2 - 1) * halfW;
      const y = fromY + Math.random() * (toY - fromY);
      const e = this.obtain();
      e.spawn(defId, x, y, this.nextEnemyId());

      const roll = Math.random();
      const crateChance = 0.09 * difficulty.weaponCrateChanceMult;
      const coinChance = 0.16 * difficulty.coinChanceMult;
      if (roll < crateChance) {
        e.setCarrier("crate");
      } else if (roll < crateChance + coinChance) {
        e.setCarrier("coin");
      }
    }
  }

  /**
   * Spawn a small cluster of normal enemies around (cx, y) — used to mix
   * regular mobs into a boss fight for the 10000+ "boss + mobs" wave (§11.1).
   * Stays within the same horizontal play-area clamp as chunk generation.
   */
  spawnBurst(cx: number, y: number, count: number, score: number): void {
    const pool = enemyPoolForScore(score);
    if (pool.length === 0) return;
    const halfW = LOGICAL_WIDTH * PLAY_AREA.HALF_WIDTH_FRACTION;
    const minX = LOGICAL_WIDTH / 2 - halfW;
    const maxX = LOGICAL_WIDTH / 2 + halfW;
    for (let i = 0; i < count; i++) {
      const defId = pool[Math.floor(Math.random() * pool.length)];
      const x = Phaser.Math.Clamp(cx + (Math.random() * 2 - 1) * 260, minX, maxX);
      const yy = y + (Math.random() * 2 - 1) * 200;
      const e = this.obtain();
      e.spawn(defId, x, yy, this.nextEnemyId());
    }
  }
}
