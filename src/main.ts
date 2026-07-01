// Entry point: configure Phaser for a portrait, responsive 1080×1920 canvas.

import Phaser from "phaser";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from "./config/progression";
import { BootScene } from "./game/scenes/BootScene";
import { TitleScene } from "./game/scenes/TitleScene";
import { ModeSelectScene } from "./game/scenes/ModeSelectScene";
import { CharacterSelectScene } from "./game/scenes/CharacterSelectScene";
import { SettingsScene } from "./game/scenes/SettingsScene";
import { GameScene } from "./game/GameScene";
import { ResultScene } from "./game/scenes/ResultScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#05060a",
  width: LOGICAL_WIDTH,
  height: LOGICAL_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    powerPreference: "high-performance",
  },
  fps: {
    target: 60,
    min: 30,
  },
  scene: [
    BootScene,
    TitleScene,
    ModeSelectScene,
    CharacterSelectScene,
    SettingsScene,
    GameScene,
    ResultScene,
  ],
};

const game = new Phaser.Game(config);
// Exposed for debugging / automated smoke tests.
(window as unknown as { __game: Phaser.Game }).__game = game;
