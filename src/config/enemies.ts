// Enemy definitions (§10). Behaviour is keyed off color, per the design:
//   black  = straight, orange = homing, purple = weave / fast,
//   green  = coin drop, blue = weapon crate drop.

export type EnemyBehavior =
  | "straight"
  | "homing"
  | "weave"
  | "fast"
  | "stationary"
  | "jump"
  | "turret_v"
  | "turret_h"
  | "tank"
  | "heli"
  | "infantry";

export type EnemyColor = "black" | "orange" | "purple" | "green" | "blue";

export interface EnemyDef {
  id: string;
  color: EnemyColor;
  hp: number;
  speed: number; // relative multiplier, world units scaled in Enemy.ts
  behavior: EnemyBehavior;
  radius: number; // hit radius
  width: number; // visual
  height: number;
  shape: "penguin" | "quad" | "bird" | "frog" | "snake" | "car" | "turret" | "tank" | "heli" | "infantry" | "block";
  shoots?: boolean;
  airborne?: boolean; // only hit by homing/missile-type weapons
  score: number;
}

const BASE_SPEED = 90; // px/sec at speed=1.0 in scaled time

export const ENEMY_BASE_SPEED = BASE_SPEED;

export const ENEMIES: Record<string, EnemyDef> = {
  PENGUIN_BLACK: { id: "PENGUIN_BLACK", color: "black", hp: 1, speed: 0.6, behavior: "straight", radius: 20, width: 44, height: 52, shape: "penguin", score: 20 },
  PENGUIN_ORANGE: { id: "PENGUIN_ORANGE", color: "orange", hp: 3, speed: 0.55, behavior: "homing", radius: 20, width: 44, height: 52, shape: "penguin", score: 40 },
  PENGUIN_PURPLE: { id: "PENGUIN_PURPLE", color: "purple", hp: 1, speed: 1.0, behavior: "weave", radius: 20, width: 44, height: 52, shape: "penguin", score: 30 },
  DOG_BLACK: { id: "DOG_BLACK", color: "black", hp: 1, speed: 0.7, behavior: "straight", radius: 24, width: 60, height: 44, shape: "quad", score: 25 },
  DOG_ORANGE: { id: "DOG_ORANGE", color: "orange", hp: 1, speed: 0.85, behavior: "homing", radius: 24, width: 60, height: 44, shape: "quad", score: 35 },
  LION_BLACK: { id: "LION_BLACK", color: "black", hp: 3, speed: 0.9, behavior: "straight", radius: 30, width: 74, height: 56, shape: "quad", score: 60 },
  LION_ORANGE: { id: "LION_ORANGE", color: "orange", hp: 3, speed: 0.9, behavior: "homing", radius: 30, width: 74, height: 56, shape: "quad", score: 80 },
  BIRD_BLACK: { id: "BIRD_BLACK", color: "black", hp: 1, speed: 0.75, behavior: "straight", radius: 16, width: 40, height: 30, shape: "bird", airborne: true, score: 25 },
  BIRD_ORANGE: { id: "BIRD_ORANGE", color: "orange", hp: 1, speed: 0.75, behavior: "homing", radius: 16, width: 40, height: 30, shape: "bird", airborne: true, score: 35 },
  FROG_BLACK: { id: "FROG_BLACK", color: "black", hp: 1, speed: 1.2, behavior: "jump", radius: 20, width: 46, height: 40, shape: "frog", score: 30 },
  FROG_ORANGE: { id: "FROG_ORANGE", color: "orange", hp: 3, speed: 1.2, behavior: "jump", radius: 20, width: 46, height: 40, shape: "frog", score: 55 },
  FROG_PURPLE: { id: "FROG_PURPLE", color: "purple", hp: 1, speed: 1.4, behavior: "jump", radius: 20, width: 46, height: 40, shape: "frog", score: 40 },
  SNAKE_BLACK: { id: "SNAKE_BLACK", color: "black", hp: 2, speed: 0.8, behavior: "straight", radius: 22, width: 40, height: 90, shape: "snake", score: 45 },
  SNAKE_PURPLE: { id: "SNAKE_PURPLE", color: "purple", hp: 2, speed: 1.5, behavior: "fast", radius: 22, width: 40, height: 90, shape: "snake", score: 55 },
  DINO_BLACK: { id: "DINO_BLACK", color: "black", hp: 2, speed: 0.9, behavior: "straight", radius: 32, width: 70, height: 80, shape: "quad", score: 55 },
  DINO_ORANGE: { id: "DINO_ORANGE", color: "orange", hp: 2, speed: 0.9, behavior: "homing", radius: 32, width: 70, height: 80, shape: "quad", score: 70 },
  MAMMOTH_SMALL: { id: "MAMMOTH_SMALL", color: "black", hp: 4, speed: 0.1, behavior: "stationary", radius: 40, width: 96, height: 90, shape: "block", score: 70 },
  MAMMOTH_BIG: { id: "MAMMOTH_BIG", color: "black", hp: 8, speed: 0.05, behavior: "stationary", radius: 54, width: 130, height: 120, shape: "block", score: 120 },
  BEAR_BLACK: { id: "BEAR_BLACK", color: "black", hp: 4, speed: 1.0, behavior: "straight", radius: 34, width: 78, height: 78, shape: "quad", score: 80 },
  BEAR_PURPLE: { id: "BEAR_PURPLE", color: "purple", hp: 4, speed: 1.2, behavior: "weave", radius: 34, width: 78, height: 78, shape: "quad", score: 95 },
  CAR_BLACK: { id: "CAR_BLACK", color: "black", hp: 2, speed: 1.1, behavior: "straight", radius: 30, width: 84, height: 54, shape: "car", score: 50 },
  CAR_PURPLE: { id: "CAR_PURPLE", color: "purple", hp: 2, speed: 1.1, behavior: "weave", radius: 30, width: 84, height: 54, shape: "car", score: 60 },
  TRAILER: { id: "TRAILER", color: "black", hp: 5, speed: 1.8, behavior: "fast", radius: 34, width: 70, height: 150, shape: "car", score: 90 },
  TURRET_VERTICAL: { id: "TURRET_VERTICAL", color: "black", hp: 5, speed: 0, behavior: "turret_v", radius: 30, width: 64, height: 64, shape: "turret", shoots: true, score: 90 },
  TURRET_HORIZONTAL: { id: "TURRET_HORIZONTAL", color: "black", hp: 3, speed: 0, behavior: "turret_h", radius: 30, width: 64, height: 64, shape: "turret", shoots: true, score: 80 },
  TANK_BLACK: { id: "TANK_BLACK", color: "black", hp: 6, speed: 0.8, behavior: "tank", radius: 36, width: 90, height: 80, shape: "tank", shoots: true, score: 120 },
  TANK_ORANGE: { id: "TANK_ORANGE", color: "orange", hp: 6, speed: 0.8, behavior: "tank", radius: 36, width: 90, height: 80, shape: "tank", shoots: true, score: 140 },
  HELI_BLACK: { id: "HELI_BLACK", color: "black", hp: 3, speed: 1.0, behavior: "heli", radius: 30, width: 90, height: 60, shape: "heli", shoots: true, airborne: true, score: 110 },
  HELI_ORANGE: { id: "HELI_ORANGE", color: "orange", hp: 3, speed: 1.0, behavior: "heli", radius: 30, width: 90, height: 60, shape: "heli", shoots: true, airborne: true, score: 130 },
  INFANTRY: { id: "INFANTRY", color: "black", hp: 1, speed: 0.5, behavior: "infantry", radius: 16, width: 34, height: 44, shape: "infantry", shoots: true, score: 25 },
};

export const COLOR_HEX: Record<EnemyColor, number> = {
  black: 0x2b2f38,
  orange: 0xff8a3d,
  purple: 0xa24bd6,
  green: 0x3ddc84,
  blue: 0x4aa8ff,
};

// Pools describing which enemies are eligible at a given score (§12.2).
export function enemyPoolForScore(score: number): string[] {
  const pool: string[] = ["PENGUIN_BLACK", "DOG_BLACK", "BIRD_BLACK", "FROG_BLACK", "SNAKE_BLACK", "MAMMOTH_SMALL"];
  if (score >= 500) pool.push("LION_BLACK", "DINO_BLACK", "PENGUIN_ORANGE", "DOG_ORANGE");
  if (score >= 1500) pool.push("BIRD_ORANGE", "LION_ORANGE", "DINO_ORANGE", "FROG_ORANGE", "INFANTRY");
  if (score >= 3000) pool.push("PENGUIN_PURPLE", "FROG_PURPLE", "SNAKE_PURPLE", "CAR_BLACK", "CAR_PURPLE", "TURRET_VERTICAL", "TURRET_HORIZONTAL", "MAMMOTH_BIG");
  if (score >= 6000) pool.push("BEAR_BLACK", "BEAR_PURPLE", "TANK_BLACK", "TANK_ORANGE", "HELI_BLACK", "HELI_ORANGE", "TRAILER");
  return pool;
}
