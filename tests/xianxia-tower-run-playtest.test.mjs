import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'

const STEP = 1 / 60
const loadout = { active: { sj_wanjian: 1 }, passive: {}, evolutions: [],
  weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }
const make = (extra = {}) => new TowerRun({
  attemptId: 1, floor: 1, seed: 123, hp: 37.5, xp: 0, loadout, ...extra,
})
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)

test('playtest assist is an explicit instance-only boolean and toggling never heals or rewrites a snapshot', () => {
  const run = make()
  const original = run.snapshot()
  assert.equal(typeof run.setPlaytestAssist, 'function')
  run.setPlaytestAssist(true)
  assert.deepEqual(run.snapshot(), original)
  run.setPlaytestAssist(false)
  assert.deepEqual(run.snapshot(), original)
  for (const value of [undefined, null, 1, 'true', NaN, Infinity]) {
    assert.throws(() => run.setPlaytestAssist(value), TypeError)
    assert.deepEqual(run.snapshot(), original)
  }
  run.pause()
  const paused = run.snapshot()
  run.setPlaytestAssist(true)
  run.advance(60)
  assert.deepEqual(run.snapshot(), paused)
  assert.equal(JSON.stringify(run.snapshot()).includes('playtestAssist'), false)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

// Reach the authored boss quickly using low-HP trash fixtures. Boss HP and
// damage remain authored values; rewards still flow through real combat.
function firstBoss() {
  const run = make()
  run.setPlaytestAssist(true)
  for (let i = 0; i < 30000 && !run.state.enemies.some(e => e.role === 'boss'); i++) {
    for (const e of run.state.enemies) {
      if(e.role!=='boss')e.hp=1
      e.x = run.state.player.x + 60
      e.y = run.state.player.y
    }
    run.advance(STEP)
  }
  assert.equal(run.state.wave, 20)
  assert.ok(validateTowerSnapshot(run.snapshot()))
  const boss = run.state.enemies.find(e => e.role === 'boss')
  assert.ok(boss)
  boss.x = run.state.player.x + 60
  boss.y = run.state.player.y
  boss.ai.graceUntil = run.state.time + 10
  return { run, boss }
}

test('invincibility preserves normal outgoing damage and cannot one-shot a full-health boss', () => {
  const {run,boss}=firstBoss()
  const before=run.snapshot(),normal=TowerRun.restore(before)
  normal.setPlaytestAssist(false)
  run.advance(STEP);normal.advance(STEP)
  const surviving=run.state.enemies.find(e=>e.id===boss.id)
  assert.ok(surviving)
  assert.ok(surviving.hp<boss.maxHp)
  assert.deepEqual(run.state.enemies,normal.state.enemies)
  assert.deepEqual(run.state.earned,normal.state.earned)
  assert.deepEqual(run.state.killLedger,normal.state.killLedger)
  assert.deepEqual(run.state.effects,normal.state.effects)
  assert.equal(run.state.player.attack,before.player.attack)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('fresh and restored instances default to normal damage; disabling assist restores normal hits', () => {
  const { run, boss } = firstBoss()
  const original = run.snapshot()
  const restored = TowerRun.restore(JSON.parse(JSON.stringify(original)))
  run.setPlaytestAssist(false)
  for (const actor of [run, restored]) actor.advance(STEP)
  assert.deepEqual(run.snapshot(), restored.snapshot())
  const surviving = run.state.enemies.find(e => e.id === boss.id)
  assert.ok(surviving)
  close(boss.maxHp - surviving.hp, original.player.attack * .2)
  assert.ok(validateTowerSnapshot(restored.snapshot()))

  const fresh = make({ floor: 9 })
  fresh.advance(1)
  const enemy = fresh.state.enemies[0]
  enemy.x = fresh.state.player.x + 60; enemy.y = fresh.state.player.y
  enemy.ai.graceUntil = 99999
  fresh.advance(STEP)
  close(enemy.maxHp - enemy.hp, fresh.state.player.attack * .2)
  assert.ok(enemy.hp > 0)
})

function addHostileHits(run) {
  const { x, y } = run.state.player
  run.state.projectiles.push({ id: 'hostile-missile', x, y, vx: 0, vy: 0, radius: 8,
    damage: 8, hostile: true, hitIds: [], expiresAt: run.state.time + 5 })
  run.state.zones.push({ id: 'hostile-web', x, y, radius: 100, damage: 6, hostile: true,
    kind: 'web', direct: false, phase: 'active', nextAt: run.state.time + STEP,
    ticks: 4, interval: 1, targetCap: 1, expiresAt: run.state.time + 4, renderOnly: false })
}

test('assist ignores missiles and repeated hostile ground damage; disabling and restore resume damage without HP fill', () => {
  const run = make(), normal = make()
  addHostileHits(run); addHostileHits(normal)
  run.setPlaytestAssist(true)
  run.advance(.5); normal.advance(.5)
  assert.equal(run.state.player.hp, 37.5)
  assert.equal(normal.state.player.hp, 29.5)
  assert.equal(run.state.hurtUntil, 0, 'blocked hits do not bank a damage-immunity timer')
  const original = run.snapshot(), restored = TowerRun.restore(original)
  assert.equal(restored.state.player.hp, 37.5)
  restored.advance(1)
  assert.equal(restored.state.player.hp, 31.5, 'restoration never inherits assist')
  run.advance(1)
  assert.equal(run.state.player.hp, 37.5)
  assert.ok(validateTowerSnapshot(run.snapshot()))
  run.setPlaytestAssist(false)
  assert.equal(run.state.player.hp, 37.5)
  run.advance(1)
  assert.equal(run.state.player.hp, 31.5, 'the next remaining DOT tick damages normally')
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('assist suppresses real melee and swept charge damage without cancelling enemy actions', () => {
  const { run, boss } = firstBoss()
  for (const range of [100, 250]) {
    const initial = run.snapshot()
    // The assist contract here is measured against native gore/dash attacks.
    delete initial.monsterMechanics
    for (const e of initial.enemies) delete e.mechanic
    initial.player.hp = 37.5
    initial.cooldowns.sj_wanjian = 99999 // Orbit is distance-gated, not cooldown-gated.
    const regular = TowerRun.restore(initial), assisted = TowerRun.restore(initial)
    for (const actor of [regular, assisted]) {
      const enemy = actor.state.enemies.find(e => e.id === boss.id)
      enemy.x = actor.state.player.x + range
      enemy.y = actor.state.player.y
      enemy.ai.graceUntil = 0; enemy.ai.entryUntil = 0; enemy.ai.readyAt = 0
      // Keep orbit out of the tested attack geometry using a valid sword loadout.
      actor.state.loadout.active = { sj_yujian: 1 }
      actor.state.cooldowns.sj_yujian = 99999
    }
    assisted.setPlaytestAssist(true)
    regular.advance(1.8); assisted.advance(1.8)
    assert.ok(regular.state.player.hp < 37.5, `range ${range}`)
    assert.equal(assisted.state.player.hp, 37.5, `range ${range}`)
    assert.ok(assisted.state.enemies.find(e => e.id === boss.id).ai.attack.hit)
    assert.ok(validateTowerSnapshot(assisted.snapshot()))
  }
})

test('speed-scaled delta retains fixed-step elapsed time up to the existing 60-second call cap', () => {
  for (const speed of [1, 2, 3]) {
    const one = make(), divided = make()
    one.setPlaytestAssist(true); divided.setPlaytestAssist(true)
    one.advance(10.123 * speed)
    for (let i = 0; i < 100; i++) divided.advance(.10123 * speed)
    assert.equal(one.state.ticks, Math.floor((10.123 * speed + 1e-9) * 60))
    close(one.state.time + one.state.remainder, 10.123 * speed)
    close(divided.state.time + divided.state.remainder, 10.123 * speed)
    const partitioned = divided.snapshot()
    // Floating additions may differ by picoseconds, never by a simulation tick.
    close(one.state.remainder, partitioned.remainder)
    partitioned.remainder = one.state.remainder
    assert.deepEqual(one.snapshot(), partitioned)
  }
  const run = make()
  run.setPlaytestAssist(true)
  run.advance(60)
  assert.equal(run.state.ticks, 3600)
  assert.equal(run.state.time, 60)
  const before = run.snapshot()
  assert.throws(() => run.advance(60 + STEP), RangeError)
  assert.deepEqual(run.snapshot(), before)
})
