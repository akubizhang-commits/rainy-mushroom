import test from 'node:test'
import assert from 'node:assert/strict'
import { cultivationAt, cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS, rankCap, skillRequirement, realmPoints } from '../js/xianxia/TowerGrowth.js'

const xpAt = cultivationLevelXp
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`)
const skill = id => GROWTH_SKILLS.find(row => row.id === id)

test('all 29 level transitions compound without rounding and breakthroughs replace minor multipliers', () => {
  for (let level = 2; level <= 30; level++) {
    const before = cultivationAt(xpAt(level) - 1), after = cultivationAt(xpAt(level))
    assert.equal(before.level, level - 1)
    assert.equal(after.level, level)
    const major = level === 11 || level === 21
    near(after.attackMultiplier / before.attackMultiplier, major ? 1.35 : 1.08)
    near(after.maxHp / before.maxHp, major ? 1.35 : 1.08)
    assert.equal(realmPoints(xpAt(level)) - realmPoints(xpAt(level) - 1), major ? 4 : 1)
  }
  near(cultivationAt(45).maxHp, 108)
  near(cultivationAt(120).maxHp, 116.64)
  assert.equal(cultivationAt(14400).capped, true)
  assert.equal(realmPoints(14400), 35)
})

// 2026-11-06（84/85号复测）基础数值调整：御剑1–9级按比例压低，流云斩×1.3，剑破虚空×1.5，两仪7–10级×1.25。
// 2026-11-09：剑破虚空改为金丹初期可学，再×1.5（合计×2.25）。
const EXTRA = { sj_yujian: [.5,.5,.52,.65,.72,.8,.85,.9,.95,1], sj_arc: Array(10).fill(1.3), sj_line: Array(10).fill(1.5 * 1.5), sj_formation: [1,1,1,1,1,1,1.25,1.25,1.25,1.25] }
const extra = (id, i) => EXTRA[id]?.[i] ?? 1
test('six active curves have distinct starting damage and exact per-rank growth with distinct cadence', () => {
  for (const [id, base, multiplier, interval] of [
    ['sj_yujian', 1.2, 1.13, 1], ['sj_arc', 1.2, 1.15, 3.5],
    ['sj_wanjian', .30, 1.2, 6], ['sj_line', 14.4, 1.1, 12],
    ['sj_shadow', 6.4, (2.64*1.2**9/3.52)**(1/9), 6], ['sj_formation', 32 / 15 * 1.65, 1.15, 12],
  ]) {
    const row = skill(id)
    near(row.damage[0], base * extra(id, 0))
    assert.equal(row.cooldown ?? row.hit_interval, interval)
    for (let i = 1; i < 10; i++) {
      const transition = [1,1,1,1,1,1,1.05,1.10,1.15,1.20]
      const formationGrowth = id === 'sj_formation' ? transition[i] / transition[i-1] : 1
      near(row.damage[i] / row.damage[i - 1], (id === 'sj_yujian' && i <= 2 ? [1.25,1.2][i-1] : id === 'sj_arc' && i <= 2 ? [1.4, 3/2.1][i-1] : multiplier * formationGrowth) * extra(id, i) / extra(id, i - 1))
      near(row.levels[i].damage, (id === 'sj_yujian' ? (i === 1 ? 1.5 : 1.8 * 1.13 ** (i-2)) : id === 'sj_arc' ? (.8 * (i === 0 ? 1.5 : i === 1 ? 2.1 : 3 * 1.15 ** (i-2))) : base * multiplier ** i * (id === 'sj_formation' ? transition[i] : 1)) * extra(id, i))
    }
  }
  const dps = (id, rank) => skill(id).damage[rank - 1] * skill(id).single_dps_factor
  // 2026-11-06（85号第10节）：流云斩只小幅加强，周天剑阵5–6级单体仍略高；
  // 剑破虚空×1.5后，6级与10级单体都高于分光连斩。
  assert.ok(dps('sj_wanjian', 5) > dps('sj_arc', 5))
  assert.ok(dps('sj_wanjian', 6) > dps('sj_arc', 6))
  assert.ok(dps('sj_line', 6) > dps('sj_shadow', 6))
  assert.ok(dps('sj_line', 10) > dps('sj_shadow', 10))
  assert.equal(skill('sj_shadow').target_cap, 3)
})

test('rank caps unlock on the approved levels and do not bypass learning, floor or point gates', () => {
  for (let level = 1; level <= 30; level++) {
    for (const row of GROWTH_SKILLS) {
      const expected = row.rankRequirements.filter(req => req.characterLevel <= level).length
      assert.equal(rankCap(row.id, xpAt(level), 9), expected, `${row.id} at ${level}`)
    }
  }
  const state = { xp: xpAt(17), clearedFloor: 2, skills: { sj_yujian: 1 }, books: [] }
  assert.deepEqual(skillRequirement(state, 'sj_formation'), { ok: true, nextLevel: 1, cost: 1, bookCost: 200 })
  assert.equal(skillRequirement({ ...state, xp: xpAt(17) - 1 }, 'sj_formation').reason, 'stage-locked')
  assert.equal(skillRequirement({ ...state, clearedFloor: 1 }, 'sj_formation').ok, true)
  assert.equal(skillRequirement(state, 'sj_formation', { inTower: true }).ok, true)
})

test('evolution budgets preserve full parent baseline and only define the two approved ranks', () => {
  const budgets = { evo_wanjian: [1.30, 1.69], evo_tiandi: [1.40, 1.82],
    evo_wuwo: [1.20, 1.44], evo_sixiang: [2.0, 2.3] }
  for (const row of GROWTH_EVOLUTIONS) {
    assert.deepEqual(row.budgetMultipliers, budgets[row.id])
    assert.deepEqual(row.pointCosts, {evo_wanjian:[2,2],evo_wuwo:[4,4],evo_tiandi:[2,2],evo_sixiang:[4,4]}[row.id])
    assert.equal(row.maxLevel, 2)
    assert.deepEqual(row.levels.map(level => level.budgetMultiplier), budgets[row.id])
    assert.equal(row.visualRank, 10)
  }
  const evolution = id => GROWTH_EVOLUTIONS.find(row => row.id === id)
  assert.equal(evolution('evo_wanjian').regularMultiplier, 1)
  assert.deepEqual(evolution('evo_wuwo').innerMultiplier, [1.2, 1.44])
  near(evolution('evo_tiandi').windup, .45)
  near(evolution('evo_tiandi').windup + evolution('evo_tiandi').release_cooldown, 10)
})
