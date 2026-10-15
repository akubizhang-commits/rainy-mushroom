import test from 'node:test'
import assert from 'node:assert/strict'

import { Pool } from '../js/survivor/Pool.js'
import { SeededRandom } from '../js/survivor/SurvivorRandom.js'
import { makeEnemy } from '../js/survivor/Enemies.js'
import { resetEnemy } from '../js/survivor/Enemies.js'
import {
  Spawner,
  spawnRadiusFor,
  relocateDistanceFor,
  pickComposition,
  segmentAt,
} from '../js/survivor/Spawner.js'
import { LIMITS } from '../js/survivor/data/limits.js'
import { WAVES } from '../js/survivor/data/waves.js'

const DT = 1 / 60

function makeWorld(viewport = { width: 720, height: 1560 }) {
  return {
    time: 0,
    player: { x: 0, y: 0, r: 18 },
    enemies: new Pool(LIMITS.pools.enemies, makeEnemy),
    diag: { dropped: { enemies: 0, shots: 0 }, droppedTime: 0 },
    viewport,
  }
}

test('spawn radius = hypot(viewW/2, viewH/2) + margin (03 §1-2)', () => {
  const r = spawnRadiusFor({ width: 720, height: 1280 }, 60)
  assert.ok(Math.abs(r - (Math.hypot(360, 640) + 60)) < 1e-9)
  // 720×1280 → ≈ 794 (matches 01 §10 reference).
  assert.ok(Math.abs(r - 794) < 1)
})

test('relocate distance = max(900, spawnRadius + 120)', () => {
  assert.equal(relocateDistanceFor(700), 900) // 700+120=820 < 900
  assert.equal(relocateDistanceFor(900), 1020)
})

test('segmentAt returns the covering segment and null past the end', () => {
  assert.equal(segmentAt(0), WAVES.segments[0])
  assert.equal(segmentAt(59.9), WAVES.segments[0])
  assert.equal(segmentAt(60), WAVES.segments[1])
  assert.equal(segmentAt(119.9), WAVES.segments[1])
  assert.equal(segmentAt(120), null) // S1 only defines 0–120s
})

test('pickComposition respects the percentage weights (statistical tolerance)', () => {
  const rng = new SeededRandom('comp')
  const composition = { gnat: 70, beetle: 30 }
  const counts = { gnat: 0, beetle: 0 }
  const N = 20000
  for (let i = 0; i < N; i += 1) counts[pickComposition(composition, rng)] += 1
  const gnatPct = (counts.gnat / N) * 100
  assert.ok(Math.abs(gnatPct - 70) < 3, `gnat ≈ 70% (got ${gnatPct.toFixed(1)})`)
})

test('spawn rate produces roughly rate × seconds enemies in the first segment', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('s:spawn'))
  const seg = WAVES.segments[0] // rate 1.0, gnat only, cap 30
  // Run 30 simulated seconds (never hit the cap since nothing removes enemies, so
  // check the first few seconds before the cap bites).
  let spawnedBeforeCap = 0
  for (let i = 0; i < 10 * 60; i += 1) {
    const before = world.enemies.count
    spawner.step(world, DT)
    if (world.enemies.count < seg.cap) spawnedBeforeCap = world.enemies.count
    world.time += DT
  }
  // 10s × 1.0/s ≈ 10 spawns (±1 for accumulator rounding) before cap of 30.
  assert.ok(spawnedBeforeCap >= 9 && spawnedBeforeCap <= 11, `~10 spawns, got ${spawnedBeforeCap}`)
})

test('all routine spawns land outside the viewport (on the spawn circle)', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('s:spawn'))
  for (let i = 0; i < 60; i += 1) {
    spawner.step(world, DT)
    world.time += DT
  }
  const r = spawner.spawnRadius
  const halfDiag = Math.hypot(world.viewport.width / 2, world.viewport.height / 2)
  for (let i = 0; i < world.enemies.count; i += 1) {
    const e = world.enemies.active[i]
    const d = Math.hypot(e.x - world.player.x, e.y - world.player.y)
    // Spawned on the circle of radius r, which is beyond the viewport half-diagonal.
    assert.ok(Math.abs(d - r) < 1e-6, 'spawned on the spawn circle')
    assert.ok(d > halfDiag, 'outside the viewport')
  }
})

test('on-screen cap is never exceeded', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('cap'))
  // Jump into the second segment (higher rate, cap 50) and run long.
  world.time = 60
  for (let i = 0; i < 59 * 60; i += 1) {
    spawner.step(world, DT)
    assert.ok(world.enemies.count <= WAVES.segments[1].cap, 'count ≤ segment cap')
    world.time += DT
  }
  assert.ok(world.diag.dropped.enemies > 0, 'cap drops are counted in diag')
})

test('enemies that drift beyond relocateDistance are moved back onto the spawn circle', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('reloc'))
  // Place one enemy far away.
  const e = world.enemies.acquire()
  resetEnemy(e, { kind: 'gnat', x: 5000, y: 0, r: 10, hp: 8, speed: 0, damage: 0, xp: 1, kbRes: 0 })
  world.time = 0
  spawner.step(world, DT)
  const d = Math.hypot(e.x - world.player.x, e.y - world.player.y)
  assert.ok(Math.abs(d - spawner.spawnRadius) < 1e-6, 'relocated onto the spawn circle')
})
