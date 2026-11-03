import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { FLOORS, FLOOR01 } from '../js/xianxia/TowerContent.js'

const STEP = 1 / 60
const VERTICES = [[33, 1020], [978, 480], [978, -600], [33, -1140], [-912, -600], [-912, 480]]
const CENTER = { x: 33, y: -60 }
const loadout = { active: { sj_wanjian: 1 }, passive: {}, evolutions: [],
  weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }
const make = (extra = {}) => new TowerRun({ attemptId: 1, floor: 1, seed: 123,
  hp: 100, xp: 0, normalCoreCounter: 19, loadout, ...extra })
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`)
// Independent signed distances from the six requested, literal vertices.
const faces = VERTICES.map(([x, y], i) => {
  const [bx, by] = VERTICES[(i + 1) % 6], length = Math.hypot(bx - x, by - y)
  return { x: (x + bx) / 2, y: (y + by) / 2, nx: -(by - y) / length, ny: (bx - x) / length }
})
const contained = (actor, radius = actor.radius) =>
  faces.every(f => (actor.x - f.x) * f.nx + (actor.y - f.y) * f.ny + radius <= 1e-7)
const allBodiesContained = run => {
  for (const actor of [run.state.player, ...run.state.enemies, ...run.state.reserved]) {
    assert.ok(contained(actor), `${actor.id ?? 'player'} escaped at ${actor.x},${actor.y}, r=${actor.radius}`)
  }
}
function assistedTick(run) {
  for (const enemy of run.state.enemies) {
    // Controlled real kills advance the geometry fixture; this is not a DPS benchmark.
    enemy.hp = 1; enemy.x = CENTER.x + 60; enemy.y = CENTER.y
  }
  run.advance(STEP)
}

test('arena opt-in writes only version one and leaves default/explicit-zero constructors rectangular', () => {
  const legacy = make(), explicit = make({ arenaVersion: 0 }), hex = make({ arenaVersion: 1 })
  assert.deepEqual(legacy.snapshot(), explicit.snapshot())
  assert.equal(Object.hasOwn(legacy.state, 'arenaVersion'), false)
  assert.equal(hex.state.arenaVersion, 1)
  const normalized = hex.snapshot()
  delete normalized.arenaVersion
  assert.deepEqual(normalized, legacy.snapshot(), 'shape selection must not reseed loot/combat or rewrite authored IDs')
  assert.ok(validateTowerSnapshot(hex.snapshot()))
  for (const value of [-1, 2, .5, '1', true, null, NaN, Infinity]) {
    assert.throws(() => make({ arenaVersion: value }), RangeError)
  }
  for (const value of [0, -1, 2, '1', true, null, undefined]) {
    const invalid = { ...hex.snapshot(), arenaVersion: value }
    assert.equal(validateTowerSnapshot(invalid), false)
    assert.throws(() => TowerRun.restore(invalid), TypeError)
  }
})

test('old no-arena snapshots restore outside hex corners without relocation or automatic migration', () => {
  const legacy = make({ arenaVersion: 0, lootVersion: 0 })
  legacy.state.player.x = 950; legacy.state.player.y = 950
  assert.equal(contained(legacy.state.player), false)
  assert.ok(validateTowerSnapshot(legacy.snapshot()))
  legacy.pause()
  const snapshot = legacy.snapshot()
  const restored = TowerRun.restore(JSON.parse(JSON.stringify(snapshot)))
  assert.deepEqual(restored.snapshot(), snapshot)
  assert.equal(Object.hasOwn(restored.state, 'arenaVersion'), false)
  assert.equal(Object.hasOwn(restored.state, 'loot'), false)
  assert.equal(validateTowerSnapshot({ ...snapshot, arenaVersion: 1 }), false,
    'opting a legacy corner position into hex must reject, never silently clamp the saved player')
  restored.resume()
  restored.setInput(1, 1)
  restored.advance(1)
  assert.equal(restored.state.player.x, 960)
  assert.equal(restored.state.player.y, 1002)
  assert.equal(Object.hasOwn(restored.state, 'arenaVersion'), false)
  assert.ok(validateTowerSnapshot(restored.snapshot()))
})

test('hex movement contains the complete player circle at all six faces and vertices', () => {
  for (const [x, y] of [...VERTICES, ...faces.map(f => [f.x, f.y])]) {
    const run = make({ arenaVersion: 1 })
    // Start beyond interior pillars: this test isolates the outer six walls.
    // Keep monsters out of this wall-only probe: bodies now block the player.
    for (const pending of run.state.pending) pending.retryAt = 99999
    const length = Math.hypot(x-CENTER.x,y-CENTER.y)
    run.state.player.x=CENTER.x+(x-CENTER.x)/length*650
    run.state.player.y=CENTER.y+(y-CENTER.y)/length*650
    // Survival assist isolates geometry, not balance or clearability.
    run.setPlaytestAssist(true)
    run.setInput(x - CENTER.x, y - CENTER.y)
    for (let i = 0; i < 90; i++) {
      run.advance(.1)
      allBodiesContained(run)
    }
    const p = run.state.player
    assert.ok(Math.hypot(p.x - CENTER.x, p.y - CENTER.y) > 800, 'the player must reach the boundary, not freeze at center')
    assert.ok(faces.some(f => Math.abs((p.x - f.x) * f.nx + (p.y - f.y) * f.ny + p.radius) < 1e-5))
    assert.ok(validateTowerSnapshot(run.snapshot()))
  }
})

test('hex replay and following viewport retain the actual slant-clipped displacement', () => {
  const run = make({ arenaVersion: 1 })
  const face = faces[0]
  run.state.player.x = face.x - face.nx * 19
  run.state.player.y = face.y - face.ny * 19
  const p = { ...run.state.player }
  run.setViewport({ xmin: p.x - 632, xmax: p.x + 632,
    ymin: p.y - 200, ymax: p.y + 190, followPlayer: true })
  const view = { ...run.state.view }
  run.setInput(face.nx, face.ny)
  const divided = TowerRun.restore(run.snapshot())
  run.advance(.3)
  for (let i = 0; i < 18; i++) divided.advance(STEP)
  assert.deepEqual(divided.snapshot(), run.snapshot())
  close(run.state.view.xmin - view.xmin, run.state.player.x - p.x)
  close(run.state.view.ymin - view.ymin, run.state.player.y - p.y)
  assert.ok(Math.hypot(run.state.player.x - p.x, run.state.player.y - p.y) < 1.001)
  allBodiesContained(run)
  run.pause()
  const paused = run.snapshot(), restored = TowerRun.restore(JSON.parse(JSON.stringify(paused)))
  restored.advance(60)
  assert.deepEqual(restored.snapshot(), paused)
  for (const actor of [run, restored]) {
    actor.resume(); actor.setInput(-face.nx, -face.ny); actor.advance(.2)
  }
  assert.deepEqual(restored.snapshot(), run.snapshot())
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('hex snapshots reject escaped players, enemies and reserved circles, including radius tampering', () => {
  const run = make({ arenaVersion: 1 })
  run.advance(.1)
  assert.ok(run.state.reserved.length > 0)
  const reserved = run.snapshot()
  run.advance(1)
  assert.ok(run.state.enemies.length > 0)
  const live = run.snapshot()
  for (const kind of ['player', 'enemies', 'reserved']) {
    const original = kind === 'reserved' ? reserved : live
    for (const point of [{ x: 900, y: 950 },
      { x: faces[0].x - faces[0].nx, y: faces[0].y - faces[0].ny }]) {
      const corrupt = JSON.parse(JSON.stringify(original))
      const actor = kind === 'player' ? corrupt.player : corrupt[kind][0]
      Object.assign(actor, point)
      assert.equal(contained(actor), false)
      assert.equal(validateTowerSnapshot(corrupt), false, `${kind}: full circle must fit`)
      assert.throws(() => TowerRun.restore(corrupt), TypeError)
    }
  }
  const shrunk = JSON.parse(JSON.stringify(reserved))
  Object.assign(shrunk.reserved[0], { x: faces[0].x - faces[0].nx, y: faces[0].y - faces[0].ny, radius: 0 })
  assert.equal(validateTowerSnapshot(shrunk), false, 'reserved radius must match the eventual authored enemy body')
  assert.throws(() => TowerRun.restore(shrunk), TypeError)
})

test('hex spawning keeps the 280-distance warning recheck and authored membership', () => {
  const run = make({ arenaVersion: 1 })
  run.advance(.1)
  const warning = run.state.reserved[0]
  assert.ok(warning)
  assert.ok(contained(warning))
  assert.ok(Math.hypot(warning.x - CENTER.x, warning.y - CENTER.y) >= 280)
  assert.ok(FLOOR01.arena.portals.find(p => p.id === warning.portal).candidates
    .some(p => p.x === warning.x && p.y === warning.y), 'filter authored candidates; do not relocate spawn points')
  assert.ok(warning.readyAt > run.state.time)
  run.state.player.x = warning.x; run.state.player.y = warning.y
  while (run.state.time + 1e-9 < warning.readyAt) run.advance(STEP)
  assert.ok(!run.state.enemies.some(e => e.id === warning.id))
  assert.ok(run.state.pending.some(p => p.id === warning.id && p.retryAt > run.state.time))
  assert.equal(new Set([...run.state.pending, ...run.state.reserved, ...run.state.enemies].map(e => e.id)).size,
    run.state.wavePlanned)
  allBodiesContained(run)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

function firstBossSnapshot() {
  const run = make({ arenaVersion: 1 })
  run.setPlaytestAssist(true)
  for (let i = 0; i < 80000 && !run.state.enemies.some(e => e.role === 'boss'); i++) assistedTick(run)
  assert.equal(run.state.wave, 20)
  assert.ok(run.state.enemies.some(e => e.role === 'boss'))
  assert.ok(validateTowerSnapshot(run.snapshot()))
  return run.snapshot()
}

test('real boss charge rays and dash bodies clip to each hex face and replay without escaping', () => {
  const initial = firstBossSnapshot()
  for (const face of faces) {
    const run = TowerRun.restore(initial)
    // Isolate native dash clipping/replay; current mechanic geometry has a separate suite.
    delete run.state.monsterMechanics
    for (const e of run.state.enemies) delete e.mechanic
    const boss = run.state.enemies.find(e => e.role === 'boss')
    for (const enemy of run.state.enemies) {
      if (enemy !== boss) {
        enemy.x = CENTER.x; enemy.y = CENTER.y; enemy.ai.graceUntil = 99999
      }
    }
    boss.x = face.x - face.nx * 280; boss.y = face.y - face.ny * 280
    run.state.player.x = face.x - face.nx * 25; run.state.player.y = face.y - face.ny * 25
    boss.ai.entryUntil = 0; boss.ai.graceUntil = 0; boss.ai.readyAt = 0
    assert.ok(validateTowerSnapshot(run.snapshot()))
    run.advance(STEP)
    assert.equal(boss.ai.mode, 'windup')
    assert.equal(boss.ai.attack.kind, 'charge')
    const attack = boss.ai.attack
    close(attack.range, 280 - boss.radius)
    const end = { x: attack.x + attack.dirX * attack.range, y: attack.y + attack.dirY * attack.range }
    assert.ok(contained(end, boss.radius))
    assert.equal(contained({ x: end.x + attack.dirX * .01, y: end.y + attack.dirY * .01 }, boss.radius), false)
    assert.equal(attack.clipped, true)
    const telegraph = run.state.zones.find(z => z.ownerId === boss.id && z.renderOnly)
    close(telegraph.toX, end.x); close(telegraph.toY, end.y)
    run.advance(.5)
    const restored = TowerRun.restore(JSON.parse(JSON.stringify(run.snapshot())))
    for (let i = 0; i < 72; i++) {
      run.advance(STEP); restored.advance(STEP)
      allBodiesContained(run)
    }
    assert.deepEqual(restored.snapshot(), run.snapshot())
    close(boss.x, end.x); close(boss.y, end.y)
    assert.equal(boss.ai.attack.boundary, true)
    assert.ok(validateTowerSnapshot(run.snapshot()))
  }
})

test('all nine hex floors can reach every authored wave with safe, finite spawns and unchanged IDs', () => {
  let deaths = 0
  const portals = new Set()
  for (let floor = 1; floor <= 9; floor++) {
    const run = make({ arenaVersion: 1, floor })
    run.setPlaytestAssist(true)
    for (let i = 0; i < 80000 && ['playing','paused'].includes(run.state.phase); i++) {
      run.resume() // Spawn reachability fixture chooses to skip breakthrough.
      assistedTick(run)
      allBodiesContained(run)
      assert.equal(run.state.wavePlanned, run.state.pending.length + run.state.reserved.length
        + run.state.enemies.filter(e=>!e.temporary).length + run.state.waveKilled)
      // Formal wave capacity excludes the separately capped mechanic attachments.
      assert.ok(run.state.enemies.filter(e=>!e.temporary).length + run.state.reserved.length <= FLOORS[floor - 1].concurrent_cap)
      for (const reserved of run.state.reserved) {
        const actualPortal = FLOOR01.arena.portals.find(p => p.candidates
          .some(point => point.x === reserved.x && point.y === reserved.y))
        assert.ok(actualPortal, 'every reservation must retain an authored candidate position')
        portals.add(actualPortal.id)
        assert.ok(Math.hypot(reserved.x - CENTER.x, reserved.y - CENTER.y) >= 280)
      }
    }
    assert.equal(run.state.phase, 'won', `floor ${floor}, wave ${run.state.wave} must remain reachable`)
    assert.equal(run.state.clearedWaves.length, 20)
    assert.equal(new Set(run.state.killLedger.map(k => k.id)).size, run.state.killLedger.length)
    for (const kill of run.state.killLedger) assert.ok(kill.id.startsWith(`a1:f${floor}:w${kill.wave}:`))
    assert.ok(validateTowerSnapshot(run.snapshot()))
    deaths += run.state.killLedger.length
  }
  assert.equal(deaths, 4772)
  assert.deepEqual([...portals].sort(), ['E', 'N', 'NE', 'NW', 'S', 'SE', 'SW', 'W'])
})
