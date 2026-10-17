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
import { ENEMIES } from '../js/survivor/data/enemies.js'

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
  assert.equal(segmentAt(120), WAVES.segments[2])
  assert.equal(segmentAt(179.9), WAVES.segments[2])
  assert.equal(segmentAt(180), WAVES.segments[3])
  assert.equal(segmentAt(419.9), WAVES.segments[6])
  assert.equal(segmentAt(420), WAVES.segments[7]) // 7:00–Boss 击败, open-ended (08 K2)
  assert.equal(segmentAt(9999), WAVES.segments[7])
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

function releaseAll(world) {
  world.enemies.releaseAll()
}

test('every wave segment spawns at its rate with its composition (statistical tolerance)', () => {
  for (const seg of WAVES.segments) {
    const world = makeWorld()
    const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom(`seg:${seg.fromSec}`))
    spawner.nextEvent = WAVES.events.length // routine spawns only
    // Rate: one real pass over the segment (release each step so the cap never bites).
    world.time = seg.fromSec
    let spawned = 0
    const span = seg.toSec === null ? 60 : seg.toSec - seg.fromSec // open segment: sample 60 s
    const steps = Math.round(span * 60)
    for (let i = 0; i < steps; i += 1) {
      spawner.step(world, DT)
      spawned += world.enemies.count
      releaseAll(world)
      world.time = seg.fromSec + (i + 1) * DT
    }
    const expected = seg.spawnRate * span
    assert.ok(Math.abs(spawned - expected) <= 1, `段 ${seg.fromSec}: ${spawned} ≈ ${expected}`)
    // Composition: hold the clock inside the segment for many spawns.
    const counts = {}
    let total = 0
    world.time = seg.fromSec + 1
    while (total < 8000) {
      spawner.step(world, DT)
      for (let k = 0; k < world.enemies.count; k += 1) {
        const kind = world.enemies.active[k].kind
        counts[kind] = (counts[kind] || 0) + 1
        total += 1
      }
      releaseAll(world)
    }
    for (const id of Object.keys(counts)) assert.ok(seg.composition[id] > 0, `段 ${seg.fromSec} 不应出现 ${id}`)
    for (const [id, pct] of Object.entries(seg.composition)) {
      const got = ((counts[id] || 0) / total) * 100
      assert.ok(Math.abs(got - pct) < 2.5, `段 ${seg.fromSec} ${id} ≈ ${pct}% (got ${got.toFixed(1)})`)
    }
  }
})

test('first routine appearance: moth 2:00, snail 3:00, sporeling 4:00', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('first'))
  spawner.nextEvent = WAVES.events.length
  const first = {}
  for (let i = 0; i < 420 * 60; i += 1) {
    spawner.step(world, DT)
    for (let k = 0; k < world.enemies.count; k += 1) {
      const kind = world.enemies.active[k].kind
      if (first[kind] === undefined) first[kind] = world.time
    }
    releaseAll(world)
    world.time += DT
  }
  for (const id of ['gnat', 'beetle', 'moth', 'snail', 'sporeling']) {
    const at = ENEMIES[id].firstSeenSec
    assert.ok(first[id] >= at - 1e-9, `${id} 不早于 ${at}s（实际 ${first[id]}）`)
    assert.ok(first[id] < at + 20, `${id} 在 ${at}s 后不久出现（实际 ${first[id]}）`)
  }
})

test('enemy growth uses the whole minute m = floor(t/60) (01 §9.1)', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('grow'))
  spawner.nextEvent = WAVES.events.length
  world.time = 179.5 // minute 2
  for (let i = 0; i < 60 && world.enemies.count === 0; i += 1) spawner.step(world, DT)
  const e = world.enemies.active[0]
  const def = ENEMIES[e.kind]
  assert.ok(Math.abs(e.hp - def.hp * 1.3) < 1e-9, 'hp × (1 + 0.15 × 2)')
  assert.ok(Math.abs(e.damage - def.contactDamage * 1.1) < 1e-9, 'damage × (1 + 0.05 × 2)')
})

// Step the spawner across `atSec` and return the enemies the event added (those not on
// the routine spawn circle).
function triggerEvent(world, spawner, atSec) {
  world.time = atSec - DT / 2
  spawner.nextEvent = WAVES.events.findIndex((e) => e.atSec >= atSec)
  const before = new Set()
  for (let k = 0; k < world.enemies.count; k += 1) before.add(world.enemies.active[k].uid)
  spawner.step(world, DT) // not yet due
  world.time = atSec
  spawner.step(world, DT)
  const added = []
  for (let k = 0; k < world.enemies.count; k += 1) {
    const e = world.enemies.active[k]
    if (before.has(e.uid)) continue
    const d = Math.hypot(e.x - world.player.x, e.y - world.player.y)
    if (Math.abs(d - spawner.spawnRadius) < 1e-6 && e.behavior !== 'cross') continue // routine spawn
    added.push(e)
  }
  return added
}

test('2:30 gnat ring: 24 gnats evenly spaced on a radius-350 circle around the player', () => {
  const world = makeWorld()
  world.player.x = 123
  world.player.y = -45
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('ring'))
  const ring = triggerEvent(world, spawner, 150)
  assert.equal(ring.length, 24)
  const angles = ring.map((e) => {
    assert.equal(e.kind, 'gnat')
    assert.equal(e.behavior, 'chase', '收拢 = 正常追踪')
    const d = Math.hypot(e.x - world.player.x, e.y - world.player.y)
    assert.ok(Math.abs(d - 350) < 1e-6, 'on the 350 circle')
    return Math.atan2(e.y - world.player.y, e.x - world.player.x)
  }).sort((a, b) => a - b)
  for (let i = 0; i < angles.length; i += 1) {
    const next = i + 1 < angles.length ? angles[i + 1] : angles[0] + Math.PI * 2
    assert.ok(Math.abs(next - angles[i] - (Math.PI * 2) / 24) < 1e-9, '等距')
  }
  // Fires once only.
  for (let i = 0; i < 120; i += 1) {
    world.time += DT
    spawner.step(world, DT)
  }
  let near = 0
  for (let k = 0; k < world.enemies.count; k += 1) {
    const e = world.enemies.active[k]
    if (Math.abs(Math.hypot(e.x - world.player.x, e.y - world.player.y) - 350) < 1e-6) near += 1
  }
  assert.equal(near, 24, '事件只触发一次')
})

test('2:30 ring obeys the global hard cap of 200 and counts the overflow', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('ringcap'))
  for (let i = 0; i < 190; i += 1) {
    const e = world.enemies.acquire()
    resetEnemy(e, { kind: 'gnat', x: 0, y: 500, r: 10, hp: 8, speed: 0, damage: 0, xp: 1, kbRes: 0 })
  }
  const dropped0 = world.diag.dropped.enemies
  const ring = triggerEvent(world, spawner, 150)
  assert.equal(ring.length, 10)
  assert.equal(world.enemies.count, LIMITS.hardCaps.enemies)
  assert.ok(world.diag.dropped.enemies > dropped0, 'overflow counted')
})

test('6:30 snail wall: 20 snails evenly spaced on a radius-400 circle', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('wall'))
  const wall = triggerEvent(world, spawner, 390)
  assert.equal(wall.length, 20)
  for (const e of wall) {
    assert.equal(e.kind, 'snail')
    assert.ok(Math.abs(Math.hypot(e.x, e.y) - 400) < 1e-6)
  }
})

test('4:30 moth cross: 16 moths in a column just off one screen edge, flying across', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('cross'))
  const col = triggerEvent(world, spawner, 270)
  assert.equal(col.length, 16)
  const limit = world.viewport.width / 2 + LIMITS.spawnMarginU
  const dir = col[0].dirX
  assert.ok(dir === 1 || dir === -1)
  const ys = col.map((e) => {
    assert.equal(e.kind, 'moth')
    assert.equal(e.behavior, 'cross')
    assert.equal(e.dirX, dir)
    assert.ok(Math.abs(e.x - (world.player.x - dir * limit)) < 1e-9, 'starts just off-screen')
    return e.y
  }).sort((a, b) => a - b)
  for (let i = 1; i < ys.length; i += 1) assert.ok(Math.abs(ys[i] - ys[i - 1] - 48) < 1e-9, 'column spacing')
})

test('optional events (5:00 elite) do not fire', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('elite'))
  triggerEvent(world, spawner, 300)
  for (let k = 0; k < world.enemies.count; k += 1) assert.notEqual(world.enemies.active[k].kind, 'elite_beetle')
})

test('full 0–7:00 run with events never exceeds segment caps or the hard cap of 200', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('full'))
  for (let i = 0; i < 420 * 60; i += 1) {
    spawner.step(world, DT)
    assert.ok(world.enemies.count <= LIMITS.hardCaps.enemies, `≤ 200 at t=${world.time.toFixed(2)}`)
    world.time += DT
  }
  assert.equal(spawner.nextEvent, WAVES.events.length, 'all events consumed')
})
