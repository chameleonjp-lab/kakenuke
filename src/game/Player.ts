// Player entity (§8). HP is always 1; movement follows input delta directly.

import Phaser from "phaser";
import type { CharacterConfig } from "../config/characters";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, PLAY_AREA } from "../config/progression";
import { drawPlayerShape } from "./Shapes";

export class Player {
  worldX = LOGICAL_WIDTH / 2;
  worldY = 0;
  maxForwardY = 0;
  hitboxRadius: number;
  visualSize: number;
  inputSensitivity: number;
  invulnUntil = 0; // real-time timestamp (ms)
  alive = true;

  container: Phaser.GameObjects.Container;
  private gfx: Phaser.GameObjects.Graphics;
  private ring: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, cfg: CharacterConfig) {
    this.hitboxRadius = cfg.hitboxRadius;
    this.visualSize = cfg.visualSize;
    this.inputSensitivity = cfg.inputSensitivity;

    this.gfx = scene.add.graphics();
    drawPlayerShape(this.gfx, cfg.bodyShape, cfg.visualSize, cfg.color);

    this.ring = scene.add.circle(0, 0, cfg.hitboxRadius, 0x9fe8ff, 0);
    this.ring.setStrokeStyle(2, 0x9fe8ff, 0.9);
    this.ring.setVisible(false);

    this.container = scene.add.container(0, 0, [this.gfx, this.ring]);
    this.container.setDepth(40);
  }

  setDebugHitbox(on: boolean): void {
    this.ring.setVisible(on);
  }

  /** Apply a movement delta (world px) then clamp to the play area (§6.3). */
  move(dx: number, dy: number, cameraY: number): void {
    this.worldX += dx;
    // world y positive = forward = up on screen; drag up (screen) => forward.
    // Screen y decreases upward, so a negative screen dy is forward (+worldY).
    this.worldY -= dy;

    const halfW = LOGICAL_WIDTH * PLAY_AREA.HALF_WIDTH_FRACTION;
    const centerX = LOGICAL_WIDTH / 2;
    this.worldX = Phaser.Math.Clamp(
      this.worldX,
      centerX - halfW,
      centerX + halfW
    );

    const minY = cameraY + LOGICAL_HEIGHT * PLAY_AREA.BOTTOM_FRACTION;
    const maxY = cameraY + LOGICAL_HEIGHT * PLAY_AREA.TOP_FRACTION;
    this.worldY = Phaser.Math.Clamp(this.worldY, minY, maxY);

    if (this.worldY > this.maxForwardY) this.maxForwardY = this.worldY;
  }

  isInvulnerable(nowMs: number): boolean {
    return nowMs < this.invulnUntil;
  }

  grantInvuln(nowMs: number, seconds: number): void {
    this.invulnUntil = nowMs + seconds * 1000;
  }

  render(screenX: number, screenY: number, nowMs: number): void {
    this.container.setPosition(screenX, screenY);
    if (nowMs < this.invulnUntil) {
      this.container.setAlpha(0.4 + 0.4 * Math.sin(nowMs * 0.03));
    } else {
      this.container.setAlpha(1);
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
