import { TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { CORE_RANK_VALUES } from '../js/xianxia/TowerLoot.js'

const STEP = 1 / 60
const plain = { active: { sj_yujian: 1 }, passive: {}, evolutions: [],
  weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }
const make = (extra = {}) => new TowerRun({
  attemptId: 1, floor: 1, seed: 123, hp: 37, xp: 0, normalCoreCounter: 0,
  loadout: plain, ...extra,
})
const step = (run, n = 1) => { for (let i = 0; i < n; i++) run.advance(STEP) }
const loadout = (active, passive = {}, evolutions = []) => ({
  ...plain, active, passive, evolutions,
})

// Controlled positioning/HP isolates real skill hits and the finite spawn/reward
// machinery from player survival. This is not a bot or a balance/clearability test.
function clearControlled(run, limit = 80000) {
  const families = new Set()
  for (let i = 0; i < limit && run.state.phase === 'playing'; i++) {
    run.state.player.hp = run.state.player.maxHp
    for (const e of run.state.enemies) {
      families.add(e.family)
      e.hp = Math.min(e.hp, 1)
      e.x = run.state.player.x + 60
      e.y = run.state.player.y
      e.ai.graceUntil = run.state.time + 10
    }
    run.advance(1 / 30)
    assert.equal(run.state.wavePlanned, run.state.pending.length + run.state.reserved.length
      + run.state.enemies.length + run.state.waveKilled)
  }
  assert.equal(run.state.phase, 'won', `floor ${run.state.floor} stalled at wave ${run.state.wave}`)
  return families
}

test('constructor preserves fractional HP, bounds growth/equipment, and copies loadout', () => {
  const selected = loadout({ sj_yujian: 5 })
  const run = make({ hp: 0.5, xp: 10920, loadout: { ...selected, weaponQuality: 4, weaponRefine: 4 } })
  assert.equal(run.state.player.hp, 0.5)
  assert.equal(run.state.player.maxHp, 100 * 1.08 ** 24 * 1.35 ** 2)
  close(run.state.player.attack, 110 * 1.08 ** 24 * 1.35 ** 2 * 1.3)
  assert.equal(run.state.wave, 1)
  assert.equal(run.state.wavePlanned, 10)
  assert.equal(run.state.cooldowns.sj_yujian, 0)
  selected.active.sj_yujian = 1
  assert.equal(run.state.loadout.active.sj_yujian, 5)
  assert.ok(validateTowerSnapshot(run.snapshot()))
  for (const patch of [{ floor: 10 }, { hp: 0 }, { xp: TOWER_XP_CAP+1 }, { normalCoreCounter: 20 },
    { loadout: { ...plain, weaponQuality: 5 } }]) assert.throws(() => make(patch))
})

test('owned evolutions work and restore without equipping their learning-prerequisite passive', () => {
  for (const [parent, evolution, range, duration, multiplier] of [
    ['sj_yujian', 'evo_wanjian', 100, 1.4, 1.188 + 6 * .352],
    ['sj_wanjian', 'evo_wuwo', 90, .5, .308],
    ['sj_line', 'evo_tiandi', 100, 1, 2.7225],
    ['sj_formation', 'evo_sixiang', 100, 3.3, .22 * 6],
  ]) {
    // Campaign owns learning/ownership checks; Run receives only equipped skills.
    const original = make({ loadout: loadout({ [parent]: 5 }, {}, [evolution]) })
    assert.ok(validateTowerSnapshot(original.snapshot()), evolution)
    const run = TowerRun.restore(original.snapshot())
    assert.deepEqual(run.state.loadout.passive, {})
    const enemy = targets(run, range)
    run.advance(.4)
    run.state.cooldowns[parent] = 99999 // Observe just one cast (and its evolution).
    run.advance(duration - .4)
    close(100000 - enemy.hp, (['sj_yujian','sj_line'].includes(parent) ? 116.6 : 106) * multiplier)
  }
})

test('evolutions still require equipped level-five parents and retain the two-evolution limit', () => {
  const two = loadout({ sj_yujian: 5, sj_line: 5 }, {}, ['evo_wanjian', 'evo_tiandi'])
  assert.ok(validateTowerSnapshot(make({ loadout: two }).snapshot()))
  for (const invalid of [
    loadout({ sj_arc: 5 }, {}, ['evo_tiandi']),
    loadout({ sj_line: 4 }, {}, ['evo_tiandi']),
    loadout({ sj_yujian: 5, sj_line: 5, sj_formation: 5 }, {},
      ['evo_wanjian', 'evo_tiandi', 'evo_sixiang']),
    loadout({ sj_yujian: 5 }, {}, ['evo_wanjian', 'evo_wanjian']),
  ]) {
    assert.throws(() => make({ loadout: invalid }))
  }
})

test('movement is normalized, fixed-step and bounded; pause freezes every timer and RNG', () => {
  const run = make()
  run.setInput(1, 1)
  run.advance(1)
  assert.ok(Math.abs(Math.hypot(run.state.player.x - 33, run.state.player.y + 60) - 220) < 1e-7)
  run.pause()
  const paused = run.snapshot()
  run.setInput(-1, -1)
  run.advance(60)
  assert.deepEqual(run.snapshot(), paused)
  const reload = TowerRun.restore(JSON.parse(JSON.stringify(paused)))
  reload.resume()
  run.resume()
  run.advance(0.37)
  reload.advance(0.37)
  assert.deepEqual(reload.snapshot(), run.snapshot())
  run.setInput(1, 1)
  run.advance(10)
  assert.ok(run.state.player.x <= 960 && run.state.player.y <= 1002)
  assert.throws(() => run.advance(Infinity))
})

test('finite warning reservations cannot spawn instantly or exceed capacity', () => {
  const run = make()
  run.advance(0.5)
  assert.equal(run.state.enemies.length, 0)
  assert.ok(run.state.reserved.length > 0)
  const warning = run.state.reserved[0]
  run.state.player.x = warning.x
  run.state.player.y = warning.y
  run.advance(0.5)
  assert.ok(!run.state.enemies.some(e => e.id === warning.id), 'unsafe materialization must retry')
  for (let i = 0; i < 300; i++) {
    step(run)
    assert.ok(run.state.enemies.length + run.state.reserved.length <= 24)
    assert.equal(run.state.wavePlanned, run.state.pending.length + run.state.reserved.length
      + run.state.enemies.length + run.state.waveKilled)
  }
})

test('JSON restore continues warnings, RNG, attacks, cooldowns and accumulated time exactly', () => {
  const a = make({ loadout: loadout({ sj_yujian: 5, sj_shadow: 5, sj_formation: 5 },
    { sj_heart: 5, sj_mark: 5, sj_bone: 5 }) })
  a.advance(0.719)
  const b = TowerRun.restore(a.snapshot())
  for (let i = 0; i < 600; i++) {
    const x = Math.sin(i / 20), y = Math.cos(i / 30)
    a.setInput(x, y); b.setInput(x, y)
    a.advance(0.017); b.advance(0.017)
  }
  assert.deepEqual(a.snapshot(), b.snapshot())
  assert.ok(validateTowerSnapshot(a.snapshot()))
  const snapshot = a.snapshot()
  snapshot.player.hp = 999
  assert.notEqual(a.state.player.hp, 999)
  assert.equal(validateTowerSnapshot(snapshot), false)
})

test('real kills award immediately before full wave; replay and abandonment retain them once', () => {
  const run = make({ normalCoreCounter: 19, lootVersion: 0 })
  run.advance(1)
  const enemy = run.state.enemies[0]
  enemy.x = run.state.player.x + 55
  enemy.y = run.state.player.y
  enemy.hp = 1
  step(run, 90)
  assert.ok(run.state.waveKilled >= 1)
  assert.ok(run.state.earned.xp >= 1)
  assert.equal(run.state.earned.cores, 1)
  assert.equal(run.state.earned.contribution, 0)
  const reload = TowerRun.restore(run.snapshot())
  const earned = { ...reload.state.earned }
  reload.abandon()
  reload.advance(10)
  assert.deepEqual(reload.state.earned, earned)
  assert.equal(reload.state.phase, 'abandoned')
  assert.ok(validateTowerSnapshot(reload.snapshot()))
})

test('legacy loot: all 180 authored waves retain kill budgets without retired wave vouchers', () => {
  let xp = 0, cores = 0, contribution = 0, deaths = 0, counter = 0
  const families = new Set()
  for (let floor = 1; floor <= 9; floor++) {
    const run = make({ floor, hp: 120, xp: TOWER_XP_CAP, normalCoreCounter: counter, lootVersion: 0,
      loadout: loadout({ sj_yujian: 5, sj_arc: 5, sj_wanjian: 5, sj_formation: 5 }) })
    for (const family of clearControlled(run)) families.add(family)
    assert.ok(validateTowerSnapshot(run.snapshot()), `floor ${floor} valid after clear`)
    deaths += run.state.killLedger.length
    // Capped XP is discarded; the raw yield remains auditable from actual kills.
    xp += run.state.rawKillXp
    cores += run.state.earned.cores
    contribution += run.state.earned.contribution
    counter = run.state.normalCoreCounter
    assert.equal(run.state.earned.xp, 0)
    assert.equal(run.state.clearedWaves.length, 20)
    if (floor === 1) assert.deepEqual(
      [run.state.rawKillXp, run.state.earned.cores, run.state.earned.contribution], [180, 63, 0])
  }
  assert.deepEqual([deaths, xp, cores, contribution, counter], [4772, 10920, 1117, 0, 16])
  assert.equal(families.size, 11)
})

test('training never produces progression and cannot masquerade as a tower clear', () => {
  const run = make({ training: true })
  run.advance(1)
  for (const enemy of run.state.enemies) {
    enemy.hp = 1; enemy.x = 70; enemy.y = -60
  }
  step(run, 180)
  assert.deepEqual(run.state.earned, { xp: 0, cores: 0, contribution: 0 })
  assert.equal(run.state.player.xp, 0)
  assert.equal(run.state.normalCoreCounter, 0)
  assert.notEqual(run.state.phase, 'won')
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('snapshot validation rejects forged rewards, duplicated IDs, NaN and lost kill membership', () => {
  const run = make()
  run.advance(1)
  for (const mutate of [
    s => { s.earned.cores++ },
    s => { s.rng = 0 },
    s => { s.player.x = NaN },
    s => { s.pending.push({ ...s.pending[0] }) },
    s => { s.waveKilled++ },
    s => { s.enemies[0].ai = {} },
  ]) {
    const snapshot = run.snapshot()
    mutate(snapshot)
    assert.equal(validateTowerSnapshot(snapshot), false)
    assert.throws(() => TowerRun.restore(snapshot))
  }
})

function targets(run, range = 100) {
  run.advance(2)
  for (const pending of run.state.pending) pending.retryAt = 99999
  for (const e of run.state.enemies) {
    e.x = -800; e.y = -1000
    e.moveSpeed = 0; e.hp = e.maxHp = 100000; e.physicalDefense = e.magicDefense = 0
    e.ai.graceUntil = 99999
  }
  const enemy = run.state.enemies[0]
  enemy.x = run.state.player.x + range
  enemy.y = run.state.player.y
  return enemy
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`)

test('six active skills retain separate geometric and per-cast damage budgets', () => {
  for (const [skill, range, seconds, multiplier] of [
    ['sj_yujian', 100, .5, 1.32],
    ['sj_arc', 100, .5, 1.30],
    ['sj_wanjian', 80, 1.2, .28 * 2],
    ['sj_line', 100, .5, 1.65],
    ['sj_shadow', 100, 1, 1.50],
    ['sj_formation', 100, 3.3, .20 * 6],
  ]) {
    const run = make({ loadout: loadout({ [skill]: 5 }) })
    const enemy = targets(run, range)
    run.advance(seconds)
    close(100000 - enemy.hp, (['sj_yujian','sj_arc','sj_line'].includes(skill) ? 116.6 : 106) * multiplier)
  }
})

test('shadow stays at its warned position, lines pierce once, and arcs exclude targets behind', () => {
  const shadow = make({ loadout: loadout({ sj_shadow: 5 }) })
  const target = targets(shadow)
  shadow.advance(.2)
  const zone = shadow.state.zones.find(z => z.kind === 'shadow')
  assert.equal(zone.phase, 'windup')
  target.y += 300
  shadow.advance(1)
  close(target.hp, 100000)
  const arc = make({ loadout: loadout({ sj_arc: 5 }) })
  const front = targets(arc)
  const behind = arc.state.enemies[1]
  behind.x = arc.state.player.x - 150; behind.y = arc.state.player.y
  arc.advance(.5)
  close(100000 - front.hp, 151.58)
  close(behind.hp, 100000)
  const line = make({ loadout: loadout({ sj_line: 5 }) })
  targets(line)
  line.state.enemies.forEach((e, i) => { e.x = 100 + i * 40; e.y = -60 })
  line.advance(.5)
  line.state.enemies.forEach(e => close(100000 - e.hp, 192.39))
})

test('four evolutions preserve windup, six shared ticks, total sword budget and inner/outer exclusion', () => {
  const rain = make({ loadout: loadout({ sj_yujian: 5 }, { sj_heart: 3 }, ['evo_wanjian']) })
  const rainTarget = targets(rain)
  // Choose a non-critical sequence; this test isolates the evolution's raw budget.
  rain.state.rng = 987654321
  rain.advance(.4)
  rain.state.cooldowns.sj_yujian = 99999
  rain.advance(1)
  // Criticals, if present, are separately tested below. Check exact raw rain ticks
  // without heart by making its hit rolls deterministic above and using a seed
  // whose casts have no criticals.
  close(100000 - rainTarget.hp, 116.6 * (1.188 + 6 * .352))
  const line = make({ loadout: loadout({ sj_line: 5 }, { sj_mark: 3 }, ['evo_tiandi']) })
  const lineTarget = targets(line)
  line.advance(.85)
  close(lineTarget.hp, 100000)
  assert.ok(line.state.casts.some(c => c.skill === 'sj_line'))
  line.advance(.08)
  assert.ok(100000 - lineTarget.hp >= 116.6 * 2.7225 - 1e-7)
  assert.ok(line.state.cooldowns.sj_line > line.state.time + 5)
  for (const [range, factor] of [[5, .5], [90, 1.1]]) {
    const orbit = make({ loadout: loadout({ sj_wanjian: 5 }, { sj_bone: 3 }, ['evo_wuwo']) })
    const enemy = targets(orbit, range)
    // Probe the damage geometry directly: range 5 deliberately intersects the
    // player body and the movement solver must not retain that illegal pose.
    const outgoing = []
    orbit._skills(outgoing)
    for (const hit of outgoing) orbit._damageEnemy(hit)
    close(100000 - enemy.hp, 106 * .28 * factor * 1.18)
  }
  const formation = make({ loadout: loadout({ sj_formation: 5 }, { sj_gate: 3 }, ['evo_sixiang']) })
  const formationTarget = targets(formation)
  formation.advance(3.3)
  close(100000 - formationTarget.hp, 106 * .22 * 6)
  assert.equal(formation.state.zones.find(z => z.kind === 'formation')?.eyes, 4)
})

test('heart crit multiplies the full passive-adjusted hit, wounds spend only their budget, and gate never invents damage', () => {
  const crit = make({ loadout: loadout({ sj_yujian: 1 }, { sj_heart: 5, sj_bone: 5 }) })
  const critTarget = targets(crit)
  crit.state.rng = 1 // First xorshift roll < 6%.
  crit.advance(.5)
  close(100000 - critTarget.hp, 116.6 * 1.32 * 1.5)
  const wound = make({ loadout: loadout({ sj_yujian: 1 }, { sj_mark: 5 }) })
  const woundTarget = targets(wound)
  wound.advance(.5)
  wound.state.cooldowns.sj_yujian = 99999
  wound.advance(3)
  close(100000 - woundTarget.hp, 116.6 * 1.04)
  const gate = make({ loadout: loadout({ sj_yujian: 1 }, { sj_gate: 5 }) })
  const primary = targets(gate, 60)
  primary.hp = 1
  const neighbor = gate.state.enemies[1]
  neighbor.x = primary.x + 40; neighbor.y = primary.y
  gate.advance(.5)
  close(100000 - neighbor.hp, .02) // Only 2% of one actual HP removed.
  assert.ok(gate.state.gateReadyAt > gate.state.time)
})

test('vajra mitigates damage, magnet changes pickup reach, and tower time never regenerates HP', () => {
  const defensive = make({ hp: 100, loadout: loadout({ sj_yujian: 1 }, { vajra: 5 }) })
  const enemy = targets(defensive, 60)
  enemy.ai.graceUntil = 0; enemy.ai.readyAt = 0
  defensive.advance(.9)
  close(defensive.state.player.hp, 100 - enemy.damage * 2 * .94)
  for (const passive of [{}, { magnet: 5 }]) {
    const run = make({ loadout: loadout({ sj_yujian: 1 }, passive) })
    run.state.drops.push({ id: 'fixture-heal', kind: 'heal', x: 83, y: -60, radius: 9,
      amount: 10, expiresAt: 20 })
    step(run)
    assert.equal(run.state.player.hp, passive.magnet ? 47 : 37)
  }
})

test('simultaneous final enemy death keeps kill XP but player death beats healing and wave rewards', () => {
  const run = make({ hp: 100, loadout: loadout({ sj_wanjian: 5 }) })
  for (let i=0;i<20000 && run.state.waveKilled<9 && run.state.phase==='playing';i++) {
    const first = run.state.enemies[0]
    if (first) { first.hp = 1; first.x = 93; first.y = -60; first.ai.graceUntil = 99999 }
    step(run)
  }
  assert.equal(run.state.waveKilled,9)
  for(let i=0;i<3000&&!run.state.enemies.length;i++)step(run)
  assert.ok(run.state.enemies.length)
  const last = run.state.enemies[0]
  last.hp = 1; last.x = 93; last.y = -60; last.orbitNextAt = 0
  run.state.player.hp = 1
  run.state.projectiles.push({ id: 'fixture-lethal', x: 33, y: -60, vx: 0, vy: 0,
    radius: 10, damage: 100, hostile: true, source: 'fixture', hitIds: [], expiresAt: 9999 })
  run.state.drops.push({ id: 'fixture-heal', kind: 'heal', x: 33, y: -60, radius: 9, amount: 100, expiresAt: 9999 })
  step(run)
  assert.equal(run.state.phase, 'lost')
  assert.equal(run.state.player.hp, 0)
  assert.equal(run.state.waveKilled, 10)
  assert.deepEqual(run.state.earned, {
    xp: 4, cores: run.state.killLedger.reduce((sum, kill) => sum + CORE_RANK_VALUES[kill.coreRank], 0), contribution: 0,
  })
  assert.equal(run.state.wave, 1)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('all twelve families expose damaging melee, charges, missiles or delayed target areas', () => {
  const cases = [
    ['boar_elite', 250, 'charge'], ['wolf_elite', 130, 'bite'], ['spider_elite', 250, 'web'],
    ['tiger_elite', 145, 'sweep'], ['snake_normal', 250, 'shot'], ['bear_normal', 130, 'slam'],
    ['falcon_normal', 250, 'shot'], ['bat_elite', 250, 'shot'], ['scorpion_normal', 250, 'shot'],
    ['centipede_elite', 125, 'sweep'], ['ape_normal', 120, 'slam'], ['crocodile_normal', 120, 'sweep'],
  ]
  for (const [archetype, range, kind] of cases) {
    const run = make()
    const enemy = targets(run, range), attr = ARCHETYPES.find(a => a.id === archetype)
    // Unit-level AI fixture: use the actual table stats on a frozen arena target.
    Object.assign(enemy, { archetype, family: archetype.split('_')[0], role: attr.role,
      rank: attr.rank, damage: attr.damage })
    run.state.floor = 3
    enemy.ai.graceUntil = 0; enemy.ai.readyAt = 0; enemy.ai.cooldowns = {}
    step(run)
    assert.equal(enemy.ai.attack.kind, kind, archetype)
    const warning = run.state.zones.find(z => z.ownerId === enemy.id)
    assert.equal(warning.kind, 'enemy_windup')
    assert.equal(warning.hostile, true)
    assert.ok(Number.isFinite(warning.x) && Number.isFinite(warning.radius))
    const oldX = enemy.x
    run.advance(1.5)
    if (kind === 'charge') assert.notEqual(enemy.x, oldX, archetype)
    if (kind === 'shot') assert.ok(run.state.projectiles.some(p => p.hostile), archetype)
    if (kind === 'stone' || kind === 'web') assert.ok(run.state.zones.some(z => z.kind === kind), archetype)
  }
})

test('snapshot rejects missing required nested fields instead of restoring NaN or phantom hits', () => {
  const run = make()
  run.advance(2)
  for (const mutate of [
    s => { delete s.player.attack },
    s => { delete s.enemies[0].ai.entryUntil },
    s => { s.view = {} },
    s => { s.zones.push({ id: 'bad', kind: 'formation', x: 0, y: 0, radius: 100, hostile: false, expiresAt: 10 }) },
    s => { s.casts.push({ skill: 'sj_heart', releaseAt: 0, x: 0, y: 0, dirX: 1, dirY: 0 }) },
  ]) {
    const snapshot = run.snapshot()
    mutate(snapshot)
    assert.equal(validateTowerSnapshot(snapshot), false)
  }
})

function firstBoss(nativeAttacks = false) {
  const run = make({ hp: 120, xp: 10920, loadout: loadout({ sj_arc: 5 }) })
  // Only explicit native-attack fixtures omit M01–M24 and retain the old phase controller.
  if (nativeAttacks) delete run.state.monsterMechanics
  for (let i = 0; i < 30000 && run.state.wave < 20; i++) {
    run.state.player.hp = 120
    for (const e of run.state.enemies) {
      e.hp = 1; e.x = 93; e.y = -60; e.ai.graceUntil = 99999
    }
    run.advance(1 / 30)
  }
  assert.equal(run.state.wave, 20)
  while (!run.state.enemies.some(e => e.role === 'boss')) step(run)
  const boss = run.state.enemies.find(e => e.role === 'boss')
  run.state.cooldowns.sj_arc = 99999
  for (const e of run.state.enemies) {
    if (e === boss) continue
    e.x = -800; e.y = -1000; e.ai.graceUntil = 99999
  }
  run.state.player.hp=120
  // Freeze natural regeneration during the isolated incoming-damage window.
  run._regenerateHp=()=>{}
  return { run, boss }
}

test('first-floor boss uses authored gore damage and charge sweeps, with one hit per segment after restore', () => {
  const { run, boss } = firstBoss(true)
  boss.x = 283; boss.y = -60
  boss.ai.entryUntil = 0; boss.ai.graceUntil = 0; boss.ai.readyAt = 0
  step(run)
  assert.equal(boss.ai.attack.kind, 'charge')
  assert.equal(boss.ai.attack.windup, 1.05)
  run.advance(1.1)
  assert.equal(run.state.player.hp, 120, 'the entire future corridor must not hit at activation')
  const restored = TowerRun.restore(run.snapshot());restored._regenerateHp=()=>{}
  run.advance(.5); restored.advance(.5)
  assert.deepEqual(restored.snapshot(), run.snapshot())
  close(run.state.player.hp, 120 - 14.928*2)
  const gore = firstBoss(true)
  gore.boss.x = 133; gore.boss.y = -60
  gore.boss.ai.entryUntil = 0; gore.boss.ai.graceUntil = 0; gore.boss.ai.readyAt = 0
  gore.run.advance(1.6)
  close(gore.run.state.player.hp, 120 - 9.332*2)
})

test('boss dying first releases exactly four dormant adds and never clears while required units remain', () => {
  const { run, boss } = firstBoss()
  assert.equal(run.state.pending.filter(p => p.trigger === 'half').length, 4)
  boss.hp = 1; boss.x = 93; boss.y = -60
  run.state.cooldowns.sj_arc = 0
  run.advance(.3)
  assert.equal(run.state.supportReleased, true)
  assert.equal(run.state.killLedger.filter(k => k.wave === 20 && k.archetype === 'boar_boss').length, 1)
  assert.equal(run.state.phase, 'playing')
  assert.equal(run.state.wavePlanned, 9)
  const ids = new Set([...run.state.pending, ...run.state.reserved, ...run.state.enemies].map(e => e.id))
  assert.equal(ids.size + run.state.waveKilled, 9)
  assert.ok(validateTowerSnapshot(run.snapshot()))
  clearControlled(run)
  assert.equal(run.state.killLedger.filter(k => k.wave === 20).length, 9)
  assert.equal(run.state.earned.contribution, 0)
})

test('boss phase transition waits for entry and existing actions, then offers separately warned second charge', () => {
  const { run, boss } = firstBoss(true)
  boss.x = 283; boss.y = -60; boss.hp = 1900
  const entryEnd = boss.ai.entryUntil
  step(run)
  assert.equal(boss.ai.transitionUntil, 0, 'entry and phase-transition clocks must not overlap')
  while (run.state.time < entryEnd + .02) step(run)
  assert.ok(boss.ai.transitionUntil >= entryEnd + 1.2)
  while (boss.ai.phase !== 2) step(run)
  while (boss.ai.mode === 'approach') step(run)
  assert.equal(boss.ai.attack.segments, 2)
  const firstId = boss.ai.attack.id
  // First segment lands beyond the stationary player; re-aim is independently warned.
  while (boss.ai.attack?.id === firstId) step(run)
  assert.equal(boss.ai.mode, 'windup')
  assert.equal(boss.ai.attack.segment, 2)
  assert.ok(boss.ai.until - run.state.time >= 1.05 - 1e-9)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('snapshot replay stays valid throughout actual skill casts, hostile attacks and phase changes', () => {
  const run = make({ floor: 5, hp: 120, xp: 10920,
    loadout: loadout({ sj_yujian: 5, sj_line: 5, sj_shadow: 5, sj_formation: 5 },
      { sj_heart: 5, sj_mark: 5, sj_bone: 5, sj_gate: 5 }, ['evo_wanjian', 'evo_tiandi']) })
  for (let i = 0; i < 240 && run.state.phase === 'playing'; i++) {
    run.setInput(Math.sin(i / 12), Math.cos(i / 12))
    run.advance(.25)
    assert.ok(validateTowerSnapshot(run.snapshot()), `invalid at ${run.state.time}`)
    const reload = TowerRun.restore(run.snapshot())
    run.advance(.1); reload.advance(.1)
    assert.deepEqual(reload.snapshot(), run.snapshot())
  }
})

test('partitioning the same duration retains fixed-step input and random evolution', () => {
  const a = make(), b = make()
  a.setInput(.3, .8); b.setInput(.3, .8)
  a.advance(3)
  for (let i = 0; i < 300; i++) b.advance(.01)
  assert.deepEqual(a.snapshot(), b.snapshot())
})

test('offscreen boss approaches without damage, and losing visibility cancels a full windup', () => {
  const { run, boss } = firstBoss(true)
  boss.x = 283; boss.y = -60
  boss.ai.entryUntil = 0; boss.ai.graceUntil = 0; boss.ai.readyAt = 0
  run.setViewport({ xmin: -100, xmax: 210, ymin: -260, ymax: 140 })
  run.advance(.2)
  assert.ok(boss.x < 283, 'offscreen boss must approach rather than wait forever at charge range')
  assert.equal(boss.ai.mode, 'approach')
  assert.equal(run.state.player.hp, 120)
  run.setViewport(null)
  step(run)
  assert.equal(boss.ai.mode, 'windup')
  run.setViewport({ xmin: -100, xmax: 80, ymin: -200, ymax: 100 })
  step(run)
  assert.equal(boss.ai.mode, 'recovery')
  assert.ok(!run.state.zones.some(z => z.ownerId === boss.id && z.renderOnly))
  assert.equal(run.state.player.hp, 120)
})

test('boss corridor ends at legal body bounds and boundary clipping stops the remaining combo', () => {
  const { run, boss } = firstBoss(true)
  run.state.player.x = 940
  boss.x = 740; boss.y = -60
  boss.ai.entryUntil = 0; boss.ai.graceUntil = 0; boss.ai.readyAt = 0; boss.ai.phase = 2
  step(run)
  const warning = run.state.zones.find(z => z.ownerId === boss.id)
  assert.equal(warning.toX, 936, 'render actual clipped path, not an impossible route outside the arena')
  const id = boss.ai.attack.id
  run.advance(1.5)
  assert.equal(boss.x, 936)
  assert.equal(boss.ai.mode, 'recovery')
  assert.equal(boss.ai.attack.id, id)
  assert.equal(boss.ai.attack.segments, 1)
  assert.ok(boss.ai.until > run.state.time + .8)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})
