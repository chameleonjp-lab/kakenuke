// Mode select (§4): Normal / Hardcore (locked until best >= 10000).

import Phaser from "phaser";
import { LOGICAL_WIDTH } from "../../config/progression";
import { save } from "../economy/SaveData";
import { button, label } from "../ui/UiKit";

export class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super("ModeSelect");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#05060a");
    const cx = LOGICAL_WIDTH / 2;

    label(this, cx, 360, "MODE", 90, "#ffffff");

    button(this, cx, 760, 620, 150, "NORMAL", () => {
      this.scene.start("CharacterSelect", { mode: "normal" });
    }, { color: 0x1f6f43, sub: "スタンダード・コンティニュー可" });

    const hardUnlocked = save.hardcoreUnlocked;
    button(
      this,
      cx,
      980,
      620,
      150,
      "HARDCORE",
      () => {
        this.scene.start("CharacterSelect", { mode: "hardcore" });
      },
      {
        color: 0x8a2f2f,
        disabled: !hardUnlocked,
        sub: hardUnlocked ? "高密度・高速・コンティニュー不可" : "BEST 10000 で解放",
      }
    );

    button(this, cx, 1280, 460, 110, "← BACK", () => {
      this.scene.start("Title");
    }, { color: 0x33475f });
  }
}
