// In-game HUD (§16.1). Rendered in screen space and updated with real time.

import Phaser from "phaser";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from "../../config/progression";

export interface HudState {
  score: number;
  best: number;
  coins: number;
  timeScale: number;
  deadlineWarn: number; // 0..1 proximity
  mode: string;
}

export class Hud {
  private score: Phaser.GameObjects.Text;
  private best: Phaser.GameObjects.Text;
  private coins: Phaser.GameObjects.Text;
  private modeText: Phaser.GameObjects.Text;
  private pauseBtn: Phaser.GameObjects.Container;
  private tsBar: Phaser.GameObjects.Graphics;
  private warn: Phaser.GameObjects.Graphics;
  private debug: Phaser.GameObjects.Text;
  private container: Phaser.GameObjects.Container;

  onPause?: () => void;

  constructor(scene: Phaser.Scene) {
    const pad = LOGICAL_WIDTH * 0.05;
    const top = LOGICAL_HEIGHT * 0.03;

    this.score = scene.add
      .text(pad, top, "0", {
        fontFamily: "monospace",
        fontSize: "72px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.best = scene.add
      .text(pad, top + 84, "BEST 0", {
        fontFamily: "monospace",
        fontSize: "34px",
        color: "#9fb2c8",
      })
      .setOrigin(0, 0);

    this.coins = scene.add
      .text(LOGICAL_WIDTH - pad, top, "◇ 0", {
        fontFamily: "monospace",
        fontSize: "44px",
        color: "#3ddc84",
        fontStyle: "bold",
      })
      .setOrigin(1, 0);

    this.modeText = scene.add
      .text(LOGICAL_WIDTH - pad, top + 60, "NORMAL", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#9fb2c8",
      })
      .setOrigin(1, 0);

    // pause button
    const btnG = scene.add.graphics();
    btnG.fillStyle(0xffffff, 0.15);
    btnG.fillRoundedRect(-40, -40, 80, 80, 12);
    btnG.fillStyle(0xffffff, 0.9);
    btnG.fillRect(-16, -22, 12, 44);
    btnG.fillRect(4, -22, 12, 44);
    this.pauseBtn = scene.add.container(LOGICAL_WIDTH - pad - 40, top + 150, [btnG]);
    this.pauseBtn.setSize(96, 96);
    this.pauseBtn.setInteractive(
      new Phaser.Geom.Rectangle(-48, -48, 96, 96),
      Phaser.Geom.Rectangle.Contains
    );
    this.pauseBtn.on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e?.stopPropagation?.();
      this.onPause?.();
    });

    // timeScale bar bottom-left
    this.tsBar = scene.add.graphics();

    // deadline warning flash overlay
    this.warn = scene.add.graphics();

    this.debug = scene.add
      .text(pad, LOGICAL_HEIGHT * 0.5, "", {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#7affe8",
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.container = scene.add.container(0, 0, [
      this.score,
      this.best,
      this.coins,
      this.modeText,
      this.pauseBtn,
      this.tsBar,
      this.warn,
      this.debug,
    ]);
    this.container.setDepth(200);
    this.container.setScrollFactor?.(0);
  }

  update(s: HudState): void {
    this.score.setText(String(s.score));
    this.best.setText("BEST " + s.best);
    this.coins.setText("◇ " + s.coins);
    this.modeText.setText(s.mode.toUpperCase());

    // timeScale bar
    const g = this.tsBar;
    g.clear();
    const bx = LOGICAL_WIDTH * 0.05;
    const by = LOGICAL_HEIGHT - 60;
    const bw = 300;
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(bx, by, bw, 20, 10);
    const frac = Phaser.Math.Clamp(s.timeScale / 2.2, 0, 1);
    const col = s.timeScale < 0.01 ? 0x667088 : 0x7affe8;
    g.fillStyle(col, 0.9);
    g.fillRoundedRect(bx, by, Math.max(6, bw * frac), 20, 10);

    // deadline warning
    const w = this.warn;
    w.clear();
    if (s.deadlineWarn > 0.01) {
      const a = s.deadlineWarn * 0.35;
      w.fillStyle(0x8a2be2, a);
      w.fillRect(0, LOGICAL_HEIGHT - 260, LOGICAL_WIDTH, 260);
    }
  }

  setDebug(text: string | null): void {
    if (text === null) {
      this.debug.setVisible(false);
    } else {
      this.debug.setVisible(true).setText(text);
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
