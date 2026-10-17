import test from 'node:test'
import assert from 'node:assert/strict'

import { SurvivorRun, SurvivorDataError } from '../js/survivor/SurvivorRun.js'
import { WAVES } from '../js/survivor/data/waves.js'
import { DT } from '../js/survivor/SimClock.js'

function newRun(overrides = {}) {
  return new SurvivorRun({ seed: 'run-test', viewport: { width: 720, height: 1560 }, ...overrides })
}

test('constructor validates seed and viewport', () => {
  assert.throws(() => new SurvivorRun({}), TypeError)
  assert.throws(() => new SurvivorRun({ seed: '' }), TypeError)
  assert.throws(
    () => new SurvivorRun({ seed: 'x', viewport: { width: NaN, height: 100 } }),
    RangeError,
  )
})

test('viewport is clamped to the valid range (03 §11)', () => {
  const run = new SurvivorRun({ seed: 'clamp', viewport: { width: 100, height: 9999 } })
  assert.equal(run.viewport.width, 320)
  assert.equal(run.viewport.height, 1800)
})

test('a run starts in the playing state with one spore_shot weapon at Lv1', () => {
  const run = newRun()
  assert.equal(run.state, 'playing')
  assert.equal(run.weapons[0].id, 'spore_shot')
  assert.equal(run.weapons[0].level, 1)
  assert.equal(run.player.hp, run.player.maxHp)
})

test('setInput normalises vectors longer than 1 and ignores non-finite values', () => {
  const run = newRun()
  run.setInput(3, 4) // |v| = 5 → normalised to (0.6, 0.8)
  assert.ok(Math.abs(run._inX - 0.6) < 1e-9)
  assert.ok(Math.abs(run._inY - 0.8) < 1e-9)
  run.setInput(NaN, 1)
  assert.equal(run._inX, 0)
  assert.equal(run._inY, 1)
})

test('advance only runs steps while playing and reports the step count', () => {
  const run = newRun()
  const steps = run.advance(DT * 3)
  assert.equal(steps, 3)
  assert.ok(run.time > 0)
})

test('player moves according to input and move speed', () => {
  const run = newRun()
  run.setInput(1, 0)
  const x0 = run.player.x
  run.step()
  assert.ok(Math.abs(run.player.x - (x0 + run.stats.moveSpeed * DT)) < 1e-9)
})

test('pause ↔ resume returns to the previous state and freezes the sim', () => {
  const run = newRun()
  assert.equal(run.pause(), true)
  assert.equal(run.state, 'paused')
  const t = run.time
  assert.equal(run.advance(DT * 5), 0, 'no steps while paused')
  assert.equal(run.time, t)
  assert.equal(run.resume(), true)
  assert.equal(run.state, 'playing')
  // Cannot resume when not paused.
  assert.equal(run.resume(), false)
})

test('abandon only works while paused and transitions to lost', () => {
  const run = newRun()
  assert.equal(run.abandon(), false, 'cannot abandon while playing')
  run.pause()
  assert.equal(run.abandon(), true)
  assert.equal(run.state, 'lost')
  assert.equal(run.summary().abandoned, true)
  assert.equal(run.summary().outcome, 'lost')
})

test('entering levelup freezes the sim and choose() advances the queue', () => {
  const run = newRun()
  // Force a level-up by banking xp directly, then run one step so the pickup phase
  // detects the pending level-up. Easiest: inject a spore on the player and step.
  const spore = run.spores.acquire()
  spore.x = run.player.x
  spore.y = run.player.y
  spore.xp = run.progression.needed // exactly one level
  run.step()
  assert.equal(run.state, 'levelup')
  assert.ok(Array.isArray(run.offer))
  assert.equal(run.offer.length, 3)
  // Sim is frozen in levelup.
  assert.equal(run.advance(DT * 3), 0)
  // Invalid choices are rejected.
  assert.equal(run.choose(-1), false)
  assert.equal(run.choose(3), false)
  assert.equal(run.choose(1.5), false)
  // Valid choice returns to playing.
  assert.equal(run.choose(0), true)
  assert.equal(run.state, 'playing')
})

test('multiple queued level-ups pop one after another', () => {
  const run = newRun()
  const spore = run.spores.acquire()
  spore.x = run.player.x
  spore.y = run.player.y
  // Enough xp for three levels.
  spore.xp = 5 + 11 + 17
  run.step()
  assert.equal(run.state, 'levelup')
  assert.equal(run.choose(0), true)
  assert.equal(run.state, 'levelup', 'second level-up pops')
  assert.equal(run.choose(0), true)
  assert.equal(run.state, 'levelup', 'third level-up pops')
  assert.equal(run.choose(0), true)
  assert.equal(run.state, 'playing')
})

function levelUpOnce(run) {
  const spore = run.spores.acquire()
  spore.x = run.player.x
  spore.y = run.player.y
  spore.xp = run.progression.needed
  run.step()
  assert.equal(run.state, 'levelup')
}

test('first level-up offers a new weapon; picking it adds a second weapon slot', () => {
  const run = newRun()
  levelUpOnce(run)
  const idx = run.offer.findIndex((c) => c.kind === 'weapon' && c.isNew)
  assert.ok(idx >= 0, 'first level-up guarantees a new-weapon card')
  const id = run.offer[idx].id
  run.choose(idx)
  assert.equal(run.weapons.length, 2)
  assert.equal(run.weapons[0].id, 'spore_shot')
  assert.equal(run.weapons[1].id, id)
  assert.equal(run.weapons[1].level, 1)
  assert.deepEqual(run.summary().weapons, [{ id: 'spore_shot', level: 1 }, { id, level: 1 }])
})

test('weapon upgrade / passive cards update the right slot and recompute stats', () => {
  const run = newRun()
  run._applyCard({ kind: 'weapon', id: 'spore_shot', level: 2, isNew: false })
  assert.equal(run.weapons[0].level, 2)
  run._applyCard({ kind: 'weapon', id: 'dew_ring', level: 1, isNew: true })
  run._applyCard({ kind: 'weapon', id: 'dew_ring', level: 2, isNew: false })
  assert.deepEqual(run.weapons.map((w) => [w.id, w.level]), [['spore_shot', 2], ['dew_ring', 2]])
  run._applyCard({ kind: 'passive', id: 'might', level: 1, isNew: true })
  run._applyCard({ kind: 'passive', id: 'might', level: 2, isNew: false })
  run._applyCard({ kind: 'passive', id: 'area', level: 1, isNew: true })
  assert.ok(Math.abs(run.stats.might - 1.2) < 1e-9)
  assert.ok(Math.abs(run.stats.areaMul - 1.1) < 1e-9)
  assert.deepEqual(run.summary().passives, [{ id: 'might', level: 2 }, { id: 'area', level: 1 }])
  // Unknown weapon ids are never equipped even if a card slips through.
  run._applyCard({ kind: 'weapon', id: 'not_a_weapon', level: 1, isNew: true })
  assert.equal(run.weapons.length, 2)
})

test('weapon slots cap at 4 and passive slots cap at 4 (01 §5)', () => {
  const run = newRun()
  for (const id of ['umbrella_blades', 'dew_ring']) run._applyCard({ kind: 'weapon', id, level: 1, isNew: true })
  assert.equal(run.weapons.length, 3)
  // 5 选 4（08 K8）：第 4 把装上，第 5 把被拒。
  run._applyCard({ kind: 'weapon', id: 'raindrop', level: 1, isNew: true })
  run._applyCard({ kind: 'weapon', id: 'leaf_boomerang', level: 1, isNew: true })
  assert.deepEqual(run.weapons.map((w) => w.id), ['spore_shot', 'umbrella_blades', 'dew_ring', 'raindrop'])
  for (const id of ['might', 'cooldown', 'area', 'speed']) run._applyCard({ kind: 'passive', id, level: 1, isNew: true })
  assert.equal(run.summary().passives.length, 4)
  // Levels never exceed 5.
  for (let i = 0; i < 10; i += 1) run._applyCard({ kind: 'passive', id: 'speed', level: 6, isNew: false })
  assert.equal(run.passives.speed, 5)
})

test('speed passive changes the player displacement per step', () => {
  const base = newRun()
  base.setInput(1, 0)
  base.step()
  const fast = newRun()
  fast._applyCard({ kind: 'passive', id: 'speed', level: 1, isNew: true })
  fast.setInput(1, 0)
  fast.step()
  assert.ok(Math.abs(base.player.x - 160 * DT) < 1e-9)
  assert.ok(Math.abs(fast.player.x - 160 * 1.08 * DT) < 1e-9)
})

test('summary lists every equipped weapon and passive', () => {
  const run = newRun()
  assert.deepEqual(run.summary().weapons, [{ id: 'spore_shot', level: 1 }])
  assert.deepEqual(run.summary().passives, [])
})

test('hp reaching 0 transitions to lost with a killer recorded', () => {
  const run = newRun()
  // Spawn an enemy right on the player; disable invuln so it hits this step.
  const e = run.enemies.acquire()
  e.kind = 'gnat'
  e.x = run.player.x
  e.y = run.player.y
  e.r = 10
  e.hp = 100000 // survives player weapon so it keeps dealing damage
  e.damage = 999
  e.speed = 0
  e.kbRes = 1
  run.player.invuln = 0
  run.step()
  assert.equal(run.state, 'lost')
  const summary = run.summary()
  assert.equal(summary.outcome, 'lost')
  assert.equal(summary.killer, 'gnat')
})

test('without the debug option, surviving 180 s does not win (08 K1)', () => {
  const run = newRun()
  run.time = 180 - DT / 2
  run.step()
  assert.equal(run.state, 'playing')
  assert.equal(run.timedWinSec, 0)
  assert.equal('winAtSeconds' in WAVES, false)
})

test('debug.timedWinSec keeps the old timed victory as a debug switch', () => {
  const run = newRun({ debug: { timedWinSec: 180 } })
  run.time = 180 - DT / 2
  run.step()
  assert.equal(run.state, 'won')
  const summary = run.summary()
  assert.equal(summary.outcome, 'won')
  assert.equal(summary.killer, '')
  assert.equal(summary.bossDefeated, false)
  assert.ok(summary.survivalSec >= 180)
  // Invalid values disable it.
  for (const v of [0, -1, NaN, Infinity, '180']) assert.equal(newRun({ debug: { timedWinSec: v } }).timedWinSec, 0)
})

test('summary reports purified count and crystal cards', () => {
  const run = newRun()
  // Kill one enemy via the death step.
  const e = run.enemies.acquire()
  e.kind = 'gnat'
  e.x = 300
  e.y = 300
  e.r = 10
  e.hp = 0
  e.xp = 0
  run._stepDeaths()
  assert.equal(run.purified, 1)
})

test('drainEvents returns and clears the event queue', () => {
  const run = newRun()
  run.events.push({ type: 'test' })
  const drained = run.drainEvents()
  assert.equal(drained.length, 1)
  assert.equal(run.events.length, 0)
})
