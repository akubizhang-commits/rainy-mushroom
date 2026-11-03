import test from 'node:test'
import assert from 'node:assert/strict'
import { castActionTiming } from '../js/xianxia/TowerSkillTiming.js'
import { skillForm } from '../js/xianxia/TowerSkillForms.js'
import { newAttackActions } from '../js/xianxia/TowerAttackActions.js'
import * as combat from '../js/xianxia/TowerRun.js'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS, giftSkills } from '../js/xianxia/TowerGrowth.js'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { CORE_DROP_RULES, CORE_RANK_VALUES } from '../js/xianxia/TowerLoot.js'

const { TowerRun, validateTowerSnapshot } = combat
const STEP = 1 / 60
const clone = value => JSON.parse(JSON.stringify(value))
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`)
const weapon = { weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }
const growth = (active = {}, passive = {}, evolutionLevels = {}, tutorialWaves = 0) => ({
  ...weapon, growthVersion: 1, active: { sj_yujian: 1, ...active }, passive,
  evolutions: Object.keys(evolutionLevels), evolutionLevels, tutorialWaves,
})
const make = (extra = {}) => new TowerRun({
  attemptId: 11, floor: 1, seed: 123, hp: 37.5, xp: 0, loadout: growth(), ...extra,
})
const maxSkills = kind => Object.fromEntries(GROWTH_SKILLS.filter(s => s.kind === kind)
  .map(s => [s.id, s.maxLevel]))
const maxEvolutions = Object.fromEntries(GROWTH_EVOLUTIONS.map(e => [e.id, 2]))

// Keep real spawn membership, damage resolution, XP ledgers and wave rewards.
// Disable outgoing casts and hold enemies far away to isolate level healing.
function healingTick(run) {
  for (const id of Object.keys(run.state.cooldowns)) run.state.cooldowns[id] = 999999
  for (const enemy of run.state.enemies) {
    enemy.ai.graceUntil = 999999
    enemy.x = -700; enemy.y = -900
  }
  run.advance(STEP)
}
function healingEnemies(run, count = 1) {
  for (let i = 0; i < 3000 && run.state.enemies.length < count; i++) healingTick(run)
  assert.ok(run.state.enemies.length >= count)
  assert.ok(validateTowerSnapshot(run.snapshot()))
  return run.state.enemies.slice(0, count)
}
function healingKill(run, enemies) {
  for (const enemy of enemies) run._damageEnemy({
    target: enemy.id, damage: enemy.hp, direct: false, scaled: true, source: 'fixture',
  })
  healingTick(run)
  assert.ok(validateTowerSnapshot(run.snapshot()))
}

for (const [xp, hp, expectedXp, expectedHp, maxHp] of [
  [0, 10, 1, 10, 100],
  [44, 10, 45, 42.4, 108],
  [44, 99, 45, 108, 108],
  [1484, 10, 1485, 10 + 30 * 1.08 ** 9, 100 * 1.08 ** 9],
  [5399, 10, 5400, 10 + 30 * 1.08 ** 17 * 1.35, 100 * 1.08 ** 17 * 1.35],
  [10124, 10, 10125, 10 + 30 * 1.08 ** 23 * 1.35 ** 2, 100 * 1.08 ** 23 * 1.35 ** 2],
  [10919, 10, 10920, 10 + 30 * 1.08 ** 24 * 1.35 ** 2, 100 * 1.08 ** 24 * 1.35 ** 2],
  [1799, 10, 1800, 10, 100 * 1.08 ** 9],
  [1800, 10, 1800, 10, 100 * 1.08 ** 9],
  [6599, 10, 6600, 10, 100 * 1.08 ** 18 * 1.35],
  [6600, 10, 6600, 10, 100 * 1.08 ** 18 * 1.35],
  [13484, 10, 13485, 10 + 30 * 1.08 ** 27 * 1.35 ** 2, 100 * 1.08 ** 27 * 1.35 ** 2],
  [14399, 10, 14400, 10, 100 * 1.08 ** 27 * 1.35 ** 2],
  [14400, 10, 14400, 10, 100 * 1.08 ** 27 * 1.35 ** 2],
]) {
  test(`real kill XP ${xp}→${expectedXp} at ${hp} HP heals only newly crossed levels`, () => {
    const run = make({ xp, hp })
    assert.equal(run.state.player.hp, hp, 'creating a run never reapplies past level healing')
    if ([1800, 6600].includes(xp)) {
      assert.equal(run.state.phase, 'paused', 'entering at a bottleneck offers the safe breakthrough prompt')
      run.resume() // Continue without consuming an item or advancing the realm.
      assert.equal(run.state.player.xp, xp)
    }
    healingKill(run, healingEnemies(run))
    assert.equal(run.state.player.xp, expectedXp)
    close(run.state.player.hp, expectedHp)
    close(run.state.player.maxHp, maxHp)
    assert.equal(run.state.earned.xp, expectedXp - xp)
    const snapshot = run.snapshot(), restored = TowerRun.restore(snapshot)
    assert.deepEqual(restored.snapshot(), snapshot, 'restoring cannot re-award healing')
    for (const actor of [run, restored]) {
      actor.state.drops = actor.state.drops.filter(d => d.kind !== 'heal')
      const resource = actor.state.drops.find(d => d.kind === 'resource')
      assert.ok(resource)
      actor.state.player.x = resource.x; actor.state.player.y = resource.y
      healingTick(actor)
      close(actor.state.player.hp, expectedHp, 'resource feedback cannot award XP or healing twice')
      assert.equal(actor.state.player.xp, expectedXp)
      actor.pause()
      const paused = actor.snapshot()
      actor.advance(60)
      assert.deepEqual(actor.snapshot(), paused)
    }
    assert.deepEqual(run.snapshot(), restored.snapshot())
  })
}

test('same-tick authored kills cross two small levels using each new max HP and clamp each heal', () => {
  for (const hp of [10, 99]) {
    const run = make({ floor: 9, xp: 44, hp })
    const enemies = healingEnemies(run, 26)
    assert.ok(enemies.every(e => e.role === 'normal' && e.rank === 4))
    // Spawning 26 real units spans two normal regeneration pulses. Neither
    // pulse is a level-up reward; retain both mechanics without disabling either.
    const beforeKillHp = run.state.player.hp
    close(beforeKillHp, Math.min(100, hp + Math.floor(run.state.ticks / 180) * 100 / 60))
    const expectedHp = Math.min(116.64, Math.min(108, beforeKillHp + 108 * .3) + 116.64 * .3)
    healingKill(run, enemies)
    assert.equal(run.state.player.xp, 121)
    close(run.state.player.maxHp, 116.64)
    close(run.state.player.hp, expectedHp)
    assert.equal(run.state.earned.xp, 77)
    assert.deepEqual(run.state.clearedWaves, [1])
    assert.equal(run.state.earned.contribution, 0, 'ordinary waves do not grant point vouchers')
  }
})

test('level healing uses the equipped player’s actual post-level max HP', () => {
  const loadout = { ...growth({}, maxSkills('passive')), weaponQuality: 4, weaponRefine: 4 }
  for (const xp of [44, 1484, 5399]) {
    const run = make({ xp, hp: 10, loadout })
    const equipment = clone(run.state.loadout)
    healingKill(run, healingEnemies(run))
    const player = run.state.player
    close(player.hp, 10 + player.maxHp * .3)
    assert.deepEqual(run.state.loadout, equipment)
    assert.ok(player.attack > 100, 'real equipped stats are in effect')
    assert.ok(player.moveSpeed > 220, 'real passive stats are in effect')
    assert.ok(validateTowerSnapshot(run.snapshot()))
  }
})

test('training kills never grant level healing even one XP below a breakthrough', () => {
  const run = make({ training: true, xp: 1484, hp: 10 })
  healingKill(run, healingEnemies(run))
  assert.equal(run.state.player.xp, 1484)
  assert.equal(run.state.player.hp, 10)
  assert.equal(run.state.earned.xp, 0)
})

test('same-tick lethal damage and a level-up kill retain XP but cannot revive the player', () => {
  const run = make({ xp: 44, hp: 1 })
  const enemies = healingEnemies(run)
  run.state.projectiles.push({ id: 'fixture-lethal-level', x: run.state.player.x,
    y: run.state.player.y, vx: 0, vy: 0, radius: 10, damage: 100,
    hostile: true, source: 'fixture', hitIds: [], expiresAt: 999999 })
  healingKill(run, enemies)
  assert.equal(run.state.phase, 'lost')
  assert.equal(run.state.player.xp, 45)
  assert.equal(run.state.player.hp, 0)
  close(run.state.player.maxHp, 108)
})

test('full floor rewards and restoring a victory never add healing without a new level', () => {
  const run = make({ xp: 14400, hp: 10 })
  for (let i = 0; i < 30000 && run.state.phase === 'playing'; i++) {
    const enemies = [...run.state.enemies]
    if (enemies.length) healingKill(run, enemies)
    else healingTick(run)
    // Healing drops are a separate mechanic and must not enter this probe.
    run.state.drops = run.state.drops.filter(d => d.kind !== 'heal')
    close(run.state.player.hp, Math.min(run.state.player.maxHp,
      10 + Math.floor(run.state.ticks / 180) * run.state.player.maxHp / 60))
  }
  assert.equal(run.state.phase, 'won')
  assert.equal(run.state.clearedWaves.length, 20)
  assert.equal(run.state.earned.xp, 0)
  assert.equal(run.state.earned.contribution, 0)
  const restored = TowerRun.restore(run.snapshot())
  restored.advance(60)
  assert.deepEqual(restored.snapshot(), run.snapshot())
})

// Preserve real authored units, finite spawning and kill accounting; controlled
// HP/positions isolate combat correctness, not player survival or tower balance.
function clearWaves(run, count = 20) {
  for (let i = 0; i < 90000 && run.state.phase === 'playing'
    && run.state.clearedWaves.length < count; i++) {
    run.state.player.hp = run.state.player.maxHp
    for (const e of run.state.enemies) {
      e.hp = Math.min(e.hp, 1)
      e.x = run.state.player.x + 55
      e.y = run.state.player.y
      e.ai.graceUntil = run.state.time + 10
    }
    run.advance(STEP)
  }
  assert.equal(run.state.clearedWaves.length, count)
  assert.ok(validateTowerSnapshot(run.snapshot()))
}

// These high-HP targets isolate exact per-cast budgets. They are intentionally
// outside authored stat validation; snapshot tests below use real enemy stats.
function target(run, range = 100) {
  run.advance(1)
  run.state.pending = []
  run.state.reserved = []
  // Wider evolution forms can acquire a real spawn during the setup second.
  // This fixture measures one newly requested cast, not those earlier windups.
  run.state.casts = []
  run.state.actions = newAttackActions()
  run.state.orbitUntil = 0
  run.state.projectiles = []
  run.state.zones = []
  run.state.effects = []
  for (const [i, e] of run.state.enemies.entries()) {
    e.x = i === 0 ? run.state.player.x + range : -800
    e.y = i === 0 ? run.state.player.y : -1000
    e.hp = 100000
    e.moveSpeed = 0
    e.orbitNextAt = 0
    e.ai.graceUntil = 99999
  }
  for (const id of Object.keys(run.state.cooldowns)) run.state.cooldowns[id] = 99999
  if(run.state.yujian){run.state.yujian.ready=1;run.state.yujian.nextAt=run.state.time+.5}
  return run.state.enemies[0]
}

test('growth loadouts accept all 7+7+4, cap ranks including one-rank flight, and retain legacy validation', () => {
  const run = make({ xp: 10920, loadout: growth(maxSkills('active'), maxSkills('passive'), maxEvolutions, 3) })
  assert.equal(Object.keys(run.state.loadout.active).length, 7)
  assert.equal(Object.keys(run.state.loadout.passive).length, 7)
  assert.equal(run.state.loadout.evolutions.length, 4)
  assert.equal(run.state.base.tutorialWaves, 3)
  close(run.state.player.moveSpeed, 292.6)
  assert.equal(run.state.player.hp, 37.5)
  assert.deepEqual(TowerRun.restore(run.snapshot()).snapshot(), run.snapshot())
  for (const invalid of [
    growth({ sj_yujian: 11 }), growth({}, { sj_bone: 9 }), growth({}, { sj_spirit: 7 }),
    growth({ sj_yujian: 10 }, {}, { evo_wanjian: 3 }),
    { ...growth(), growthVersion: 2 },
    { ...growth({ sj_yujian: 8 }, {}, { evo_wanjian: 2 }), evolutions: [] },
  ]) assert.throws(() => make({ loadout: invalid }))
  const legacy = { ...weapon, active: { sj_yujian: 5 }, passive: {}, evolutions: ['evo_wanjian'] }
  assert.ok(validateTowerSnapshot(make({ loadout: legacy }).snapshot()))
  assert.throws(() => make({ loadout: { ...legacy, active: maxSkills('active') } }))
})

test('authored teaching milestones grant skills once and preserve invested ranks', () => {
  const run = make()
  clearWaves(run, 7)
  assert.deepEqual(run.state.loadout.active, { sj_yujian: 1 })
  const resumed = TowerRun.restore(run.snapshot())
  clearWaves(resumed, 8)
  assert.deepEqual(resumed.state.loadout.active, { sj_yujian: 1 })
  assert.equal(resumed.state.loadout.tutorialWaves, 0)
  assert.equal(resumed.state.books, undefined)
  const second = make({ floor: 2, loadout: growth({ sj_arc: 3 }, {}, {}, 1) })
  clearWaves(second, 1)
  assert.deepEqual(second.state.loadout.active, { sj_yujian: 1, sj_arc: 3 })
  assert.equal(second.state.loadout.tutorialWaves, 1)
  assert.ok(validateTowerSnapshot(second.snapshot()))
})

test('paused growth updates preserve HP and ledgers while scaling remaining sword production time', () => {
  const run = make()
  assert.throws(() => run.setGrowthLoadout(growth({ sj_yujian: 2 })))
  run.advance(.35)
  run.pause()
  const before = run.snapshot()
  const returned = run.setGrowthLoadout(growth({ sj_yujian: 2 }, { sj_bone: 1 }))
  const after = run.snapshot()
  assert.equal(after.player.hp, 37.5)
  assert.equal(after.player.moveSpeed, 224.4)
  const normalized = clone(after)
  normalized.loadout = before.loadout
  normalized.player.moveSpeed = before.player.moveSpeed
  assert.ok(Math.abs(after.yujian.nextAt-(before.time+(before.yujian.nextAt-before.time)*.5**(1/9)))<1e-8)
  normalized.yujian.nextAt = before.yujian.nextAt
  assert.deepEqual(normalized, before)
  assert.deepEqual(returned, after)
  returned.player.hp = 100
  assert.equal(run.state.player.hp, 37.5)
  for (const next of [
    { ...after.loadout, weaponQuality: 2 },
    growth({ sj_yujian: 2 }, { sj_bone: 1 }, {}, 1),
    { ...after.loadout, active: { sj_yujian: 11 } },
  ]) {
    assert.throws(() => run.setGrowthLoadout(next))
    assert.deepEqual(run.snapshot(), after)
  }
  run.advance(60)
  assert.deepEqual(run.snapshot(), after)
  assert.ok(validateTowerSnapshot(after))
})

test('each evolution uses the actual parent rank budget once, with no old level-five constants', () => {
  for (const rank of [1, 2]) {
    for (const parentLevel of [rank === 1 ? 6 : 8, 10]) {
      for (const [parent, evolution, duration] of [
        ['sj_yujian', 'evo_wanjian', 1.85],
        ['sj_wanjian', 'evo_wuwo', .1],
        ['sj_line', 'evo_tiandi', 1],
        ['sj_formation', 'evo_sixiang', 6.55],
      ]) {
        const run = make({ loadout: growth({ [parent]: parentLevel }, {}, { [evolution]: rank }) })
        const skill = GROWTH_SKILLS.find(s => s.id === parent)
        const range = evolution === 'evo_wuwo' ? skill.radius[parentLevel - 1] + (rank === 1 ? 24 : 48) : 90
        const enemy = target(run, range)
        run.state.cooldowns[parent] = 0
        if (evolution === 'evo_wanjian') run.state.cooldowns.evo_wanjian = 0
        run.advance(.4)
        run.state.cooldowns[parent] = 99999
        if (duration > .4) run.advance(duration - .4)
        const coefficient = skill.damage[parentLevel - 1]
        const budget = {
          evo_wanjian: [1.30, 1.69], evo_wuwo: [1.20, 1.44],
          evo_tiandi: [1.40, 1.82], evo_sixiang: [2.0, 2.3],
        }[evolution][rank - 1]
        const expected = evolution === 'evo_wanjian' ? coefficient * ((budget - 1) * 8 + (rank === 1 ? 1.1 : 1.4))
          : evolution === 'evo_tiandi' ? coefficient * 10 / 6 * budget
            : evolution === 'evo_sixiang' ? coefficient * budget * 9 : coefficient * budget
        close(100000 - enemy.hp, 106 * expected)
      }
    }
  }
})

test('all active skills share the action slot and evolutions replace parent releases', () => {
  const run = make({ xp: 10920, loadout: growth(maxSkills('active'), maxSkills('passive'), maxEvolutions, 3) })
  const enemy = target(run, 100), events = []
  for (const id of Object.keys(run.state.cooldowns)) run.state.cooldowns[id] = 0
  for (let i=0;i<360;i++) {
    enemy.hp=1e12
    enemy.x=run.state.player.x+100;enemy.y=run.state.player.y
    run.advance(STEP, e=>events.push(e))
    assert.ok(run.state.casts.length<=1, 'only one character cast may be pending')
  }
  const ids=new Set(events.map(e=>e.skill))
  for(const id of ['sj_arc','sj_cross','sj_shadow','evo_sixiang','evo_tiandi','evo_wuwo','evo_wanjian'])
    assert.ok(ids.has(id), `scheduled ${id}`)
  for(const id of ['sj_line','sj_formation','sj_wanjian'])assert.ok(!ids.has(id), `replaced ${id}`)
  const starts=events.filter(e=>e.pulseIndex===1).filter((e,i,all)=>!i||e.startedAt!==all[i-1].startedAt)
  for(let i=1;i<starts.length;i++)assert.ok(starts[i].startedAt>=starts[i-1].endsAt-1e-8)
})

test('new active damage at ranks 1 and 10 stays a per-cast total rather than multiplying decorative swords or eyes', () => {
  for (const rank of [1, 10]) {
    for (const [id, seconds, multiplier] of [
      ['sj_yujian', .5, .5 ** ((rank - 1) / 9)], ['sj_arc', .7, 1], ['sj_wanjian', .4, 10 / 7],
      ['sj_line', .5, 1], ['sj_shadow', 1.5, 1], ['sj_formation', 5.7, 6], // Rank 10 splits the same budget across seven hits.
    ]) {
      const run = make({ loadout: growth({ [id]: rank }) })
      const e = target(run, 85)
      run.state.cooldowns[id] = 0
      run.advance(.4)
      run.state.cooldowns[id] = 99999
      // Sequential line/crescent pulses share one budget but may release
      // after 0.5s. Observe the final authored release plus its short flight.
      const form = skillForm(id, rank)
      const releaseEnd = ['sj_arc','sj_line'].includes(id)
        ? castActionTiming(id, form.hits).releases.at(-1) + 85 / (form.speed || 1000) + STEP : 0
      const until = Math.max(seconds, releaseEnd)
      if (until > .4) run.advance(until - .4)
      const skill = GROWTH_SKILLS.find(s => s.id === id)
      close(100000 - e.hp, 106 * skill.damage[rank - 1] * multiplier)
    }
  }
})

test('growth passive rank-eight effects retain crit, wound and single-trigger burst rules and HP/pickup rules', () => {
  const crit = make({ loadout: growth({}, { sj_heart: 4, sj_bone: 4 }) })
  const e = target(crit)
  crit.state.cooldowns.sj_yujian = 0
  crit.state.rng = 1
  // Allow the gathered sword to complete its homing flight before checking damage.
  crit.advance(.8)
  close(100000 - e.hp, 106 * 1.2 * 1.25 * 1.5)
  const wound = make({ loadout: growth({}, { sj_mark: 4 }) })
  const marked = target(wound)
  wound.state.cooldowns.sj_yujian = 0
  wound.advance(.1)
  wound.state.cooldowns.sj_yujian = 99999
  wound.advance(.7)
  wound.advance(3)
  close(100000 - marked.hp, 106 * 1.2 * (.5 + .5 * 1.5))
  const gate = make({ loadout: growth({}, { sj_gate: 4 }) })
  const first = target(gate)
  first.hp = 1
  // Add a second authored unit for the budget recipient, since the first spawn
  // instant can contain only one unit.
  const normal = { ...gate.state.enemies[0], id: 'budget-target', hp: 100000,
    ai: clone(first.ai), x: first.x + 40, woundBudget: 0 }
  gate.state.enemies.push(normal)
  gate.state.cooldowns.sj_yujian = 99999
  gate._damageEnemy({target:first.id,source:"sj_yujian",damage:10,direct:true})
  gate.advance(.5)
  close(100000 - normal.hp, 106 * 1.2) // One killing hit triggers one delayed burst.
  for (const spirit of [0, 3]) {
    const defended = make({ loadout: growth({}, { vajra: 4, ...(spirit ? { sj_spirit: spirit } : {}) }) })
    defended.state.projectiles.push({ id: 'incoming', x: 33, y: -60, vx: 0, vy: 0,
      radius: 10, damage: 10, hostile: true, hitIds: [], expiresAt: 10 })
    defended.state.drops.push({ id: 'healing', x: 83, y: -60, radius: 9,
      kind: 'heal', amount: 10, expiresAt: 10 })
    defended.advance(STEP)
    close(defended.state.player.hp, 37.5 - 8.5 + (spirit ? 10 : 0))
    assert.ok(validateTowerSnapshot(defended.snapshot()))
  }
})

function readyAuthoredTarget(run, skill, range = 100) {
  run.advance(1)
  for (const e of run.state.enemies) e.ai.graceUntil = 99999
  const enemy = run.state.enemies[0]
  enemy.x = run.state.player.x + range
  enemy.y = run.state.player.y
  for (const id of Object.keys(run.state.cooldowns)) run.state.cooldowns[id] = 99999
  run.state.cooldowns[skill] = 0
  return enemy.id
}

test('paused rank changes keep windup, projectile and delayed-zone contexts unchanged and resume deterministic damage', () => {
  for (const [skill, beforePause, range] of [
    ['sj_yujian', STEP, 340], // Still in windup.
    ['sj_yujian', .2, 340], // Already in flight.
    ['sj_shadow', .2, 100], // Already warned, not detonated.
    ['sj_formation', .8, 100], // One tick spent, five remain.
  ]) {
    const run = make({ floor: 9, loadout: growth({ [skill]: 1 }, { sj_bone: 1, sj_mark: 1 }) })
    const enemyId = readyAuthoredTarget(run, skill, range)
    run.advance(beforePause)
    run.pause()
    const before = run.snapshot(), unchanged = TowerRun.restore(before)
    assert.ok(before.casts.length + before.projectiles.length + before.zones.filter(z => !z.hostile).length > 0)
    const updatedLoadout = growth({ [skill]: 3 }, { sj_bone: 3, sj_mark: 3, sj_gate: 1 })
    const result = run.setGrowthLoadout(updatedLoadout)
    for (const key of ['casts', 'projectiles', 'zones', 'cooldowns', 'killLedger', 'gateEntries',
      'earned', 'base', 'time', 'ticks', 'remainder', 'rng', 'loot', 'enemies']) assert.deepEqual(result[key], before[key], key)
    assert.equal(result.player.hp, before.player.hp)
    assert.ok(validateTowerSnapshot(result))
    const restored = TowerRun.restore(JSON.parse(JSON.stringify(result)))
    // Suppress subsequent starts in both worlds so only the already-started
    // cast and its existing numeric wound/zone budgets can affect this target.
    for (const actor of [run, unchanged, restored]) {
      for (const id of Object.keys(actor.state.cooldowns)) actor.state.cooldowns[id] = 99999
      actor.resume()
      actor.advance(4)
    }
    assert.deepEqual(run.snapshot(), restored.snapshot())
    const actual = run.state.enemies.find(e => e.id === enemyId)
    const control = unchanged.state.enemies.find(e => e.id === enemyId)
    assert.ok(actual && control)
    close(actual.hp, control.hp)
    close(actual.woundBudget, control.woundBudget)
    assert.deepEqual(run.state.gateEntries, unchanged.state.gateEntries, 'new gate cannot feed on an old cast')
    assert.ok(validateTowerSnapshot(run.snapshot()))
    // Expired casts are absent here; corrupt the original valid in-flight record.
    const corrupted = clone(result)
    const item = corrupted.casts[0] ?? corrupted.projectiles.find(p => !p.hostile)
      ?? corrupted.zones.find(z => !z.hostile)
    assert.ok(item)
    delete item.castContext
    assert.equal(validateTowerSnapshot(corrupted), false)
  }
})

test('newly learned paused skills are ready without resetting old cooldowns or filling HP', () => {
  const run = make({ xp: 100, hp: .25, loadout: growth({}, { sj_bone: 1 }, {}, 3) })
  run.advance(1)
  run.pause()
  const old = run.snapshot()
  run.setGrowthLoadout(growth({ sj_shadow: 1 }, { sj_bone: 2 }, {}, 3))
  assert.equal(run.state.cooldowns.sj_shadow, 0)
  for (const [id, value] of Object.entries(old.cooldowns)) assert.equal(run.state.cooldowns[id], value)
  assert.equal(run.state.player.hp, .25)
  run.resume()
  const id = readyAuthoredTarget(run, 'sj_shadow')
  run.advance(.2)
  assert.ok(run.state.zones.some(z => z.kind === 'shadow'))
  assert.ok(run.state.enemies.some(e => e.id === id))
})

test('growth training loops with real kills but never teaches, pays rewards, or changes permanent inputs', () => {
  const selected = growth(), original = clone(selected)
  const run = make({ training: true, normalCoreCounter: 19, loadout: selected })
  let resets = 0, previousKills = 0, killsSeen = 0
  for (let i = 0; i < 4000 && resets < 2; i++) {
    run.state.player.hp = run.state.player.maxHp
    for (const e of run.state.enemies) {
      e.hp = 1; e.x = run.state.player.x + 55; e.y = run.state.player.y
      e.ai.graceUntil = 99999
    }
    run.advance(STEP)
    assert.ok(run.state.killLedger.every(k => k.coreRank === 0))
    assert.ok(!run.state.drops.some(d => d.kind === 'core'))
    if (run.state.waveKilled < previousKills) resets++
    if (run.state.waveKilled > previousKills) killsSeen++
    previousKills = run.state.waveKilled
    if (i % 200 === 0) assert.ok(validateTowerSnapshot(run.snapshot()))
  }
  assert.equal(resets, 2)
  assert.ok(killsSeen >= 16)
  assert.deepEqual(selected, original)
  assert.deepEqual(run.state.loadout, selected)
  assert.deepEqual(run.state.earned, { xp: 0, cores: 0, contribution: 0 })
  assert.equal(run.state.player.xp, 0)
  assert.equal(run.state.normalCoreCounter, 19)
  assert.deepEqual(run.state.clearedWaves, [])
  assert.equal(run.state.base.tutorialWaves, 0)
  assert.equal(run.state.phase, 'playing')
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('all nine growth floors preserve 180 waves, 4772 deaths and bounded grade sums across live JSON replay', () => {
  const totals = { xp: 0, cores: 0, contribution: 0, deaths: 0 }, families = new Set()
  let counter = 0, replays = 0
  for (let floor = 1; floor <= 9; floor++) {
    const run = make({ floor, hp: 120, xp: 10920, normalCoreCounter: counter,
      loadout: growth(maxSkills('active'), maxSkills('passive'), maxEvolutions, 3) })
    for (let i = 0; i < 90000 && run.state.phase === 'playing'; i++) {
      run.state.player.hp = 120
      for (const e of run.state.enemies) {
        families.add(e.family)
        e.hp = 1; e.x = run.state.player.x + 55; e.y = run.state.player.y
        e.ai.graceUntil = run.state.time + 10
      }
      run.advance(STEP)
      if (i % 113 === 0) {
        const restored = TowerRun.restore(JSON.parse(JSON.stringify(run.snapshot())))
        run.advance(STEP); restored.advance(STEP)
        assert.deepEqual(restored.snapshot(), run.snapshot(), `floor ${floor}, tick ${run.state.ticks}`)
        replays++
      }
    }
    assert.equal(run.state.phase, 'won', `floor ${floor}`)
    assert.ok(validateTowerSnapshot(run.snapshot()))
    assert.equal(run.state.clearedWaves.length, 20)
    const dropped = run.state.killLedger.filter(k => k.coreRank > 0)
    const value = dropped.reduce((sum, kill) => sum + CORE_RANK_VALUES[kill.coreRank], 0)
    const rule = CORE_DROP_RULES[floor]
    assert.ok(dropped.length >= rule.minCount && dropped.length <= rule.maxCount, `floor ${floor} count`)
    assert.ok(value >= rule.minValue && value <= rule.maxValue, `floor ${floor} value`)
    for (const kill of dropped) {
      assert.equal(kill.coreRank, ARCHETYPES.find(a => a.id === kill.archetype).rank)
    }
    assert.equal(run.state.earned.cores, value + 5 * (floor - 1))
    totals.xp += run.state.rawKillXp
    totals.cores += run.state.earned.cores
    totals.contribution += run.state.earned.contribution
    totals.deaths += run.state.killLedger.length
    counter = run.state.normalCoreCounter
  }
  assert.deepEqual([totals.xp, totals.contribution, totals.deaths], [10920, 0, 4772])
  const rules = Object.values(CORE_DROP_RULES)
  assert.ok(totals.cores >= 180 + rules.reduce((sum, rule) => sum + rule.minValue, 0))
  assert.ok(totals.cores <= 180 + rules.reduce((sum, rule) => sum + rule.maxValue, 0))
  assert.equal(counter, 0, 'new loot never advances the legacy normal counter')
  assert.deepEqual([...families].sort(), ['bat', 'bear', 'boar', 'crocodile', 'falcon', 'rhino', 'snake', 'spider', 'tiger', 'wolf', 'yak'])
  assert.ok(replays > 180)
})

test('growth migration verifies old kills first and preserves legitimate partial-wave earnings and HP', () => {
  assert.equal(typeof combat.migrateTowerGrowth, 'function')
  const run = make({ normalCoreCounter: 19, lootVersion: 0,
    loadout: { ...weapon, active: { sj_yujian: 5 }, passive: {}, evolutions: ['evo_wanjian'] } })
  run.advance(1)
  const e = run.state.enemies[0]
  e.hp = 1; e.x = run.state.player.x + 55; e.y = run.state.player.y
  e.ai.graceUntil = 99999
  run.advance(.4)
  run.pause()
  const old = run.snapshot()
  assert.ok(old.earned.xp > 0)
  assert.ok(validateTowerSnapshot(old))
  const converted = combat.migrateTowerGrowth(old, growth())
  assert.deepEqual(old, run.snapshot(), 'migration cannot mutate the accepted old record')
  for (const key of ['earned', 'killLedger', 'normalCoreCounter', 'rawKillXp', 'cooldowns', 'gateEntries']) {
    assert.deepEqual(converted[key], old[key], key)
  }
  assert.equal(converted.player.hp, old.player.hp)
  assert.equal(converted.base.tutorialWaves, 0)
  assert.ok(validateTowerSnapshot(converted))
  TowerRun.restore(converted).resume()
  for (const corrupt of [
    { ...old, earned: { ...old.earned, cores: old.earned.cores + 1 } },
    { ...old, killLedger: [] },
    { ...old, loadout: { ...old.loadout, active: { sj_yujian: 6 } } },
  ]) assert.throws(() => combat.migrateTowerGrowth(corrupt, growth()))
})

test('legacy migration preserves in-flight old ranks/evolutions even when the new build no longer owns them', () => {
  for (const [skill, evolution, seconds] of [
    ['sj_yujian', 'evo_wanjian', STEP], ['sj_yujian', 'evo_wanjian', .2],
    ['sj_line', 'evo_tiandi', .4], ['sj_formation', 'evo_sixiang', .8],
  ]) {
    const run = make({ floor: 9, lootVersion: 0,
      loadout: { ...weapon, active: { [skill]: 5 }, passive: { sj_bone: 5, sj_mark: 5 }, evolutions: [evolution] } })
    const enemyId = readyAuthoredTarget(run, skill, skill === 'sj_yujian' ? 340 : 100)
    // This checks already-earned damage across migration, not whether an old
    // five-rank spell can one-shot the newly rebalanced ninth-floor enemies.
    run.state.enemies.find(e => e.id === enemyId).hp = 1
    if (evolution === 'evo_wanjian') run.state.cooldowns.evo_wanjian = 0
    run.advance(seconds)
    run.pause()
    const old = run.snapshot()
    const converted = combat.migrateTowerGrowth(old, growth())
    assert.ok(validateTowerSnapshot(converted))
    assert.equal(converted.player.hp, old.player.hp)
    const control = TowerRun.restore(old), migrated = TowerRun.restore(converted)
    for (const actor of [control, migrated]) {
      for (const id of Object.keys(actor.state.cooldowns)) actor.state.cooldowns[id] = 99999
      actor.resume()
    }
    for (let i = 0; i < 240; i++) {
      control.advance(STEP); migrated.advance(STEP)
      const a = control.state.enemies.find(e => e.id === enemyId), b = migrated.state.enemies.find(e => e.id === enemyId)
      close(a?.hp ?? 0, b?.hp ?? 0)
      close(a?.woundBudget ?? 0, b?.woundBudget ?? 0)
      assert.deepEqual(migrated.state.killLedger, control.state.killLedger)
      assert.deepEqual(migrated.state.effects.filter(e => e.kind === 'hit'), control.state.effects.filter(e => e.kind === 'hit'))
    }
    assert.ok(migrated.state.killLedger.some(k => k.id === enemyId), 'old cast can still finish its earned kill')
    assert.deepEqual(migrated.state.earned, control.state.earned)
    assert.ok(validateTowerSnapshot(migrated.snapshot()))
  }
})

test('migration retains cleared waves and rejects a tutorial total below the real clear ledger', () => {
  const oldRun = make({ lootVersion: 0, loadout: { ...weapon, active: { sj_yujian: 5 }, passive: {}, evolutions: [] } })
  clearWaves(oldRun, 8)
  oldRun.pause()
  const before = oldRun.snapshot()
  assert.ok(combat.migrateTowerGrowth(before, growth()))
  const after = combat.migrateTowerGrowth(before, growth({}, {}, {}, 1))
  assert.deepEqual(after.clearedWaves, before.clearedWaves)
  assert.deepEqual(after.killLedger, before.killLedger)
  assert.deepEqual(after.earned, before.earned)
  assert.equal(after.player.hp, before.player.hp)
  assert.equal(after.base.tutorialWaves, 1)
  assert.ok(validateTowerSnapshot(after))
})
