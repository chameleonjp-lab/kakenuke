// Persistent save data via localStorage (§19.2).

import { ECONOMY } from "../../config/progression";

export interface Settings {
  volume: number;
  sensitivity: number;
  vibration: boolean;
}

const KEYS = {
  best: "tl_clone_bestScore",
  totalCoins: "tl_clone_totalCoins",
  cumulativeScore: "tl_clone_cumulativeScore",
  hardcoreUnlocked: "tl_clone_hardcoreUnlocked",
  settings: "tl_clone_settings",
} as const;

function readNumber(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function writeValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — run in-memory */
  }
}

export class SaveData {
  bestScore = 0;
  totalCoins = 0;
  cumulativeScore = 0;
  hardcoreUnlocked = false;
  settings: Settings = { volume: 0.6, sensitivity: 1.0, vibration: true };

  constructor() {
    this.load();
  }

  load(): void {
    this.bestScore = readNumber(KEYS.best, 0);
    this.totalCoins = readNumber(KEYS.totalCoins, 0);
    this.cumulativeScore = readNumber(KEYS.cumulativeScore, 0);
    this.hardcoreUnlocked =
      readNumber(KEYS.hardcoreUnlocked, 0) === 1 ||
      this.bestScore >= ECONOMY.HARDCORE_UNLOCK_SCORE;
    try {
      const raw = localStorage.getItem(KEYS.settings);
      if (raw) this.settings = { ...this.settings, ...JSON.parse(raw) };
    } catch {
      /* ignore malformed settings */
    }
  }

  saveSettings(): void {
    writeValue(KEYS.settings, JSON.stringify(this.settings));
  }

  /** Record the outcome of a finished run and persist. Returns true on new best. */
  recordRun(score: number, coinsEarned: number): boolean {
    let newBest = false;
    if (score > this.bestScore) {
      this.bestScore = score;
      newBest = true;
    }
    this.totalCoins += coinsEarned;
    this.cumulativeScore += score;
    if (this.bestScore >= ECONOMY.HARDCORE_UNLOCK_SCORE) {
      this.hardcoreUnlocked = true;
    }
    writeValue(KEYS.best, String(this.bestScore));
    writeValue(KEYS.totalCoins, String(this.totalCoins));
    writeValue(KEYS.cumulativeScore, String(this.cumulativeScore));
    writeValue(KEYS.hardcoreUnlocked, this.hardcoreUnlocked ? "1" : "0");
    return newBest;
  }

  spendCoins(amount: number): boolean {
    if (this.totalCoins < amount) return false;
    this.totalCoins -= amount;
    writeValue(KEYS.totalCoins, String(this.totalCoins));
    return true;
  }

  addCoins(amount: number): void {
    this.totalCoins += amount;
    writeValue(KEYS.totalCoins, String(this.totalCoins));
  }

  reset(): void {
    for (const k of Object.values(KEYS)) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
    this.bestScore = 0;
    this.totalCoins = 0;
    this.cumulativeScore = 0;
    this.hardcoreUnlocked = false;
    this.settings = { volume: 0.6, sensitivity: 1.0, vibration: true };
  }
}

// Single shared instance for the whole app.
export const save = new SaveData();
