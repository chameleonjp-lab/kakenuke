// The advancing "deadline" — a black collapse band that always moves in real
// time, even while gameplay time is frozen (§13). Catching the player = death.

import Phaser from "phaser";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, DEADLINE } from "../config/progression";

export class Deadline {
  y = -400; // world y of the leading edge
  speed = DEADLINE.NORMAL_BASE;
  private gfx: Phaser.GameObjects.Graphics;
  private noiseT = 0;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(45);
  }

  reset(startY: number): void {
    this.y = startY;
    this.noiseT = 0;
  }

  /** Advance using REAL time (never scaled). */
  update(realDt: number, speed: number): void {
    this.speed = speed;
    this.y += speed * realDt;
    this.noiseT += realDt;
  }

  /** Push the deadline back after a continue (§14.2). */
  pushBack(distance: number): void {
    this.y -= distance;
  }

  /** Player dies if their center is below (behind) the leading edge + grace. */
  hits(playerWorldY: number): boolean {
    return playerWorldY < this.y + DEADLINE.HITBOX_GRACE;
  }

  /** Render the band from bottom of screen up to the leading edge. */
  render(edgeScreenY: number): void {
    const g = this.gfx;
    g.clear();
    // fill everything below the edge (larger screen y)
    const top = Math.max(0, edgeScreenY);
    g.fillStyle(0x0a0410, 1);
    g.fillRect(0, top, LOGICAL_WIDTH, LOGICAL_HEIGHT - top);

    // jagged glowing rim
    g.fillStyle(0x3a0a4a, 0.9);
    const segW = 40;
    for (let x = 0; x <= LOGICAL_WIDTH; x += segW) {
      const n = Math.sin(x * 0.05 + this.noiseT * 6) * 10 + Math.sin(x * 0.11 - this.noiseT * 9) * 6;
      g.fillRect(x, top + n - 6, segW + 2, 18);
    }
    g.fillStyle(0x8a2be2, 0.5);
    for (let x = 0; x <= LOGICAL_WIDTH; x += segW) {
      const n = Math.sin(x * 0.05 + this.noiseT * 6) * 10;
      g.fillRect(x, top + n - 2, segW + 2, 4);
    }
  }
}
