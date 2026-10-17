// Spawner (03 §3.4 step 3, §3.8). Pure logic only: no Math.random (uses SurvivorRandom),
// no Date.now, no cc/wx.
//
// - Accumulates `spawnRate × DT` per step and spawns the whole-number part (03 §3.8).
// - Spawn position: on a circle of radius `spawnRadius` = hypot(viewW/2, viewH/2) + margin
//   (03 §1-2), at a random angle from the `spawn` sub-stream, centred on the player.
// - Composition is drawn by weight from the active wave segment (percent weights).
// - On-screen cap: never exceed the segment cap or the enemy pool capacity.
// - Timed events (WAVES.events: 2:30 ring, 4:30 cross, 6:30 snail wall) fire once each
//   and obey the global hard cap of 200 (01 §10).
// - Enemies that drift beyond max(900, spawnRadius + 120) are relocated back onto the
//   spawn circle around the player (03 §1-2, §3.8).

import { ENEMIES } from './data/enemies.js'
import { WAVES } from './data/waves.js'
import { LIMITS } from './data/limits.js'
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
    // Cross-event column starts / ends this far beside the player (screen half-width + margin).
    this.crossLimit = viewport.width / 2 + margin
    this.rng = rng
    this.accumulator = 0
    this.nextEvent = 0 // index into WAVES.events; each event fires once
  }

  // One step. `world` provides: time, player, enemies (Pool), diag.
  step(world, dt) {
    this._relocate(world)
    const minute = Math.floor(world.time / 60) // 01 §9.1: whole minutes
    this._events(world, minute)
    const seg = segmentAt(world.time)
    if (!seg) {
      // Past the last defined segment (Boss 段 lands in 08 L6): no routine spawns,
      // but relocation above still keeps existing enemies in range.
      return
    }
    this.accumulator += seg.spawnRate * dt
    let due = Math.floor(this.accumulator)
    if (due <= 0) return
    this.accumulator -= due
    while (due > 0) {
      due -= 1
      if (world.enemies.count >= seg.cap) {
        world.diag.dropped.enemies += 1
        continue
      }
      const id = pickComposition(seg.composition, this.rng)
      const angle = this.rng.next() * TWO_PI
      this._spawnOne(world, id, minute, {
        x: world.player.x + Math.cos(angle) * this.spawnRadius,
        y: world.player.y + Math.sin(angle) * this.spawnRadius,
      })
    }
  }

  // Timed events (01 §10 事件列, data-driven by WAVES.events). Each fires once when the
  // clock reaches atSec; `optional: true` events are skipped (not implemented in S2).
  // Every event spawn obeys the global hard cap (limits.hardCaps.enemies).
  _events(world, minute) {
    const events = WAVES.events
    while (this.nextEvent < events.length && world.time >= events[this.nextEvent].atSec) {
      const ev = events[this.nextEvent]
      this.nextEvent += 1
      if (ev.optional) continue
      const px = world.player.x
      const py = world.player.y
      if (ev.type === 'ring') {
        // Evenly spaced on a circle around the player, then chase (收拢).
        const start = this.rng.next() * TWO_PI
        for (let i = 0; i < ev.count; i += 1) {
          const a = start + (TWO_PI * i) / ev.count
          if (!this._spawnEvent(world, ev.enemy, minute, { x: px + Math.cos(a) * ev.radius, y: py + Math.sin(a) * ev.radius })) break
        }
      } else if (ev.type === 'cross') {
        // A vertical column just outside one side of the screen, flying straight across.
        const dir = this.rng.next() < 0.5 ? 1 : -1
        const speed = ENEMIES[ev.enemy].moveSpeed
        const limit = this.crossLimit
        const life = (2 * limit) / speed + 2 // safety net if the player keeps pace
        for (let i = 0; i < ev.count; i += 1) {
          const y = py + (i - (ev.count - 1) / 2) * ev.spacing
          if (!this._spawnEvent(world, ev.enemy, minute, { x: px - dir * limit, y, behavior: 'cross', dirX: dir, dirY: 0, limit, timer: life })) break
        }
      }
    }
  }

  // Event spawn: global hard cap instead of the segment cap. Returns false when capped.
  _spawnEvent(world, id, minute, at) {
    if (world.enemies.count >= LIMITS.hardCaps.enemies) {
      world.diag.dropped.enemies += 1
      return false
    }
    return this._spawnOne(world, id, minute, at)
  }

  _spawnOne(world, id, minute, at) {
    const def = ENEMIES[id]
    const enemy = world.enemies.acquire()
    if (!enemy) {
      world.diag.dropped.enemies += 1
      return false
    }
    resetEnemy(enemy, {
      kind: id,
      x: at.x,
      y: at.y,
      r: def.radius,
      hp: enemyHp(def.hp, def.hpGrowthPerMin, minute),
      speed: def.moveSpeed,
      damage: enemyContactDamage(def.contactDamage, def.damageGrowthPerMin, minute),
      xp: def.xp,
      kbRes: def.knockbackResist,
      behavior: at.behavior || def.behavior,
      // Ranged enemies wait one full interval before their first bubble.
      timer: at.timer !== undefined ? at.timer : def.fireInterval || 0,
      dirX: at.dirX,
      dirY: at.dirY,
      limit: at.limit,
    })
    return true
  }

  // Relocate enemies that drifted too far back onto the spawn circle (03 §3.8).
  // Cross-event enemies are exempt: they fly straight and are recycled on exit.
  _relocate(world) {
    const enemies = world.enemies
    const px = world.player.x
    const py = world.player.y
    const maxD2 = this.relocateDistance * this.relocateDistance
    for (let i = 0; i < enemies.count; i += 1) {
      const e = enemies.active[i]
      if (e.behavior === 'cross') continue
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
