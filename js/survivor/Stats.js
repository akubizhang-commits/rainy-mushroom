// Derived stat composition (03 §3.8, formulas 01-gdd §15.1). Pure logic only:
// no Math.random, no Date.now, no cc/wx.
//
// Stats are recomputed only on open / level-up (03 §3.8) and cached; the step loop
// reads the cached values. `passives` is the run's passive level map `{id: level}`
// (data/passives.js); 局外 bonuses come from Meta.bonuses.
//
// 01 §15.1 公式：
//   might        = (1 + 局外晨光之力) × (1 + 晨光菌丝)
//   实际冷却     = 武器档位冷却 × max(0.5, 1 − 湿润苔衣)
//   实际范围     = 武器档位范围 × (1 + 宽檐菌帽)
//   移动速度     = 160 × (1 + 局外轻灵蕨步) × (1 + 蕨叶轻靴)
//   拾取半径     = 60 × (1 + 局外孢子亲和) × (1 + 孢子罗盘)
//   生命回复/秒  = 局外露水祝福 + 露水叶片
//   实际伤害     = round(武器档位伤害 × might)，最小 1

import { PASSIVES } from './data/passives.js'

export const COOLDOWN_FLOOR = 0.5

// Normalise the 局外 bonuses object (Meta.bonuses) to the additive terms used below.
// Missing fields default to 0 so a bare {} behaves as "no permanent upgrades".
function readBonuses(bonuses) {
  const b = bonuses || {}
  return {
    might: num(b.might),         // 局外晨光之力
    moveSpeed: num(b.moveSpeed), // 局外轻灵蕨步
    pickup: num(b.pickup),       // 局外孢子亲和
    regen: num(b.regen),         // 局外露水祝福（每秒绝对值）
    maxHp: num(b.maxHp),         // 局外韧性苔原（绝对生命）
  }
}

// In-run passive terms from the passive level map `{id: level}` (run.passives, 08 L2).
// Each passive's cumulative bonus at level L is PASSIVES[id].levels[L-1] (01 §7 线性叠加);
// levels are clamped to [0, levels.length], unknown ids are ignored. regen / magnet are
// not in data/passives.js in S2, so their terms stay 0.
export function passiveTerms(passives) {
  const out = { might: 0, cooldown: 0, area: 0, moveSpeed: 0, pickup: 0, regen: 0 }
  const p = passives || {}
  for (const id of Object.keys(PASSIVES)) {
    const def = PASSIVES[id]
    const raw = p[id]
    if (!Number.isFinite(raw)) continue
    const level = Math.min(def.levels.length, Math.max(0, Math.floor(raw)))
    if (level > 0) out[def.stat] += def.levels[level - 1]
  }
  return out
}

function num(v) {
  return Number.isFinite(v) ? v : 0
}

// Compose derived player stats from base data + 局外 bonuses + in-run passives.
// `player` is data/player.js. Returns a plain object cached on world.stats.
export function computeStats(player, bonuses, passives) {
  const b = readBonuses(bonuses)
  const p = passiveTerms(passives)
  const might = (1 + b.might) * (1 + p.might)
  const cooldownMul = Math.max(COOLDOWN_FLOOR, 1 - p.cooldown)
  const areaMul = 1 + p.area
  const moveSpeed = player.moveSpeed * (1 + b.moveSpeed) * (1 + p.moveSpeed)
  const pickupRadius = player.pickupRadius * (1 + b.pickup) * (1 + p.pickup)
  const regenPerSec = b.regen + p.regen
  const maxHp = player.maxHp + b.maxHp
  return {
    might,
    cooldownMul, // multiply a weapon's base cooldown by this
    areaMul,     // multiply a weapon's base area/range by this
    moveSpeed,
    pickupRadius,
    regenPerSec,
    maxHp,
  }
}

// 实际伤害 = round(武器档位伤害 × might)，最小 1 (01 §15.1).
export function actualDamage(baseDamage, might) {
  const d = Math.round(baseDamage * might)
  return d < 1 ? 1 : d
}

// Damage one hit deals to `enemy` (01 §15.1). `damage` is the pre-rounded 实际伤害;
// `raw` = 武器档位伤害 × might (unrounded). Only an enemy with takenMul ≠ 1 (the Boss
// under 超时兜底) re-rounds: round(武器档位伤害 × might × 受到伤害倍率)，最小 1.
export function hitDamage(enemy, damage, raw) {
  const m = enemy.takenMul
  if (m === 1 || m === undefined) return damage
  return actualDamage(raw, m)
}
// 实际冷却 = 武器档位冷却 × cooldownMul (floor already applied in cooldownMul).
export function actualCooldown(baseCooldown, cooldownMul) {
  return baseCooldown * cooldownMul
}

// Enemy scaling by minute m (01 §9.1 / §15.1):
//   敌人生命       = 基础生命 × (1 + hpGrowthPerMin × m)
//   敌人接触伤害   = 基础伤害 × (1 + damageGrowthPerMin × m)
export function enemyHp(base, growthPerMin, minute) {
  return base * (1 + growthPerMin * minute)
}
export function enemyContactDamage(base, growthPerMin, minute) {
  return base * (1 + growthPerMin * minute)
}
