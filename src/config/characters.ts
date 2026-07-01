// Character definitions (§15). Characters differ in hitbox, visual size,
// input sensitivity and starting weapons.

import type { WeaponId } from "./weapons";

export interface WeaponGrant {
  id: WeaponId;
  level: number;
}

export type BodyShape = "circle" | "box" | "triangle" | "custom";

export interface CharacterConfig {
  id: string;
  displayName: string;
  bodyShape: BodyShape;
  color: number;
  visualSize: number;
  hitboxRadius: number;
  inputSensitivity: number;
  startingWeapons: WeaponGrant[];
  unlockCumulativeScore: number;
  coinCost: number;
  rarity: "common" | "rare" | "epic";
  pros: string;
  cons: string;
}

export const DEFAULT_CHARACTER_ID = "DEFAULT_LOCKER";

export const CHARACTERS: CharacterConfig[] = [
  {
    id: "DEFAULT_LOCKER",
    displayName: "カケヌケ",
    bodyShape: "triangle",
    color: 0xffffff,
    visualSize: 52,
    hitboxRadius: 16,
    inputSensitivity: 1.0,
    startingWeapons: [{ id: "STANDARD_SHOT", level: 1 }],
    unlockCumulativeScore: 0,
    coinCost: 0,
    rarity: "common",
    pros: "小さい当たり判定・練習向け",
    cons: "標準ショットのみ",
  },
  {
    id: "RIFLE_UNIT",
    displayName: "ライフル",
    bodyShape: "box",
    color: 0x9fe8ff,
    visualSize: 54,
    hitboxRadius: 18,
    inputSensitivity: 1.0,
    startingWeapons: [{ id: "STANDARD_SHOT", level: 3 }],
    unlockCumulativeScore: 0,
    coinCost: 120,
    rarity: "common",
    pros: "ボスに強い連射",
    cons: "横が弱い",
  },
  {
    id: "WIDE_BEAST",
    displayName: "ワイドビースト",
    bodyShape: "box",
    color: 0xbdf0c0,
    visualSize: 58,
    hitboxRadius: 20,
    inputSensitivity: 1.0,
    startingWeapons: [
      { id: "STANDARD_SHOT", level: 1 },
      { id: "WIDE_SHOT", level: 2 },
    ],
    unlockCumulativeScore: 0,
    coinCost: 150,
    rarity: "common",
    pros: "雑魚に強い",
    cons: "単体火力低め",
  },
  {
    id: "WAR_DRONE",
    displayName: "ウォードローン",
    bodyShape: "triangle",
    color: 0x8fd0ff,
    visualSize: 56,
    hitboxRadius: 18,
    inputSensitivity: 1.1,
    startingWeapons: [
      { id: "STANDARD_SHOT", level: 1 },
      { id: "TWIN_SHOT", level: 4 },
    ],
    unlockCumulativeScore: 5000,
    coinCost: 200,
    rarity: "rare",
    pros: "前方火力",
    cons: "発射間隔の隙",
  },
  {
    id: "ROCKET_UNIT",
    displayName: "ロケットユニット",
    bodyShape: "box",
    color: 0xff9a5a,
    visualSize: 60,
    hitboxRadius: 22,
    inputSensitivity: 0.95,
    startingWeapons: [
      { id: "STANDARD_SHOT", level: 1 },
      { id: "ROCKET", level: 2 },
    ],
    unlockCumulativeScore: 5000,
    coinCost: 220,
    rarity: "rare",
    pros: "ボス火力",
    cons: "爆風で視認性低下",
  },
  {
    id: "HOMING_HOPPER",
    displayName: "ホーミングホッパー",
    bodyShape: "triangle",
    color: 0xc59fff,
    visualSize: 54,
    hitboxRadius: 18,
    inputSensitivity: 1.05,
    startingWeapons: [
      { id: "STANDARD_SHOT", level: 1 },
      { id: "HOMING_SHOT", level: 2 },
    ],
    unlockCumulativeScore: 20000,
    coinCost: 240,
    rarity: "rare",
    pros: "横・後方処理",
    cons: "低火力",
  },
  {
    id: "GUARD_ORBITER",
    displayName: "ガードオービター",
    bodyShape: "circle",
    color: 0xffd24a,
    visualSize: 58,
    hitboxRadius: 20,
    inputSensitivity: 1.0,
    startingWeapons: [
      { id: "STANDARD_SHOT", level: 1 },
      { id: "GUARD_BIT", level: 2 },
    ],
    unlockCumulativeScore: 20000,
    coinCost: 260,
    rarity: "epic",
    pros: "接近に強い",
    cons: "遠距離火力不足",
  },
  {
    id: "SUPPORT_DRONE",
    displayName: "サポートドローン",
    bodyShape: "circle",
    color: 0xb0ffb0,
    visualSize: 56,
    hitboxRadius: 19,
    inputSensitivity: 1.0,
    startingWeapons: [
      { id: "STANDARD_SHOT", level: 1 },
      { id: "SUPPORTER", level: 1 },
    ],
    unlockCumulativeScore: 80000,
    coinCost: 300,
    rarity: "epic",
    pros: "汎用",
    cons: "高コスト",
  },
];

export function getCharacter(id: string): CharacterConfig {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
