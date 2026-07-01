// Weapon definitions (§9). Weapons never decrease; picking up a duplicate
// raises its level and level scales the numeric getters below.

export type WeaponId =
  | "STANDARD_SHOT"
  | "TWIN_SHOT"
  | "WIDE_SHOT"
  | "SIDE_SHOT"
  | "HOMING_SHOT"
  | "ROCKET"
  | "BEAM"
  | "MINE_BOT"
  | "ICE_CANNON"
  | "MISSILE"
  | "LINE"
  | "GUARD_BIT"
  | "SUPPORTER";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  color: number;
  // base cooldown in scaled seconds between shots
  cooldown: number;
  damage: number;
  // spawn weight for random crates
  weightNormal: number;
  weightHardcore: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  STANDARD_SHOT: {
    id: "STANDARD_SHOT",
    name: "STANDARD",
    color: 0x9fe8ff,
    cooldown: 0.32,
    damage: 1,
    weightNormal: 0,
    weightHardcore: 0,
  },
  TWIN_SHOT: {
    id: "TWIN_SHOT",
    name: "TWIN",
    color: 0x8fd0ff,
    cooldown: 0.3,
    damage: 1,
    weightNormal: 18,
    weightHardcore: 14,
  },
  WIDE_SHOT: {
    id: "WIDE_SHOT",
    name: "WIDE",
    color: 0xbdf0c0,
    cooldown: 0.42,
    damage: 1,
    weightNormal: 16,
    weightHardcore: 12,
  },
  SIDE_SHOT: {
    id: "SIDE_SHOT",
    name: "SIDE",
    color: 0xffe08a,
    cooldown: 0.5,
    damage: 1,
    weightNormal: 12,
    weightHardcore: 10,
  },
  HOMING_SHOT: {
    id: "HOMING_SHOT",
    name: "HOMING",
    color: 0xc59fff,
    cooldown: 0.55,
    damage: 1,
    weightNormal: 10,
    weightHardcore: 9,
  },
  ROCKET: {
    id: "ROCKET",
    name: "ROCKET",
    color: 0xff9a5a,
    cooldown: 0.85,
    damage: 4,
    weightNormal: 7,
    weightHardcore: 8,
  },
  BEAM: {
    id: "BEAM",
    name: "BEAM",
    color: 0x7affe8,
    cooldown: 1.2,
    damage: 2,
    weightNormal: 5,
    weightHardcore: 6,
  },
  MINE_BOT: {
    id: "MINE_BOT",
    name: "MINE BOT",
    color: 0xff7a7a,
    cooldown: 1.4,
    damage: 3,
    weightNormal: 4,
    weightHardcore: 5,
  },
  ICE_CANNON: {
    id: "ICE_CANNON",
    name: "ICE CANNON",
    color: 0x9fe0ff,
    cooldown: 0.7,
    damage: 0,
    weightNormal: 4,
    weightHardcore: 5,
  },
  MISSILE: {
    id: "MISSILE",
    name: "MISSILE",
    color: 0xffb15a,
    cooldown: 0.95,
    damage: 3,
    weightNormal: 4,
    weightHardcore: 5,
  },
  LINE: {
    id: "LINE",
    name: "LINE",
    color: 0xa0f0ff,
    cooldown: 0.5,
    damage: 2,
    weightNormal: 5,
    weightHardcore: 5,
  },
  GUARD_BIT: {
    id: "GUARD_BIT",
    name: "GUARD BIT",
    color: 0xffd24a,
    cooldown: 0.6,
    damage: 2,
    weightNormal: 3,
    weightHardcore: 4,
  },
  SUPPORTER: {
    id: "SUPPORTER",
    name: "SUPPORTER",
    color: 0xb0ffb0,
    cooldown: 0.9,
    damage: 1,
    weightNormal: 1,
    weightHardcore: 2,
  },
};

// Weapons that can appear in random crates (STANDARD is never dropped).
export const DROPPABLE_WEAPONS: WeaponId[] = (
  Object.keys(WEAPONS) as WeaponId[]
).filter((id) => WEAPONS[id].weightNormal > 0);

export function pickRandomWeapon(
  rng: () => number,
  hardcore: boolean
): WeaponId {
  const total = DROPPABLE_WEAPONS.reduce(
    (s, id) => s + (hardcore ? WEAPONS[id].weightHardcore : WEAPONS[id].weightNormal),
    0
  );
  let r = rng() * total;
  for (const id of DROPPABLE_WEAPONS) {
    const w = hardcore ? WEAPONS[id].weightHardcore : WEAPONS[id].weightNormal;
    r -= w;
    if (r <= 0) return id;
  }
  return DROPPABLE_WEAPONS[0];
}
