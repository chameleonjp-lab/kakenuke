// Boot: load save data (already loaded via singleton) and jump to Title.

import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create(): void {
    this.scene.start("Title");
  }
}
