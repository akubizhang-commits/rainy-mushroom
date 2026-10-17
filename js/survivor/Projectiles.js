// Player projectile system (03 §3.4 step 8). Pure logic only: no Math.random,
// no Date.now, no cc/wx.
//
// Each shot moves in a straight line, queries the enemy grid, applies damage once per
// enemy (tracked by uid so a reused slot is never double-counted), and ends when it
// has pierced its budget of enemies or its lifetime expires. Player shots never test
// against mistBubbles (裁决 L4 — S1 has none anyway).
//
// Damage is only marked here (sets enemy.hp and enemy.lastHitTime); deaths are
// resolved together in SurvivorRun step 10 so one step's hits drop loot once.

import { makeShot } from './Weapons.js'

// Advance every active shot by dt. `world` provides: shots (Pool), enemies (Pool),
// grid (SpatialGrid), queryBuf (Int32Array), time.
export function stepProjectiles(world, dt) {
  const shots = world.shots
  const enemies = world.enemies
  const grid = world.grid
  const buf = world.queryBuf
  // Iterate backwards because release() swap-removes into the current index.
  for (let i = shots.count - 1; i >= 0; i -= 1) {
    const shot = shots.active[i]
    shot.x += shot.vx * dt
    shot.y += shot.vy * dt
    shot.life -= dt
    if (shot.life <= 0) {
      shots.release(shot)
      continue
    }
    // Broad-phase: candidate enemy slots near the shot.
    const n = grid.queryCircle(shot.x, shot.y, shot.r, buf)
    let ended = false
    for (let k = 0; k < n && !ended; k += 1) {
      const enemy = enemies.items[buf[k]]
      if (!enemies.isActive(enemy) || enemy.hp <= 0) continue
      if (hasHit(shot, enemy.uid)) continue
      const rr = shot.r + enemy.r
      const dx = enemy.x - shot.x
      const dy = enemy.y - shot.y
      if (dx * dx + dy * dy > rr * rr) continue
      // Mark damage + knockback; death is resolved in step 10.
      applyHit(enemy, shot, world.time)
      rememberHit(shot, enemy.uid)
      shot.pierceLeft -= 1
      if (shot.pierceLeft <= 0) {
        shots.release(shot)
        ended = true
      }
    }
    // Also test the `large` list (none in S1, but keep the contract).
    if (!ended) {
      const large = grid.large
      for (let k = 0; k < large.length && !ended; k += 1) {
        const enemy = large[k]
        if (!enemies.isActive(enemy) || enemy.hp <= 0) continue
        if (hasHit(shot, enemy.uid)) continue
        const rr = shot.r + enemy.r
        const dx = enemy.x - shot.x
        const dy = enemy.y - shot.y
        if (dx * dx + dy * dy > rr * rr) continue
        applyHit(enemy, shot, world.time)
        rememberHit(shot, enemy.uid)
        shot.pierceLeft -= 1
        if (shot.pierceLeft <= 0) {
          shots.release(shot)
          ended = true
        }
      }
    }
  }
}

function applyHit(enemy, shot, time) {
  enemy.hp -= shot.damage
  enemy.lastHitTime = time
  // Knockback along the shot's travel direction, reduced by the enemy's resistance.
  const speed = Math.hypot(shot.vx, shot.vy) || 1
  const push = shot.knockback * (1 - enemy.kbRes)
  if (push > 0) {
    enemy.kbX += (shot.vx / speed) * push
    enemy.kbY += (shot.vy / speed) * push
  }
}

// hitUids is a small fixed array on each shot (pierce is tiny: 1–3 in S1).
function hasHit(shot, uid) {
  const list = shot.hitUids
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] === uid) return true
  }
  return false
}
function rememberHit(shot, uid) {
  shot.hitUids.push(uid)
}

// Factory for the shots pool (used by SurvivorRun when building pools).
export { makeShot }

// --- Hostile mist bubbles (01 §9 迷途菌灵, 03 §3.4 step 9, §3.5 mistBubbles 池) ---
// Straight-line enemy projectiles that only test against the player. Player weapons
// never touch them (裁决 L4). A bubble is consumed on contact with the player; it deals
// damage and starts invulnerability only when the player is not already invulnerable.
export function makeBubble() {
  return { slot: 0, uid: 0, x: 0, y: 0, vx: 0, vy: 0, r: 12, damage: 0, life: 0, source: '' }
}
// Fire one bubble from (x, y) toward (tx, ty). Pool full → counted in diag, not fired.
export function spawnBubble(world, x, y, tx, ty, spec, source) {
  const b = world.mistBubbles.acquire()
  if (!b) {
    world.diag.dropped.bubbles = (world.diag.dropped.bubbles || 0) + 1
    return null
  }
  const dx = tx - x
  const dy = ty - y
  const d = Math.hypot(dx, dy) || 1
  b.x = x
  b.y = y
  b.vx = (dx / d) * spec.speed
  b.vy = (dy / d) * spec.speed
  b.r = spec.radius
  b.damage = spec.damage
  b.life = spec.life
  b.source = source
  return b
}
// Move bubbles, expire them, and resolve hits on the player. Returns the bubble that
// hurt the player this step (or null) so the caller can record the killer / event.
export function stepMistBubbles(world, dt, invulnTime) {
  const bubbles = world.mistBubbles
  const p = world.player
  let hurtBy = null
  for (let i = bubbles.count - 1; i >= 0; i -= 1) {
    const b = bubbles.active[i]
    b.x += b.vx * dt
    b.y += b.vy * dt
    b.life -= dt
    if (b.life <= 0) {
      bubbles.release(b)
      continue
    }
    const rr = b.r + p.r
    const dx = b.x - p.x
    const dy = b.y - p.y
    if (dx * dx + dy * dy > rr * rr) continue
    if (p.invuln <= 0) {
      p.hp -= b.damage
      p.invuln = invulnTime
      hurtBy = b.source
    }
    bubbles.release(b)
  }
  return hurtBy
}
