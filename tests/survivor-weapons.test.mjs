import test from 'node:test'
import assert from 'node:assert/strict'

import { Pool } from '../js/survivor/Pool.js'
import { SpatialGrid } from '../js/survivor/SpatialGrid.js'
import { computeStats } from '../js/survivor/Stats.js'
import { PLAYER } from '../js/survivor/data/player.js'
import { WEAPONS } from '../js/survivor/data/weapons.js'
import { makeEnemy, resetEnemy } from '../js/survivor/Enemies.js'
import {
  sporeShot,
  stepWeapons,
  nearestEnemy,
  fanAngles,
  makeShot,
  resetShot,
} from '../js/survivor/Weapons.js'
import { stepProjectiles } from '../js/survivor/Projectiles.js'

const DT = 1 / 60

// Minimal world fixture holding only what the weapon/projectile systems read.
function makeWorld() {
  const enemies = new Pool(32, makeEnemy)
  const shots = new Pool(32, makeShot)
  const world = {
    time: 0,
    player: { x: 0, y: 0, r: PLAYER.radius },
    enemies,
    shots,
    grid: new SpatialGrid({ capacity: 32 }),
    queryBuf: new Int32Array(32),
    weaponAngleBuf: new Float64Array(16),
    stats: computeStats(PLAYER, null, null),
    weapons: [{ id: 'spore_shot', level: 1, cooldown: 0 }],
    events: [],
  }
  return world
}

function spawnEnemy(world, x, y, hp = 1000, kind = 'gnat', r = 10) {
  const e = world.enemies.acquire()
  resetEnemy(e, { kind, x, y, r, hp, speed: 0, damage: 0, xp: 0, kbRes: 0 })
  return e
}

test('nearestEnemy returns the closest living enemy, ties by active order', () => {
  const world = makeWorld()
  const far = spawnEnemy(world, 300, 0)
  const near = spawnEnemy(world, 100, 0)
  assert.equal(nearestEnemy(world.enemies, 0, 0), near)
  // Dead enemies are skipped.
  near.hp = 0
  assert.equal(nearestEnemy(world.enemies, 0, 0), far)
  // No living enemy → null.
  far.hp = 0
  assert.equal(nearestEnemy(world.enemies, 0, 0), null)
})

test('fanAngles centres the fan on the base angle', () => {
  const out = new Float64Array(8)
  assert.deepEqual([...fanAngles(0, 1, 0.1, out).slice(0, 1)], [0])
  const two = [...fanAngles(0, 2, 0.1, out).slice(0, 2)]
  assert.ok(Math.abs(two[0] + 0.05) < 1e-12)
  assert.ok(Math.abs(two[1] - 0.05) < 1e-12)
  const three = [...fanAngles(0, 3, 0.1, out).slice(0, 3)]
  assert.ok(Math.abs(three[0] + 0.1) < 1e-12)
  assert.ok(Math.abs(three[1]) < 1e-12)
  assert.ok(Math.abs(three[2] - 0.1) < 1e-12)
})

test('spore_shot with no target does not consume cooldown (无目标不进入冷却)', () => {
  const world = makeWorld()
  const state = world.weapons[0]
  sporeShot.tick(world, state, DT)
  assert.equal(state.cooldown, 0, 'cooldown unchanged with no enemies')
  assert.equal(world.shots.count, 0, 'no shots fired')
})

test('spore_shot Lv1 fires 1 projectile aimed at the nearest enemy and starts cooldown', () => {
  const world = makeWorld()
  spawnEnemy(world, 100, 0)
  const state = world.weapons[0]
  sporeShot.tick(world, state, DT)
  const lvl = WEAPONS.spore_shot.levels[0]
  assert.equal(world.shots.count, lvl.count)
  assert.equal(world.shots.count, 1)
  const shot = world.shots.active[0]
  // Aimed along +x (toward enemy); speed matches level data.
  assert.ok(Math.abs(shot.vx - lvl.speed) < 1e-6)
  assert.ok(Math.abs(shot.vy) < 1e-6)
  assert.equal(shot.pierceLeft, lvl.pierce)
  assert.ok(state.cooldown > 0)
})

test('spore_shot fan count and spread grow with weapon level', () => {
  for (let level = 1; level <= 5; level += 1) {
    const world = makeWorld()
    spawnEnemy(world, 0, 100) // directly up → base angle π/2
    const state = { id: 'spore_shot', level, cooldown: 0 }
    sporeShot.tick(world, state, DT)
    const lvl = WEAPONS.spore_shot.levels[level - 1]
    assert.equal(world.shots.count, lvl.count, `Lv${level} count`)
    if (lvl.count > 1) {
      // Angles are symmetric around π/2 with spreadDeg spacing.
      const spread = WEAPONS.spore_shot.spreadDeg * (Math.PI / 180)
      const angles = world.shots.active
        .map((s) => Math.atan2(s.vy, s.vx))
        .sort((a, b) => a - b)
      const gap = angles[1] - angles[0]
      assert.ok(Math.abs(gap - spread) < 1e-6, `Lv${level} spacing = spreadDeg`)
    }
  }
})

test('spore_shot does not fire again until cooldown elapses (via stepWeapons)', () => {
  const world = makeWorld()
  spawnEnemy(world, 100, 0)
  stepWeapons(world, DT)
  assert.equal(world.shots.count, 1)
  const cd = world.weapons[0].cooldown
  // Next step is within cooldown → no new shot.
  world.shots.releaseAll()
  stepWeapons(world, DT)
  assert.equal(world.shots.count, 0)
  assert.ok(world.weapons[0].cooldown < cd)
})

test('a single projectile pierces exactly `pierce` enemies then expires', () => {
  const world = makeWorld()
  // Line up three enemies along +x so one shot passes through them.
  const e1 = spawnEnemy(world, 50, 0, 5)
  const e2 = spawnEnemy(world, 70, 0, 5)
  const e3 = spawnEnemy(world, 90, 0, 5)
  // Fire ONE shot with pierce 2 directly (isolating pierce from the multi-shot fan).
  const shot = world.shots.acquire()
  resetShot(shot, { x: 0, y: 0, vx: 420, vy: 0, damage: 3, knockback: 0, life: 1.2, pierce: 2 })
  // Step projectiles forward enough to sweep past all three enemies. The grid is
  // rebuilt each step (SurvivorRun step 5 does this before step 8 in the real loop).
  for (let i = 0; i < 60 && world.shots.count > 0; i += 1) {
    world.grid.build(world.enemies.active, world.enemies.count, world.player)
    stepProjectiles(world, DT)
  }
  // The two closest enemies took damage, the third did not (shot died after 2 pierces).
  const damaged = [e1, e2, e3].filter((e) => e.hp < 5)
  assert.equal(damaged.length, 2)
  assert.ok(e1.hp < 5 && e2.hp < 5)
  assert.equal(e3.hp, 5)
  assert.equal(world.shots.count, 0, 'shot expired after exhausting pierce')
})

test('a projectile never hits the same enemy twice', () => {
  const world = makeWorld()
  const e = spawnEnemy(world, 40, 0, 10000)
  const state = { id: 'spore_shot', level: 5, cooldown: 0 } // pierce 2
  sporeShot.tick(world, state, DT)
  const lvl = WEAPONS.spore_shot.levels[4]
  const before = e.hp
  // Sweep the shots through the enemy (rebuild the grid each step).
  for (let i = 0; i < 30 && world.shots.count > 0; i += 1) {
    world.grid.build(world.enemies.active, world.enemies.count, world.player)
    stepProjectiles(world, DT)
  }
  // Each of the `count` shots can hit the enemy once → damage = count × per-shot.
  const perShot = Math.round(lvl.damage * world.stats.might)
  assert.equal(before - e.hp, perShot * lvl.count)
})
