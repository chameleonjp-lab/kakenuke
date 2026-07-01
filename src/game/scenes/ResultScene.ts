// Result screen (§16.2): score, best, coins, kills, weapons acquired, replay.

import Phaser from "phaser";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, type GameMode } from "../../config/progression";
import { save } from "../economy/SaveData";
import { button, label } from "../ui/UiKit";
import type { WeaponId } from "../../config/weapons";

interface ResultData {
  mode: GameMode;
  characterId: string;
  score: number;
  newBest: boolean;
  coins: number;
  kills: number;
  bossKills: number;
  distance: number;
  weapons: { id: WeaponId; name: string; level: number }[];
}

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultData;
  constructor() {
    super("Result");
  }
  init(data: ResultData): void {
    this.resultData = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#05060a");
    const cx = LOGICAL_WIDTH / 2;
    const d = this.resultData;

    label(this, cx, 180, "RESULT", 80, "#ffffff");

    if (d.newBest) {
      label(this, cx, 300, "★ NEW BEST ★", 50, "#ffd24a");
    }
    label(this, cx, 430, String(d.score), 150, "#ffffff");
    label(this, cx, 560, `BEST ${save.bestScore}`, 42, "#9fb2c8");

    const lines = [
      `到達距離   ${d.distance}`,
      `撃破数     ${d.kills}`,
      `ボス撃破   ${d.bossKills}`,
      `獲得コイン ◇${d.coins}`,
      `累計コイン ◇${save.totalCoins}`,
    ];
    label(this, cx, 780, lines.join("\n"), 40, "#c8d6e6");

    // weapons acquired
    label(this, cx, 1080, "WEAPONS", 44, "#7affe8");
    if (d.weapons.length === 0) {
      label(this, cx, 1150, "-", 36, "#66707f");
    } else {
      const wtext = d.weapons
        .map((w) => `${w.name} Lv${w.level}`)
        .join("   ");
      label(this, cx, 1170, wtext, 34, "#9fe8ff", false);
    }

    if (d.newBest && save.hardcoreUnlocked) {
      label(this, cx, 1280, "HARDCORE UNLOCKED!", 40, "#ff8a3d");
    }

    button(this, cx, 1500, 560, 130, "REPLAY", () => {
      this.scene.start("Game", { mode: d.mode, characterId: d.characterId });
    }, { color: 0x1f6f43 });

    button(this, cx, 1660, 560, 110, "CHARACTER", () => {
      this.scene.start("CharacterSelect", { mode: d.mode });
    }, { color: 0x2f4a6b });

    button(this, cx, LOGICAL_HEIGHT - 90, 460, 100, "TITLE", () => {
      this.scene.start("Title");
    }, { color: 0x33475f });
  }
}
