import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'

const STEP = 1 / 60
const loadout = { active: { sj_yujian: 1 }, passive: {}, evolutions: [],
  weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }
const make = (floor = 1) => new TowerRun({ attemptId: 1, floor, seed: 123,
  hp: 100, xp: 0, normalCoreCounter: 19, loadout })
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)

// Fixed-width host projection for the tested frames, passed to the real Run
// without Cocos/input mocks. Short-screen SHOW_ALL layout belongs to host tests.
function viewport(player, frameWidth, frameHeight) {
  const landscape = frameWidth >= frameHeight
  const width = landscape ? 1280 : 720, height = width * frameHeight / frameWidth
  const cameraY = landscape ? 12 : 40, top = landscape ? 108 : 161, bottom = landscape ? 72 : 86
  return { xmin: player.x - width / 2 + 8, xmax: player.x + width / 2 - 8,
    ymin: player.y + cameraY - height / 2 + bottom + 8,
    ymax: player.y + cameraY + height / 2 - top - 8 }
}

test('portrait/landscape viewport changes preserve real world state and paused JSON replay', () => {
  const run = make(4)
  run.state.cooldowns.sj_yujian = 99999
  run.advance(1.037)
  run.pause()
  const before = run.snapshot()
  assert.ok(before.enemies.length + before.reserved.length > 0)
  for (const [width, height] of [[844, 390], [1280, 720], [2560, 1200], [390, 844]]) {
    const nextView = { ...viewport(run.state.player, width, height), followPlayer: true }
    run.setViewport(nextView)
    assert.deepEqual(run.snapshot(), { ...before, view: nextView },
      'only the view rectangle changes: no reseeding, movement, warning reset or reward mutation')
    assert.ok(validateTowerSnapshot(run.snapshot()))
    const restored = TowerRun.restore(JSON.parse(JSON.stringify(run.snapshot())))
    run.advance(10); restored.advance(10)
    assert.deepEqual(restored.snapshot(), run.snapshot())
  }
  const restored = TowerRun.restore(run.snapshot())
  for (const actor of [run, restored]) {
    actor.resume()
    actor.setInput(.3, -.4)
  }
  for (let i = 0; i < 60; i++) {
    for (const actor of [run, restored]) {
      actor.setViewport({ ...viewport(actor.state.player, 844, 390), followPlayer: true })
      actor.advance(STEP)
    }
  }
  assert.deepEqual(restored.snapshot(), run.snapshot())
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('rotating during a spawn warning cannot bypass the world-distance recheck or duplicate a unit', () => {
  const run = make()
  run.state.cooldowns.sj_yujian = 99999
  run.setViewport(viewport(run.state.player, 390, 844))
  run.advance(.1)
  const warning = run.state.reserved[0]
  assert.ok(warning && warning.readyAt > run.state.time)
  assert.ok(Math.hypot(warning.x - run.state.player.x, warning.y - run.state.player.y) >= 280)
  const identity = { id: warning.id, readyAt: warning.readyAt, x: warning.x, y: warning.y }
  run.setViewport(viewport(run.state.player, 844, 390))
  assert.deepEqual(Object.fromEntries(Object.keys(identity).map(key => [key, warning[key]])), identity)
  assert.ok(!run.state.enemies.some(e => e.id === warning.id))
  // Controlled valid player position isolates materialization safety; no enemy
  // HP, damage, authored membership or timestamps are rewritten.
  run.state.player.x = warning.x
  run.state.player.y = warning.y
  run.setViewport(viewport(run.state.player, 844, 390))
  while (run.state.time + 1e-9 < warning.readyAt) run.advance(STEP)
  assert.ok(!run.state.enemies.some(e => e.id === warning.id))
  assert.ok(!run.state.reserved.some(e => e.id === warning.id))
  const retry = run.state.pending.find(e => e.id === warning.id)
  assert.ok(retry && retry.retryAt > run.state.time)
  assert.equal(new Set([...run.state.pending, ...run.state.reserved, ...run.state.enemies].map(e => e.id)).size,
    run.state.wavePlanned)
  assert.equal(run.state.waveKilled, 0)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('a portrait charge cropped by landscape recovers without damage and restores deterministically', () => {
  const run = make(1)
  run.state.cooldowns.sj_yujian = 99999
  run.advance(2)
  for (const enemy of run.state.enemies) {
    enemy.x = -800; enemy.y = -1000; enemy.ai.graceUntil = 99999
  }
  const enemy = run.state.enemies.find(e => e.family === 'boar' && e.role === 'normal')
  assert.ok(enemy)
  enemy.x = run.state.player.x; enemy.y = run.state.player.y + 250
  enemy.ai.entryUntil = 0; enemy.ai.graceUntil = 0; enemy.ai.readyAt = 0
  run.setViewport(viewport(run.state.player, 390, 844))
  run.advance(STEP)
  assert.equal(enemy.ai.mode, 'windup')
  assert.equal(enemy.ai.attack.kind, 'charge')
  assert.ok(validateTowerSnapshot(run.snapshot()))
  const old = run.snapshot()
  run.setViewport(viewport(run.state.player, 844, 390))
  const restored = TowerRun.restore(run.snapshot())
  for (const actor of [run, restored]) actor.advance(STEP)
  assert.deepEqual(restored.snapshot(), run.snapshot())
  assert.equal(enemy.ai.mode, 'recovery')
  assert.equal(enemy.x, old.enemies.find(e => e.id === enemy.id).x)
  assert.equal(enemy.y, old.enemies.find(e => e.id === enemy.id).y)
  assert.equal(run.state.player.hp, old.player.hp)
  assert.ok(!run.state.zones.some(z => z.ownerId === enemy.id && z.renderOnly))
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

// Real authored snake at the last fully visible position below the landscape
// HUD. Its shot will release three ticks later unless visibility cancels it.
function snakeAtViewportEdge() {
  const run = make(5)
  run.state.cooldowns.sj_yujian = 99999
  run.advance(2)
  for (const enemy of run.state.enemies) {
    enemy.x = -800; enemy.y = -1000; enemy.ai.graceUntil = 99999
  }
  const enemy = run.state.enemies.find(e => e.family === 'snake' && e.role === 'normal')
  assert.ok(enemy)
  const rect = viewport(run.state.player, 844, 390)
  enemy.x = run.state.player.x
  // Allow the initial spacing step before the attack starts; the following
  // camera still crops this shot before its final three windup ticks.
  enemy.y = rect.ymax - enemy.radius - 8
  enemy.ai.entryUntil = 0; enemy.ai.graceUntil = 0; enemy.ai.readyAt = 0
  run.setViewport(rect)
  run.advance(STEP)
  run.advance(.8)
  assert.equal(enemy.ai.mode, 'windup')
  assert.equal(enemy.ai.attack.kind, 'shot')
  close(enemy.ai.until - run.state.time, .05)
  assert.ok(validateTowerSnapshot(run.snapshot()))
  return { run, enemyId: enemy.id }
}

test('following viewport cancels the cropped snake shot inside a single x3 update', () => {
  const { run, enemyId } = snakeAtViewportEdge()
  const fixed = TowerRun.restore(run.snapshot())
  const initialPlayer = { ...run.state.player }
  run.setViewport({ ...run.state.view, followPlayer: true })
  for (const actor of [run, fixed]) {
    actor.setInput(0, -1)
    actor.advance(.3) // Host dt=.1 at x3; assist remains disabled.
  }
  close(run.state.player.y, initialPlayer.y - 66)
  assert.equal(run.state.projectiles.filter(p => p.hostile).length, 0)
  assert.equal(fixed.state.projectiles.filter(p => p.hostile).length, 1,
    'the old fixed rectangle remains a distinct, backward-compatible control')
  const enemy = run.state.enemies.find(e => e.id === enemyId)
  assert.equal(enemy.ai.mode, 'recovery')
  assert.ok(enemy.y > run.state.view.ymax + 8, 'enemy center is behind the final HUD')
  assert.ok(!run.state.zones.some(z => z.renderOnly && z.ownerId === enemyId))
  assert.equal(run.state.player.hp, initialPlayer.hp)
  assert.deepEqual(run.state.earned, { xp: 0, cores: 0, contribution: 0 })
  const expected = viewport(run.state.player, 844, 390)
  for (const key of ['xmin', 'xmax', 'ymin', 'ymax']) close(run.state.view[key], expected[key])
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('following viewport makes .3 seconds and eighteen subticks identical, including mid-batch JSON resume', () => {
  const { run } = snakeAtViewportEdge()
  run.setViewport({ ...run.state.view, followPlayer: true })
  run.setInput(0, -1)
  const divided = TowerRun.restore(run.snapshot()), interrupted = TowerRun.restore(run.snapshot())
  run.advance(.3)
  for (let i = 0; i < 18; i++) divided.advance(STEP)
  assert.deepEqual(divided.snapshot(), run.snapshot())
  interrupted.advance(.117)
  interrupted.pause()
  const paused = interrupted.snapshot()
  assert.equal(paused.view.followPlayer, true)
  const expectedPausedView = viewport(paused.player, 844, 390)
  for (const key of ['xmin', 'xmax', 'ymin', 'ymax']) close(paused.view[key], expectedPausedView[key])
  const restored = TowerRun.restore(JSON.parse(JSON.stringify(paused)))
  restored.advance(60)
  assert.deepEqual(restored.snapshot(), paused, 'pausing freezes the rectangle with the rest of the world')
  restored.resume()
  restored.advance(.183)
  assert.deepEqual(restored.snapshot(), run.snapshot())
  assert.equal(restored.state.projectiles.filter(p => p.hostile).length, 0)
  assert.ok(validateTowerSnapshot(restored.snapshot()))
})

test('following viewport translates by actual movement after arena clipping and stops drifting at the boundary', () => {
  for (const [x, y, direction] of [[959, 1001, 1], [-893, -1121, -1]]) {
    const run = make()
    run.state.player.x = x; run.state.player.y = y
    const rect = { ...viewport(run.state.player, 844, 390), followPlayer: true }
    run.setViewport(rect)
    run.setInput(direction, direction)
    run.advance(STEP)
    assert.equal(run.state.player.x, x + direction)
    assert.equal(run.state.player.y, y + direction)
    for (const key of ['xmin', 'xmax', 'ymin', 'ymax']) {
      assert.equal(run.state.view[key], rect[key] + direction,
        'viewport must use clipped displacement, not intended input velocity')
    }
    const stopped = { ...run.state.view }
    run.advance(.3)
    assert.deepEqual(run.state.view, stopped)
    assert.deepEqual(rect, { ...viewport({ x, y }, 844, 390), followPlayer: true },
      'setViewport copied the caller rectangle')
    assert.ok(validateTowerSnapshot(run.snapshot()))
  }
})

test('following viewport uses slowed movement rather than base move speed', () => {
  const run = make()
  const rect = { ...viewport(run.state.player, 844, 390), followPlayer: true }
  run.setViewport(rect)
  run.state.zones.push({ id: 'viewport-slow-web', kind: 'web', x: 33, y: -60, radius: 100,
    phase: 'active', hostile: true, renderOnly: false, direct: false, damage: 0,
    nextAt: 10, interval: 1, ticks: 4, targetCap: 1, expiresAt: 4 })
  assert.ok(validateTowerSnapshot(run.snapshot()))
  run.setInput(0, -1)
  run.advance(.3)
  close(run.state.player.y, -60 - 49.5)
  close(run.state.view.ymin, rect.ymin - 49.5)
  close(run.state.view.ymax, rect.ymax - 49.5)
  assert.equal(run.state.view.xmin, rect.xmin)
  assert.equal(run.state.view.xmax, rect.xmax)
  assert.equal(run.state.player.hp, 100)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('absent or false followPlayer keeps legacy static rectangles and null keeps geometry-only simulation', () => {
  const base = viewport(make().state.player, 844, 390)
  const actors = []
  for (const rect of [base, { ...base, followPlayer: false }, null]) {
    const run = make()
    run.setViewport(rect)
    const restored = TowerRun.restore(JSON.parse(JSON.stringify(run.snapshot())))
    for (const actor of [run, restored]) {
      actor.setInput(.3, .7)
      actor.advance(.3)
      assert.deepEqual(actor.state.view, rect)
      assert.ok(actor.state.player.x > 33 && actor.state.player.y > -60)
    }
    assert.deepEqual(restored.snapshot(), run.snapshot())
    assert.ok(validateTowerSnapshot(run.snapshot()))
    actors.push(run)
  }
  assert.deepEqual(actors[0].snapshot(), { ...actors[1].snapshot(), view: base })
  assert.equal(Object.hasOwn(actors[0].state.view, 'followPlayer'), false)
})

test('non-boolean followPlayer is rejected atomically by the setter and snapshot validator', () => {
  const run = make()
  run.setViewport({ ...viewport(run.state.player, 844, 390), followPlayer: true })
  const before = run.snapshot()
  for (const value of [undefined, null, 0, 1, 'true', [], {}, NaN, Infinity]) {
    const invalidView = { ...before.view, followPlayer: value }
    assert.throws(() => run.setViewport(invalidView), RangeError, `followPlayer=${String(value)}`)
    assert.deepEqual(run.snapshot(), before)
    const invalidSnapshot = { ...before, view: invalidView }
    assert.equal(validateTowerSnapshot(invalidSnapshot), false)
    assert.throws(() => TowerRun.restore(invalidSnapshot), TypeError)
  }
})
