// Data validation (03 §4). validate() returns an array of error strings; an empty
// array means the data is sound. Pure logic only: no Math.random, no Date.now, no cc/wx.
// Run in tests and once in the SurvivorRun constructor; a non-empty result is fatal
// (03 §4: 表现层显示「游戏数据异常」页面, 不带病运行).
//
// Validates player, weapons (all five, 01 §6.1–§6.5; a `placeholder: true` weapon must
// have empty levels and is excluded from drafts), passives, enemies, waves, limits.

import { PLAYER } from './player.js'
import { WEAPONS } from './weapons.js'
import { PASSIVES } from './passives.js'
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
  // Required per-level fields by weapon id (01 §6.1–§6.5). Every non-placeholder weapon
  // must be listed here; `positive` fields > 0, `ints` additionally integers,
  // `ratios` in (0, 1), `top` = weapon-level (not per-level) positive fields.
  const weaponSchemas = {
    spore_shot: {
      positive: ['damage', 'cooldown', 'count', 'pierce', 'speed', 'knockback', 'life'],
      ints: ['count', 'pierce'],
      ratios: [],
      evolvedRequired: true,
    },
    umbrella_blades: {
      positive: ['damage', 'count', 'orbitRadius', 'angularSpeedDeg', 'hitInterval', 'knockback'],
      ints: ['count'],
      ratios: [],
      evolvedRequired: false,
    },
    dew_ring: {
      positive: ['damage', 'radius', 'interval', 'slow'],
      ints: [],
      ratios: ['slow'],
      evolvedRequired: false,
    },
    raindrop: {
      positive: ['damage', 'count', 'radius', 'cooldown', 'knockback'],
      ints: ['count'],
      ratios: [],
      evolvedRequired: false,
      top: ['range', 'warnSec', 'fallbackMin', 'fallbackMax'],
    },
    leaf_boomerang: {
      positive: ['damage', 'count', 'maxDistance', 'speed', 'cooldown', 'knockback'],
      ints: ['count'],
      ratios: [],
      evolvedRequired: false,
      top: ['spreadDeg', 'leafRadius', 'catchRadius', 'maxLife'],
    },
  }
  const indices = new Set()
  for (const [id, weapon] of Object.entries(WEAPONS)) {
    if (!Number.isInteger(weapon.index) || weapon.index < 0 || weapon.index > 4) {
      push(`weapons.${id}.index`, '必须为 0–4 的整数（敌人 hitAt 长度 5）')
    } else if (indices.has(weapon.index)) {
      push(`weapons.${id}.index`, '与其它武器重复')
    } else {
      indices.add(weapon.index)
    }
    if (typeof weapon.evolvesWith !== 'string' || weapon.evolvesWith.length === 0) {
      push(`weapons.${id}.evolvesWith`, '必须指向一个被动 id')
    }
    // Out-of-scope weapons (08 §2) are explicit placeholders with empty levels.
    if (weapon.placeholder === true) {
      if (!Array.isArray(weapon.levels) || weapon.levels.length !== 0) {
        push(`weapons.${id}.levels`, '占位武器的 levels 必须为空数组')
      }
      continue
    }
    const schema = weaponSchemas[id]
    if (!schema) {
      push(`weapons.${id}`, '未知武器 id（非占位武器必须有校验规则）')
      continue
    }
    if (!Array.isArray(weapon.levels) || weapon.levels.length !== 5) {
      push(`weapons.${id}.levels`, '必须正好 5 档')
      continue
    }
    const checkLevel = (lvl, at) => {
      for (const f of schema.positive) {
        if (!isPositiveNumber(lvl[f])) push(`${at}.${f}`, '必须为有限正数')
      }
      for (const f of schema.ints) {
        if (!isPositiveInt(lvl[f])) push(`${at}.${f}`, '必须为正整数')
      }
      for (const f of schema.ratios) {
        if (!(isPositiveNumber(lvl[f]) && lvl[f] < 1)) push(`${at}.${f}`, '必须在 (0,1)')
      }
    }
    weapon.levels.forEach((lvl, i) => checkLevel(lvl, `weapons.${id}.levels[${i}]`))
    if (id === 'umbrella_blades' && !isPositiveNumber(weapon.bladeRadius)) {
      push(`weapons.${id}.bladeRadius`, '必须为有限正数')
    }
    for (const f of schema.top || []) {
      if (!isPositiveNumber(weapon[f])) push(`weapons.${id}.${f}`, '必须为有限正数')
    }
    if (id === 'raindrop') {
      if (!(weapon.fallbackMin < weapon.fallbackMax)) push(`weapons.${id}.fallbackMin`, '必须小于 fallbackMax')
      const zoneCap = LIMITS.pools.raindropZones
      for (let i = 0; i < weapon.levels.length; i += 1) {
        if (weapon.levels[i].count > zoneCap) push(`weapons.${id}.levels[${i}].count`, `落点数不得超过 limits.pools.raindropZones (${zoneCap})`)
      }
    }
    if (id === 'leaf_boomerang') {
      // 无限穿透只能靠回收结束：安全寿命必须够飞一个来回。
      for (let i = 0; i < weapon.levels.length; i += 1) {
        const lvl = weapon.levels[i]
        if (isPositiveNumber(lvl.speed) && !(weapon.maxLife > (2 * lvl.maxDistance) / lvl.speed)) {
          push(`weapons.${id}.maxLife`, `必须大于 Lv${i + 1} 往返时间`)
        }
      }
    }
    // Evolution (01 §6: 5 级 + 1 进化). S2 关闭进化（08 §2），新武器可为 null。
    if (weapon.evolved === null && !schema.evolvedRequired) {
      // allowed
    } else if (!weapon.evolved || typeof weapon.evolved !== 'object') {
      push(`weapons.${id}.evolved`, '必须有进化形态')
    } else {
      checkLevel(weapon.evolved, `weapons.${id}.evolved`)
    }
  }

  // --- passives (01 §7) ---
  const passiveStats = new Set(['might', 'cooldown', 'area', 'moveSpeed'])
  for (const [id, passive] of Object.entries(PASSIVES)) {
    const at = `passives.${id}`
    if (!passiveStats.has(passive.stat)) push(`${at}.stat`, '必须为 might/cooldown/area/moveSpeed 之一')
    if (!isPositiveNumber(passive.perLevel)) push(`${at}.perLevel`, '必须为有限正数')
    if (!Array.isArray(passive.levels) || passive.levels.length !== 5) {
      push(`${at}.levels`, '必须正好 5 档')
      continue
    }
    passive.levels.forEach((v, i) => {
      // 每级效果相同、线性叠加：Lv(i+1) 累计 = perLevel × (i+1)。
      if (!isPositiveNumber(v) || Math.abs(v - passive.perLevel * (i + 1)) > 1e-9) {
        push(`${at}.levels[${i}]`, '必须等于 perLevel × 等级（线性叠加）')
      }
    })
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
    const behaviorFields = {
      chase: [],
      sway: ['swayAmplitude', 'swayPeriod'],
      ranged: ['approachRange', 'fireRange', 'fireInterval'],
      charge: ['chargeEvery', 'chargeWindup', 'chargeDuration', 'chargeSpeedMul'],
      boss: [],
    }
    if (enemy.behavior === 'boss') {
      const groups = {
        summon: ['every', 'count', 'radius'],
        charge: ['every', 'windup', 'duration', 'speedMul'],
        bubbleRing: ['every', 'hpBelow', 'count'],
        enrage: ['atSec', 'speedMul', 'damageMul'],
      }
      for (const [g, gf] of Object.entries(groups)) {
        const obj = enemy[g]
        if (!obj || typeof obj !== 'object') {
          push(`enemies.${id}.${g}`, 'Boss 必须有该技能参数')
          continue
        }
        for (const f of gf) {
          if (!isPositiveNumber(obj[f])) push(`enemies.${id}.${g}.${f}`, '必须为有限正数')
        }
      }
      if (enemy.summon && !ENEMIES[enemy.summon.enemy]) push(`enemies.${id}.summon.enemy`, '引用了不存在的敌人 id')
      if (enemy.summon && !isPositiveInt(enemy.summon.count)) push(`enemies.${id}.summon.count`, '必须为正整数')
      if (enemy.bubbleRing && !isPositiveInt(enemy.bubbleRing.count)) push(`enemies.${id}.bubbleRing.count`, '必须为正整数')
      if (enemy.bubbleRing && !(enemy.bubbleRing.hpBelow < 1)) push(`enemies.${id}.bubbleRing.hpBelow`, '必须在 (0,1)')
      if (enemy.charge && !(enemy.charge.windup + enemy.charge.duration < enemy.charge.every)) {
        push(`enemies.${id}.charge`, '预警 + 冲撞时长必须小于冷却')
      }
      const b = enemy.bubbleRing && enemy.bubbleRing.bubble
      if (!b || typeof b !== 'object') push(`enemies.${id}.bubbleRing.bubble`, '必须有浊雾泡参数')
      else {
        for (const f of ['speed', 'damage', 'life', 'radius']) {
          if (!isPositiveNumber(b[f])) push(`enemies.${id}.bubbleRing.bubble.${f}`, '必须为有限正数')
        }
      }
    }
    const fields = behaviorFields[enemy.behavior]
    if (!fields) {
      push(`enemies.${id}.behavior`, '必须为 chase/sway/ranged/charge/boss 之一')
    } else {
      for (const f of fields) {
        if (!isPositiveNumber(enemy[f])) push(`enemies.${id}.${f}`, '必须为有限正数')
      }
    }
    if (enemy.behavior === 'ranged') {
      const b = enemy.bubble
      if (!b || typeof b !== 'object') push(`enemies.${id}.bubble`, '远程敌人必须有浊雾泡参数')
      else {
        for (const f of ['speed', 'damage', 'life', 'radius']) {
          if (!isPositiveNumber(b[f])) push(`enemies.${id}.bubble.${f}`, '必须为有限正数')
        }
      }
    }
  }

  // --- waves ---
  // 08 K1：计时胜利只走 SurvivorRun 调试选项，数据里不再有 winAtSeconds。
  if ('winAtSeconds' in WAVES) push('waves.winAtSeconds', '已移除（08 K1：计时胜利改为调试选项 debug.timedWinSec）')
  const boss = WAVES.boss
  if (!boss || typeof boss !== 'object') {
    push('waves.boss', '必须为对象')
  } else {
    if (!ENEMIES[boss.enemy] || ENEMIES[boss.enemy].behavior !== 'boss') push('waves.boss.enemy', '必须引用 behavior=boss 的敌人')
    if (!isPositiveNumber(boss.atSec)) push('waves.boss.atSec', '必须为有限正数')
    if (!(isPositiveNumber(boss.warningSec) && boss.warningSec < boss.atSec)) push('waves.boss.warningSec', '必须为正数且小于 atSec')
  }
  const extraction = WAVES.extraction
  if (!extraction || typeof extraction !== 'object') {
    push('waves.extraction', '必须为对象')
  } else {
    for (const f of ['cleansingSec', 'distance', 'radius', 'holdSec', 'healPerSec']) {
      if (!isPositiveNumber(extraction[f])) push(`waves.extraction.${f}`, '必须为有限正数')
    }
  }
  const segments = WAVES.segments
  if (!Array.isArray(segments) || segments.length === 0) {
    push('waves.segments', '必须为非空数组')
  } else {
    const enemyCap = LIMITS.hardCaps.enemies
    segments.forEach((seg, i) => {
      const at = `waves.segments[${i}]`
      if (!isNonNegativeNumber(seg.fromSec)) push(`${at}.fromSec`, '必须为非负有限数')
      // 08 K2：只有最后一段可以用 toSec: null 表示开放区间（7:00–Boss 击败）。
      const last = i === segments.length - 1
      if (seg.toSec === null) {
        if (!last) push(`${at}.toSec`, '只有最后一段允许为 null')
      } else if (!isPositiveNumber(seg.toSec)) push(`${at}.toSec`, '必须为有限正数或（仅最后一段）null')
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
  // events (01 §10 事件列): sorted by atSec, known type, known enemy, positive count.
  const events = WAVES.events
  if (!Array.isArray(events)) {
    push('waves.events', '必须为数组')
  } else {
    events.forEach((ev, i) => {
      const at = `waves.events[${i}]`
      if (!isNonNegativeNumber(ev.atSec)) push(`${at}.atSec`, '必须为非负有限数')
      if (i > 0 && isFiniteNumber(ev.atSec) && ev.atSec < events[i - 1].atSec) {
        push(`${at}.atSec`, '事件必须按时间升序')
      }
      if (!['ring', 'cross', 'elite'].includes(ev.type)) push(`${at}.type`, '必须为 ring/cross/elite 之一')
      if (!ENEMIES[ev.enemy]) push(`${at}.enemy`, '引用了不存在的敌人 id')
      if (!isPositiveInt(ev.count)) push(`${at}.count`, '必须为正整数')
      if (ev.type === 'ring' && !isPositiveNumber(ev.radius)) push(`${at}.radius`, '必须为有限正数')
      if (ev.type === 'cross' && !isPositiveNumber(ev.spacing)) push(`${at}.spacing`, '必须为有限正数')
      if (ev.optional !== undefined && typeof ev.optional !== 'boolean') push(`${at}.optional`, '必须为布尔值')
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
  for (const [name, mod] of [['player', PLAYER], ['weapons', WEAPONS], ['passives', PASSIVES], ['enemies', ENEMIES], ['waves', WAVES], ['limits', LIMITS]]) {
    if (!jsonRoundTripsEqual(mod)) push(`${name}`, '无法 JSON 往返（混入了函数/Infinity/NaN）')
  }

  return errors
}
