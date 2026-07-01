// Settings (§4): sensitivity, volume, vibration, and save-data reset.

import Phaser from "phaser";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from "../../config/progression";
import { save } from "../economy/SaveData";
import { button, label } from "../ui/UiKit";

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("Settings");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#05060a");
    const cx = LOGICAL_WIDTH / 2;
    label(this, cx, 200, "SETTINGS", 80, "#ffffff");

    this.stepper(460, "感度 SENSITIVITY", () => save.settings.sensitivity, (v) => {
      save.settings.sensitivity = Phaser.Math.Clamp(v, 0.5, 2.0);
      save.saveSettings();
    }, 0.1);

    this.stepper(660, "音量 VOLUME", () => save.settings.volume, (v) => {
      save.settings.volume = Phaser.Math.Clamp(v, 0, 1);
      save.saveSettings();
    }, 0.1);

    this.toggle(860, "振動 VIBRATION", () => save.settings.vibration, () => {
      save.settings.vibration = !save.settings.vibration;
      save.saveSettings();
    });

    button(this, cx, 1120, 620, 120, "RESET SAVE DATA", () => {
      save.reset();
      this.scene.restart();
    }, { color: 0x8a2f2f, sub: "スコア・コイン・解放を全消去" });

    button(this, cx, LOGICAL_HEIGHT - 120, 460, 110, "← BACK", () => {
      this.scene.start("Title");
    }, { color: 0x33475f });
  }

  private valueLabels = new Map<string, Phaser.GameObjects.Text>();

  private stepper(
    y: number,
    name: string,
    get: () => number,
    set: (v: number) => void,
    step: number
  ): void {
    const cx = LOGICAL_WIDTH / 2;
    label(this, cx, y - 46, name, 38, "#c8d6e6");
    const valText = label(this, cx, y + 6, get().toFixed(1), 44, "#7affe8");
    this.valueLabels.set(name, valText);
    button(this, cx - 260, y, 120, 100, "−", () => {
      set(get() - step);
      valText.setText(get().toFixed(1));
    }, { color: 0x33475f });
    button(this, cx + 260, y, 120, 100, "＋", () => {
      set(get() + step);
      valText.setText(get().toFixed(1));
    }, { color: 0x33475f });
  }

  private toggle(y: number, name: string, get: () => boolean, flip: () => void): void {
    const cx = LOGICAL_WIDTH / 2;
    label(this, cx, y - 46, name, 38, "#c8d6e6");
    const t = label(this, cx, y + 6, get() ? "ON" : "OFF", 44, "#7affe8");
    button(this, cx + 260, y, 160, 100, "切替", () => {
      flip();
      t.setText(get() ? "ON" : "OFF");
    }, { color: 0x33475f });
  }
}
