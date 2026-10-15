// Weapon data (01-gdd §6). Only a frozen JSON literal: no functions, no imports.
// S1 only ships spore_shot (01 §6.1); the other four weapons are declared with the
// same shape so the structure is reserved, but their `levels`/`evolved` payloads are
// filled in S2 (see 07 backlog T4 scope). ids use 01 §15.5 English ids.
//
// Each level follows the shape used by 03 §4:
//   { damage, cooldown, count, pierce, speed, knockback, life }
// `life` is the projectile lifetime in seconds (01 §6.1: 1.2s for spore_shot);
// `evolvesWith` points to the passive id that unlocks the evolution (01 §7).
export const WEAPONS = Object.freeze({
  spore_shot: Object.freeze({
    name: '孢子弹',
    index: 0,
    evolvesWith: 'cooldown',
    evolution: 'spore_storm',
    // 01 §6.1 五档：伤害/冷却/发数/穿透/弹速/击退（life=飞行寿命 1.2 秒）
    levels: Object.freeze([
      Object.freeze({ damage: 10, cooldown: 1.0, count: 1, pierce: 1, speed: 420, knockback: 10, life: 1.2 }),
      Object.freeze({ damage: 10, cooldown: 1.0, count: 2, pierce: 1, speed: 420, knockback: 10, life: 1.2 }),
      Object.freeze({ damage: 15, cooldown: 1.0, count: 2, pierce: 1, speed: 420, knockback: 10, life: 1.2 }),
      Object.freeze({ damage: 15, cooldown: 0.8, count: 2, pierce: 2, speed: 420, knockback: 10, life: 1.2 }),
      Object.freeze({ damage: 15, cooldown: 0.8, count: 3, pierce: 2, speed: 420, knockback: 10, life: 1.2 }),
    ]),
    // 进化：孢子风暴（01 §6.1）
    evolved: Object.freeze({ name: '孢子风暴', damage: 22, cooldown: 0.6, count: 5, pierce: 3, speed: 480, knockback: 15, life: 1.2 }),
    // 扇形散射间隔（01 §6.1：多发时以 10° 间隔）
    spreadDeg: 10,
  }),
  // 以下武器 S1 不实现，仅保留结构占位，levels/evolved 由 S2 按 01 §6.2–§6.5 填充。
  // @placeholder S1 占位：数值待 S2 落地。
  umbrella_blades: Object.freeze({ name: '菌伞旋刃', index: 1, evolvesWith: 'area', evolution: 'umbrella_canopy', levels: Object.freeze([]), evolved: null }),
  dew_ring: Object.freeze({ name: '露珠环', index: 2, evolvesWith: 'regen', evolution: 'dawn_dew_ward', levels: Object.freeze([]), evolved: null }),
  raindrop: Object.freeze({ name: '雨滴坠击', index: 3, evolvesWith: 'might', evolution: 'downpour', levels: Object.freeze([]), evolved: null }),
  leaf_boomerang: Object.freeze({ name: '落叶回旋镖', index: 4, evolvesWith: 'speed', evolution: 'autumn_leaf_dance', levels: Object.freeze([]), evolved: null }),
})
