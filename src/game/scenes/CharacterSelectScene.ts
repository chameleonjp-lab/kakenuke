// Character select (§15). The default character is free; others cost coins to
// field for the run. A POD roll (§15.5) offers 3 random unlocked candidates.

import Phaser from "phaser";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, ECONOMY, type GameMode } from "../../config/progression";
import { CHARACTERS, DEFAULT_CHARACTER_ID, type CharacterConfig } from "../../config/characters";
import { save } from "../economy/SaveData";
import { readPlayerName } from "../platform";
import { button, label } from "../ui/UiKit";

export class CharacterSelectScene extends Phaser.Scene {
  private mode: GameMode = "normal";
  private overlay?: Phaser.GameObjects.Container;

  constructor() {
    super("CharacterSelect");
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? "normal";
  }

  private available(): CharacterConfig[] {
    return CHARACTERS.filter(
      (c) => c.unlockCumulativeScore <= save.cumulativeScore
    );
  }

  create(): void {
    if (!readPlayerName()) {
      this.scene.start("Title");
      return;
    }
    this.cameras.main.setBackgroundColor("#05060a");
    const cx = LOGICAL_WIDTH / 2;

    label(this, cx, 150, "CHARACTER", 78, "#ffffff");
    label(this, cx, 240, `${this.mode.toUpperCase()}  /  ◇ ${save.totalCoins}`, 36, "#3ddc84");

    // POD roll
    button(
      this,
      cx,
      360,
      620,
      110,
      "POD ROLL (◇100)",
      () => this.rollPod(),
      {
        color: 0x5a3f8a,
        disabled: save.totalCoins < ECONOMY.POD_COST,
        sub: "ランダム3体から選ぶ",
      }
    );

    const list = this.available();
    let y = 540;
    const step = Math.min(150, (LOGICAL_HEIGHT - 720) / list.length);
    for (const c of list) {
      const affordable = c.coinCost === 0 || save.totalCoins >= c.coinCost;
      const isDefault = c.id === DEFAULT_CHARACTER_ID;
      const sub =
        (isDefault ? "無料 / " : `◇${c.coinCost} / `) + `${c.pros}`;
      button(
        this,
        cx,
        y,
        900,
        step - 18,
        c.displayName,
        () => this.choose(c),
        { color: isDefault ? 0x1f6f43 : 0x2f4a6b, disabled: !affordable, sub }
      );
      y += step;
    }

    button(this, cx, LOGICAL_HEIGHT - 90, 460, 100, "← BACK", () => {
      this.scene.start("ModeSelect");
    }, { color: 0x33475f });
  }

  private choose(c: CharacterConfig): void {
    if (c.coinCost > 0) {
      if (!save.spendCoins(c.coinCost)) return;
    }
    this.startRun(c.id);
  }

  private startRun(characterId: string): void {
    this.scene.start("Game", { mode: this.mode, characterId });
  }

  private rollPod(): void {
    if (!save.spendCoins(ECONOMY.POD_COST)) return;
    const pool = this.available();
    const picks: CharacterConfig[] = [];
    const copy = [...pool];
    for (let i = 0; i < 3 && copy.length; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      picks.push(copy.splice(idx, 1)[0]);
    }
    this.showPodOverlay(picks);
  }

  private showPodOverlay(picks: CharacterConfig[]): void {
    this.overlay?.destroy();
    const cx = LOGICAL_WIDTH / 2;
    const cy = LOGICAL_HEIGHT / 2;
    const bg = this.add.rectangle(cx, cy, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x000000, 0.8);
    const title = label(this, cx, cy - 420, "CHOOSE ONE", 70, "#ffffff");
    const items: Phaser.GameObjects.GameObject[] = [bg, title];
    let y = cy - 220;
    for (const c of picks) {
      const b = button(this, cx, y, 760, 150, c.displayName, () => this.startRun(c.id), {
        color: 0x2f4a6b,
        sub: `${c.pros} / ${c.cons}`,
      });
      items.push(b);
      y += 200;
    }
    this.overlay = this.add.container(0, 0, items);
    this.overlay.setDepth(300);
  }
}
