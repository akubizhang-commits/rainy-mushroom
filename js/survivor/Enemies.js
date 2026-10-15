// Enemy system (03 §3.4 steps 4 & 6, §3.8). Pure logic only: no Math.random,
// no Date.now, no cc/wx.
//
// S1 behaviour is limited to gnat + beetle: both chase the player in a straight line
// (03 §3.8). Knockback impulses from projectiles decay here; separation pushes
// overlapping neighbours apart using the spatial grid (≤6 neighbours, 03 §3.6).

export function makeEnemy() {
  return {
    slot: 0,
    uid: 0,
    kind: '',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 10,
    hp: 1,
    maxHp: 1,
    speed: 0,
    damage: 0,
    xp: 0,
    kbRes: 0,  // knockback resistance [0,1]
    kbX: 0,    // residual knockback velocity
    kbY: 0,
    lastHitTime: -1,
    contactCooldown: 0, // per-enemy gate so one enemy hurts the player ≤ once / invuln window
  }
}

// Reset an enemy on spawn. `spec` carries resolved per-minute values from the spawner.
export function resetEnemy(enemy, spec) {
  enemy.kind = spec.kind
  enemy.x = spec.x
  enemy.y = spec.y
  enemy.vx = 0
  enemy.vy = 0
  enemy.r = spec.r
  enemy.hp = spec.hp
  enemy.maxHp = spec.hp
  enemy.speed = spec.speed
  enemy.damage = spec.damage
  enemy.xp = spec.xp
  enemy.kbRes = spec.kbRes
  enemy.kbX = 0
  enemy.kbY = 0
  enemy.lastHitTime = -1
  enemy.contactCooldown = 0
}

const KB_DECAY = 8 // per-second exponential-ish decay of residual knockback

// Step 4: chase the player, apply + decay knockback. Movement integrates here.
export function stepEnemyBehavior(world, dt) {
  const enemies = world.enemies
  const px = world.player.x
  const py = world.player.y
  for (let i = 0; i < enemies.count; i += 1) {
    const e = enemies.active[i]
    // Straight-line tracking toward the player.
    const dx = px - e.x
    const dy = py - e.y
    const dist = Math.hypot(dx, dy) || 1
    const vx = (dx / dist) * e.speed
    const vy = (dy / dist) * e.speed
    e.x += (vx + e.kbX) * dt
    e.y += (vy + e.kbY) * dt
    e.vx = vx
    e.vy = vy
    // Decay knockback toward zero.
    const decay = Math.max(0, 1 - KB_DECAY * dt)
    e.kbX *= decay
    e.kbY *= decay
    if (e.contactCooldown > 0) e.contactCooldown -= dt
  }
}

// Step 6: push overlapping enemies apart (grid neighbours, ≤6), then keep them from
// overlapping the player (03 §3.6: slide to player.r + enemy.r along the connecting line).
export function stepSeparation(world) {
  const enemies = world.enemies
  const grid = world.grid
  const buf = world.queryBuf
  const px = world.player.x
  const py = world.player.y
  const pr = world.player.r
  for (let i = 0; i < enemies.count; i += 1) {
    const e = enemies.active[i]
    const n = grid.queryCircle(e.x, e.y, e.r, buf)
    let handled = 0
    for (let k = 0; k < n && handled < 6; k += 1) {
      const other = enemies.items[buf[k]]
      if (other === e || !enemies.isActive(other)) continue
      const dx = e.x - other.x
      const dy = e.y - other.y
      const minDist = e.r + other.r
      const d2 = dx * dx + dy * dy
      if (d2 >= minDist * minDist || d2 === 0) {
        if (d2 === 0) {
          // Perfectly coincident: nudge deterministically along +x by half the radius.
          e.x += minDist * 0.25
          other.x -= minDist * 0.25
          handled += 1
        }
        continue
      }
      const dist = Math.sqrt(d2)
      const overlap = minDist - dist
      // Each moves half the overlap × 0.5 (03 §3.6).
      const push = (overlap * 0.5) / dist
      const sx = dx * push
      const sy = dy * push
      e.x += sx
      e.y += sy
      other.x -= sx
      other.y -= sy
      handled += 1
    }
    // Do not let the enemy overlap the player: slide to touching distance.
    const pdx = e.x - px
    const pdy = e.y - py
    const touch = pr + e.r
    const pd2 = pdx * pdx + pdy * pdy
    if (pd2 < touch * touch) {
      const pd = Math.sqrt(pd2) || 1
      e.x = px + (pdx / pd) * touch
      e.y = py + (pdy / pd) * touch
    }
  }
}
