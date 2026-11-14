import { equipmentCastSpeed } from '../js/xianxia/TowerSkillTiming.js'
import { cultivationAt, TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'
import test from 'node:test'
import assert from 'node:assert/strict'
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
  // Spawn waiting can cross natural regeneration pulses; begin the isolated
  // level-heal measurement at the requested entry HP.
  run.state.player.hp = run.state.base.hp
  return run.state.enemies.slice(0, count)
}
function healingKill(run, enemies) {
  for (const enemy of enemies) run._damageEnemy({
    target: enemy.id, damage: enemy.hp * 100, direct: false, scaled: true, source: 'fixture',
  })
  healingTick(run)
  assert.ok(validateTowerSnapshot(run.snapshot()))
}

for (const [xp, hp, expectedXp, expectedHp, maxHp] of [
  [0, 10, 1, 10, 100],
  [44, 10, 45, 42.4, 108],
  [44, 99, 45, 108, 108],
  [1484, 10, 1485, 10 + cultivationAt(1485).maxHp * .3, cultivationAt(1485).maxHp],
  [5399, 10, 5400, 10 + cultivationAt(5400).maxHp * .3, cultivationAt(5400).maxHp],
  [10124, 10, 10125, 10 + 30 * 1.08 ** 23 * 1.35 ** 2, 100 * 1.08 ** 23 * 1.35 ** 2],
  [10919, 10, 10920, 10 + 30 * 1.08 ** 24 * 1.35 ** 2, 100 * 1.08 ** 24 * 1.35 ** 2],
  [TOWER_XP_CAP, 10, TOWER_XP_CAP, 10, cultivationAt(TOWER_XP_CAP).maxHp],
]) {
  test(`real kill XP ${xp}→${expectedXp} at ${hp} HP heals only newly crossed levels`, () => {
    const run = make({ xp, hp })
    assert.equal(run.state.player.hp, hp, 'creating a run never reapplies past level healing')
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
  for (const [hp, expectedHp] of [[10, 77.392], [99, 116.64]]) {
    const run = make({ floor: 9, xp: 44, hp })
    const enemies = healingEnemies(run, 26)
    assert.ok(enemies.every(e => e.role === 'normal' && e.rank === 4))
    healingKill(run, enemies)
    assert.equal(run.state.player.xp, 121)
    close(run.state.player.maxHp, 116.64)
    close(run.state.player.hp, expectedHp)
    assert.equal(run.state.earned.xp, 77)
    assert.deepEqual(run.state.clearedWaves, [1])
    assert.equal(run.state.earned.contribution, 0, 'ordinary waves do not award point vouchers')
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

test('at XP cap only natural regeneration heals during a full floor; rewards and restore do not', () => {
  const run = make({ xp: TOWER_XP_CAP, hp: 10 })
  for (let i = 0; i < 30000 && run.state.phase === 'playing'; i++) {
    const enemies = [...run.state.enemies]
    if (enemies.length) healingKill(run, enemies)
    else healingTick(run)
    // Healing drops are a separate mechanic and must not enter this probe.
    run.state.drops = run.state.drops.filter(d => d.kind !== 'heal')
    close(run.state.player.hp, Math.min(run.state.player.maxHp, 10 + Math.floor(run.state.ticks / 180) * run.state.player.maxHp / 60))
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
    e.physicalDefense = e.magicDefense = 0
    e.moveSpeed = 0
    e.orbitNextAt = 0
    e.ai.graceUntil = 99999
  }
  for (const id of Object.keys(run.state.cooldowns)) run.state.cooldowns[id] = 99999
  if(run.state.yujian){run.state.yujian.ready=1;run.state.yujian.nextAt=run.state.time+.5}
  return run.state.enemies[0]
}

test('growth loadouts accept all current skills, cap ranks including one-rank flight, and retain legacy validation', () => {
  const run = make({ xp: 10920, loadout: growth(maxSkills('active'), maxSkills('passive'), maxEvolutions, 3) })
  assert.equal(Object.keys(run.state.loadout.active).length, 12)
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

// Budget fixtures isolate one authored release from basic attacks, automatic
// sword replenishment and unrelated skills; cadence/replay is covered below.
function emittedBudget(parent, parentLevel, evolution, evolutionRank = 1) {
  const loadout = { ...growth({}, {}, evolution ? { [evolution]: evolutionRank } : {}),
    active: { [parent]: parentLevel } }
  const run = make({ xp: TOWER_XP_CAP, loadout })
  const enemy = target(run, 85), output = []
  run._startBasic = () => {}
  const original = run._damageEnemy.bind(run)
  run._damageEnemy = hit => { if (hit.target === enemy.id) output.push(hit); original(hit) }
  run.state.cooldowns[parent] = 0
  if (evolution === 'evo_wanjian') run.state.cooldowns.evo_wanjian = 0
  for (let frame = 0; frame < 600; frame++) {
    run.advance(STEP)
    if (frame === 0) {
      run.state.cooldowns[parent] = 99999
      if (evolution) run.state.cooldowns[evolution] = 99999
    }
    if (run.state.zones.length || run.state.projectiles.length || output.length) return { run, output }
  }
  assert.fail(`${evolution || parent}: no authored damage release`)
}

test('each evolution inherits its actual parent rank and current per-window budget', () => {
  for (const rank of [1, 2]) for (const parentLevel of [6, 10]) {
    for (const [parent, evolution] of [['sj_yujian','evo_wanjian'], ['sj_wanjian','evo_wuwo'],
      ['sj_line','evo_tiandi'], ['sj_formation','evo_sixiang']]) {
      const {run, output} = emittedBudget(parent, parentLevel, evolution, rank)
      const skill = GROWTH_SKILLS.find(s => s.id === parent)
      const definition = GROWTH_EVOLUTIONS.find(s => s.id === evolution)
      const base = run.state.player.attack * skill.damage[parentLevel - 1]
      if (evolution === 'evo_wanjian') {
        const zone = run.state.zones.find(z => z.formId === evolution)
        assert.ok(zone)
        const multiplier = (definition.budgetMultipliers[rank-1] - 1) * 8 / skill.cooldown
          + definition.rainDamageDurationByRank[rank-1] / skill.cooldown
        close(zone.damage * zone.pulseCount, base * multiplier)
        assert.equal(zone.pulseCount, rank === 1 ? 19 : 25)
      } else if (evolution === 'evo_sixiang') {
        const zone = run.state.zones.find(z => z.formId === evolution)
        assert.ok(zone)
        close(zone.damage * zone.pulseCount, base * 6 * definition.budgetMultipliers[rank-1] * 15 / 12)
        assert.equal(zone.pulseCount, rank === 1 ? 16 : 20)
      } else {
        const hit = output.find(h => h.source === evolution)
        assert.ok(hit, evolution)
        close(hit.damage, base * definition.budgetMultipliers[rank-1]
          * (evolution === 'evo_tiandi' ? 12 / skill.cooldown : 1))
      }
    }
  }
})

test('all active skills share the action slot and evolutions replace parent releases', () => {
  const run = make({ xp: 10920, loadout: growth(maxSkills('active'), maxSkills('passive'), maxEvolutions, 3) })
  const enemy = target(run, 100), events = []
  for (const id of Object.keys(run.state.cooldowns)) run.state.cooldowns[id] = 0
  // 5个大招之间各隔2秒（施法速度会缩短），12秒内都能轮到。
  for (let i=0;i<720;i++) {
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
  const heavy=starts.filter(e=>['sj_cross','sj_sancai','evo_tiandi','evo_sixiang','evo_wanjian'].includes(e.skill))
  assert.ok(heavy.length>=5)
  const gap=2/(1+equipmentCastSpeed(run.state.loadout,run.state.player.xp))
  assert.ok(gap>1&&gap<2,'fixture has cast speed, which shortens the heavy gap')
  for(let i=1;i<heavy.length;i++)assert.ok(heavy[i].startedAt-heavy[i-1].startedAt>=gap-1e-8,`heavy gap ${heavy[i].skill}`)
})

test('active releases preserve per-sword, per-window and whole-field damage units', () => {
  for (const rank of [1, 10]) for (const id of ['sj_yujian','sj_arc','sj_wanjian','sj_line','sj_shadow','sj_formation']) {
    const {run, output} = emittedBudget(id, rank)
    const skill = GROWTH_SKILLS.find(s => s.id === id), base = run.state.player.attack * skill.damage[rank-1]
    if (id === 'sj_yujian') {
      assert.equal(run.state.projectiles.length, 1)
      close(run.state.projectiles[0].damage, base * skill.sword_damage_share[rank-1])
    } else if (id === 'sj_shadow' || id === 'sj_formation') {
      const zone = run.state.zones[0]
      close(zone.damage * zone.pulseCount, base * (id === 'sj_formation' ? 6 : 1))
    } else {
      const hit = output.find(h => h.source === id)
      assert.ok(hit, id)
      close(hit.damage, base * (id === 'sj_arc' ? .25 : id === 'sj_wanjian' ? 10/7 : rank === 1 ? 1 : 1/3))
    }
  }
})

test('current passives apply multiplicative crit, direct-only vulnerability and heavy-hit bursts', () => {
  const crit = make({ loadout: growth({}, { sj_heart: 4, sj_bone: 4 }) })
  const e = target(crit)
  crit.state.rng = 1
  crit._damageEnemy({target:e.id,source:'sj_yujian',damage:100,direct:true})
  close(100000-e.hp,100*1.25*1.5)
  const markedRun = make({ loadout: growth({}, { sj_mark:1 }) })
  const marked = target(markedRun)
  markedRun._damageEnemy({target:marked.id,source:'sj_yujian',damage:100,direct:true})
  close(100000-marked.hp,100)
  markedRun._damageEnemy({target:marked.id,source:'sj_yujian',damage:100,direct:true})
  close(100000-marked.hp,220)
  assert.equal(marked.scarDebuff.vulnerability,.2)
  assert.equal(marked.qingpingDot,undefined)
  const gate = make({ loadout: growth({sj_line:1}, { sj_gate: 2 }) })
  const first = target(gate)
  gate._startBasic=()=>{}
  gate._damageEnemy({target:first.id,source:'sj_yujian',damage:10,direct:true})
  assert.equal(gate.state.swordBursts?.length??0,0,'ordinary swords do not spend heavy-hit burst')
  gate._damageEnemy({target:first.id,source:'sj_line',damage:10,direct:true,weaponCastId:'heavy-one'})
  assert.equal(gate.state.swordBursts.length,1)
  const before=first.hp, burstDamage=gate.state.swordBursts[0].damage
  close(burstDamage,gate.state.player.attack*1.2)
  gate.advance(.3)
  close(before-first.hp,burstDamage*(gate.state.player.attack+gate.state.player.magicAttack)/(2*gate.state.player.attack))
  assert.equal(gate.state.swordBursts.length,0,'burst cannot trigger itself')
  for (const spirit of [0, 3]) {
    const defended = make({ loadout: growth({}, { vajra: 4, ...(spirit ? { sj_spirit: spirit } : {}) }) })
    defended.state.projectiles.push({ id: 'incoming', x: 33, y: -60, vx: 0, vy: 0,
      radius: 10, damage: 10, hostile: true, hitIds: [], expiresAt: 10 })
    defended.state.drops.push({ id: 'healing', x: 83, y: -60, radius: 9,
      kind: 'heal', amount: 10, expiresAt: 10 })
    defended.advance(STEP)
    close(defended.state.player.hp, 37.5 - 17 + (spirit ? 10 : 0))
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
    const updatedLoadout = growth({ [skill]: 3 }, { sj_bone: 3, sj_mark:1, sj_gate: 1 })
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
  assert.deepEqual(run.state.loadout, {...selected, classId: 'sword'})
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
  assert.equal(families.size, 11)
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
