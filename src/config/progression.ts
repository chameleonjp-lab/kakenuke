// Global tuning constants and progression / difficulty curve.
// All gameplay numbers live here so balancing does not require touching logic.

export const LOGICAL_WIDTH = 1080;
export const LOGICAL_HEIGHT = 1920;

// --- Time control (see requirements §5.2) ---
export const TIME = {
  DEADZONE_PX_PER_SEC: 8,
  REFERENCE_SPEED_PX_PER_SEC: 450,
  MAX_TIME_SCALE: 2.2,
  TIME_SCALE_SMOOTHING: 0.35,
  PLAYER_INPUT_SENSITIVITY: 1.0,
  MAX_PLAYER_DELTA_PER_FRAME: 70,
};

// --- Camera (§6.2) ---
export const CAMERA = {
  FOLLOW_LERP: 0.12,
  LOOKAHEAD: 0.35, // fraction of view height kept ahead of player
};

// --- Play area clamp (§6.3), fractions of view ---
export const PLAY_AREA = {
  HALF_WIDTH_FRACTION: 0.45,
  BOTTOM_FRACTION: 0.12,
  TOP_FRACTION: 0.82,
};

// --- Spawning / chunks (§12.1) ---
export const SPAWN = {
  CHUNK_HEIGHT: 900,
  DESPAWN_MARGIN: 2880,
  INITIAL_ENEMY_DENSITY: 4,
  MAX_ENEMY_DENSITY: 28,
};

// --- Deadline (§13.2) ---
export const DEADLINE = {
  NORMAL_BASE: 65,
  NORMAL_EXTRA: 30, // reaches 95 at score >= 10000
  HARDCORE_BASE: 90,
  HARDCORE_EXTRA: 40, // reaches 130 at score >= 10000
  HITBOX_GRACE: 10,
  CONTINUE_PUSHBACK: 0.65, // fraction of view height
};

// --- Scoring (§7) ---
export const SCORE = {
  DISTANCE_MULT: 10,
  HARDCORE_MULTIPLIER: 1.25,
};

// --- Economy / continue (§14) ---
export const ECONOMY = {
  CONTINUE_INVULN_SECONDS: 3,
  POD_COST: 100,
  CONTINUE_BASE_COST: 30,
  CONTINUE_COST_PER_10K: 40,
  HARDCORE_UNLOCK_SCORE: 10000,
};

export type GameMode = "normal" | "hardcore";

export interface DifficultyState {
  mode: GameMode;
  score: number;
  // 0..1 normalized progression used to interpolate density / speed
  t: number;
  enemyDensity: number;
  deadlineSpeed: number;
  scoreMultiplier: number;
  weaponCrateChanceMult: number;
  coinChanceMult: number;
  bossFirstScore: number;
}

// Hardcore modifiers (§12.3)
const HARDCORE = {
  deadlineMult: 1.35,
  densityMult: 1.4,
  crateMult: 0.75,
  coinMult: 1.2,
  bossFirstScore: 400,
};

export function computeDifficulty(mode: GameMode, score: number): DifficultyState {
  const t = Math.min(score / 10000, 1.0);
  const isHard = mode === "hardcore";

  let enemyDensity =
    SPAWN.INITIAL_ENEMY_DENSITY +
    (SPAWN.MAX_ENEMY_DENSITY - SPAWN.INITIAL_ENEMY_DENSITY) * t;

  let deadlineSpeed = isHard
    ? DEADLINE.HARDCORE_BASE + t * DEADLINE.HARDCORE_EXTRA
    : DEADLINE.NORMAL_BASE + t * DEADLINE.NORMAL_EXTRA;

  if (isHard) {
    enemyDensity *= HARDCORE.densityMult;
  }

  return {
    mode,
    score,
    t,
    enemyDensity,
    deadlineSpeed,
    scoreMultiplier: isHard ? SCORE.HARDCORE_MULTIPLIER : 1.0,
    weaponCrateChanceMult: isHard ? HARDCORE.crateMult : 1.0,
    coinChanceMult: isHard ? HARDCORE.coinMult : 1.0,
    bossFirstScore: isHard ? HARDCORE.bossFirstScore : 600,
  };
}

// Boss roster selection window by score (§11.1)
export function bossPoolForScore(score: number): string[] {
  if (score < 1500) return ["BOSS_MAMMOTH"];
  if (score < 3000) return ["BOSS_MAMMOTH", "BOSS_BEAR"];
  if (score < 6000) return ["BOSS_BEAR", "BOSS_GORILLA", "BOSS_DINO"];
  return ["BOSS_MAMMOTH", "BOSS_BEAR", "BOSS_GORILLA", "BOSS_DINO", "BOSS_INSECT"];
}
