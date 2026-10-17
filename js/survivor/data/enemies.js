// Enemy data (01-gdd §9). Only a frozen JSON literal: no functions, no imports.
// ids use 01 §15.5 English ids. S2 ships gnat / beetle / moth / snail / sporeling;
// elite_beetle is data-only (its 5:00 event stays `optional: true`, 08 §1 可选).
// Each enemy carries the growth coefficients from 01 §9.1 so the spawner can scale
// hp/contact damage by the current whole minute m = floor(t / 60):
//   hp     = baseHp     × (1 + hpGrowthPerMin × m)
//   damage = baseDamage × (1 + damageGrowthPerMin × m)
// move speed and xp do not grow (01 §9.1).
//
// `behavior` selects the movement rule in Enemies.js:
//   chase  — straight-line tracking (gnat, beetle, snail)
//   sway   — tracking + perpendicular sway (moth: swayAmplitude / swayPeriod)
//   ranged — sporeling: approach while > approachRange, spit a mist bubble every
//            fireInterval while ≤ fireRange (bubble: speed / damage / life / radius)
//   charge — elite_beetle (not wired in S2)
const HP_GROWTH_PER_MIN = 0.15     // 01 §9.1 生命成长系数
const DAMAGE_GROWTH_PER_MIN = 0.05 // 01 §9.1 接触伤害成长系数
export const ENEMIES = Object.freeze({
  gnat: Object.freeze({
    name: '蚊蚋群',
    hp: 8,
    moveSpeed: 110,
    contactDamage: 5,
    xp: 1,
    radius: 10,
    knockbackResist: 0,        // 0%
    firstSeenSec: 0,           // 0:00
    behavior: 'chase',
    hpGrowthPerMin: HP_GROWTH_PER_MIN,
    damageGrowthPerMin: DAMAGE_GROWTH_PER_MIN,
  }),
  beetle: Object.freeze({
    name: '圆壳甲虫',
    hp: 25,
    moveSpeed: 70,
    contactDamage: 8,
    xp: 2,
    radius: 16,
    knockbackResist: 0.3,      // 30%
    firstSeenSec: 60,          // 1:00
    behavior: 'chase',
    hpGrowthPerMin: HP_GROWTH_PER_MIN,
    damageGrowthPerMin: DAMAGE_GROWTH_PER_MIN,
  }),
  moth: Object.freeze({
    name: '灰蛾',
    hp: 18,
    moveSpeed: 130,
    contactDamage: 6,
    xp: 2,
    radius: 14,
    knockbackResist: 0,        // 0%
    firstSeenSec: 120,         // 2:00
    behavior: 'sway',
    swayAmplitude: 40,         // 左右摆动振幅
    swayPeriod: 1.2,           // 摆动周期（秒）
    hpGrowthPerMin: HP_GROWTH_PER_MIN,
    damageGrowthPerMin: DAMAGE_GROWTH_PER_MIN,
  }),
  snail: Object.freeze({
    name: '雨夜蜗牛',
    hp: 80,
    moveSpeed: 35,
    contactDamage: 12,
    xp: 5,
    radius: 22,
    knockbackResist: 0.8,      // 80%
    firstSeenSec: 180,         // 3:00
    behavior: 'chase',
    hpGrowthPerMin: HP_GROWTH_PER_MIN,
    damageGrowthPerMin: DAMAGE_GROWTH_PER_MIN,
  }),
  sporeling: Object.freeze({
    name: '迷途菌灵',
    hp: 40,
    moveSpeed: 60,
    contactDamage: 6,
    xp: 4,
    radius: 16,
    knockbackResist: 0.2,      // 20%
    firstSeenSec: 240,         // 4:00
    behavior: 'ranged',
    approachRange: 180,        // 距离 > 180 时追近
    fireRange: 250,            // 距离 ≤ 250 时吐泡
    fireInterval: 3,           // 每 3 秒 1 个
    bubble: Object.freeze({
      speed: 150,
      damage: 6,
      life: 3,
      radius: 12,              // 02 §9 fx-mist-bubble 直径 24u
    }),
    hpGrowthPerMin: HP_GROWTH_PER_MIN,
    damageGrowthPerMin: DAMAGE_GROWTH_PER_MIN,
  }),
  elite_beetle: Object.freeze({
    name: '精英圆壳甲虫',
    hp: 1500,
    moveSpeed: 80,
    contactDamage: 15,
    xp: 50,
    radius: 28,
    knockbackResist: 0.9,      // 90%
    firstSeenSec: 300,         // 5:00
    behavior: 'charge',
    chargeEvery: 5,            // 每 5 秒
    chargeWindup: 0.8,         // 蓄力 0.8 秒
    chargeDuration: 1,         // 冲撞 1 秒
    chargeSpeedMul: 2.5,       // 速度 ×2.5
    hpGrowthPerMin: HP_GROWTH_PER_MIN,
    damageGrowthPerMin: DAMAGE_GROWTH_PER_MIN,
  }),
})
