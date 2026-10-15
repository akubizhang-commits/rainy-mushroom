// Spawner (03 §3.4 step 3, §3.8). Pure logic only: no Math.random (uses SurvivorRandom),
// no Date.now, no cc/wx.
//
// - Accumulates `spawnRate × DT` per step and spawns the whole-number part (03 §3.8).
// - Spawn position: on a circle of radius `spawnRadius` = hypot(viewW/2, viewH/2) + margin
//   (03 §1-2), at a random angle from the `spawn` sub-stream, centred on the player.
// - Composition is drawn by weight from the active wave segment (percent weights).
// - On-screen cap: never exceed the segment cap or the enemy pool capacity.
// - Enemies that drift beyond max(900, spawnRadius + 120) are relocated back onto the
//   spawn circle around the player (03 §1-2, §3.8).

import { ENEMIES } from './data/enemies.js'
import { WAVES } from './data/waves.js'
import { enemyHp, enemyContactDamage } from './Stats.js'
import { resetEnemy } from './Enemies.js'

const TWO_PI = Math.PI * 2

// Compute the spawn radius from the viewport (03 §1-2).
export function spawnRadiusFor(viewport, margin) {
  return Math.hypot(viewport.width / 2, viewport.height / 2) + margin
}

export function relocateDistanceFor(spawnRadius) {
  return Math.max(900, spawnRadius + 120)
}

// Pick an enemy id from a segment's composition (percent weights) using rng.
// Deterministic: iterates composition entries in insertion order.
export function pickComposition(composition, rng) {
  const roll = rng.next() * 100
  let acc = 0
  let last = null
  for (const id in composition) {
    last = id
    acc += composition[id]
    if (roll < acc) return id
  }
  return last // guards against float rounding when weights sum to exactly 100
}

// Find the wave segment covering `timeSec`; returns null past the last segment.
export function segmentAt(timeSec) {
  const segments = WAVES.segments
  for (let i = 0; i < segments.length; i += 1) {
    const s = segments[i]
    if (timeSec >= s.fromSec && timeSec < s.toSec) return s
  }
  return null
}

export class Spawner {
  constructor(viewport, margin, rng) {
    this.spawnRadius = spawnRadiusFor(viewport, margin)
    this.relocateDistance = relocateDistanceFor(this.spawnRadius)
    this.rng = rng
    this.accumulator = 0
  }

  // One step. `world` provides: time, player, enemies (Pool), diag.
  step(world, dt) {
    this._relocate(world)
    const seg = segmentAt(world.time)
    if (!seg) {
      // Past the last defined segment (e.g. 2:00–3:00 in S1): no routine spawns,
      // but relocation above still keeps existing enemies in range.
      return
    }
    this.accumulator += seg.spawnRate * dt
    let due = Math.floor(this.accumulator)
    if (due <= 0) return
    this.accumulator -= due
    const minute = world.time / 60
    while (due > 0) {
      due -= 1
      if (world.enemies.count >= seg.cap) {
        world.diag.dropped.enemies += 1
        continue
      }
      const id = pickComposition(seg.composition, this.rng)
      this._spawnOne(world, id, minute)
    }
  }

  _spawnOne(world, id, minute) {
    const def = ENEMIES[id]
    const angle = this.rng.next() * TWO_PI
    const x = world.player.x + Math.cos(angle) * this.spawnRadius
    const y = world.player.y + Math.sin(angle) * this.spawnRadius
    const enemy = world.enemies.acquire()
    if (!enemy) {
      world.diag.dropped.enemies += 1
      return
    }
    resetEnemy(enemy, {
      kind: id,
      x,
      y,
      r: def.radius,
      hp: enemyHp(def.hp, def.hpGrowthPerMin, minute),
      speed: def.moveSpeed,
      damage: enemyContactDamage(def.contactDamage, def.damageGrowthPerMin, minute),
      xp: def.xp,
      kbRes: def.knockbackResist,
    })
  }

  // Relocate enemies that drifted too far back onto the spawn circle (03 §3.8).
  _relocate(world) {
    const enemies = world.enemies
    const px = world.player.x
    const py = world.player.y
    const maxD2 = this.relocateDistance * this.relocateDistance
    for (let i = 0; i < enemies.count; i += 1) {
      const e = enemies.active[i]
      const dx = e.x - px
      const dy = e.y - py
      if (dx * dx + dy * dy <= maxD2) continue
      const angle = this.rng.next() * TWO_PI
      e.x = px + Math.cos(angle) * this.spawnRadius
      e.y = py + Math.sin(angle) * this.spawnRadius
      e.kbX = 0
      e.kbY = 0
    }
  }
}
