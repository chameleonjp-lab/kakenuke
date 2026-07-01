// Low-poly primitive drawing helpers (§17). All visuals are built from
// geometric shapes drawn with Phaser Graphics — no external textures.

import Phaser from "phaser";
import type { EnemyDef } from "../config/enemies";

export function drawPlayerShape(
  g: Phaser.GameObjects.Graphics,
  shape: "circle" | "box" | "triangle" | "custom",
  size: number,
  color: number
): void {
  g.clear();
  const h = size / 2;
  g.fillStyle(color, 1);
  g.lineStyle(3, 0xffffff, 0.9);
  switch (shape) {
    case "circle":
      g.fillCircle(0, 0, h);
      g.strokeCircle(0, 0, h);
      break;
    case "box":
      g.fillRect(-h, -h, size, size);
      g.strokeRect(-h, -h, size, size);
      break;
    case "triangle":
    case "custom":
    default:
      // pointing "forward" (up on screen)
      g.fillTriangle(0, -h, h, h, -h, h);
      g.strokeTriangle(0, -h, h, h, -h, h);
      break;
  }
  // core dot to hint the tiny hitbox
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(0, 0, Math.max(3, size * 0.08));
}

export function drawEnemyShape(
  g: Phaser.GameObjects.Graphics,
  def: EnemyDef,
  color: number
): void {
  g.clear();
  const w = def.width;
  const h = def.height;
  const hw = w / 2;
  const hh = h / 2;
  g.fillStyle(color, 1);
  g.lineStyle(2, 0x000000, 0.25);

  switch (def.shape) {
    case "penguin":
      g.fillRoundedRect(-hw, -hh, w, h, w * 0.35);
      g.fillStyle(0xffffff, 0.85);
      g.fillEllipse(0, hh * 0.1, w * 0.5, h * 0.5);
      break;
    case "quad": // four-legged silhouette
      g.fillRoundedRect(-hw, -hh * 0.6, w, h * 0.7, 8);
      g.fillRect(-hw * 0.8, hh * 0.2, w * 0.18, hh * 0.8);
      g.fillRect(hw * 0.62, hh * 0.2, w * 0.18, hh * 0.8);
      g.fillTriangle(-hw, -hh * 0.4, -hw - w * 0.18, -hh * 0.1, -hw, hh * 0.1);
      break;
    case "bird":
      g.fillTriangle(-hw, 0, 0, -hh, hw, 0);
      g.fillTriangle(-hw, 0, 0, hh, hw, 0);
      break;
    case "frog":
      g.fillEllipse(0, 0, w, h);
      g.fillCircle(-hw * 0.5, -hh * 0.4, w * 0.14);
      g.fillCircle(hw * 0.5, -hh * 0.4, w * 0.14);
      break;
    case "snake":
      for (let i = 0; i < 5; i++) {
        const yy = -hh + (h / 5) * i + h / 10;
        g.fillCircle(Math.sin(i) * 6, yy, hw * 0.7);
      }
      break;
    case "car":
      g.fillRoundedRect(-hw, -hh, w, h, 10);
      g.fillStyle(0x000000, 0.35);
      g.fillRect(-hw * 0.7, -hh * 0.5, w * 0.4, h * 0.35);
      break;
    case "turret":
      g.fillCircle(0, 0, hw);
      g.fillStyle(0x000000, 0.4);
      g.fillRect(-6, -hh - 8, 12, hh + 8);
      g.fillRect(-hw - 8, -6, hw + 8, 12);
      break;
    case "tank":
      g.fillRoundedRect(-hw, -hh * 0.6, w, h * 0.8, 6);
      g.fillStyle(0x000000, 0.35);
      g.fillRect(-6, -hh - 10, 12, hh + 10);
      break;
    case "heli":
      g.fillEllipse(0, 0, w * 0.55, h);
      g.fillRect(-hw, -4, w, 8);
      break;
    case "infantry":
      g.fillCircle(0, -hh * 0.5, w * 0.35);
      g.fillRoundedRect(-w * 0.25, -hh * 0.1, w * 0.5, h * 0.6, 4);
      break;
    case "block":
    default:
      g.fillRoundedRect(-hw, -hh, w, h, 12);
      break;
  }
}

export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count = 12,
  spread = 60
): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 6 + Math.random() * spread;
    const px = x + Math.cos(a) * 4;
    const py = y + Math.sin(a) * 4;
    const dot = scene.add.rectangle(
      px,
      py,
      3 + Math.random() * 4,
      3 + Math.random() * 4,
      color
    );
    dot.setDepth(50);
    scene.tweens.add({
      targets: dot,
      x: px + Math.cos(a) * d,
      y: py + Math.sin(a) * d,
      alpha: 0,
      duration: 260 + Math.random() * 220,
      ease: "Quad.out",
      onComplete: () => dot.destroy(),
    });
  }
}
