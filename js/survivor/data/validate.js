// Data validation (03 §4). validate() returns an array of error strings; an empty
// array means the data is sound. Pure logic only: no Math.random, no Date.now, no cc/wx.
// Run in tests and once in the SurvivorRun constructor; a non-empty result is fatal
// (03 §4: 表现层显示「游戏数据异常」页面, 不带病运行).
//
// S1 scope: validates the modules shipped in Sprint 1 (player, weapons.spore_shot,
// enemies gnat/beetle, waves 0–2min segments, limits, strings). Reserved weapons with
// empty `levels` are skipped (structure placeholders for S2).

import { PLAYER } from './player.js'
import { WEAPONS } from './weapons.js'
import { ENEMIES } from './enemies.js'
import { WAVES } from './waves.js'
import { LIMITS } from './limits.js'

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v)
}
function isPositiveNumber(v) {
  return isFiniteNumber(v) && v > 0
}
function isPositiveInt(v) {
  return Number.isInteger(v) && v > 0
}
function isNonNegativeNumber(v) {
  return isFiniteNumber(v) && v >= 0
}

// deepEqual via JSON round-trip (03 §4): catches functions, Infinity, NaN, undefined.
function jsonRoundTripsEqual(x) {
  let serialized
  try {
    serialized = JSON.stringify(x)
  } catch {
    return false
  }
  if (serialized === undefined) return false
  const parsed = JSON.parse(serialized)
  return JSON.stringify(parsed) === serialized
}

export function validate() {
  const errors = []
  const push = (path, msg) => errors.push(`${path}: ${msg}`)

  // --- player ---
  const playerNumericFields = [
    'maxHp', 'moveSpeed', 'pickupRadius', 'might', 'cooldown', 'area', 'invulnTime', 'radius',
  ]
  for (const field of playerNumericFields) {
    if (!isPositiveNumber(PLAYER[field])) push(`player.${field}`, '必须为有限正数')
  }
  if (!isNonNegativeNumber(PLAYER.regen)) push('player.regen', '必须为非负有限数')
  if (!isPositiveInt(PLAYER.weaponSlots)) push('player.weaponSlots', '必须为正整数')
  if (!isPositiveInt(PLAYER.passiveSlots)) push('player.passiveSlots', '必须为正整数')

  // --- weapons ---
  const levelFields = ['damage', 'cooldown', 'count', 'pierce', 'speed', 'knockback', 'life']
  for (const [id, weapon] of Object.entries(WEAPONS)) {
    // Reserved S2 weapons: empty levels array is an allowed placeholder.
    if (Array.isArray(weapon.levels) && weapon.levels.length === 0) continue
    if (!Array.isArray(weapon.levels) || weapon.levels.length !== 5) {
      push(`weapons.${id}.levels`, '必须正好 5 档')
      continue
    }
    weapon.levels.forEach((lvl, i) => {
      const at = `weapons.${id}.levels[${i}]`
      for (const f of levelFields) {
        if (!isPositiveNumber(lvl[f])) push(`${at}.${f}`, '必须为有限正数')
      }
      if (!isPositiveInt(lvl.count)) push(`${at}.count`, '必须为正整数')
      if (!isPositiveInt(lvl.pierce)) push(`${at}.pierce`, '必须为正整数')
    })
    // Evolution (01 §6: 5 级 + 1 进化) and its unlocking passive id.
    if (!weapon.evolved || typeof weapon.evolved !== 'object') {
      push(`weapons.${id}.evolved`, '必须有进化形态')
    } else {
      for (const f of levelFields) {
        if (!isPositiveNumber(weapon.evolved[f])) push(`weapons.${id}.evolved.${f}`, '必须为有限正数')
      }
    }
    if (typeof weapon.evolvesWith !== 'string' || weapon.evolvesWith.length === 0) {
      push(`weapons.${id}.evolvesWith`, '必须指向一个被动 id')
    }
  }

  // --- enemies ---
  const enemyNumericFields = ['hp', 'moveSpeed', 'contactDamage', 'radius']
  for (const [id, enemy] of Object.entries(ENEMIES)) {
    for (const f of enemyNumericFields) {
      if (!isPositiveNumber(enemy[f])) push(`enemies.${id}.${f}`, '必须为有限正数')
    }
    if (!isNonNegativeNumber(enemy.xp)) push(`enemies.${id}.xp`, '必须为非负有限数')
    if (!(isNonNegativeNumber(enemy.knockbackResist) && enemy.knockbackResist <= 1)) {
      push(`enemies.${id}.knockbackResist`, '必须在 [0,1]')
    }
    if (!isNonNegativeNumber(enemy.firstSeenSec)) push(`enemies.${id}.firstSeenSec`, '必须为非负有限数')
    if (!isNonNegativeNumber(enemy.hpGrowthPerMin)) push(`enemies.${id}.hpGrowthPerMin`, '必须为非负有限数')
    if (!isNonNegativeNumber(enemy.damageGrowthPerMin)) push(`enemies.${id}.damageGrowthPerMin`, '必须为非负有限数')
  }

  // --- waves ---
  if (WAVES.winAtSeconds !== 180) push('waves.winAtSeconds', '计时胜利目标必须为 180 秒 (00 §8 D4)')
  const segments = WAVES.segments
  if (!Array.isArray(segments) || segments.length === 0) {
    push('waves.segments', '必须为非空数组')
  } else {
    const enemyCap = LIMITS.hardCaps.enemies
    segments.forEach((seg, i) => {
      const at = `waves.segments[${i}]`
      if (!isNonNegativeNumber(seg.fromSec)) push(`${at}.fromSec`, '必须为非负有限数')
      if (!isPositiveNumber(seg.toSec)) push(`${at}.toSec`, '必须为有限正数')
      if (isFiniteNumber(seg.fromSec) && isFiniteNumber(seg.toSec) && seg.toSec <= seg.fromSec) {
        push(`${at}`, 'toSec 必须大于 fromSec (单调递增)')
      }
      if (i === 0 && seg.fromSec !== 0) push(`${at}.fromSec`, '首段必须从 0 开始')
      if (i > 0 && seg.fromSec !== segments[i - 1].toSec) {
        push(`${at}.fromSec`, '波次段必须首尾相接')
      }
      if (!isPositiveNumber(seg.spawnRate)) push(`${at}.spawnRate`, '必须为有限正数')
      if (!isPositiveInt(seg.cap)) push(`${at}.cap`, '必须为正整数')
      else if (seg.cap > enemyCap) push(`${at}.cap`, `同屏上限不得超过 limits.hardCaps.enemies (${enemyCap})`)
      // composition: ids must exist in enemies, values sum to 100.
      const composition = seg.composition
      if (!composition || typeof composition !== 'object') {
        push(`${at}.composition`, '必须为对象')
      } else {
        let sum = 0
        for (const [enemyId, pct] of Object.entries(composition)) {
          if (!ENEMIES[enemyId]) push(`${at}.composition.${enemyId}`, '引用了不存在的敌人 id')
          if (!isNonNegativeNumber(pct)) push(`${at}.composition.${enemyId}`, '组成百分比必须为非负有限数')
          else sum += pct
        }
        if (sum !== 100) push(`${at}.composition`, `组成百分比之和必须为 100，当前 ${sum}`)
      }
    })
  }

  // --- limits ---
  for (const group of ['hardCaps', 'pools', 'nodes']) {
    const bucket = LIMITS[group]
    if (!bucket || typeof bucket !== 'object') {
      push(`limits.${group}`, '必须为对象')
      continue
    }
    for (const [key, val] of Object.entries(bucket)) {
      if (!isPositiveInt(val)) push(`limits.${group}.${key}`, '必须为正整数')
    }
  }
  if (!isPositiveNumber(LIMITS.spawnMarginU)) push('limits.spawnMarginU', '必须为有限正数')

  // --- JSON round-trip (03 §4): guards against functions / Infinity / NaN. ---
  for (const [name, mod] of [['player', PLAYER], ['weapons', WEAPONS], ['enemies', ENEMIES], ['waves', WAVES], ['limits', LIMITS]]) {
    if (!jsonRoundTripsEqual(mod)) push(`${name}`, '无法 JSON 往返（混入了函数/Infinity/NaN）')
  }

  return errors
}
