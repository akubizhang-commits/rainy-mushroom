import test from 'node:test'
import assert from 'node:assert/strict'

import { Pool } from '../js/survivor/Pool.js'
import { SpatialGrid } from '../js/survivor/SpatialGrid.js'
import { computeStats } from '../js/survivor/Stats.js'
import { PLAYER } from '../js/survivor/data/player.js'
import { WEAPONS } from '../js/survivor/data/weapons.js'
import { makeEnemy, resetEnemy } from '../js/survivor/Enemies.js'
import { stepEnemyBehavior } from '../js/survivor/Enemies.js'
import { SeededRandom } from '../js/survivor/SurvivorRandom.js'
import { LIMITS } from '../js/survivor/data/limits.js'
import {
  sporeShot,
  umbrellaBlades,
  dewRing,
  raindrop,
  leafBoomerang,
  makeZone,
  makeWeaponState,
  stepWeapons,
  nearestEnemy,
  fanAngles,
  makeShot,
  resetShot,
} from '../js/survivor/Weapons.js'
import { stepProjectiles, stepZones } from '../js/survivor/Projectiles.js'

const DT = 1 / 60

// Minimal world fixture holding only what the weapon/projectile systems read.
function makeWorld({ shotCap = 32, zoneCap = LIMITS.pools.raindropZones, seed = 'weapons' } = {}) {
  const enemies = new Pool(32, makeEnemy)
  const shots = new Pool(shotCap, makeShot)
  const world = {
    time: 0,
    player: { x: 0, y: 0, r: PLAYER.radius, dirX: 0, dirY: -1 },
    enemies,
    shots,
    zones: new Pool(zoneCap, makeZone),
    weaponRng: new SeededRandom(`${seed}:weapon`),
    diag: { dropped: { enemies: 0, shots: 0, bubbles: 0, zones: 0 } },
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

// --- umbrella_blades (01 §6.2) ---

function withStats(world, passives) {
  world.stats = computeStats(PLAYER, null, passives)
  return world
}
function rebuild(world) {
  world.grid.build(world.enemies.active, world.enemies.count, world.player)
}

test('umbrella_blades: blade count / orbit radius / angle = ω·t + 2πi/n per level', () => {
  for (let level = 1; level <= 5; level += 1) {
    const lvl = WEAPONS.umbrella_blades.levels[level - 1]
    const world = makeWorld()
    world.time = 0.75
    world.player.x = 30
    world.player.y = -20
    const state = makeWeaponState('umbrella_blades', level)
    rebuild(world)
    umbrellaBlades.tick(world, state, DT)
    assert.equal(state.bladeCount, lvl.count, `Lv${level} count`)
    assert.equal(state.bladeR, WEAPONS.umbrella_blades.bladeRadius)
    const omega = (lvl.angularSpeedDeg * Math.PI) / 180
    for (let i = 0; i < lvl.count; i += 1) {
      const a = omega * world.time + (2 * Math.PI * i) / lvl.count
      assert.ok(Math.abs(state.bladeX[i] - (30 + Math.cos(a) * lvl.orbitRadius)) < 1e-9)
      assert.ok(Math.abs(state.bladeY[i] - (-20 + Math.sin(a) * lvl.orbitRadius)) < 1e-9)
    }
  }
})

test('umbrella_blades: several blades touching one enemy in a step deal damage once', () => {
  const world = makeWorld()
  // Big enemy (r>32 → grid.large) centred on the player overlaps all 4 Lv5 blades.
  const e = spawnEnemy(world, 0, 0, 1000, 'boss', 100)
  const state = makeWeaponState('umbrella_blades', 5)
  rebuild(world)
  umbrellaBlades.tick(world, state, DT)
  assert.equal(state.bladeCount, 4)
  assert.equal(1000 - e.hp, WEAPONS.umbrella_blades.levels[4].damage)
})

test('umbrella_blades: no repeat damage inside the hit interval; cooldown passive shortens it', () => {
  const interval = WEAPONS.umbrella_blades.levels[0].hitInterval
  for (const [passives, mul] of [[null, 1], [{ cooldown: 5 }, 0.6]]) {
    const world = withStats(makeWorld(), passives)
    const e = spawnEnemy(world, 0, 0, 1000, 'boss', 100)
    const state = makeWeaponState('umbrella_blades', 1)
    let hits = 0
    let last = e.hp
    const steps = Math.round(1.2 * 60)
    for (let i = 0; i < steps; i += 1) {
      world.time = i * DT
      rebuild(world)
      umbrellaBlades.tick(world, state, DT)
      if (e.hp < last) hits += 1
      last = e.hp
    }
    // Hits land at t = 0, k·interval·mul, … within 1.2 s.
    const expected = Math.floor((steps - 1) * DT / (interval * mul) + 1e-9) + 1
    assert.equal(hits, expected, `mul ${mul}`)
  }
})

test('umbrella_blades: knockback pushes along player→enemy', () => {
  const world = makeWorld()
  const lvl = WEAPONS.umbrella_blades.levels[0]
  // Put an enemy exactly where blade 0 sits at t=0 (angle 0 → +x at orbit radius).
  const e = spawnEnemy(world, lvl.orbitRadius, 0, 1000)
  const state = makeWeaponState('umbrella_blades', 1)
  rebuild(world)
  umbrellaBlades.tick(world, state, DT)
  assert.ok(e.hp < 1000)
  assert.ok(Math.abs(e.kbX - lvl.knockback) < 1e-9)
  assert.ok(Math.abs(e.kbY) < 1e-9)
})

test('area passive scales both the orbit and the blade radius', () => {
  const world = withStats(makeWorld(), { area: 5 })
  const lvl = WEAPONS.umbrella_blades.levels[0]
  const state = makeWeaponState('umbrella_blades', 1)
  rebuild(world)
  umbrellaBlades.tick(world, state, DT)
  assert.ok(Math.abs(state.bladeR - WEAPONS.umbrella_blades.bladeRadius * 1.5) < 1e-9)
  assert.ok(Math.abs(state.bladeX[0] - lvl.orbitRadius * 1.5) < 1e-9)
})

// --- dew_ring (01 §6.3) ---

test('dew_ring: damages everything inside on each interval, nothing outside, no knockback', () => {
  const world = makeWorld()
  const lvl = WEAPONS.dew_ring.levels[0]
  const inside = spawnEnemy(world, 40, 0, 1000)
  const inside2 = spawnEnemy(world, 0, -45, 1000)
  const outside = spawnEnemy(world, lvl.radius + 40, 0, 1000)
  const state = makeWeaponState('dew_ring', 1)
  let pulses = 0
  let last = inside.hp
  const steps = 120 // 2 s → pulses at 0, 0.8, 1.6
  for (let i = 0; i < steps; i += 1) {
    world.time = i * DT
    rebuild(world)
    dewRing.tick(world, state, DT)
    if (inside.hp < last) pulses += 1
    last = inside.hp
  }
  assert.equal(pulses, 3)
  assert.equal(1000 - inside.hp, 3 * lvl.damage)
  assert.equal(1000 - inside2.hp, 3 * lvl.damage)
  assert.equal(outside.hp, 1000)
  assert.equal(inside.kbX, 0)
  assert.equal(inside.kbY, 0)
  assert.equal(state.ringR, lvl.radius)
})

test('dew_ring: slows enemies inside, restores immediately on leaving, takes the max source', () => {
  const world = makeWorld()
  const lvl = WEAPONS.dew_ring.levels[0]
  const e = spawnEnemy(world, 30, 0, 1000)
  e.speed = 100
  const state = makeWeaponState('dew_ring', 1)
  rebuild(world)
  dewRing.tick(world, state, DT)
  assert.equal(e.slow, lvl.slow)
  // Enemy step uses the slow, then clears it.
  const x0 = e.x
  world.player.x = 1000 // chase +x, far away
  stepEnemyBehavior(world, DT)
  assert.ok(Math.abs((e.x - x0) - 100 * (1 - lvl.slow) * DT) < 1e-9)
  assert.equal(e.slow, 0)
  // Out of the ring (player moved away): weapon no longer re-applies the slow.
  rebuild(world)
  dewRing.tick(world, state, DT)
  assert.equal(e.slow, 0)
  const x1 = e.x
  stepEnemyBehavior(world, DT)
  assert.ok(Math.abs((e.x - x1) - 100 * DT) < 1e-9, 'full speed outside')
  // Two sources: a stronger existing slow is kept, never stacked.
  world.player.x = 0
  e.x = 30
  rebuild(world)
  e.slow = 0.4
  dewRing.tick(world, state, DT)
  assert.equal(e.slow, 0.4)
  e.slow = 0.05
  dewRing.tick(world, state, DT)
  assert.equal(e.slow, lvl.slow)
})

test('dew_ring: area passive enlarges the ring; cooldown passive shortens the interval', () => {
  const world = withStats(makeWorld(), { area: 5, cooldown: 5 })
  const lvl = WEAPONS.dew_ring.levels[0]
  const e = spawnEnemy(world, lvl.radius + 20, 0, 1000) // outside base ring, inside ×1.5
  const state = makeWeaponState('dew_ring', 1)
  rebuild(world)
  dewRing.tick(world, state, DT)
  assert.ok(Math.abs(state.ringR - lvl.radius * 1.5) < 1e-9)
  assert.equal(1000 - e.hp, lvl.damage)
  assert.ok(Math.abs(state.cooldown - lvl.interval * 0.6) < 1e-9)
})

test('all equipped weapons act in the same step (multi-weapon)', () => {
  const world = makeWorld()
  world.weapons = [
    makeWeaponState('spore_shot', 1),
    makeWeaponState('umbrella_blades', 1),
    makeWeaponState('dew_ring', 1),
  ]
  const blade = WEAPONS.umbrella_blades.levels[0]
  const onBlade = spawnEnemy(world, blade.orbitRadius, 0, 1000)
  const inRing = spawnEnemy(world, 0, 30, 1000)
  rebuild(world)
  stepWeapons(world, DT)
  assert.equal(world.shots.count, 1, 'spore_shot fired')
  assert.ok(onBlade.hp < 1000, 'umbrella hit')
  assert.equal(1000 - inRing.hp, WEAPONS.dew_ring.levels[0].damage, 'dew ring pulse')
  assert.equal(inRing.slow, WEAPONS.dew_ring.levels[0].slow)
})

// --- raindrop (01 §6.4) ---

// One full system step for the area/projectile weapons: grid → zones/projectiles → time.
function stepWorld(world) {
  rebuild(world)
  stepProjectiles(world, DT)
  stepZones(world)
  world.time += DT
}

test('raindrop: each level drops `count` zones of `radius` and starts its cooldown', () => {
  for (let level = 1; level <= 5; level += 1) {
    const lvl = WEAPONS.raindrop.levels[level - 1]
    const world = makeWorld()
    for (let i = 0; i < 8; i += 1) spawnEnemy(world, 40 * i - 140, 100)
    const state = makeWeaponState('raindrop', level)
    raindrop.tick(world, state, DT)
    assert.equal(world.zones.count, lvl.count, `Lv${level} count`)
    for (const z of world.zones.active.slice(0, world.zones.count)) {
      assert.equal(z.r, lvl.radius)
      assert.equal(z.damage, lvl.damage)
      assert.ok(Math.abs(z.at - WEAPONS.raindrop.warnSec) < 1e-12)
    }
    assert.ok(Math.abs(state.cooldown - lvl.cooldown) < 1e-12, `Lv${level} cooldown`)
    assert.equal(world.events.filter((e) => e.type === 'raindropWarn').length, lvl.count)
    // Within the cooldown nothing new drops.
    raindrop.tick(world, state, DT)
    assert.equal(world.zones.count, lvl.count)
  }
})

test('raindrop: one cast targets different enemies first (同次落点不重复选敌)', () => {
  for (let seed = 0; seed < 50; seed += 1) {
    const world = makeWorld({ seed: `distinct-${seed}` })
    for (let i = 0; i < 6; i += 1) spawnEnemy(world, 50 * i - 125, -120)
    raindrop.tick(world, makeWeaponState('raindrop', 5), DT)
    const pts = world.zones.active.slice(0, world.zones.count).map((z) => `${z.x},${z.y}`)
    assert.equal(new Set(pts).size, 5, `seed ${seed}`)
  }
  // Fewer enemies than drops: every enemy is used before any repeats (5 drops, 2 enemies → 3/2 split).
  for (let seed = 0; seed < 30; seed += 1) {
    const world = makeWorld({ seed: `repeat-${seed}` })
    const a = spawnEnemy(world, 100, 0)
    const b = spawnEnemy(world, -100, 0)
    raindrop.tick(world, makeWeaponState('raindrop', 5), DT)
    const zs = world.zones.active.slice(0, world.zones.count)
    const onA = zs.filter((z) => z.x === a.x && z.y === a.y).length
    const onB = zs.filter((z) => z.x === b.x && z.y === b.y).length
    assert.equal(onA + onB, 5)
    assert.ok(onA >= 2 && onB >= 2, `seed ${seed}: ${onA}/${onB}`)
    // First two drops of the cast hit two different enemies.
    assert.notEqual(zs[0].x, zs[1].x)
  }
})

test('raindrop: only enemies within 400 are targets; none in range → lands 150–300 from the player', () => {
  for (let seed = 0; seed < 40; seed += 1) {
    const world = makeWorld({ seed: `fallback-${seed}` })
    world.player.x = 30
    world.player.y = -50
    const far = spawnEnemy(world, 30 + WEAPONS.raindrop.range + 20, -50)
    raindrop.tick(world, makeWeaponState('raindrop', 5), DT)
    assert.equal(world.zones.count, 5)
    for (const z of world.zones.active.slice(0, 5)) {
      const d = Math.hypot(z.x - 30, z.y + 50)
      assert.ok(d >= WEAPONS.raindrop.fallbackMin - 1e-9 && d <= WEAPONS.raindrop.fallbackMax + 1e-9, `d=${d}`)
      assert.ok(!(z.x === far.x && z.y === far.y))
    }
  }
})

test('raindrop: damage lands only after the 0.4 s shadow, at the locked point (落点不追踪)', () => {
  const world = makeWorld()
  const lvl = WEAPONS.raindrop.levels[0]
  const stay = spawnEnemy(world, 120, 0, 1000)
  const leaver = spawnEnemy(world, -120, 0, 1000)
  raindrop.tick(world, makeWeaponState('raindrop', 1), DT)
  assert.equal(world.zones.count, 2)
  // The leaver walks away right after the shadow appears; the point does not follow.
  leaver.x = -120 - lvl.radius - leaver.r - 5
  const warnSteps = Math.round(WEAPONS.raindrop.warnSec / DT)
  for (let i = 0; i < warnSteps; i += 1) {
    stepWorld(world)
    assert.equal(stay.hp, 1000, `no damage at step ${i} (t=${world.time.toFixed(3)})`)
  }
  assert.equal(world.zones.count, 2, 'both shadows still pending just before 0.4 s')
  stepWorld(world) // world.time == 0.4 → resolve
  assert.equal(world.zones.count, 0, 'zones recycled after resolving')
  assert.equal(1000 - stay.hp, lvl.damage)
  assert.equal(leaver.hp, 1000, 'moved out of the locked point → untouched')
  // Knockback along 角色→敌人.
  assert.ok(stay.kbX > 0 && Math.abs(stay.kbY) < 1e-9)
})

test('raindrop: hits every enemy inside the landing radius once; area/might passives apply', () => {
  const world = withStats(makeWorld(), { area: 5, might: 5 })
  const lvl = WEAPONS.raindrop.levels[3] // radius 60
  const target = spawnEnemy(world, 0, -200, 1000)
  const near = spawnEnemy(world, 0, -200 + lvl.radius * 1.5 - 5, 1000) // inside 60×1.5 (+ own r)
  // Both enemies stand inside each other's landing radius, so every drop hits both.
  raindrop.tick(world, makeWeaponState('raindrop', 4), DT)
  const zs = world.zones.active.slice(0, world.zones.count)
  for (const z of zs) assert.ok(Math.abs(z.r - lvl.radius * 1.5) < 1e-9)
  for (let i = 0; i <= Math.round(WEAPONS.raindrop.warnSec / DT); i += 1) stepWorld(world)
  const dmg = Math.round(lvl.damage * 1.5)
  // 3 drops on 2 enemies standing within each other's landing radius → each drop hits both.
  assert.equal(1000 - target.hp, dmg * 3)
  assert.equal(1000 - near.hp, dmg * 3)
})

test('raindrop: zones pool cap limits drops (少落) and counts them in diag', () => {
  const world = makeWorld({ zoneCap: 4 })
  for (let i = 0; i < 8; i += 1) spawnEnemy(world, 30 * i, 80)
  raindrop.tick(world, makeWeaponState('raindrop', 5), DT)
  assert.equal(world.zones.count, 4)
  assert.equal(world.diag.dropped.zones, 1)
  // The real run sizes the pool from limits (16).
  assert.equal(LIMITS.pools.raindropZones, 16)
})

test('raindrop: same weapon stream → same landing points; different stream differs', () => {
  const land = (seed) => {
    const world = makeWorld({ seed })
    for (let i = 0; i < 10; i += 1) spawnEnemy(world, 30 * i - 150, 60)
    const state = makeWeaponState('raindrop', 5)
    const out = []
    for (let k = 0; k < 4; k += 1) {
      raindrop.tick(world, state, DT)
      out.push(...world.zones.active.slice(0, world.zones.count).map((z) => [z.x, z.y]))
      world.zones.releaseAll()
      state.cooldown = 0
    }
    return out
  }
  assert.deepEqual(land('same'), land('same'))
  assert.notDeepEqual(land('same'), land('other'))
})

// --- leaf_boomerang (01 §6.5) ---

test('leaf_boomerang: leaf count and 25° fan centred on the facing per level; cooldown per level', () => {
  for (let level = 1; level <= 5; level += 1) {
    const lvl = WEAPONS.leaf_boomerang.levels[level - 1]
    const world = makeWorld()
    world.player.dirX = 1
    world.player.dirY = 0
    const state = makeWeaponState('leaf_boomerang', level)
    leafBoomerang.tick(world, state, DT)
    assert.equal(world.shots.count, lvl.count, `Lv${level} count`)
    const angles = world.shots.active.slice(0, lvl.count).map((s) => Math.atan2(s.vy, s.vx)).sort((a, b) => a - b)
    const mean = angles.reduce((a, b) => a + b, 0) / angles.length
    assert.ok(Math.abs(mean) < 1e-9, 'centred on facing')
    for (let i = 1; i < angles.length; i += 1) assert.ok(Math.abs(angles[i] - angles[i - 1] - (25 * Math.PI) / 180) < 1e-9)
    for (const s of world.shots.active.slice(0, lvl.count)) {
      assert.equal(s.kind, 'leaf')
      assert.ok(Math.abs(Math.hypot(s.vx, s.vy) - lvl.speed) < 1e-9)
    }
    assert.ok(Math.abs(state.cooldown - lvl.cooldown) < 1e-12)
    leafBoomerang.tick(world, state, DT)
    assert.equal(world.shots.count, lvl.count, 'no re-throw within cooldown')
  }
})

test('leaf_boomerang: flies out to max distance (× area), turns back and is recycled at the player', () => {
  for (const [passives, mul] of [[null, 1], [{ area: 5 }, 1.5]]) {
    for (const level of [1, 4]) {
      const lvl = WEAPONS.leaf_boomerang.levels[level - 1]
      const world = withStats(makeWorld(), passives)
      leafBoomerang.tick(world, makeWeaponState('leaf_boomerang', level), DT)
      const leaf = world.shots.active[0]
      let maxD = 0
      let steps = 0
      while (world.shots.count > 0 && steps < 600) {
        stepWorld(world)
        if (world.shots.isActive(leaf)) maxD = Math.max(maxD, Math.hypot(leaf.x, leaf.y))
        steps += 1
      }
      assert.equal(world.shots.count, 0, 'recycled')
      const far = lvl.maxDistance * mul
      assert.ok(Math.abs(maxD - far) <= lvl.speed * DT + 1e-9, `Lv${level} ×${mul}: reached ${maxD} vs ${far}`)
      // Round trip ≈ 2 × distance / speed, recycled before the safety lifetime.
      assert.ok(steps * DT < WEAPONS.leaf_boomerang.maxLife)
      assert.ok(steps * DT >= (2 * far - WEAPONS.leaf_boomerang.catchRadius) / lvl.speed - 2 * DT)
    }
  }
})

test('leaf_boomerang: unlimited pierce, every enemy hit once going out and once coming back', () => {
  const world = makeWorld()
  const lvl = WEAPONS.leaf_boomerang.levels[0]
  const line = [40, 80, 120, 160, 200].map((d) => spawnEnemy(world, 0, -d, 1000))
  leafBoomerang.tick(world, makeWeaponState('leaf_boomerang', 1), DT)
  let outHits = null
  const leaf = world.shots.active[0]
  for (let i = 0; i < 600 && world.shots.count > 0; i += 1) {
    stepWorld(world)
    if (outHits === null && leaf.returning) outHits = line.map((e) => 1000 - e.hp)
  }
  assert.equal(world.shots.count, 0)
  // By the turn every enemy took exactly one hit (去程), at the end exactly two (回程).
  assert.deepEqual(outHits, line.map(() => lvl.damage))
  for (const e of line) assert.equal(1000 - e.hp, 2 * lvl.damage)
  // Knockback is 角色→敌人 (outwards, -y) on both legs.
  for (const e of line) assert.ok(e.kbY < 0 && Math.abs(e.kbX) < 1e-9)
})

test('leaf_boomerang: the return leg homes on the player current position', () => {
  const world = makeWorld()
  leafBoomerang.tick(world, makeWeaponState('leaf_boomerang', 1), DT)
  const leaf = world.shots.active[0]
  let last = null
  for (let i = 0; i < 600 && world.shots.isActive(leaf); i += 1) {
    if (leaf.returning) {
      // The player walks sideways while the leaf comes back.
      world.player.x += 120 * DT
    }
    last = { x: leaf.x, y: leaf.y, px: world.player.x, py: world.player.y }
    stepWorld(world)
  }
  assert.equal(world.shots.count, 0)
  assert.ok(world.player.x > 50, 'player actually moved')
  const d = Math.hypot(last.x - last.px, last.y - last.py)
  assert.ok(d <= WEAPONS.leaf_boomerang.catchRadius + WEAPONS.leaf_boomerang.levels[0].speed * DT + 1e-9, `caught at ${d}`)
})

test('leaf_boomerang: shares the 150-shot player projectile pool (fewer leaves when full)', () => {
  const world = makeWorld({ shotCap: 2 })
  leafBoomerang.tick(world, makeWeaponState('leaf_boomerang', 5), DT)
  assert.equal(world.shots.count, 2)
  assert.equal(world.diag.dropped.shots, 1)
  assert.equal(LIMITS.pools.playerProjectiles, 150)
})

test('all five weapons run together through stepWeapons', () => {
  const world = makeWorld()
  world.weapons = ['spore_shot', 'umbrella_blades', 'dew_ring', 'raindrop', 'leaf_boomerang'].map((id) => makeWeaponState(id, 1))
  spawnEnemy(world, 0, -150, 1000)
  rebuild(world)
  stepWeapons(world, DT)
  assert.equal(world.shots.count, 2, 'spore + leaf')
  assert.equal(world.zones.count, WEAPONS.raindrop.levels[0].count)
})
