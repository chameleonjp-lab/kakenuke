// TimeController implements the core "input speed controls game time" rule (§5).
// It reads pointer / keyboard input and produces a smoothed timeScale plus the
// player's movement delta for the frame.

import { TIME } from "../config/progression";

export interface InputState {
  isDown: boolean;
  x: number;
  y: number;
}

export class TimeController {
  timeScale = 0;
  private prevX = 0;
  private prevY = 0;
  private hasPrev = false;

  // Movement delta the player should apply this frame (already sensitivity-scaled).
  moveX = 0;
  moveY = 0;

  sensitivity = TIME.PLAYER_INPUT_SENSITIVITY;

  reset(): void {
    this.timeScale = 0;
    this.hasPrev = false;
    this.moveX = 0;
    this.moveY = 0;
  }

  /**
   * Update from a pointer.
   * @param input current pointer state (in world/logical pixels)
   * @param realDt real seconds elapsed this frame
   */
  updateFromPointer(input: InputState, realDt: number): void {
    let targetTimeScale = 0;
    this.moveX = 0;
    this.moveY = 0;

    if (input.isDown && this.hasPrev && realDt > 0) {
      const dx = input.x - this.prevX;
      const dy = input.y - this.prevY;
      const dist = Math.hypot(dx, dy);
      const inputSpeed = dist / realDt;

      if (inputSpeed >= TIME.DEADZONE_PX_PER_SEC) {
        targetTimeScale = clamp(
          (inputSpeed - TIME.DEADZONE_PX_PER_SEC) / TIME.REFERENCE_SPEED_PX_PER_SEC,
          0,
          TIME.MAX_TIME_SCALE
        );
        // Player follows the drag delta directly, clamped per frame.
        let mvx = dx * this.sensitivity;
        let mvy = dy * this.sensitivity;
        const mlen = Math.hypot(mvx, mvy);
        if (mlen > TIME.MAX_PLAYER_DELTA_PER_FRAME) {
          const s = TIME.MAX_PLAYER_DELTA_PER_FRAME / mlen;
          mvx *= s;
          mvy *= s;
        }
        this.moveX = mvx;
        this.moveY = mvy;
      }
    }

    if (input.isDown) {
      this.prevX = input.x;
      this.prevY = input.y;
      this.hasPrev = true;
    } else {
      this.hasPrev = false;
    }

    this.timeScale = lerp(this.timeScale, targetTimeScale, TIME.TIME_SCALE_SMOOTHING);
    if (this.timeScale < 0.001) this.timeScale = 0;
  }

  /**
   * Keyboard fallback (§5.1): key held → timeScale 1.0, Shift → 0.35, none → 0.
   * dirX/dirY are normalized direction (-1..1).
   */
  updateFromKeyboard(
    dirX: number,
    dirY: number,
    slow: boolean,
    realDt: number
  ): void {
    const moving = dirX !== 0 || dirY !== 0;
    const target = moving ? (slow ? 0.35 : 1.0) : 0;
    this.timeScale = lerp(this.timeScale, target, TIME.TIME_SCALE_SMOOTHING);
    if (this.timeScale < 0.001) this.timeScale = 0;

    if (moving) {
      // Velocity in px/sec scaled by real time; keyboard speed reference.
      const speed = (slow ? 320 : 620) * this.sensitivity;
      const len = Math.hypot(dirX, dirY) || 1;
      let mvx = (dirX / len) * speed * realDt;
      let mvy = (dirY / len) * speed * realDt;
      const mlen = Math.hypot(mvx, mvy);
      if (mlen > TIME.MAX_PLAYER_DELTA_PER_FRAME) {
        const s = TIME.MAX_PLAYER_DELTA_PER_FRAME / mlen;
        mvx *= s;
        mvy *= s;
      }
      this.moveX = mvx;
      this.moveY = mvy;
    } else {
      this.moveX = 0;
      this.moveY = 0;
    }
  }
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
