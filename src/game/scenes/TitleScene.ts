// Title screen (§4): logo, top score, coins, start + settings.

import Phaser from "phaser";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from "../../config/progression";
import { save } from "../economy/SaveData";
import { button, label } from "../ui/UiKit";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#05060a");
    const cx = LOGICAL_WIDTH / 2;

    // decorative moving triangle logo mark
    const mark = this.add.graphics();
    mark.fillStyle(0x9fe8ff, 1);
    mark.fillTriangle(cx - 60, 520, cx + 60, 520, cx, 380);
    mark.lineStyle(4, 0xffffff, 0.8);
    mark.strokeTriangle(cx - 60, 520, cx + 60, 520, cx, 380);

    label(this, cx, 680, "カケヌケ", 140, "#ffffff");
    label(this, cx, 800, "K A K E N U K E", 44, "#7affe8");
    label(this, cx, 900, "時間をあやつるシューティング", 34, "#9fb2c8");

    label(this, cx, 1080, `BEST  ${save.bestScore}`, 52, "#ffffff");
    label(this, cx, 1150, `◇ COINS  ${save.totalCoins}`, 42, "#3ddc84");

    button(this, cx, 1360, 560, 130, "START", () => {
      this.scene.start("ModeSelect");
    }, { color: 0x1f6f43 });

    button(this, cx, 1520, 560, 110, "SETTINGS", () => {
      this.scene.start("Settings");
    }, { color: 0x33475f });

    label(
      this,
      cx,
      1740,
      "ドラッグで移動・止めると時間も止まる\n背後の闇に飲まれる前に駆け抜けろ",
      30,
      "#66707f"
    );

    if (!save.hardcoreUnlocked) {
      label(
        this,
        cx,
        LOGICAL_HEIGHT - 60,
        "HARDCORE: BEST 10000 で解放",
        26,
        "#5a616e"
      );
    } else {
      label(this, cx, LOGICAL_HEIGHT - 60, "HARDCORE UNLOCKED", 26, "#ff8a3d");
    }
  }
}
