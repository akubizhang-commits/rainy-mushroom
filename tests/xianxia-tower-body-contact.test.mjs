import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun } from '../js/xianxia/TowerRun.js'
import { insideHex } from '../js/xianxia/TowerArena.js'
import { clearPillars } from '../js/xianxia/TowerObstacles.js'

function fixture() {
  const run = new TowerRun({ attemptId: 1, floor: 1, seed: 123, hp: 100, xp: 0,
    normalCoreCounter: 0, arenaVersion: 1,
    loadout: { active: { sj_wanjian: 1 }, passive: {}, evolutions: [],
      weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 } })
  for (let i = 0; i < 600 && !run.state.enemies.length; i++) run.advance(1 / 60)
  const s = run.state, e = s.enemies[0]
  s.enemies = [e]; s.pending = []; s.reserved = []
  e.orbitNextAt = 99999; e.ai.entryUntil = 99999
  Object.assign(s.player, { x: 33, y: -60 })
  Object.assign(e, { x: 33 + s.player.radius + e.radius, y: -60 })
  return { run, s, e }
}
const gap = (s, e) => Math.hypot(s.player.x - e.x, s.player.y - e.y) - s.player.radius - e.radius

test('walking into a living monster stops at its body without pushing it', () => {
  const { run, s, e } = fixture(), x = e.x
  run.setInput(1, 0)
  for (let i = 0; i < 120; i++) { run.advance(1 / 60); assert.ok(gap(s, e) >= -1e-6) }
  assert.equal(e.x, x)
})
test('coincident bodies separate deterministically, including next to arena walls', () => {
  for (const x of [33, 940]) {
    const { run, s, e } = fixture()
    s.player.x = x; e.x = x; e.y = s.player.y
    run.advance(1 / 60)
    assert.ok(gap(s, e) >= -1e-6)
    for (const actor of [s.player, e]) {
      assert.ok(insideHex(actor, actor.radius)); assert.ok(clearPillars(actor, actor.radius))
    }
  }
})
test('death releases the body and pause freezes contact correction', () => {
  const { run, s, e } = fixture()
  e.x = s.player.x
  run.pause(); run.advance(1); assert.equal(e.x, s.player.x)
  run.resume(); e.hp = 0; run.setInput(1, 0); run.advance(1 / 60)
  assert.ok(s.player.x > 33)
})

test('enlarged boss and rage leave standing room without enlarging damage radius', () => {
  const { run, s, e } = fixture()
  e.family = 'boar'; e.role = 'boss'; e.radius = 42
  e.x = s.player.x; e.y = s.player.y
  run.advance(1 / 60)
  assert.ok(Math.hypot(e.x - s.player.x, e.y - s.player.y) >= 106)
  e.mechanic = { ...(e.mechanic || {}), enraged: true }
  run._separateBody(e, s.player)
  assert.ok(Math.hypot(e.x - s.player.x, e.y - s.player.y) >= 123.6 - 1e-6)
  assert.equal(e.radius, 42)
})
