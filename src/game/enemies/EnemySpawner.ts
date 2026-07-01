// EnemySpawner (§12). Procedurally generates chunks of enemies ahead of the
// camera and recycles enemies that fall far behind the deadline.

import Phaser from "phaser";
import { Enemy } from "./Enemy";
import { enemyPoolForScore } from "../../config/enemies";
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
    const count = Math.round(
      difficulty.enemyDensity * (0.7 + Math.random() * 0.6)
    );
    const halfW = LOGICAL_WIDTH * PLAY_AREA.HALF_WIDTH_FRACTION;
    const centerX = LOGICAL_WIDTH / 2;

    for (let i = 0; i < count; i++) {
      let defId = pool[Math.floor(Math.random() * pool.length)];
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
        (e as Enemy & { dropCrate?: boolean }).dropCrate = true;
      } else if (roll < crateChance + coinChance) {
        (e as Enemy & { dropCoin?: boolean }).dropCoin = true;
      }
    }
  }
}
