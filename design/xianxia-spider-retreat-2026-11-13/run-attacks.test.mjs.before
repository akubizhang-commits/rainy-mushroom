import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { FLOORS, FLOOR01_BOSS, ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { insideHex } from '../js/xianxia/TowerArena.js'
import { cultivationAt, TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'

const STEP = 1 / 60
const CENTER = { x: 33, y: -60 }
const loadout = { active: { sj_wanjian: 1 }, passive: {}, evolutions: [],
  weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }
// Isolate native enemy attacks from automatic player attacks and regeneration.
function isolate(run) { run._startBasic=()=>{}; run._regenerateHp=()=>{}; return run }
const restore = snapshot => isolate(TowerRun.restore(snapshot))
const cache = new Map()
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`)
const separation = (run, enemy) => Math.hypot(enemy.x - run.state.player.x, enemy.y - run.state.player.y)

// Obtain actual authored membership through spawning/deaths, not fabricated
// enemy IDs or archetype swaps. Assist is only used to reach the fixture's wave.
// Restore disables it before every measured attack; none of this is balance evidence.
const byArchetype = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]))
function authoredMatch(id, floor) {
  const wanted = byArchetype[id]
  return FLOORS.filter(f => floor === undefined || f.floor === floor).flatMap(f =>
    f.waves.flatMap(w => w.enemy_groups.map(g => ({ floor: f.floor, id: g.archetype }))))
    .find(row => row.id === id || wanted.role !== 'boss'
      && byArchetype[row.id].species === wanted.species && byArchetype[row.id].role === wanted.role)
}
function fixture(requested, range = 250, requestedFloor) {
  const membership = authoredMatch(requested, requestedFloor)
  assert.ok(membership, `Use selector fixture for unplaced species: ${requested}`)
  const { id: archetype, floor } = membership
  const key = `${floor}:${archetype}`
  if (!cache.has(key)) {
    // The late-floor heavy hit must be survivable so recovery/CD assertions run.
    const xp = TOWER_XP_CAP
    const hp = xp ? cultivationAt(xp).maxHp : 100
    const setup = new TowerRun({ attemptId: 1, floor, seed: 123, hp, xp,
      normalCoreCounter: 0, arenaVersion: 1, loadout })
    // This suite exercises native attacks and their legacy phase controller, not M01–M24.
    // Remove the optional controller before spawning; full-run/mechanics suites retain it.
    delete setup.state.monsterMechanics
    setup.setPlaytestAssist(true)
    for (let i = 0; i < 80000 && !setup.state.enemies.some(e => e.archetype === archetype); i++) {
      for (const enemy of setup.state.enemies) Object.assign(enemy, { hp: 1, x: CENTER.x + 60, y: CENTER.y })
      setup.advance(STEP)
    }
    assert.ok(setup.state.enemies.some(e => e.archetype === archetype), key)
    assert.ok(validateTowerSnapshot(setup.snapshot()), key)
    cache.set(key, setup.snapshot())
  }
  const run = restore(cache.get(key))
  run.state.cooldowns.sj_wanjian = 99999
  run.state.hurtUntil = 0
  run.state.nextWindupAt = 0
  const enemy = run.state.enemies.find(e => e.archetype === archetype)
  // Orbit is continuous and uses this per-target timer, not the skill cooldown.
  Object.assign(enemy, { x: CENTER.x + range, y: CENTER.y, orbitNextAt: 99999 })
  // 83号：普通怪出生4秒后才可首次放技能；本套件测招式本身，跳过这段等待。
  Object.assign(enemy.ai, { entryUntil: 0, graceUntil: 0, readyAt: 0, cooldowns: {} })
  quietOthers(run, enemy.id)
  assert.ok(validateTowerSnapshot(run.snapshot()))
  return { run, enemy }
}

function quietOthers(run, id) {
  for (const other of run.state.enemies) if (other.id !== id) {
    Object.assign(other, { x: CENTER.x - 500, y: CENTER.y })
    Object.assign(other.ai, { entryUntil: 99999, graceUntil: 99999, mode: 'approach', attack: null })
  }
  run.state.zones = run.state.zones.filter(z => !z.renderOnly || z.ownerId === id)
}
function ticks(run, enemy, n = 1) {
  for (let i = 0; i < n; i++) {
    quietOthers(run, enemy.id)
    run.advance(STEP)
  }
}
function until(run, enemy, condition, maxTicks = 1800) {
  for (let i = 0; i < maxTicks && !condition(); i++) ticks(run, enemy)
  assert.ok(condition(), `${enemy.archetype}: condition not reached (${enemy.ai.mode})`)
}

const cases = [
  // Distances for enlarged melee attacks deliberately exceed the old R+54+18 gate.
  ['boar_normal', 220, 'charge', 240, .85],
  // First-floor named wolf uses authored radius 24.64 plus elite bite reach 94.
  ['wolf_elite', 135, 'bite', 118.64, .8],
  ['spider_elite', 250, 'web', 480, .9, undefined, 3],
  ['tiger_normal', 125, 'sweep', 118, 1],
  ['snake_normal', 250, 'shot', 480, .85, 'poison'],
  ['bear_normal', 135, 'slam', 122, 1],
  ['falcon_elite', 250, 'shot', 480, .95, 'feather'],
  ['bat_normal', 250, 'shot', 480, .85, 'sonic'],
  ['crocodile_normal', 135, 'sweep', 120, 1],
  ['wolf_boss', 165, 'bite', 150, .9],
  ['tiger_boss_zhenyan', 175, 'sweep', 164, 1.2],
  ['snake_boss', 250, 'shot', 480, 1.05, 'poison'],
]
for (const [id, range, kind, reach, windup, element, floor] of cases) {
  test(`real Run ${id}: ${kind} has authored damage, final range, warning and recovery CD`, () => {
    const far = fixture(id, reach + 28, floor)
    ticks(far.run, far.enemy)
    assert.equal(far.enemy.ai.attack, null, 'outside final reach must approach without warning or damage')
    assert.ok(separation(far.run, far.enemy) < reach + 28)
    const { run, enemy } = fixture(id, range, floor)
    const hp = run.state.player.hp
    ticks(run, enemy)
    assert.equal(enemy.ai.mode, 'windup')
    const attack = enemy.ai.attack
    assert.equal(attack.kind, kind)
    assert.equal(attack.range, reach)
    assert.equal(attack.windup, windup)
    const expectedDamage = id === 'tiger_boss_zhenyan'
      ? FLOORS[run.state.floor - 1].floor_stat_scale.boss_heavy_damage : enemy.damage
    assert.equal(attack.damage, expectedDamage)
    assert.equal(attack.element, element)
    assert.equal(run.state.player.hp, hp, 'windup cannot deal damage')
    const warning = run.state.zones.find(z => z.ownerId === enemy.id && z.renderOnly)
    assert.equal(warning.kind, 'enemy_windup')
    assert.equal(warning.attackId, attack.id)
    assert.equal(warning.shape, attack.shape)
    assert.ok(validateTowerSnapshot(run.snapshot()))
    until(run, enemy, () => enemy.ai.mode === 'active')
    if (kind === 'shot') {
      const shots = run.state.projectiles.filter(p => p.source === attack.id)
      assert.equal(shots.length, enemy.role === 'boss' ? 3 : 1)
      for (const shot of shots) {
        assert.equal(shot.element, element)
        assert.equal(shot.damage, enemy.damage)
        close(Math.hypot(shot.vx, shot.vy), 270)
      }
    } else if (kind === 'web') {
      assert.ok(run.state.zones.some(z => z.kind === 'web' && !z.renderOnly && z.damage === enemy.damage))
    } else if (kind !== 'charge') close(hp - run.state.player.hp, expectedDamage * 2)
    until(run, enemy, () => enemy.ai.cooldowns[kind] > run.state.time)
    close(enemy.ai.cooldowns[kind], run.state.time + attack.cooldown)
    assert.ok(enemy.ai.readyAt <= run.state.time, 'one kind must not globally lock the next kind')
    const sequence = enemy.ai.sequence
    ticks(run, enemy)
    assert.equal(enemy.ai.sequence, sequence, 'the completed kind cannot start again before its CD')
    assert.ok(validateTowerSnapshot(run.snapshot()))
  })
}

test('boar charge CD permits a close bite, blocks early recharging and does not repeat charge in melee', () => {
  const { run, enemy } = fixture('boar_normal', 220)
  ticks(run, enemy)
  assert.equal(enemy.ai.attack.kind, 'charge')
  until(run, enemy, () => enemy.ai.cooldowns.charge > run.state.time)
  const chargeAt = enemy.ai.cooldowns.charge
  // 83号：普通怪技能替换一次普通攻击，之后要等一个普通攻击间隔才能咬。
  close(enemy.ai.cooldowns.bite, run.state.time + enemy.attackInterval)
  enemy.x = run.state.player.x + 60; enemy.y = run.state.player.y
  ticks(run, enemy)
  assert.equal(enemy.ai.attack, null)
  until(run, enemy, () => enemy.ai.mode === 'windup')
  assert.equal(enemy.ai.attack.kind, 'bite')
  assert.ok(run.state.time < chargeAt)
  until(run, enemy, () => enemy.ai.mode === 'approach')
  const sequence = enemy.ai.sequence
  enemy.x = run.state.player.x + 350
  ticks(run, enemy, 10)
  assert.equal(enemy.ai.sequence, sequence)
  assert.ok(enemy.x < run.state.player.x + 350, 'cooling charge must still approach')
  assert.equal(enemy.ai.cooldowns.charge, chargeAt)
  until(run, enemy, () => run.state.time >= chargeAt)
  enemy.x = run.state.player.x + 60
  until(run, enemy, () => enemy.ai.mode === 'windup')
  assert.equal(enemy.ai.attack.kind, 'bite', 'even a ready charge cannot be selected below 130')
})

for (const id of ['falcon_elite', 'spider_elite']) {
  test(`${id} advances, retreats and holds its distance band during cooldown`, () => {
    const { run, enemy } = fixture(id, 60, id === 'spider_elite' ? 3 : undefined)
    enemy.ai.cooldowns[id === 'spider_elite' ? 'web' : 'shot'] = run.state.time + 20
    ticks(run, enemy, 90)
    close(separation(run, enemy), 180)
    assert.equal(enemy.ai.mode, 'approach')
    enemy.x = CENTER.x + 400; enemy.y = CENTER.y
    ticks(run, enemy, 90)
    close(separation(run, enemy), 300)
    const held = { x: enemy.x, y: enemy.y }
    ticks(run, enemy, 30)
    assert.deepEqual({ x: enemy.x, y: enemy.y }, held)
    assert.ok(validateTowerSnapshot(run.snapshot()))
  })
}

for (const id of ['snake_normal', 'bat_normal']) {
  test(`${id} closes in to bite while its shot cools, then pulls back to shoot`, () => {
    const { run, enemy } = fixture(id, 260)
    enemy.ai.cooldowns.shot = run.state.time + 20
    until(run, enemy, () => enemy.ai.mode === 'windup')
    assert.equal(enemy.ai.attack.kind, 'bite')
    assert.ok(separation(run, enemy) <= enemy.radius + 54 + 18 + 1e-7)
    until(run, enemy, () => enemy.ai.mode === 'approach')
    enemy.ai.cooldowns.shot = run.state.time
    enemy.ai.cooldowns.bite = run.state.time + 99
    until(run, enemy, () => enemy.ai.mode === 'windup')
    assert.equal(enemy.ai.attack.kind, 'shot')
    assert.ok(separation(run, enemy) >= 150 - 1e-7, 'the shot is released only after pulling back')
    until(run, enemy, () => enemy.ai.cooldowns.shot > run.state.time)
    close(enemy.ai.cooldowns.shot, run.state.time + (run.state.floor <= 3 ? 15 : 10))
    assert.ok(validateTowerSnapshot(run.snapshot()))
  })
}

test('normal skills wait four seconds after spawning and only one normal casts a skill at a time', () => {
  const { run, enemy } = fixture('boar_normal', 220)
  const spawned = run._enemy({ id: 'late-boar', archetype: enemy.archetype,
    x: run.state.player.x - 200, y: run.state.player.y })
  close(spawned.ai.cooldowns.charge, run.state.time + 4)
  assert.notEqual(run._attackSpec(spawned)?.kind, 'charge', 'no skill before the first four seconds')
  spawned.ai.cooldowns = {}
  assert.equal(run._attackSpec(spawned)?.kind, 'charge')
  run.state.enemies.push(spawned)
  ticks(run, enemy)
  assert.equal(enemy.ai.attack.kind, 'charge')
  assert.equal(run._attackSpec(spawned), null, 'a second normal cannot start a skill while one is casting')
  spawned.x = run.state.player.x - 60
  assert.equal(run._attackSpec(spawned)?.kind, 'bite', 'it falls back to its ordinary attack')
})

test('a ranged actor can move along the hex wall while cooling and still shoot at close range', () => {
  const { run, enemy } = fixture('falcon_elite', 60)
  enemy.x = 978 - enemy.radius
  run.state.player.x = enemy.x - 60
  const start = { x: enemy.x, y: enemy.y }
  enemy.ai.cooldowns.shot = run.state.time + .5
  ticks(run, enemy, 20)
  assert.ok(Math.hypot(enemy.x - start.x, enemy.y - start.y) > 1, 'blocked retreat should slide along the wall')
  until(run, enemy, () => run.state.projectiles.some(p => p.hostile))
  assert.equal(enemy.ai.attack.kind, 'shot')
  assert.ok(insideHex(enemy, enemy.radius))
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('shot launch uses saved spec speed and poison remains one direct hit with no new damage-over-time zone', () => {
  const { run, enemy } = fixture('snake_normal')
  ticks(run, enemy)
  enemy.ai.attack.speed = 333
  const restored = restore(run.snapshot())
  const actor = restored.state.enemies.find(e => e.id === enemy.id)
  const hp = restored.state.player.hp
  until(restored, actor, () => restored.state.projectiles.some(p => p.hostile))
  const shot = restored.state.projectiles.find(p => p.hostile)
  close(Math.hypot(shot.vx, shot.vy), 333)
  assert.equal(shot.element, 'poison')
  actor.ai.graceUntil = 99999
  until(restored, actor, () => restored.state.player.hp < hp)
  close(hp - restored.state.player.hp, actor.damage * 2)
  ticks(restored, actor, 180)
  close(hp - restored.state.player.hp, actor.damage * 2)
  assert.ok(!restored.state.zones.some(z => z.hostile && !z.renderOnly))
  assert.ok(validateTowerSnapshot(restored.snapshot()))
})

test('element windup, flight and per-kind cooldown survive pause, JSON restore and batched ticks', () => {
  const { run, enemy } = fixture('falcon_elite')
  ticks(run, enemy, 10)
  run.pause()
  const paused = run.snapshot()
  const restored = restore(JSON.parse(JSON.stringify(paused)))
  restored.advance(60)
  assert.deepEqual(restored.snapshot(), paused)
  run.resume(); restored.resume()
  run.advance(.9)
  for (let i = 0; i < 54; i++) restored.advance(STEP)
  assert.deepEqual(restored.snapshot(), run.snapshot())
  assert.ok(run.state.projectiles.some(p => p.element === 'feather'))
  const flight = restore(JSON.parse(JSON.stringify(run.snapshot())))
  run.advance(.9); flight.advance(.9)
  assert.deepEqual(flight.snapshot(), run.snapshot())
  assert.ok(run.state.enemies.find(e => e.id === enemy.id).ai.cooldowns.shot > run.state.time)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('optional attack/projectile elements accept the three enums, reject corruption and preserve untagged legacy shots', () => {
  const { run, enemy } = fixture('snake_normal')
  ticks(run, enemy)
  const windup = run.snapshot()
  until(run, enemy, () => run.state.projectiles.some(p => p.hostile))
  const flight = run.snapshot()
  for (const original of [windup, flight]) {
    for (const value of ['poison', 'feather', 'sonic', '', 'fire', null, 1, true, {}, undefined]) {
      const snapshot = structuredClone(original)
      const holder = original === windup
        ? snapshot.enemies.find(e => e.id === enemy.id).ai.attack : snapshot.projectiles.find(p => p.hostile)
      holder.element = value
      const valid = ['poison', 'feather', 'sonic'].includes(value)
      assert.equal(validateTowerSnapshot(snapshot), valid, String(value))
      if (!valid) assert.throws(() => restore(snapshot), TypeError)
    }
  }
  const legacy = structuredClone(windup)
  delete legacy.enemies.find(e => e.id === enemy.id).ai.attack.element
  const old = restore(legacy)
  const actor = old.state.enemies.find(e => e.id === enemy.id)
  until(old, actor, () => old.state.projectiles.some(p => p.hostile))
  assert.equal(Object.hasOwn(old.state.projectiles.find(p => p.hostile), 'element'), false)
  assert.ok(validateTowerSnapshot(old.snapshot()))
  assert.deepEqual(restore(old.snapshot()).snapshot(), old.snapshot())
})

test('floor-one elite spider remains a melee tutorial and the authored boss keeps charge/gore stats', () => {
  const { run, enemy } = fixture('spider_elite', 250, 1)
  const x = enemy.x
  ticks(run, enemy)
  assert.equal(enemy.ai.attack, null)
  assert.ok(enemy.x < x)
  enemy.x = CENTER.x + 60
  ticks(run, enemy)
  assert.equal(enemy.ai.attack.kind, 'bite')
  assert.equal(enemy.ai.attack.windup, .65)
  assert.equal(enemy.ai.attack.damage, enemy.damage)
  assert.equal(enemy.ai.attack.cost, 2)
  for (const [range, kind, windup, reach, damage, cooldown] of [
    [250, 'charge', 1.05, 324, 14.928, 5], [60, 'gore', 1.25, 132, 9.332, 2.4],
  ]) {
    const { run: bossRun, enemy: boss } = fixture('boar_boss', range)
    ticks(bossRun, boss)
    const attack = boss.ai.attack
    assert.deepEqual([attack.kind, attack.windup, attack.range, attack.damage, attack.cooldown],
      [kind, windup, reach, damage, cooldown])
    assert.ok(validateTowerSnapshot(bossRun.snapshot()))
  }
})

test('new family selection retains spawn grace, quarter-second warning spacing and attack budget', () => {
  const { run, enemy } = fixture('boar_normal', 60)
  enemy.ai.graceUntil = run.state.time + .3
  ticks(run, enemy, 17)
  assert.equal(enemy.ai.attack, null)
  ticks(run, enemy)
  assert.equal(enemy.ai.mode, 'windup')
  const first = enemy.ai.attack.startedAt
  const other = run.state.enemies.find(e => e.id !== enemy.id)
  assert.ok(other)
  Object.assign(other, { x: run.state.player.x - 60, y: run.state.player.y, orbitNextAt: 99999 })
  Object.assign(other.ai, { entryUntil: 0, graceUntil: 0, readyAt: 0 })
  run.advance(14 * STEP)
  assert.equal(other.ai.attack, null)
  run.advance(STEP)
  assert.ok(other.ai.attack,'the second protected probe starts after the warning gap')
  close(other.ai.attack.startedAt - first, .25)
  const third = run.state.enemies.find(e => e.id !== enemy.id && e.id !== other.id)
  assert.ok(third)
  Object.assign(third, { x: run.state.player.x, y: run.state.player.y + 60, orbitNextAt: 99999 })
  Object.assign(third.ai, { entryUntil: 0, graceUntil: 0, readyAt: 0 })
  run.advance(.3)
  assert.equal(third.ai.attack, null, 'both normal attacks consume the floor-one budget of two')
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

for (const [archetype, reach, cooldown, speed] of [
  ['boar_normal', 240, 15, 460], ['boar_elite', 270, 4.5, 460], ['boar_boss', 324, 5, 720],
]) {
  test(`${archetype} shortened dash stops at its warning endpoint and cannot hit the removed tail`, () => {
    const { run, enemy } = fixture(archetype, archetype === 'boar_normal' ? 220 : 250)
    until(run, enemy, () => enemy.ai.attack?.locked)
    const attack = enemy.ai.attack
    assert.equal(attack.kind, 'charge')
    assert.equal(attack.range, reach)
    assert.equal(attack.maxRange, reach)
    assert.equal(attack.speed, speed)
    const warning = run.state.zones.find(z => z.ownerId === enemy.id && z.renderOnly)
    close(Math.hypot(warning.toX - warning.x, warning.toY - warning.y), reach)
    const snapshot = run.snapshot()
    for (const hit of [true, false]) {
      const fork = restore(snapshot)
      // Earlier fixture waves leave pickup rewards; isolate attack damage.
      fork.state.drops = fork.state.drops.filter(d=>d.receipts)
      const boar = fork.state.enemies.find(e => e.id === enemy.id)
      const distance = hit ? 220 : reach + boar.radius + fork.state.player.radius + 1
      fork.state.player.x = attack.x + attack.dirX * distance
      fork.state.player.y = attack.y + attack.dirY * distance
      const hp = fork.state.player.hp
      until(fork, boar, () => boar.ai.mode === 'active')
      assert.equal(fork.state.player.hp, hp, 'future warning corridor is not instantaneous damage')
      const replay = restore(fork.snapshot())
      const replayBoar = replay.state.enemies.find(e => e.id === boar.id)
      while (boar.ai.mode === 'active') {
        ticks(fork, boar); ticks(replay, replayBoar)
        assert.deepEqual(replay.snapshot(), fork.snapshot(), 'mid-dash snapshot replay remains deterministic')
      }
      close(boar.ai.attack.travelled, reach)
      close(boar.x, warning.toX); close(boar.y, warning.toY)
      assert.equal(boar.ai.attack.boundary, false)
      assert.equal(boar.ai.attack.hit, hit)
      close(hp - fork.state.player.hp, hit ? attack.damage * 2 : 0)
      until(fork, boar, () => boar.ai.cooldowns.charge > fork.state.time)
      close(boar.ai.cooldowns.charge, fork.state.time + cooldown)
      assert.ok(validateTowerSnapshot(fork.snapshot()))
    }
  })
}

test('floor-one boss phase-two charges each warn and travel 324, retaining the shared five-second cooldown', () => {
  const { run, enemy } = fixture('boar_boss')
  enemy.hp = enemy.maxHp / 2
  until(run, enemy, () => enemy.ai.phase === 2)
  const ids = []
  for (let segment = 1; segment <= 2; segment++) {
    until(run, enemy, () => enemy.ai.mode === 'windup' && enemy.ai.attack?.segment === segment)
    const attack = enemy.ai.attack
    assert.equal(attack.kind, 'charge')
    assert.equal(attack.segments, 2)
    assert.equal(attack.windup, 1.05)
    assert.equal(attack.active, .45)
    ids.push(attack.id)
    until(run, enemy, () => enemy.ai.attack.locked)
    const warning = { ...run.state.zones.find(z => z.ownerId === enemy.id && z.renderOnly) }
    close(Math.hypot(warning.toX - warning.x, warning.toY - warning.y), 324)
    until(run, enemy, () => enemy.ai.mode === 'recovery')
    close(attack.travelled, 324)
    close(enemy.x, warning.toX); close(enemy.y, warning.toY)
    assert.ok(validateTowerSnapshot(run.snapshot()))
  }
  assert.notEqual(ids[0], ids[1], 'each segment retains its own hit ledger and warning')
  // Contact now displaces the player. Prevent an immediate melee follow-up
  // from hiding the one-tick approach state whose charge cooldown we inspect.
  run.state.nextWindupAt = run.state.time + 10
  until(run, enemy, () => enemy.ai.mode === 'approach')
  close(enemy.ai.cooldowns.charge, run.state.time + 5)
})

test('authored boss runtime matches the JSON source and approaches beyond the shortened selection range', () => {
  const source = JSON.parse(readFileSync(new URL(
    '../docs/xianxia/sect-tower-v1/data/floor01-boss.json', import.meta.url), 'utf8'))
  assert.deepEqual(FLOOR01_BOSS, source, 'regenerate content from its source rather than editing runtime constants')
  const charge = source.attacks.find(a => a.id === 'charge')
  assert.deepEqual(
    [charge.range, charge.active_s, charge.dash_speed, charge.cooldown_s, charge.windup_s,
      charge.recovery_s, charge.damage, charge.width],
    [324, .45, 720, 5, 1.05, .9, 14.928, 84],
  )
  for (const [distance, shouldCharge] of [[180, true], [300, true], [304, false], [400, false]]) {
    const { run, enemy } = fixture('boar_boss', distance)
    ticks(run, enemy)
    if (shouldCharge) assert.equal(enemy.ai.attack?.kind, 'charge')
    else {
      assert.equal(enemy.ai.attack, null)
      assert.ok(separation(run, enemy) < distance, 'outside reach the boss approaches')
    }
  }
})

// These families exist in the catalog but are not placed in the current tower.
// Run-created selector actors exercise geometry/timing without claiming valid
// authored persistence. The table above retains full replay validation for all
// placed families, including equivalent shot/sweep/slam actions.
for (const [archetype, range, kind, reach, windup, element] of [
  ['scorpion_normal', 250, 'shot', 480, .85, 'poison'],
  ['centipede_elite', 135, 'sweep', 124, .9, undefined],
  ['ape_normal', 125, 'slam', 118, 1.05, undefined],
]) test(`unplaced ${archetype}: real Run attack retains warning, hit, timing and cooldown`, () => {
  const makeActor = distance => {
    const run = isolate(new TowerRun({ attemptId: 1, floor: 2, seed: 123, hp: cultivationAt(TOWER_XP_CAP).maxHp, xp: TOWER_XP_CAP, arenaVersion: 1, loadout }))
    delete run.state.monsterMechanics
    run.state.cooldowns.sj_wanjian = 99999
    const enemy = run._enemy({ id: 'unplaced-selector', archetype, x: CENTER.x + distance, y: CENTER.y })
    run.state.enemies.push(enemy)
    Object.assign(enemy, { orbitNextAt: 99999 })
    Object.assign(enemy.ai, { entryUntil: 0, graceUntil: 0, readyAt: 0, cooldowns: {} })
    return { run, enemy }
  }
  const far = makeActor(reach + 28)
  ticks(far.run, far.enemy)
  assert.equal(far.enemy.ai.attack, null)
  assert.ok(separation(far.run, far.enemy) < reach + 28)
  const { run, enemy } = makeActor(range), hp = run.state.player.hp
  ticks(run, enemy)
  const attack = enemy.ai.attack
  assert.equal(enemy.ai.mode, 'windup')
  assert.deepEqual([attack.kind, attack.range, attack.windup, attack.damage, attack.element],
    [kind, reach, windup, enemy.damage, element])
  assert.equal(run.state.player.hp, hp)
  const warning = run.state.zones.find(z => z.ownerId === enemy.id && z.renderOnly)
  assert.equal(warning.kind, 'enemy_windup')
  assert.equal(warning.attackId, attack.id)
  assert.equal(warning.shape, attack.shape)
  until(run, enemy, () => enemy.ai.mode === 'active')
  if (kind === 'shot') {
    const shots = run.state.projectiles.filter(p => p.source === attack.id)
    assert.equal(shots.length, 1)
    assert.equal(shots[0].element, element)
    assert.equal(shots[0].damage, enemy.damage)
    close(Math.hypot(shots[0].vx, shots[0].vy), 270)
  } else close(hp - run.state.player.hp, enemy.damage * 2)
  until(run, enemy, () => enemy.ai.cooldowns[kind] > run.state.time)
  close(enemy.ai.cooldowns[kind], run.state.time + attack.cooldown)
  assert.ok(enemy.ai.readyAt <= run.state.time)
  const sequence = enemy.ai.sequence
  ticks(run, enemy)
  assert.equal(enemy.ai.sequence, sequence)
})
