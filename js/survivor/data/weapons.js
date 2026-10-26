// Weapon data (01-gdd §6). Only a frozen JSON literal: no functions, no imports.
// All five weapons ship Lv1–Lv5 (08 L1, K8/L9) plus the evolved tier (S3 B2, 01 §6 进化行,
// §8.3). ids use 01 §15.5 English ids.
//
// Level shape differs per weapon (see each entry); spore_shot uses
//   { damage, cooldown, count, pierce, speed, knockback, life }
// `life` is the projectile lifetime in seconds (01 §6.1: 1.2s for spore_shot);
// `evolvesWith` points to the passive id that unlocks the evolution (01 §7); `evolution` is the
// evolved form's id (strings card_evolve_<weapon id>). `evolved` has the same shape as a level
// row plus `name`; it replaces Lv5 once chosen (01 §8.3). Evolution-only behaviour flags:
//   spore_shot.evolved.multiTarget — 每发锁定最近的不同敌人（01 §6.1 孢子风暴）
//   leaf_boomerang.evolved.radial  — 以 360°/片数 间隔向四周掷出、不依赖朝向（01 §6.5 秋风叶舞）
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
    evolved: Object.freeze({ name: '孢子风暴', damage: 22, cooldown: 0.6, count: 5, pierce: 3, speed: 480, knockback: 15, life: 1.2, multiTarget: true }),
    // 扇形散射间隔（01 §6.1：多发时以 10° 间隔）
    spreadDeg: 10,
  }),
  // 菌伞旋刃（01 §6.2）：常驻环绕，无冷却。每档：伤害/片数/旋转半径/角速度(°/秒)/
  // 单敌受击间隔(秒，受 cooldown 影响)/击退。bladeRadius = 菌伞片碰撞半径（× area）。
  umbrella_blades: Object.freeze({
    name: '菌伞旋刃',
    index: 1,
    evolvesWith: 'area',
    evolution: 'umbrella_canopy',
    bladeRadius: 16,
    levels: Object.freeze([
      Object.freeze({ damage: 8, count: 2, orbitRadius: 70, angularSpeedDeg: 200, hitInterval: 0.5, knockback: 20 }),
      Object.freeze({ damage: 12, count: 2, orbitRadius: 70, angularSpeedDeg: 200, hitInterval: 0.5, knockback: 20 }),
      Object.freeze({ damage: 12, count: 3, orbitRadius: 70, angularSpeedDeg: 200, hitInterval: 0.5, knockback: 20 }),
      Object.freeze({ damage: 12, count: 3, orbitRadius: 90, angularSpeedDeg: 220, hitInterval: 0.5, knockback: 20 }),
      Object.freeze({ damage: 16, count: 4, orbitRadius: 90, angularSpeedDeg: 220, hitInterval: 0.5, knockback: 25 }),
    ]),
    // 进化：菌伞华盖（01 §6.2）
    evolved: Object.freeze({ name: '菌伞华盖', damage: 24, count: 6, orbitRadius: 110, angularSpeedDeg: 240, hitInterval: 0.4, knockback: 40 }),
  }),
  // 露珠环（01 §6.3）：每档：伤害/半径/伤害间隔(秒，受 cooldown 影响)/圈内减速比例。
  // 无击退；多个减速来源取最大值不叠加。
  // 08 K17（2026-09-11 第二轮）：半径 60/75/75/90/90 → 80/95/95/115/115。
  dew_ring: Object.freeze({
    name: '露珠环',
    index: 2,
    evolvesWith: 'regen',
    evolution: 'dawn_dew_ward',
    levels: Object.freeze([
      Object.freeze({ damage: 4, radius: 80, interval: 0.8, slow: 0.15 }),
      Object.freeze({ damage: 4, radius: 95, interval: 0.8, slow: 0.15 }),
      Object.freeze({ damage: 7, radius: 95, interval: 0.8, slow: 0.15 }),
      Object.freeze({ damage: 7, radius: 115, interval: 0.8, slow: 0.25 }),
      Object.freeze({ damage: 10, radius: 115, interval: 0.6, slow: 0.25 }),
    ]),
    // 进化：晨露结界（01 §6.3）
    evolved: Object.freeze({ name: '晨露结界', damage: 16, radius: 145, interval: 0.5, slow: 0.4 }),
  }),
  // 雨滴坠击（01 §6.4，08 K8/L9 提前到 S2）：每档：伤害/落点数/落点半径(× area)/冷却/击退。
  // range = 选敌范围 400；warnSec = 落点阴影 0.4 秒后结算；无敌人时落在角色周围
  // fallbackMin–fallbackMax（150–300）的随机位置。落点走 zones 池（limits.pools.raindropZones）。
  raindrop: Object.freeze({
    name: '雨滴坠击',
    index: 3,
    evolvesWith: 'might',
    evolution: 'downpour',
    range: 400,
    warnSec: 0.4,
    fallbackMin: 150,
    fallbackMax: 300,
    levels: Object.freeze([
      Object.freeze({ damage: 22, count: 2, radius: 45, cooldown: 2.2, knockback: 15 }),
      Object.freeze({ damage: 22, count: 3, radius: 45, cooldown: 2.2, knockback: 15 }),
      Object.freeze({ damage: 32, count: 3, radius: 45, cooldown: 2.2, knockback: 15 }),
      Object.freeze({ damage: 32, count: 3, radius: 60, cooldown: 2.2, knockback: 15 }),
      Object.freeze({ damage: 32, count: 5, radius: 60, cooldown: 1.8, knockback: 15 }),
    ]),
    // 进化：骤雨（01 §6.4）
    evolved: Object.freeze({ name: '骤雨', damage: 45, count: 8, radius: 70, cooldown: 1.4, knockback: 20 }),
  }),
  // 落叶回旋镖（01 §6.5，08 K8/L9 提前到 S2）：每档：伤害/片数/最远距离(× area)/飞行速度/冷却/击退。
  // 沿角色朝向掷出，多片以 spreadDeg=25° 扇形散开；无限穿透，去程、回程对同一敌人各结算一次；
  // 回程追角色当前位置，进入 catchRadius（角色身边）回收。leafRadius = 落叶碰撞半径、
  // maxLife = 安全寿命（秒，防止永远追不上时常驻；01 未规定，开发取值）。
  // 08 K17（2026-09-11 第二轮）：最远距离 220/220/220/280/280 → 280/280/280/340/340。
  leaf_boomerang: Object.freeze({
    name: '落叶回旋镖',
    index: 4,
    evolvesWith: 'speed',
    evolution: 'autumn_leaf_dance',
    spreadDeg: 25,
    leafRadius: 10,
    catchRadius: 24,
    maxLife: 6,
    levels: Object.freeze([
      Object.freeze({ damage: 12, count: 1, maxDistance: 280, speed: 360, cooldown: 1.6, knockback: 25 }),
      Object.freeze({ damage: 18, count: 1, maxDistance: 280, speed: 360, cooldown: 1.6, knockback: 25 }),
      Object.freeze({ damage: 18, count: 2, maxDistance: 280, speed: 360, cooldown: 1.6, knockback: 25 }),
      Object.freeze({ damage: 18, count: 2, maxDistance: 340, speed: 420, cooldown: 1.6, knockback: 25 }),
      Object.freeze({ damage: 24, count: 3, maxDistance: 340, speed: 420, cooldown: 1.6, knockback: 30 }),
    ]),
    // 进化：秋风叶舞（01 §6.5）：6 片以 60° 间隔向四周掷出（radial）
    evolved: Object.freeze({ name: '秋风叶舞', damage: 36, count: 6, maxDistance: 360, speed: 420, cooldown: 1.4, knockback: 35, radial: true }),
  }),
})
