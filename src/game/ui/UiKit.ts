// Shared menu widgets (buttons / labels) used by the non-gameplay scenes.

import Phaser from "phaser";

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color = "#ffffff",
  bold = true
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: "monospace",
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? "bold" : "normal",
      align: "center",
    })
    .setOrigin(0.5);
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  onClick: () => void,
  opts: { color?: number; disabled?: boolean; sub?: string } = {}
): Phaser.GameObjects.Container {
  const color = opts.color ?? 0x1f4f6f;
  const disabled = opts.disabled ?? false;
  const g = scene.add.graphics();
  g.fillStyle(disabled ? 0x2a2f38 : color, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
  g.lineStyle(3, 0xffffff, disabled ? 0.15 : 0.5);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);

  const t = scene.add
    .text(0, opts.sub ? -14 : 0, text, {
      fontFamily: "monospace",
      fontSize: "46px",
      color: disabled ? "#666c78" : "#ffffff",
      fontStyle: "bold",
    })
    .setOrigin(0.5);

  const children: Phaser.GameObjects.GameObject[] = [g, t];
  if (opts.sub) {
    const s = scene.add
      .text(0, 30, opts.sub, {
        fontFamily: "monospace",
        fontSize: "26px",
        color: disabled ? "#555b66" : "#c8d6e6",
      })
      .setOrigin(0.5);
    children.push(s);
  }

  const c = scene.add.container(x, y, children);
  c.setSize(w, h);
  if (!disabled) {
    c.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );
    c.on("pointerover", () => c.setScale(1.03));
    c.on("pointerout", () => c.setScale(1));
    c.on("pointerdown", () => {
      c.setScale(0.97);
      onClick();
    });
  }
  return c;
}
