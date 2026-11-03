import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { ARCHETYPES, FLOOR01, FLOORS } from '../js/xianxia/TowerContent.js'
import { TowerRun } from '../js/xianxia/TowerRun.js'

const archetypes = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]))
const oldTargets = [63, 65, 78, 87, 90, 108, 105, 110, 119]
const eliteValues = [0, 3, 5, 8, 10, 12, 15, 18]
const bossValues = [0, 10, 15, 20, 25, 30, 35, 40]
const loadout = { active: { sj_yujian: 1 }, passive: {}, evolutions: [],
  weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }

// Read the authored lists independently; partitioning preserves non-boss order.
function authoredUnits(floor) {
  return FLOORS[floor - 1].waves.flatMap(wave => {
    if (floor === 1) return FLOOR01.waves[wave.wave - 1].batches.flatMap(batch =>
      batch.unit_ids.map(localId => ({ key: `${wave.wave}:${localId}`,
        wave: wave.wave, localId, archetype: batch.archetype })))
    const bosses = wave.enemy_groups.filter(g => archetypes[g.archetype].role === 'boss')
    const others = wave.enemy_groups.filter(g => archetypes[g.archetype].role !== 'boss')
    const ids = [...bosses, ...others].flatMap(g => Array(g.count).fill(g.archetype))
    return ids.map((archetype, index) => ({ key: `${wave.wave}:u${index + 1}`,
      wave: wave.wave, localId: `u${index + 1}`, archetype }))
  }).map(unit => ({ ...unit, ...archetypes[unit.archetype] }))
}

function checkPlan(loot, floor, seed, byKey) {
  const rule = loot.CORE_DROP_RULES[floor]
  const plan = loot.buildCoreDropPlan(floor, seed)
  let value = 0
  const entries = Object.entries(plan)
  for (const [key, rank] of entries) {
    assert.ok(byKey.has(key), `unknown entity ${floor}/${key}`)
    assert.equal(rank, byKey.get(key).rank, `wrong rank ${floor}/${key}`)
    value += loot.CORE_RANK_VALUES[rank]
  }
  assert.ok(entries.length >= rule.minCount && entries.length <= rule.maxCount,
    `floor ${floor}, seed ${seed}, count ${entries.length}`)
  assert.ok(value >= rule.minValue && value <= rule.maxValue,
    `floor ${floor}, seed ${seed}, value ${value}`)
  return { plan, value, count: entries.length }
}

test('graded core plans expose immutable rank values, floor rules and drop-only entries', async () => {
  const loot = await import('../js/xianxia/TowerLoot.js').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return null
    throw error
  })
  assert.equal(typeof loot?.buildCoreDropPlan, 'function', 'TowerLoot must implement the pure plan API')
  assert.deepEqual(loot.CORE_RANK_VALUES, [0, 1, 6, 24, 30, 36, 42, 48])
  assert.ok(Object.isFrozen(loot.CORE_RANK_VALUES))
  assert.ok(Object.isFrozen(loot.CORE_DROP_RULES))
  for (let floor = 1; floor <= 9; floor++) {
    assert.ok(Object.isFrozen(loot.CORE_DROP_RULES[floor]))
    const chances = loot.CORE_DROP_RULES[floor].chancesByRole
    assert.ok(Object.isFrozen(chances))
    for (const role of ['normal', 'elite', 'boss']) {
      assert.ok(Object.isFrozen(chances[role]))
      assert.equal(chances[role].length, 8)
      assert.equal(chances[role][0], 0)
      assert.ok(chances[role].every(p => p >= 0 && p <= 1))
    }
    const plan = loot.buildCoreDropPlan(floor, 0)
    assert.ok(Object.isFrozen(plan))
    assert.ok(Object.keys(plan).length > 0)
    for (const [key, rank] of Object.entries(plan)) {
      assert.match(key, /^\d+:(f01w\d+b\d+u\d+|u\d+)$/)
      assert.ok(Number.isInteger(rank) && rank >= 1 && rank <= 7)
    }
    assert.throws(() => { plan['1:u999'] = 7 }, TypeError)
  }
})

test('role and rank probabilities retain floor budgets after rank promotions', async () => {
  const loot = await import('../js/xianxia/TowerLoot.js')
  for (let floor = 1; floor <= 9; floor++) {
    const units = authoredUnits(floor)
    const normals = units.filter(u => u.role === 'normal')
    const elite = units.filter(u => u.role === 'elite')
    const bosses = units.filter(u => u.role === 'boss')
    if (floor === 1) assert.deepEqual([normals.length, elite.length, bosses.length], [372, 5, 1])
    const oldValue = oldTargets[floor - 1]
    const rule = loot.CORE_DROP_RULES[floor]
    assert.equal(rule.floor, floor)
    assert.equal(rule.targetValue, oldValue)
    assert.ok(rule.minValue >= oldValue * .9 && rule.maxValue <= oldValue * 1.1)
    assert.ok(rule.maxCount >= rule.minCount + 2)
    for (const [role, group] of [['normal', normals], ['elite', elite], ['boss', bosses]]) {
      const meanChance = group.reduce((n, u) => n + rule.chancesByRole[role][u.rank], 0) / group.length
      assert.ok(Math.abs(rule[`${role}Chance`] - meanChance) < 1e-12)
      assert.ok(group.every(u => rule.chancesByRole[role][u.rank] > 0
        && rule.chancesByRole[role][u.rank] < 1))
    }
  }
})

test('every authored entity matches TowerRun registration, including boss-first local IDs', async () => {
  const { buildCoreDropPlan } = await import('../js/xianxia/TowerLoot.js')
  for (let floor = 1; floor <= 9; floor++) {
    const units = authoredUnits(floor)
    const run = new TowerRun({ floor, attemptId: 1, seed: 123, hp: 100, xp: 0, loadout })
    for (let wave = 1; wave <= 20; wave++) {
      run.state.wave = wave
      run._registerWave()
      assert.deepEqual(run.state.pending.map(p => [p.localId, p.archetype]),
        units.filter(u => u.wave === wave).map(u => [u.localId, u.archetype]))
    }
    if (floor > 1) assert.equal(units.find(u => u.key === '20:u1').role, 'boss')
    const seen = new Set()
    const byKey = new Map(units.map(u => [u.key, u]))
    for (let seed = 0; seed < 10000; seed++) {
      for (const [key, rank] of Object.entries(buildCoreDropPlan(floor, seed))) {
        assert.equal(byKey.get(key)?.rank, rank)
        seen.add(key)
      }
    }
    assert.equal(seen.size, units.length, `floor ${floor}: every authored entity must be eligible`)
  }
})

test('many full-floor seeds respect both budgets and preserve credible conditional role/rank rates', async () => {
  const loot = await import('../js/xianxia/TowerLoot.js')
  const samples = 16000
  const means = []
  for (let floor = 1; floor <= 9; floor++) {
    const units = authoredUnits(floor)
    const byKey = new Map(units.map(u => [u.key, u]))
    const groups = new Map()
    for (const u of units) {
      const group = `${u.role}:${u.rank}`
      if (!groups.has(group)) groups.set(group, { opportunities: 0, hits: 0, role: u.role, rank: u.rank })
      groups.get(group).opportunities += samples
    }
    let sum = 0
    const prefixWaves = [1, 3, 5, 10, 15, 19]
    const prefixValues = prefixWaves.map(() => 0)
    const counts = new Set(), values = new Set()
    for (let i = 0; i < samples; i++) {
      // Odd multiplication is a permutation of uint32, sampling the entire range.
      const seed = Math.imul(i, 0x9e3779b1) >>> 0
      const { plan, count, value } = checkPlan(loot, floor, seed, byKey)
      counts.add(count); values.add(value); sum += value
      for (const key of Object.keys(plan)) {
        const u = byKey.get(key)
        groups.get(`${u.role}:${u.rank}`).hits++
        prefixWaves.forEach((wave, index) => {
          if (u.wave <= wave) prefixValues[index] += loot.CORE_RANK_VALUES[u.rank]
        })
      }
    }
    const rule = loot.CORE_DROP_RULES[floor]
    means.push(sum / samples)
    assert.ok(Math.abs(sum / samples - rule.targetValue) / rule.targetValue < .05)
    assert.ok(counts.size >= (floor >= 6 ? 2 : 3) && values.size >= (floor === 4 ? 2 : 3), 'denomination-feasible budgets must retain real variation')
    const specialScale = (rule.targetValue - units.filter(u => u.role === 'normal').length * .05)
      / units.filter(u => u.role !== 'normal').reduce((n, u) =>
        n + (u.role === 'elite' ? eliteValues : bossValues)[u.rank], 0)
    const budget = u => u.role === 'normal' ? .05
      : (u.role === 'elite' ? eliteValues : bossValues)[u.rank] * specialScale
    prefixWaves.forEach((wave, index) => {
      const target = units.filter(u => u.wave <= wave).reduce((n, u) => n + budget(u), 0)
      const ratio = prefixValues[index] / samples / target
      assert.ok(Math.abs(ratio - 1) <= .2, `floor ${floor} wave ${wave}: tempo ratio ${ratio}`)
    })
    for (const [name, group] of groups) {
      const rate = group.hits / group.opportunities
      const members=units.filter(u=>u.role===group.role&&u.rank===group.rank)
      const oldCredit=members.reduce((sum,u)=>sum+budget(u),0)/members.length
      const targetRate = oldCredit / loot.CORE_RANK_VALUES[group.rank]
      assert.ok(rate > 0 && rate < 1, `${floor}/${name}: drop and miss must both occur`)
      assert.ok(Math.abs(rate / targetRate - 1) < .2,
        `${floor}/${name}: conditioned rate ${rate} too far from old-credit target ${targetRate}`)
    }
  }
  // Preserve the old ordering, including floor 7's intentional lower kill budget.
  for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) {
    assert.equal(Math.sign(means[i] - means[j]), Math.sign(oldTargets[i] - oldTargets[j]))
  }
})

test('uint32 boundaries, cache eviction and JSON reload reproduce the same plan without global RNG', async t => {
  const loot = await import('../js/xianxia/TowerLoot.js')
  t.mock.method(Math, 'random', () => { throw new Error('loot must not use global random') })
  const seeds = [0, 1, 0x7fffffff, 0x80000000, 0xfffffffe, 0xffffffff]
  for (let floor = 1; floor <= 9; floor++) {
    const byKey = new Map(authoredUnits(floor).map(u => [u.key, u]))
    const saved = seeds.map(seed => checkPlan(loot, floor, seed, byKey).plan)
    for (let seed = 200; seed < 240; seed++) loot.buildCoreDropPlan(floor, seed)
    seeds.forEach((seed, index) => {
      const restoredInput = JSON.parse(JSON.stringify({ floor, seed }))
      const again = loot.buildCoreDropPlan(restoredInput.floor, restoredInput.seed)
      assert.deepEqual(again, saved[index])
      assert.deepEqual(JSON.parse(JSON.stringify(again)), { ...saved[index] })
    })
    assert.notDeepEqual(saved[0], saved[1], 'zero seed must not alias seed one')
  }
  for (const floor of [0, 10, -1, 1.5, NaN, Infinity, '1', null, undefined]) {
    assert.throws(() => loot.buildCoreDropPlan(floor, 0), RangeError)
  }
  for (const seed of [-1, 0x100000000, 1.5, NaN, Infinity, '1', null, undefined]) {
    assert.throws(() => loot.buildCoreDropPlan(1, seed), RangeError)
  }
})

test('version-one saved seed fixtures stay stable and plan queries leave combat RNG untouched', async () => {
  const { buildCoreDropPlan } = await import('../js/xianxia/TowerLoot.js')
  // Approved development-only rank/role rebalance replaces the old seed fixtures.
  // The corresponding mode profile is reset; current-version replay remains exact.
  const expected = [
    "196d94ff75dec15d57ff4ccc8c48cd13f4283fb1351a1edef6a351ef046e88fb",
    "f1ff99af0972954eb0102015b683a6ec642878d3e9fc5e25f55aae42441a060a",
    "24a6ba29539b870a254bbda46f6acd20d9d823b684021a7bbfa60f7f896384d8",
    "7d8b52c7eb35556eea626943fd09a9a223cce50d4032d6d294a606d6818b9462",
    "e96c4056b4c00557f2d51d903ea30fcbfce3a7d0e5d6f17c98023671301bd182",
    "063d6ff1a9b2b04500477ae20480be02b7cf488ca6ad89fae0647e0d1563df27",
    "e48d0a2203340503dcee534dcb5957e3d5c3c8d94884cd8780b34607120d174b",
    "326b95fa457f56389160846a179870d6d25c332d5e1ac42b8ba7d1370f06bcbc",
    "2c384e15f3f89c17c818904912a7db3545212dda42c656d0a06fa16cdc7e4515"
]

  for (let floor = 1; floor <= 9; floor++) {
    const run = new TowerRun({ floor, attemptId: 1, seed: 123, hp: 100, xp: 0, loadout })
    run.advance(1)
    const before = run.snapshot()
    const plan = buildCoreDropPlan(floor, 0xffffffff)
    assert.equal(createHash('sha256').update(JSON.stringify(plan)).digest('hex'), expected[floor - 1])
    for (let seed = 0; seed < 20; seed++) buildCoreDropPlan(floor, seed)
    assert.deepEqual(run.snapshot(), before)
    const restored = TowerRun.restore(before)
    run.advance(.5)
    restored.advance(.5)
    assert.deepEqual(restored.snapshot(), run.snapshot())
  }
})

test('arbitrary partial kills only earn their own one-core entries, without budget top-ups', async () => {
  const loot = await import('../js/xianxia/TowerLoot.js')
  for (let floor = 1; floor <= 9; floor++) {
    const units = authoredUnits(floor)
    const plan = loot.buildCoreDropPlan(floor, 8675309)
    const original = JSON.stringify(plan)
    const earned = subset => [...new Set(subset.map(u => u.key))]
      .reduce((value, key) => value + loot.CORE_RANK_VALUES[plan[key] ?? 0], 0)
    assert.equal(earned([]), 0)
    assert.equal(earned(units.filter(u => !plan[u.key])), 0)
    for (let residue = 0; residue < 7; residue++) {
      const subset = units.filter((_, i) => i % 7 === residue)
      const complement = units.filter((_, i) => i % 7 !== residue)
      assert.equal(earned(subset) + earned(complement), earned(units))
      assert.equal(earned(subset), earned(subset.reverse()))
      for (const unit of subset) assert.ok([0, loot.CORE_RANK_VALUES[unit.rank]].includes(earned([unit])))
    }
    assert.equal(JSON.stringify(plan), original)
    assert.deepEqual(loot.buildCoreDropPlan(floor, 8675309), plan)
  }
})

test('exhausted rejection has a finite deterministic fallback even when every random draw is zero', async () => {
  // Fault injection only at the integer PRNG primitive; no test hooks in production.
  // Mulberry's imul=0 makes every draw zero, forcing all entities into every proposal.
  const loot = await import('../js/xianxia/TowerLoot.js')
  const originalImul = Math.imul
  let callsMade = 0
  Math.imul = () => { callsMade++; return 0 }
  try { for (let floor = 1; floor <= 9; floor++) {
    const units = authoredUnits(floor), byKey = new Map(units.map(u => [u.key, u]))
    const before = callsMade
    const first = checkPlan(loot, floor, 0xfedcba98, byKey)
    const calls = callsMade - before
    assert.ok(calls >= 128 * units.length * 2, 'must exhaust the fixed proposal budget')
    assert.ok(calls < 130 * units.length * 2 + 20, 'fallback must finish without further rejection')
    loot.buildCoreDropPlan(floor, 42) // Evict the result so reconstruction is exercised.
    assert.deepEqual(loot.buildCoreDropPlan(floor, 0xfedcba98), first.plan)
    assert.ok(Math.abs(first.value - oldTargets[floor - 1]) <= (floor >= 4 ? 3 : 1))
  } } finally { Math.imul = originalImul }
})
