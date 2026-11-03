import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, validateTowerSnapshot, coreLootSummary } from '../js/xianxia/TowerRun.js'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { CORE_DROP_RULES, CORE_RANK_VALUES, buildCoreDropPlan } from '../js/xianxia/TowerLoot.js'

const STEP = 1 / 60
const A = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]))
const loadout = { active: { sj_wanjian: 1 }, passive: {}, evolutions: [],
  weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }
const make = (extra = {}) => new TowerRun({
  attemptId: 1, floor: 1, seed: 123, hp: 100, xp: 0, normalCoreCounter: 19, loadout, ...extra,
})
const clone = value => JSON.parse(JSON.stringify(value))
const key = kill => `${kill.wave}:${kill.id.split(':').at(-1)}`
const grades = run => Object.fromEntries(run.state.killLedger.map(k => [key(k), k.coreRank]))
const gradeValue = snapshot => snapshot.killLedger.reduce((sum, kill) => sum + CORE_RANK_VALUES[kill.coreRank], 0)

// Explicit assist plus positioning exercises real authored spawns, full-HP
// enemies, skill hits and settlement. It is runtime coverage, not balance data.
function tick(run, selected = 'all') {
  for (const enemy of run.state.enemies) {
    enemy.x = selected === 'all' || selected === enemy.id ? run.state.player.x + 60 : -800
    enemy.y = selected === 'all' || selected === enemy.id ? run.state.player.y : -1000
  }
  run.advance(STEP)
}
function until(run, predicate, limit = 80000) {
  run.setPlaytestAssist(true)
  for (let i = 0; i < limit && !predicate(run.state) && run.state.phase === 'playing'; i++) tick(run)
  assert.ok(predicate(run.state), `floor ${run.state.floor}, wave ${run.state.wave}, kills ${run.state.killLedger.length}`)
}
function assertRejected(snapshot, mutate, label) {
  const corrupt = clone(snapshot)
  mutate(corrupt)
  assert.equal(validateTowerSnapshot(corrupt), false, label)
  assert.throws(() => TowerRun.restore(corrupt), label)
}
function firstDroppedKill(extra = {}) {
  const run = make(extra)
  until(run, s => s.killLedger.some(k => k.coreRank > 0))
  assert.ok(run.state.drops.some(d => d.kind === 'core'))
  assert.ok(validateTowerSnapshot(run.snapshot()))
  return run
}

test('new attempts default to version-one loot and validate uint32 identity without changing combat RNG', () => {
  for (const seed of [0, 1, 0x7fffffff, 0x80000000, 0xffffffff]) {
    const current = make({ seed }), explicit = make({ seed, lootVersion: 1 })
    const legacy = make({ seed, lootVersion: 0 })
    assert.deepEqual(current.snapshot(), explicit.snapshot())
    assert.deepEqual(Object.keys(current.state.loot).sort(), ['seed', 'version'])
    assert.equal(current.state.loot.version, 1)
    assert.ok(Number.isInteger(current.state.loot.seed) && current.state.loot.seed >= 0
      && current.state.loot.seed <= 0xffffffff)
    assert.equal(current.state.rng, legacy.state.rng)
    assert.equal(Object.hasOwn(legacy.snapshot(), 'loot'), false)
    assert.ok(validateTowerSnapshot(current.snapshot()))
    assert.deepEqual(TowerRun.restore(clone(current.snapshot())).snapshot(), current.snapshot())
  }
  for (const lootVersion of [-1, 2, .5, '1', true, null, NaN, Infinity]) {
    assert.throws(() => make({ lootVersion }), RangeError)
  }
})

test('all nine full combat floors pay exact authored grades inside both count and value bounds', () => {
  const droppedRoles = new Set(), droppedRanks = new Set()
  let kills = 0
  for (let floor = 1; floor <= 9; floor++) {
    const run = make({ floor, seed: 456 })
    run.setPlaytestAssist(true)
    const identity = clone(run.state.loot), plan = buildCoreDropPlan(floor, identity.seed)
    for (let i = 0; i < 80000 && run.state.phase === 'playing'; i++) {
      const before = run.state.killLedger.length
      tick(run)
      for (const kill of run.state.killLedger.slice(before)) {
        assert.equal(kill.coreRank, plan[key(kill)] ?? 0, `floor ${floor}, ${key(kill)}`)
        assert.ok(kill.coreRank === 0 || kill.coreRank === A[kill.archetype].rank)
        const visuals = run.state.drops.filter(d => d.kind === 'core' && d.killId === kill.id)
        assert.equal(visuals.length, kill.coreRank ? 1 : 0)
        if (kill.coreRank) {
          droppedRoles.add(A[kill.archetype].role)
          droppedRanks.add(kill.coreRank)
          assert.equal(visuals[0].rank, A[kill.archetype].rank)
          assert.equal(visuals[0].amount, CORE_RANK_VALUES[kill.coreRank])
          assert.ok(Number.isFinite(visuals[0].x) && Number.isFinite(visuals[0].y))
          assert.ok(visuals[0].expiresAt > run.state.time)
        }
      }
    }
    assert.equal(run.state.phase, 'won', `floor ${floor}`)
    const snapshot = run.snapshot(), count = snapshot.killLedger.filter(k => k.coreRank > 0).length
    const value = gradeValue(snapshot), rule = CORE_DROP_RULES[floor]
    assert.ok(count >= rule.minCount && count <= rule.maxCount, `floor ${floor} count ${count}`)
    assert.ok(value >= rule.minValue && value <= rule.maxValue, `floor ${floor} value ${value}`)
    assert.equal(snapshot.earned.cores, value + 5 * (floor - 1))
    const summary = coreLootSummary(snapshot)
    assert.equal(summary.count, count)
    assert.equal(summary.value, value, 'the UI summary counts kill denominations, excluding clear bonuses')
    assert.equal(summary.value, summary.byRank.reduce((sum, count, index) =>
      sum + count * CORE_RANK_VALUES[index + 1], 0))
    assert.equal(snapshot.earned.contribution, 100 + 5 * (floor - 1))
    assert.equal(snapshot.normalCoreCounter, 19)
    assert.deepEqual(snapshot.loot, identity)
    assert.deepEqual(Object.fromEntries(Object.entries(grades(run)).filter(([, rank]) => rank > 0)), { ...plan })
    assert.ok(validateTowerSnapshot(snapshot))
    const restored = TowerRun.restore(clone(snapshot))
    restored.advance(60)
    assert.deepEqual(restored.snapshot(), snapshot, 'terminal reload cannot award again')
    kills += snapshot.killLedger.length
  }
  assert.equal(kills, 4770)
  assert.deepEqual([...droppedRoles].sort(), ['boss', 'elite', 'normal'])
  assert.deepEqual([...droppedRanks].sort(), [1, 2, 3, 4, 5, 6, 7])
})

test('forward, reverse and interleaved kill order use the same wave/local-ID plan on floors one and nine', () => {
  for (const floor of [1, 9]) {
    const waiting = make({ floor })
    waiting.setPlaytestAssist(true)
    for (let i = 0; i < 2000 && (waiting.state.pending.length || waiting.state.reserved.length); i++) {
      tick(waiting, null)
    }
    assert.equal(waiting.state.killLedger.length, 0)
    assert.equal(waiting.state.enemies.length, waiting.state.wavePlanned)
    assert.ok(validateTowerSnapshot(waiting.snapshot()))
    const initial = waiting.snapshot(), ids = initial.enemies.map(e => e.id)
    const orders = [ids, [...ids].reverse(), [...ids.filter((_, i) => i % 2), ...ids.filter((_, i) => !(i % 2))]]
    const results = []
    for (const order of orders) {
      const run = TowerRun.restore(clone(initial))
      run.setPlaytestAssist(true)
      for (const id of order) {
        const before = run.state.killLedger.length
        tick(run, id)
        assert.equal(run.state.killLedger.length, before + 1)
        assert.equal(run.state.killLedger.at(-1).id, id)
      }
      assert.deepEqual(run.state.killLedger.map(k => k.id), order)
      const plan = buildCoreDropPlan(floor, initial.loot.seed)
      for (const kill of run.state.killLedger) assert.equal(kill.coreRank, plan[key(kill)] ?? 0)
      assert.equal(run.state.earned.cores, gradeValue(run.snapshot()))
      assert.equal(run.state.normalCoreCounter, 19)
      assert.ok(validateTowerSnapshot(run.snapshot()))
      results.push(grades(run))
    }
    for (const result of results) assert.deepEqual(result, results[0])
  }
})

test('loot allocation leaves combat RNG, healing rolls and crit rolls identical to legacy rewards', () => {
  const current = make({ loadout: { ...loadout, passive: { sj_heart: 5 } } })
  const legacy = make({ lootVersion: 0, loadout: { ...loadout, passive: { sj_heart: 5 } } })
  const identity = clone(current.state.loot)
  current.setPlaytestAssist(true); legacy.setPlaytestAssist(true)
  for (let i = 0; i < 6000 && current.state.killLedger.length < 40; i++) {
    tick(current); tick(legacy)
    assert.equal(current.state.rng, legacy.state.rng)
    assert.deepEqual(current.state.loot, identity)
    assert.deepEqual(current.state.killLedger.map(({ coreRank, ...kill }) => kill), legacy.state.killLedger)
    const heals = run => run.state.drops.filter(d => d.kind === 'heal').map(({ id, ...drop }) => drop)
    assert.deepEqual(heals(current), heals(legacy))
    const hits = run => run.state.effects.filter(e => e.kind === 'hit').map(({ id, ...effect }) => effect)
    assert.deepEqual(hits(current), hits(legacy))
  }
  assert.ok(current.state.killLedger.length >= 40)
  assert.equal(current.state.normalCoreCounter, 19)
  const normalKills = legacy.state.killLedger.filter(k => A[k.archetype].role === 'normal').length
  assert.equal(legacy.state.normalCoreCounter, (19 + normalKills) % 20)
  assert.ok(legacy.state.earned.cores >= 2, 'forty real normal kills exercise the legacy counter twice')
})

test('paused and live JSON resumes retain the same seed, future grades, visuals and automatic awards', () => {
  const run = firstDroppedKill({ floor: 8 })
  run.advance(.007)
  run.pause()
  const saved = run.snapshot()
  run.advance(60)
  assert.deepEqual(run.snapshot(), saved)
  const restored = TowerRun.restore(clone(saved))
  assert.deepEqual(restored.snapshot(), saved)
  for (const actor of [run, restored]) { actor.resume(); actor.setPlaytestAssist(true) }
  for (let i = 0; i < 2000; i++) {
    tick(run); tick(restored)
    if (i % 97 === 0) {
      assert.deepEqual(restored.snapshot(), run.snapshot())
      assert.ok(validateTowerSnapshot(run.snapshot()))
    }
  }
  assert.ok(run.state.killLedger.length > saved.killLedger.length)
  assert.deepEqual(run.snapshot(), restored.snapshot())
  assert.deepEqual(run.state.loot, saved.loot)
  assert.equal(run.state.earned.cores,
    gradeValue(run.snapshot()) + (run.state.phase === 'won' ? 5 * (run.state.floor - 1) : 0))
})

test('core visuals are already credited at the kill, persist through reload and never credit on touch or expiry', () => {
  const run = firstDroppedKill({ floor: 9 })
  const saved = run.snapshot(), drop = saved.drops.find(d => d.kind === 'core')
  assert.ok(drop.rank > 1, 'high-rank value must not be mistaken for an item count')
  assert.equal(saved.earned.cores, gradeValue(saved))
  assert.ok(Math.hypot(drop.x - saved.player.x, drop.y - saved.player.y) > 36)
  for (const touch of [false, true]) {
    const restored = TowerRun.restore(clone(saved))
    restored.setPlaytestAssist(true)
    if (touch) { restored.state.player.x = drop.x; restored.state.player.y = drop.y }
    for (let i = 0; i < 240; i++) tick(restored, null)
    assert.equal(restored.state.killLedger.length, saved.killLedger.length)
    assert.deepEqual(restored.state.earned, saved.earned)
    assert.ok(!restored.state.drops.some(d => d.kind === 'core' && d.killId === drop.killId))
    assert.ok(validateTowerSnapshot(restored.snapshot()))
    restored.abandon()
    assert.deepEqual(restored.state.earned, saved.earned)
  }
})

test('UI snapshot core summary reports denomination value separately from item count and rank sum', () => {
  const snapshot = firstDroppedKill({ floor: 9 }).snapshot()
  assert.equal(snapshot.phase, 'playing', 'use actual partial loot before any floor-clear bonus')
  const drops = snapshot.killLedger.filter(k => k.coreRank > 0)
  assert.ok(drops.some(k => CORE_RANK_VALUES[k.coreRank] > k.coreRank), 'exercise a nonlinear denomination')
  const byRank = [0, 0, 0, 0, 0, 0, 0]
  for (const kill of drops) byRank[kill.coreRank - 1]++
  const expected = {
    byRank, count: drops.length,
    value: drops.reduce((sum, kill) => sum + CORE_RANK_VALUES[kill.coreRank], 0),
  }
  const summary = coreLootSummary(snapshot)
  assert.deepEqual(summary, expected)
  assert.equal(summary.value, snapshot.earned.cores)
  assert.ok(summary.value > summary.count, 'the denomination value is not the number of dropped items')
  assert.ok(summary.value > drops.reduce((sum, kill) => sum + kill.coreRank, 0),
    'the denomination value is not the numeric sum of ranks')
  assert.deepEqual(coreLootSummary(TowerRun.restore(clone(snapshot)).snapshot()), expected)
  for (const visual of snapshot.drops.filter(d => d.kind === 'core')) {
    assert.equal(visual.amount, CORE_RANK_VALUES[visual.rank])
    assert.equal(drops.filter(k => k.id === visual.killId).length, 1)
  }
  summary.byRank.fill(0)
  assert.deepEqual(coreLootSummary(snapshot), expected, 'UI consumers cannot mutate the snapshot receipt')
})

test('partial kills, retreat and death retain only actual drops and never receive a full-floor minimum', () => {
  const run = make()
  const plan = buildCoreDropPlan(1, run.state.loot.seed)
  run.setPlaytestAssist(true)
  for (let i = 0; i < 2000 && (run.state.pending.length || run.state.reserved.length); i++) tick(run, null)
  const misses = run.state.enemies.filter(e => !plan[`1:${e.id.split(':').at(-1)}`])
  assert.ok(misses.length > 0)
  tick(run, misses[0].id)
  assert.equal(run.state.killLedger.length, 1)
  assert.equal(run.state.killLedger[0].coreRank, 0)
  assert.equal(run.state.earned.cores, 0, 'a carried counter of nineteen cannot override a planned miss')
  const partial = run.snapshot()
  for (const outcome of ['abandoned', 'lost']) {
    const actor = TowerRun.restore(partial)
    if (outcome === 'abandoned') actor.abandon()
    else { actor.state.player.hp = 0; actor.advance(STEP) }
    assert.equal(actor.state.phase, outcome)
    assert.equal(actor.state.earned.cores, 0)
    assert.equal(actor.state.normalCoreCounter, 19)
    assert.ok(actor.state.earned.cores < CORE_DROP_RULES[1].minValue)
    assert.ok(validateTowerSnapshot(actor.snapshot()))
    actor.advance(60)
    assert.equal(actor.state.earned.cores, 0)
  }
  const dropped = firstDroppedKill().snapshot()
  for (const outcome of ['abandoned', 'lost']) {
    const actor = TowerRun.restore(dropped)
    if (outcome === 'abandoned') actor.abandon()
    else { actor.state.player.hp = 0; actor.advance(STEP) }
    assert.equal(actor.state.earned.cores, gradeValue(dropped))
    assert.ok(actor.state.earned.cores < CORE_DROP_RULES[1].minValue)
    assert.ok(validateTowerSnapshot(actor.snapshot()))
  }
})

test('corrupt loot identity, grades, monetary totals and core visuals are rejected on validation and restore', () => {
  const saved = firstDroppedKill({ floor: 9 }).snapshot()
  const dropped = saved.killLedger.findIndex(k => k.coreRank > 0)
  const visual = saved.drops.findIndex(d => d.kind === 'core')
  for (const [label, mutate] of [
    ['null loot', s => { s.loot = null }],
    ['array loot', s => { s.loot = [] }],
    ['unknown version', s => { s.loot.version = 2 }],
    ['missing seed', s => { delete s.loot.seed }],
    ['negative seed', s => { s.loot.seed = -1 }],
    ['overflow seed', s => { s.loot.seed = 0x100000000 }],
    ['fractional seed', s => { s.loot.seed = .5 }],
    ['string seed', s => { s.loot.seed = '123' }],
    ['extra loot field', s => { s.loot.rolls = [] }],
    ['missing kill grade', s => { delete s.killLedger[dropped].coreRank }],
    ['grade above seven', s => { s.killLedger[dropped].coreRank = 8 }],
    ['negative grade', s => { s.killLedger[dropped].coreRank = -1 }],
    ['string grade', s => { s.killLedger[dropped].coreRank = String(s.killLedger[dropped].coreRank) }],
    ['fractional grade', s => { s.killLedger[dropped].coreRank = 1.5 }],
    ['wrong grade and matching forged wallet', s => {
      s.earned.cores += CORE_RANK_VALUES[1] - CORE_RANK_VALUES[s.killLedger[dropped].coreRank]
      s.killLedger[dropped].coreRank = 1
      s.drops = s.drops.filter(d => d.kind !== 'core')
    }],
    ['unearned minimum', s => { s.earned.cores = CORE_DROP_RULES[9].minValue }],
    ['extra credited core', s => { s.earned.cores++ }],
    ['advanced legacy counter', s => { s.normalCoreCounter = 0 }],
    ['removed loot identity', s => { delete s.loot }],
    ['wrong visual amount', s => { s.drops[visual].amount++ }],
    ['wrong visual rank', s => { s.drops[visual].rank = 1 }],
    ['missing kill reference', s => { delete s.drops[visual].killId }],
    ['unearned kill reference', s => { s.drops[visual].killId = s.enemies[0]?.id ?? 'unearned' }],
    ['invalid vertical position', s => { s.drops[visual].y = NaN }],
    ['invalid expiry', s => { s.drops[visual].expiresAt = Infinity }],
    ['duplicate core visual', s => { s.drops.push({ ...s.drops[visual], id: 'duplicate-core' }) }],
  ]) assertRejected(saved, mutate, label)
  const originalPlan = buildCoreDropPlan(saved.floor, saved.loot.seed)
  let differentSeed = 0
  while ((buildCoreDropPlan(saved.floor, differentSeed)[key(saved.killLedger[dropped])] ?? 0)
    === originalPlan[key(saved.killLedger[dropped])]) differentSeed++
  assertRejected(saved, s => { s.loot.seed = differentSeed }, 'rerolled plan contradicts an accepted grade')
})

test('snapshots without loot remain legacy across repeated resumes and retain counter, elite and boss payouts', () => {
  let run = make({ lootVersion: 0 })
  const eliteValues = [0, 3, 5, 8, 10, 12, 15, 18], bossValues = [0, 10, 15, 20, 25, 30, 35, 40]
  let cores = 0, counter = 19, resumes = 0
  const roles = new Set()
  run.setPlaytestAssist(true)
  for (let i = 0; i < 80000 && run.state.phase === 'playing'; i++) {
    const before = run.state.killLedger.length
    // This is a legacy payout/reload fixture, not a level-one damage benchmark.
    // Resolve long elite/boss fights through the real damage/death path.
    for (const e of run.state.enemies) if (!e.temporary && e.role !== 'normal')
      run._damageEnemy({ target: e.id, damage: 1e9, direct: false, scaled: true, source: 'loot-fixture' })
    tick(run)
    for (const kill of run.state.killLedger.slice(before)) {
      const a = A[kill.archetype]
      roles.add(a.role)
      assert.equal(Object.hasOwn(kill, 'coreRank'), false)
      if (a.role === 'normal') {
        if (++counter === 20) { cores++; counter = 0 }
      } else cores += (a.role === 'elite' ? eliteValues : bossValues)[a.rank]
    }
    assert.equal(run.state.earned.cores, cores)
    assert.equal(run.state.normalCoreCounter, counter)
    assert.equal(Object.hasOwn(run.state, 'loot'), false)
    assert.ok(!run.state.drops.some(d => d.kind === 'core'))
    if (i % 337 === 0) {
      run.pause()
      const snapshot = run.snapshot()
      run = TowerRun.restore(clone(snapshot))
      assert.deepEqual(run.snapshot(), snapshot)
      run.resume(); run.setPlaytestAssist(true)
      resumes++
    }
  }
  assert.equal(run.state.phase, 'won')
  assert.equal(cores, 64, 'floor one legacy kill value is 63 plus the carried nineteenth kill')
  assert.equal(counter, 11)
  assert.deepEqual([...roles].sort(), ['boss', 'elite', 'normal'])
  assert.ok(resumes > 10)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('training performs actual kills and resets while every grade, wallet award and core visual stays empty', () => {
  const run = make({ training: true, floor: 9 })
  run.setPlaytestAssist(true)
  const identity = clone(run.state.loot)
  let previous = 0, resets = 0, observed = 0
  for (let i = 0; i < 10000 && resets < 2; i++) {
    tick(run)
    const count = run.state.killLedger.length
    if (count < previous) resets++
    else observed += count - previous
    previous = count
    assert.ok(run.state.killLedger.every(k => k.coreRank === 0))
    assert.deepEqual(run.state.earned, { xp: 0, cores: 0, contribution: 0 })
    assert.ok(!run.state.drops.some(d => d.kind === 'core'))
    assert.equal(run.state.normalCoreCounter, 19)
    assert.deepEqual(run.state.loot, identity)
    if (i % 101 === 0) assert.ok(validateTowerSnapshot(run.snapshot()))
  }
  assert.equal(resets, 2)
  assert.ok(observed >= 16)
  assert.equal(run.state.player.xp, 0)
  assert.equal(run.state.phase, 'playing')
})
