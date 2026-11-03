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
    assert.equal(realmPoints(xpAt(level)) - realmPoints(xpAt(level) - 1), level === 11 ? 9 : level === 21 ? 15 : level % 10 === 0 ? 0 : 1)
  }
  near(cultivationAt(45).maxHp, 108)
  near(cultivationAt(120).maxHp, 116.64)
  assert.equal(cultivationAt(14400).capped, true)
  assert.equal(realmPoints(14400), 48)
})

test('six active curves have distinct starting damage and exact per-rank growth with distinct cadence', () => {
  for (const [id, base, multiplier, interval] of [
    ['sj_yujian', 1.2, 1.13, 1], ['sj_arc', 1.2, 1.15, 1.8],
    ['sj_wanjian', .30, 1.2, 6], ['sj_line', 14.4, 1.1, 6],
    ['sj_shadow', 3.52, (2.64*1.2**9/3.52)**(1/9), 2.2], ['sj_formation', 32 / 15, 1.15, 8],
  ]) {
    const row = skill(id)
    near(row.damage[0], base)
    assert.equal(row.cooldown ?? row.hit_interval, interval)
    for (let i = 1; i < 10; i++) {
      near(row.damage[i] / row.damage[i - 1], id === 'sj_yujian' && i <= 2 ? [1.25,1.2][i-1] : id === 'sj_arc' && i <= 2 ? [1.4, 3/2.1][i-1] : multiplier)
      near(row.levels[i].damage, id === 'sj_yujian' ? (i === 1 ? 1.5 : 1.8 * 1.13 ** (i-2)) : id === 'sj_arc' ? (.8 * (i === 0 ? 1.5 : i === 1 ? 2.1 : 3 * 1.15 ** (i-2))) : base * multiplier ** i)
    }
  }
  const dps = (id, rank) => skill(id).damage[rank - 1] * skill(id).single_dps_factor
  assert.ok(dps('sj_wanjian', 5) < dps('sj_arc', 5))
  assert.ok(dps('sj_wanjian', 6) < dps('sj_arc', 6))
  assert.ok(dps('sj_shadow', 6) < dps('sj_line', 6))
  assert.ok(dps('sj_shadow', 10) > dps('sj_line', 10))
  assert.equal(skill('sj_shadow').target_cap, 3)
})

test('rank caps unlock on the approved levels and do not bypass learning, floor or point gates', () => {
  for (let level = 1; level <= 30; level++) {
    for (const row of GROWTH_SKILLS) {
      const expected = row.rankRequirements.filter(req => req.characterLevel <= level).length
      assert.equal(rankCap(row.id, xpAt(level), 9), expected, `${row.id} at ${level}`)
    }
  }
  const state = { xp: xpAt(11), clearedFloor: 2, skills: { sj_yujian: 1 }, books: [] }
  assert.deepEqual(skillRequirement(state, 'sj_formation'), { ok: true, nextLevel: 1, cost: 2, bookCost: 200 })
  assert.equal(skillRequirement({ ...state, xp: xpAt(11) - 1 }, 'sj_formation').reason, 'stage-locked')
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
