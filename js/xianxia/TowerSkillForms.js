// Shared combat geometry. Damage, cooldown and learning costs remain in Growth.
import { COMBAT_SKILLS as GROWTH_SKILLS, COMBAT_EVOLUTIONS as GROWTH_EVOLUTIONS } from './TowerCombatSkills.js'
import { wuwoSwordPose } from './WuwoMotion.js'
import { QINGLIAN_RINGS } from './TowerGrowth.js'
import { JINGHONG_LEAD } from './TowerJinghong.js'

const SKILLS = Object.fromEntries(GROWTH_SKILLS.map(skill => [skill.id, skill]))
const EVOLUTIONS = Object.fromEntries(GROWTH_EVOLUTIONS.map(skill => [skill.id, skill]))
const PARENTS = { evo_wanjian: 'sj_yujian', evo_wuwo: 'sj_wanjian',
  evo_tiandi: 'sj_line', evo_sixiang: 'sj_formation' }
const cache = new Map()
const rank = (value, max) => Math.max(1, Math.min(max, Math.trunc(Number(value) || 1)))
const stage = level => level >= 10 ? 3 : level >= 6 ? 2 : level >= 3 ? 1 : 0
const at = (skill, key, level, fallback = 0) => Array.isArray(skill[key])
  ? skill[key][level - 1] : skill[key] ?? fallback

// Preserve the strongest first swing from the previous shape stage; distribute
// only the extra damage over follow-up swings. Total cast budget is unchanged.
export function skillHitShare(id, level, pulse = 1) {
  const form = skillForm(id, level)
  if (id === 'sj_shadow' && form.hits >= 3) {
    const skill = SKILLS[id]
    const retained = at(skill, 'damage', 5) / at(skill, 'damage', 6)
    const shares = [retained / 2, retained / 2, 1 - retained]
    if (form.hits === 4) {
      const previous = at(skill, 'damage', 9) / at(skill, 'damage', 10)
      return pulse === 4 ? 1 - previous : shares[pulse - 1] * previous
    }
    return shares[pulse - 1]
  }
  if (id === 'sj_arc') return [.25, .33, .42][pulse - 1]
  return 1 / Math.max(1, form.hits)
}

export function skillForm(id, level = 1, parentLevel = 1, trainedLevel = level) {
  const parent = PARENTS[id], skill = SKILLS[parent ?? id]
  if (!skill) throw new RangeError(`Unknown tower skill: ${id}`)
  // Keep accepted VFX/collision geometry stable. Damage uses the actual parent
  // rank in Run and Presentation, independently of this visual template.
  const lv = rank(parent ? EVOLUTIONS[id].visualRank : id === 'sj_sancai' ? trainedLevel : level, skill.maxLevel)
  const evolution = parent ? rank(level, 2) : 0
  const key = `${id}:${lv}:${evolution}`
  if (cache.has(key)) return cache.get(key)
  const node = stage(lv)
  const form = { id, shape: 'none', hits: 0, swords: 0, eyes: 0,
    radius: at(skill, 'radius', lv), reach: at(skill, 'reach', lv),
    width: at(skill, 'width', lv), angle: at(skill, 'angle', lv),
    interval: 0, initialDelay: 0, duration: 0, targetCap: at(skill, 'target_cap', lv) }
  if (skill.kind === 'active') {
    switch (parent ?? id) {
      case 'sj_yujian':
        Object.assign(form, { shape: 'projectile', hits: at(skill, 'swords', lv),
          swords: at(skill, 'swords', lv) })
        break
      case 'sj_arc':
        Object.assign(form, { shape: 'sector', hits: 3, interval: .16,
          bladeKind: 'crescent', bladeWidth: at(skill, 'bladeWidth', lv, 12) })
        break
      case 'sj_moon':
        Object.assign(form, { shape: 'sector', hits: 1, interval: 0, duration: .42 })
        break
      case 'sj_moon_triple':
        Object.assign(form, { shape: 'crescent-projectile',
          hits: id === 'sj_moon' ? 1 : 3, interval: id === 'sj_moon' ? 0 : .16,
          bladeKind: 'crescent', bladeWidth: at(skill, 'bladeWidth', lv, 12),
          width: at(skill, 'width', lv, form.radius * 1.2), speed: at(skill, 'speed', lv, 960) })
        break
      case 'sj_cross':
        Object.assign(form, { shape: 'cross-burst', hits: 1, angle: 180,
          bladeKind: 'cross', bladeWidth: at(skill, 'bladeWidth', lv), speed: at(skill, 'speed', lv) })
        break
      case 'sj_line':
        Object.assign(form, { shape: 'line', hits: [1, 1, 2, 3][node], interval: .16 })
        break
      case 'sj_shadow':
        Object.assign(form, { shape: 'shadow', hits: [1, 2, 3, 4][node],
          width: 30, interval: .08, initialDelay: at(skill, 'delay', lv) })
        break
      case 'sj_jinghong':
        // 锁定单体；每柄重剑显形后停顿0.35秒再0.08秒刺穿，首刺0.43秒，之后每0.22秒一刺；刺数随等级段 3/4/5/6。
        Object.assign(form, { shape: 'jinghong', hits: [3, 4, 5, 6][node],
          initialDelay: JINGHONG_LEAD, interval: .22, retargetRadius: 240 })
        break
      case 'sj_sancai':
        // 2026-11-09 用户确认（方案A）：持续6秒，每秒落一剑共6剑，三剑各落两轮。
        Object.assign(form, { shape: 'triangle', hits: 6, eyes: 3,
          initialDelay: .35, interval: 1, duration: 6 })
        break
      case 'sj_formation':
        Object.assign(form, { shape: 'circle', hits: at(skill, 'pulseCount', lv), eyes: 2,
          initialDelay: .5, duration: skill.duration })
        form.interval = (form.duration - form.initialDelay) / (form.hits - 1)
        break
      case 'sj_qinglian':
        // Three judgment rounds at release, +1s and +2s (outer, middle, inner). No target cap.
        // 2026-11-09 用户确认（方案C）：持续4秒只延长莲瓣画面，第3秒后不再判定。
        Object.assign(form, { shape: 'lotus', radius: QINGLIAN_RINGS[0].radius, hits: 3,
          interval: 1, initialDelay: 0, duration: skill.duration, rings: QINGLIAN_RINGS, targetCap: null })
        break
      case 'sj_wanjian':
        // 2026-11-09 方案A：周天剑阵改用原周天剑域的变速游剑与近身剑意，冷却、伤害不变。
        // 2026-11-13 用户决定：各级固定 4 把飞剑。
        Object.assign(form, { shape: 'orbit', hits: null, swords: 4,
          interval: .6, bladeLength: 36 + 2 * (form.radius - 90), bladeWidth: 10,
          // A new visible blade reaches each bearing at least once per damage window.
          angularSpeed: Math.max(1.8, Math.PI * 2 / ([4, 5, 6, 8][node] * .6)),
          innerRadius: 67, motion: 'wuwo', motionSpeed: 2.6,
          // 2026-11-13 用户决定：收窄每把剑的随机速度差；技能范围内有怪时加速，没有怪时减速（0.5 秒平滑过渡）。
          speedBase: .9, speedSpread: .2, speedWave: .15, combatPace: 1.35, idlePace: .45, paceRamp: .5 })
        form.innerRadius = (form.radius - form.bladeLength / 2) * 1.25
        form.radius *= 1.25
        break
    }
  }
  if (id === 'evo_tiandi') Object.assign(form, { hits: 1, interval: 0,
    // Its approved geometry is independent of the base skill's new range.
    reach: evolution === 1 ? 670 : 770, width: evolution === 1 ? 80 : 112 })
  if (id === 'evo_wuwo') {
    // 退役的周天剑域沿用改动前的几何：基础周天剑阵的半径已×1.25，这里先还原。
    if (form.motion === 'wuwo') form.radius /= 1.25
    // 2026-11-13: the combat pace and narrowed speed spread belong to the base orbit only; keep the retired evolution's motion.
    for (const key of ['speedBase', 'speedSpread', 'speedWave', 'combatPace', 'idlePace', 'paceRamp']) delete form[key]
    const oldRadius = form.radius + (evolution === 1 ? 24 : 48)
    Object.assign(form, { radius: oldRadius * 1.25, swords: evolution === 1 ? 8 : 12,
      innerRadius: (oldRadius - form.bladeLength / 2) * 1.25, motionSpeed: 2.6 })
  }
  if (id === 'evo_sixiang') {
    Object.assign(form, { shape: 'diamond', hits: EVOLUTIONS.evo_sixiang.pulseCount[evolution - 1], eyes: 4,
      duration: EVOLUTIONS.evo_sixiang.duration,
      radius: EVOLUTIONS.evo_sixiang.radiusByRank[evolution - 1] })
    form.interval = (form.duration - form.initialDelay) / (form.hits - 1)
  }
  if (id === 'evo_wanjian') Object.assign(form, { shape: 'line', hits: evolution === 1 ? 19 : 25,
    swords: evolution === 1 ? 18 : 24, radius: 160, reach: 440, width: 28,
    targetCap: 8, initialDelay: .2, interval: .1 })
  if (!form.duration && form.hits) form.duration = form.initialDelay
    + Math.max(0, form.hits - 1) * form.interval
  const result = Object.freeze(form)
  cache.set(key, result)
  return result
}

// 青莲剑阵：第 k 环的每一瓣都是判定剑，从阵眼辐射到环半径。第 k 环的瓣以 k·π/8 + j·2π/N − ω_k·t 旋转，
// 角度递减即顺时针；内环最快、外环最慢，相邻环错开 π/8。
const QINGLIAN_SPIN = [10.05, 8.17, 6.6]
// Judgment band half-width, equal to the drawn blade's widest half-width (see QinglianFormationArt).
export const QINGLIAN_BLADE_HALF_WIDTH = 8
const TAU = Math.PI * 2
export function qinglianPetalPose(form, time, ringIndex, petalIndex) {
  const ring = form.rings[ringIndex]
  const angle = ringIndex * Math.PI / 8 + petalIndex * TAU / ring.visualPetals - QINGLIAN_SPIN[ringIndex] * time
  const dx = Math.cos(angle), dy = Math.sin(angle)
  return { x: dx * ring.radius, y: dy * ring.radius, angle,
    baseX: 0, baseY: 0, tipX: dx * ring.radius, tipY: dy * ring.radius }
}
// Pulse p (1-based) judges the ring that is shown p-th: outer, middle, inner.
export function qinglianRingForPulse(form, pulse) {
  return form.rings.length - pulse
}
// Does a blade whose angle sweeps [s - span, s] (radians, s in [0, 2π)) pass within
// ±alpha of a bearing at 0 (mod 2π)?
function sweepTouches(s, span, alpha) {
  if (span + 2 * alpha >= TAU) return true
  for (const k of [-1, 0, 1]) {
    const low = k * TAU - alpha, high = k * TAU + alpha
    if (s >= low && s - span <= high) return true
  }
  return false
}
// Judgment hits one target receives from one round: a round is one second, and each
// petal of the round's ring counts once when its sweep crosses the target. A target
// is in reach when its edge is within the ring radius (the same test as the target finder).
export function qinglianRoundHits(form, centre, target, pulse) {
  const ringIndex = qinglianRingForPulse(form, pulse), ring = form.rings[ringIndex]
  const r = target.radius ?? 0
  const dx = target.x - centre.x, dy = target.y - centre.y, d = Math.hypot(dx, dy)
  if (d - r > ring.radius + 1e-6) return 0
  const alpha = d <= r + QINGLIAN_BLADE_HALF_WIDTH ? Math.PI : Math.asin((r + QINGLIAN_BLADE_HALF_WIDTH) / d)
  const bearing = Math.atan2(dy, dx), span = QINGLIAN_SPIN[ringIndex] * form.interval
  const roundStart = (pulse - 1) * form.interval
  let hits = 0
  for (let j = 0; j < ring.visualPetals; j++) {
    const angle = qinglianPetalPose(form, roundStart, ringIndex, j).angle
    const s = ((angle - bearing) % TAU + TAU) % TAU
    if (sweepTouches(s, span, alpha)) hits++
  }
  return hits
}

// Local coordinates: the caller adds the actual player position. Both renderer
// and collision use the same radial blade, including the spaces between swords.
/** Motion clock of the base orbit: advances at the combat-dependent pace while active (TowerRun). */
export function orbitMotionTime(state) {
  return Number.isFinite(state?.orbitClock) ? state.orbitClock : state?.time ?? 0
}
/** Outer attack reach of the orbit swords (also the "monster in range" test for the pace). */
export function orbitReach(form) {
  return form.radius + form.bladeLength / 2 + form.bladeWidth / 2
}
export function orbitSwordPose(form, time, index) {
  if (form.id === 'evo_wuwo' || form.motion === 'wuwo') return wuwoSwordPose(form, time, index)
  const angle = time * form.angularSpeed + index * Math.PI * 2 / form.swords
  const dx = Math.cos(angle), dy = Math.sin(angle)
  const half = form.bladeLength / 2
  return { x: dx * form.radius, y: dy * form.radius, angle,
    baseX: dx * (form.radius - half), baseY: dy * (form.radius - half),
    tipX: dx * (form.radius + half), tipY: dy * (form.radius + half) }
}

// The rain owns the slot until its last beat. Fund the skipped ordinary casts
// from the rain budget, so the displayed total and saved zone agree with combat.
export function convergenceRainMultiplier(rank) {
  const evo = GROWTH_EVOLUTIONS.find(row => row.id === 'evo_wanjian')
  const parent = SKILLS.sj_yujian
  // Keep the approved damage budget when the visual volley is lengthened.
  const skipped = evo.rainDamageDurationByRank[rank - 1] / parent.cooldown
  return (evo.budgetMultipliers[rank - 1] - evo.regularMultiplier)
    * evo.rainDamageBudgetSeconds / parent.cooldown + skipped
}
