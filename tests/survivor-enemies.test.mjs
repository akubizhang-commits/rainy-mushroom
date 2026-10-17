import test from 'node:test'
import assert from 'node:assert/strict'
import { Pool } from '../js/survivor/Pool.js'
import { SeededRandom } from '../js/survivor/SurvivorRandom.js'
import { makeEnemy, resetEnemy, stepEnemyBehavior } from '../js/survivor/Enemies.js'
import { makeBubble, stepMistBubbles } from '../js/survivor/Projectiles.js'
import { Spawner } from '../js/survivor/Spawner.js'
import { SurvivorRun } from '../js/survivor/SurvivorRun.js'
import { ENEMIES } from '../js/survivor/data/enemies.js'
import { LIMITS } from '../js/survivor/data/limits.js'
import { WAVES } from '../js/survivor/data/waves.js'
import { PLAYER } from '../js/survivor/data/player.js'

const DT = 1 / 60

function makeWorld() {
  return {
    time: 0,
    player: { x: 0, y: 0, r: 18, hp: 100, invuln: 0 },
    enemies: new Pool(LIMITS.pools.enemies, makeEnemy),
    mistBubbles: new Pool(LIMITS.pools.mistBubbles, makeBubble),
    diag: { dropped: { enemies: 0, shots: 0, bubbles: 0 }, droppedTime: 0 },
    viewport: { width: 720, height: 1560 },
  }
}

function spawn(world, kind, x, y, extra = {}) {
  const def = ENEMIES[kind]
  const e = world.enemies.acquire()
  resetEnemy(e, {
    kind, x, y, r: def.radius, hp: def.hp, speed: def.moveSpeed, damage: def.contactDamage,
    xp: def.xp, kbRes: def.knockbackResist, behavior: def.behavior, timer: def.fireInterval || 0, ...extra,
  })
  return e
}

test('gnat / beetle / snail chase the player in a straight line at their move speed', () => {
  for (const kind of ['gnat', 'beetle', 'snail']) {
    const world = makeWorld()
    const e = spawn(world, kind, 0, -1000)
    for (let i = 0; i < 60; i += 1) stepEnemyBehavior(world, DT)
    assert.ok(Math.abs(e.x) < 1e-9, `${kind} stays on the line`)
    assert.ok(Math.abs(e.y - (-1000 + ENEMIES[kind].moveSpeed)) < 1e-6, `${kind} moves speed × 1s`)
  }
})

test('snail is a tank: 80 hp and 80% knockback resistance', () => {
  const world = makeWorld()
  const e = spawn(world, 'snail', 0, -500)
  assert.equal(e.hp, 80)
  assert.equal(e.kbRes, 0.8)
})

test('moth tracks with a perpendicular sway of amplitude ≈ 40 and period 1.2 s', () => {
  const world = makeWorld()
  const e = spawn(world, 'moth', 0, -3000)
  let minX = 0
  let maxX = 0
  const xs = []
  for (let i = 0; i < 2.4 * 60; i += 1) {
    stepEnemyBehavior(world, DT)
    minX = Math.min(minX, e.x)
    maxX = Math.max(maxX, e.x)
    xs.push(e.x)
  }
  // Player is far away straight ahead, so the lateral axis is x: offset = 40·sin(ωt).
  assert.ok(Math.abs(maxX - 40) < 2, `peak +40 (got ${maxX.toFixed(2)})`)
  assert.ok(Math.abs(minX + 40) < 2, `peak −40 (got ${minX.toFixed(2)})`)
  // Back near the centre line after one full period.
  assert.ok(Math.abs(xs[Math.round(1.2 * 60) - 1]) < 2, 'period 1.2 s')
  // Still closes in on the player.
  assert.ok(e.y > -3000 + 0.9 * ENEMIES.moth.moveSpeed * 2.4, 'keeps tracking forward')
})

test('sporeling approaches while > 180 and holds position within 180', () => {
  const world = makeWorld()
  const e = spawn(world, 'sporeling', 0, -400)
  stepEnemyBehavior(world, DT)
  assert.ok(e.y > -400, 'approaches from 400')
  let guard = 0
  while (Math.hypot(e.x, e.y) > 180 && guard < 600) {
    stepEnemyBehavior(world, DT)
    guard += 1
  }
  const d0 = Math.hypot(e.x, e.y)
  assert.ok(d0 <= 180 && d0 > 178, 'stops at the 180 approach range')
  for (let i = 0; i < 60; i += 1) stepEnemyBehavior(world, DT)
  assert.ok(Math.abs(Math.hypot(e.x, e.y) - d0) < 1e-9, 'holds position')
})

test('sporeling spits one mist bubble every 3 s while within 250, aimed at the player', () => {
  const world = makeWorld()
  const e = spawn(world, 'sporeling', 0, -200) // within fireRange, outside approachRange
  const fireTimes = []
  for (let i = 0; i < 10 * 60; i += 1) {
    const before = world.mistBubbles.count
    stepEnemyBehavior(world, DT)
    if (world.mistBubbles.count > before) fireTimes.push((i + 1) * DT)
    world.mistBubbles.releaseAll() // isolate firing from bubble flight
  }
  assert.equal(fireTimes.length, 3, '3 bubbles in 10 s (first after one interval)')
  assert.ok(Math.abs(fireTimes[0] - 3) < 2 * DT)
  assert.ok(Math.abs(fireTimes[1] - fireTimes[0] - 3) < 2 * DT)
  assert.ok(Math.abs(fireTimes[2] - fireTimes[1] - 3) < 2 * DT)
  // Aim + speed.
  const world2 = makeWorld()
  spawn(world2, 'sporeling', 0, -200, { timer: 0 })
  stepEnemyBehavior(world2, DT)
  const b = world2.mistBubbles.active[0]
  assert.ok(b, 'fires immediately when ready')
  assert.ok(Math.abs(b.vx) < 1e-9 && Math.abs(b.vy - ENEMIES.sporeling.bubble.speed) < 1e-9, 'aimed at player at 150/s')
  assert.equal(b.damage, 6)
  assert.equal(b.source, 'sporeling')
  void e
})

test('sporeling does not fire beyond 250', () => {
  const world = makeWorld()
  spawn(world, 'sporeling', 0, -2000, { timer: 0 })
  for (let i = 0; i < 60; i += 1) stepEnemyBehavior(world, DT)
  assert.equal(world.mistBubbles.count, 0)
})

test('mist bubble expires after 3 s if it never reaches the player', () => {
  const world = makeWorld()
  world.player.x = 5000 // out of the way
  spawn(world, 'sporeling', 0, 0, { timer: 0 })
  // Fire toward a fake target by putting the player within range for one step.
  world.player.x = 100
  stepEnemyBehavior(world, DT)
  assert.equal(world.mistBubbles.count, 1)
  world.player.x = 0
  world.player.y = 5000 // move away so it cannot hit
  world.enemies.releaseAll()
  let steps = 0
  while (world.mistBubbles.count > 0 && steps < 400) {
    stepMistBubbles(world, DT, PLAYER.invulnTime)
    steps += 1
  }
  assert.ok(Math.abs(steps * DT - ENEMIES.sporeling.bubble.life) < 2 * DT, `lives 3 s (got ${(steps * DT).toFixed(3)})`)
})

test('mist bubble hit deals 6 damage, starts invulnerability and is consumed', () => {
  const world = makeWorld()
  spawn(world, 'sporeling', 0, -200, { timer: 0 })
  stepEnemyBehavior(world, DT)
  world.enemies.releaseAll()
  let hurt = null
  for (let i = 0; i < 120 && !hurt; i += 1) hurt = stepMistBubbles(world, DT, PLAYER.invulnTime)
  assert.equal(hurt, 'sporeling')
  assert.equal(world.player.hp, 94)
  assert.equal(world.player.invuln, PLAYER.invulnTime)
  assert.equal(world.mistBubbles.count, 0)
})

test('mist bubble during invulnerability is consumed without damage', () => {
  const world = makeWorld()
  world.player.invuln = 0.4
  spawn(world, 'sporeling', 0, -100, { timer: 0 })
  stepEnemyBehavior(world, DT)
  world.enemies.releaseAll()
  for (let i = 0; i < 120; i += 1) stepMistBubbles(world, DT, PLAYER.invulnTime)
  assert.equal(world.player.hp, 100)
  assert.equal(world.mistBubbles.count, 0)
})

test('player weapons do not cancel mist bubbles (裁决 L4)', () => {
  const run = new SurvivorRun({ seed: 'bubble-l4', viewport: { width: 720, height: 1560 } })
  // A bubble sitting in front of the player on spore_shot's path, plus a target enemy.
  const b = run.mistBubbles.acquire()
  Object.assign(b, { x: 0, y: -150, vx: 0, vy: 0, r: 12, damage: 6, life: 3, source: 'sporeling' })
  const e = run.enemies.acquire()
  resetEnemy(e, { kind: 'beetle', x: 0, y: -300, r: 16, hp: 1000, speed: 0, damage: 0, xp: 0, kbRes: 1 })
  for (let i = 0; i < 60; i += 1) run.step()
  assert.ok(e.hp < 1000, 'shots reached the enemy behind the bubble')
  assert.equal(run.mistBubbles.count, 1, 'bubble untouched by player shots')
})

test('SurvivorRun applies mist bubble damage and records the killer', () => {
  const run = new SurvivorRun({ seed: 'bubble-run', viewport: { width: 720, height: 1560 } })
  run.player.hp = 5
  const b = run.mistBubbles.acquire()
  Object.assign(b, { x: 0, y: 0, vx: 0, vy: 0, r: 12, damage: 6, life: 3, source: 'sporeling' })
  run.step()
  assert.equal(run.state, 'lost')
  assert.equal(run.summary().killer, 'mist_bubble')
})

test('cross moths fly straight (no tracking) and are recycled silently off the far edge', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('cross-fly'))
  world.time = 270
  spawner.nextEvent = WAVES.events.findIndex((ev) => ev.atSec === 270)
  spawner.step(world, DT)
  const moths = world.enemies.active.slice(0, world.enemies.count).filter((e) => e.behavior === 'cross')
  assert.equal(moths.length, 16)
  const y0 = moths.map((e) => e.y)
  const dir = moths[0].dirX
  stepEnemyBehavior(world, DT)
  moths.forEach((e, i) => {
    assert.equal(e.y, y0[i], 'no vertical tracking')
    assert.ok(Math.abs(e.vx - dir * ENEMIES.moth.moveSpeed) < 1e-9)
  })
  const limit = world.viewport.width / 2 + LIMITS.spawnMarginU
  const crossSec = (2 * limit) / ENEMIES.moth.moveSpeed
  // Remove routine spawns so only the column remains.
  for (let k = world.enemies.count - 1; k >= 0; k -= 1) {
    const e = world.enemies.active[k]
    if (e.behavior !== 'cross') world.enemies.release(e)
  }
  for (let i = 0; i < Math.ceil(crossSec * 60) + 5; i += 1) stepEnemyBehavior(world, DT)
  assert.equal(world.enemies.count, 0, 'all recycled after crossing')
})

test('cross moths are recycled by the lifetime safety net if the player keeps pace', () => {
  const world = makeWorld()
  const e = spawn(world, 'moth', -100, 0, { behavior: 'cross', dirX: 1, dirY: 0, limit: 420, timer: 1 })
  for (let i = 0; i < 59; i += 1) {
    world.player.x = e.x + 100 // stay ahead
    stepEnemyBehavior(world, DT)
  }
  assert.equal(world.enemies.count, 1)
  stepEnemyBehavior(world, DT)
  stepEnemyBehavior(world, DT)
  assert.equal(world.enemies.count, 0)
})

test('cross moths are exempt from far-distance relocation', () => {
  const world = makeWorld()
  const spawner = new Spawner(world.viewport, LIMITS.spawnMarginU, new SeededRandom('noreloc'))
  const e = spawn(world, 'moth', 5000, 0, { behavior: 'cross', dirX: 1, dirY: 0, limit: 420, timer: 9 })
  spawner.step(world, DT)
  assert.equal(e.x, 5000)
})
