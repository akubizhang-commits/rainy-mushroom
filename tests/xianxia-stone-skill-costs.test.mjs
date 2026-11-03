import { TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GROWTH_SKILLS, GROWTH_EVOLUTIONS, GROWTH_RESEARCH,
  giftSkills, growthSummary, skillRequirement,
} from '../js/xianxia/TowerGrowth.js'

const state = (extra = {}) => ({
  xp: TOWER_XP_CAP, clearedFloor: 9, researchPurchases: 3, tutorialWaves: 3,
  skills: giftSkills(3), evolutionRanks: {}, books: [], spiritStones: 10000,
  ...extra,
})
const prerequisites = row => row.kind === 'evolution'
  ? { [row.parent]: 6, [row.passive]: 4 }
  : row.prerequisites
const definitions = [...GROWTH_SKILLS, ...GROWTH_EVOLUTIONS]

test('all special book quotes use the approved lower-grade spirit stone prices', () => {
  for (const row of definitions.filter(row => row.special)) {
    const expected = row.kind === 'evolution' ? 2400 : row.kind === 'active' ? 200 : 100
    const s = state({ skills: { ...giftSkills(3), ...prerequisites(row) } })
    const before = JSON.stringify(s)
    const quote = skillRequirement(s, row.id)
    assert.equal(row.bookCost, expected, row.id)
    assert.equal(quote.ok, true, row.id)
    assert.equal(quote.bookCost, expected, row.id)
    assert.equal(quote.cost, row.pointCosts[0], row.id)
    assert.equal(JSON.stringify(s), before, 'pure quoting never spends stones or SP')
  }
})

test('owned books waive stone quotes even after a respec; subsequent ranks only cost SP', () => {
  for (const row of definitions.filter(row => row.special)) {
    const s = state({ spiritStones: 0, books: [row.id],
      skills: { ...giftSkills(3), ...prerequisites(row) } })
    const quote = skillRequirement(s, row.id)
    assert.equal(quote.ok, true, row.id)
    assert.equal(quote.bookCost, 0, row.id)
    assert.equal(quote.cost, row.pointCosts[0], row.id)
    if (row.kind === 'evolution') {
      s.evolutionRanks[row.id] = 1
      s.skills[row.parent] = 7
      s.skills[row.passive] = GROWTH_SKILLS.find(skill => skill.id === row.passive).maxLevel
    } else s.skills[row.id] = 1
    const next = skillRequirement(s, row.id)
    assert.equal(next.ok, true, row.id)
    assert.equal(next.bookCost, 0, row.id)
    assert.equal(next.cost, row.pointCosts[1], row.id)
  }
})

test('ordinary upgrades remain SP-only, including the one-point flight passive', () => {
  for (const row of GROWTH_SKILLS.filter(row => !row.special)) {
    const s = state({ spiritStones: 0 })
    const quote = skillRequirement(s, row.id)
    assert.equal(quote.ok, true, row.id)
    assert.equal(quote.bookCost, 0, row.id)
    assert.equal(quote.cost, 1, row.id)
  }
  assert.deepEqual(growthSummary(state()), {
    total: 80, spent: 0, available: 80, realm: 48, firstClear: 20, research: 12, cap: 80,
  })
})

test('research uses four-point bundles with unchanged prices and floor unlocks', () => {
  assert.deepEqual(GROWTH_RESEARCH, [
    { purchase: 1, cost: 800, learnClear: 3, points: 4 },
    { purchase: 2, cost: 1600, learnClear: 6, points: 4 },
    { purchase: 3, cost: 2400, learnClear: 9, points: 4 },
  ])
})

test('stones cannot bypass stages, ranks, evolution parents or SP', () => {
  const rich = { spiritStones: 1000000 }
  const cases = [
    [state({ ...rich, xp: 0, skills: { sj_yujian: 1 }, tutorialWaves: 0 }), 'sj_arc', undefined],
    [state({ ...rich, xp: 0 }), 'sj_flight', 'stage-locked'],
    [state({ ...rich, xp: 720, skills: { ...giftSkills(3), sj_yujian: 9 } }), 'sj_yujian', 'realm-locked'],
    [state(rich), 'evo_wanjian', 'parent-required'],
    [state({ ...rich, clearedFloor: 0, researchPurchases: 0, skills: { ...giftSkills(3), sj_arc: 2 } }), 'sj_line', undefined],
    [state({ ...rich, xp: 45, clearedFloor: 0, researchPurchases: 0,
      skills: { ...giftSkills(3), sj_arc: 2 } }), 'sj_yujian', 'insufficient-points'],
  ]
  for (const [s, id, reason] of cases) assert.equal(skillRequirement(s, id).reason, reason)
})

test('pure book quotes do not authorize a purchase based on stone balance', () => {
  const s = state({ spiritStones: 0, skills: { ...giftSkills(3), sj_arc: 2 } })
  assert.deepEqual(skillRequirement(s, 'sj_line'), { ok: true, nextLevel: 1, cost: 2, bookCost: 200 })
  assert.equal(s.spiritStones, 0, 'Campaign owns affordability checks and atomic debits')
})
