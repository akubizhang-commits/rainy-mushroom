// Pickups system (03 §3.4 step 11, §3.8). Pure logic only: no Math.random,
// no Date.now, no cc/wx.
//
// Spores (experience): on an enemy's death a spore carrying its xp drops at its position. Each step, spores within the player's pickup radius are
// pulled toward the player at a fixed attract speed; on contact they are collected and
// their xp is banked into Progression. When the spore pool is full, a new drop merges
// into the nearest existing spore instead (03 §3.8), raising its appearance tier.
//
// Appearance tiers by accumulated xp (03 §3.8): ≥5 medium, ≥20 large.
//
// Drops (S3 B3, 01 §11, data/pickups.js) share one pool of limits.pools.pickups (5):
//   - a normal enemy purified in combat rolls once on the `${seed}:drop` stream:
//     [0, dew.chance) 露珠, [dew.chance, dew.chance + wind.chance) 一阵林风; a roll that hits
//     a kind already at its on-field cap (露珠 3 / 林风 1) drops nothing (diag.capSkipped.pickups);
//   - an elite always drops 大露珠 + 林风 (eliteDrops), ignoring the per-kind caps;
//   - pool full → nothing spawns, counted in diag.dropped.pickups;
//   - drops are pulled in like spores (pickup radius, 600/s) and vanish after lifeSec;
//     露珠 / 大露珠 heal (never above max hp), 林风 makes every spore on the field fly to the
//     player at wind.attractSpeed regardless of distance until collected.
// Cleansing purification drops nothing (08 K4): SurvivorRun only calls rollDrop in step 10.
import { PICKUPS } from './data/pickups.js'

const ATTRACT_SPEED = 600 // px/s once inside the pickup radius (01 §5: 进入后 600/秒)
const COLLECT_RADIUS = 14 // spore + player contact distance for banking

export function makeSpore() {
  return {
    slot: 0,
    uid: 0,
    x: 0,
    y: 0,
    xp: 0,
    tier: 0, // 0 small, 1 medium, 2 large (appearance only)
    wind: false, // 一阵林风 picked up while this spore was on the field → flies in from anywhere
  }
}

export function resetSpore(spore, { x, y, xp }) {
  spore.x = x
  spore.y = y
  spore.xp = xp
  spore.tier = tierFor(xp)
  spore.wind = false
}

export function tierFor(xp) {
  if (xp >= 20) return 2
  if (xp >= 5) return 1
  return 0
}

// Drop a spore worth `xp` at (x, y). Pool full → merge into the nearest existing spore.
export function dropSpore(world, x, y, xp) {
  const spore = world.spores.acquire()
  if (spore) {
    resetSpore(spore, { x, y, xp })
    return
  }
  // Pool full: find the nearest active spore and accumulate the xp into it.
  const spores = world.spores
  let best = null
  let bestD = Infinity
  for (let i = 0; i < spores.count; i += 1) {
    const s = spores.active[i]
    const dx = s.x - x
    const dy = s.y - y
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  if (best) {
    best.xp += xp
    best.tier = tierFor(best.xp)
  }
}

// Step 11: attract spores inside the pickup radius; collect on contact and bank xp.
// Returns the total xp collected this step (SurvivorRun feeds it to Progression).
export function stepPickups(world, dt) {
  const spores = world.spores
  const px = world.player.x
  const py = world.player.y
  const radius = world.stats.pickupRadius
  const radius2 = radius * radius
  const collect2 = COLLECT_RADIUS * COLLECT_RADIUS
  if (world.drops) stepDrops(world, dt)
  const windSpeed = PICKUPS.wind.attractSpeed
  let gained = 0
  for (let i = spores.count - 1; i >= 0; i -= 1) {
    const s = spores.active[i]
    const dx = px - s.x
    const dy = py - s.y
    const d2 = dx * dx + dy * dy
    if (d2 <= collect2) {
      gained += s.xp
      world.events.push({ type: 'pickup', kind: 'spore' })
      spores.release(s)
      continue
    }
    if (s.wind || d2 <= radius2) {
      const d = Math.sqrt(d2) || 1
      const stepMove = (s.wind ? windSpeed : ATTRACT_SPEED) * dt
      s.x += (dx / d) * stepMove
      s.y += (dy / d) * stepMove
    }
  }
  return gained
}

// ---------- drops: 露珠 / 大露珠 / 一阵林风 (01 §11) ----------
export function makeDrop() {
  return { slot: 0, uid: 0, kind: 'dew', x: 0, y: 0, r: 10, heal: 0, life: 0, maxLife: 0 }
}

// Active drops of one kind (≤ pool capacity 5, linear scan).
export function dropCount(world, kind) {
  const drops = world.drops
  let n = 0
  for (let i = 0; i < drops.count; i += 1) if (drops.active[i].kind === kind) n += 1
  return n
}

// Spawn one drop of `kind` at (x, y). Respects the kind's on-field cap unless ignoreCap
// (精英必掉). Returns the drop, or null (cap reached → capSkipped; pool full → dropped).
export function spawnDrop(world, kind, x, y, ignoreCap = false) {
  const def = PICKUPS[kind]
  if (!ignoreCap && def.cap !== null && dropCount(world, kind) >= def.cap) {
    world.diag.capSkipped.pickups = (world.diag.capSkipped.pickups || 0) + 1
    return null
  }
  const d = world.drops.acquire()
  if (!d) {
    world.diag.dropped.pickups = (world.diag.dropped.pickups || 0) + 1
    return null
  }
  d.kind = kind
  d.x = x
  d.y = y
  d.r = def.radius
  d.heal = def.heal
  d.life = def.lifeSec
  d.maxLife = def.lifeSec
  return d
}

// A normal enemy purified in combat at (x, y): one roll on the drop stream (always consumed).
export function rollDrop(world, x, y) {
  const roll = world.dropRng.next()
  const dew = PICKUPS.dew.chance
  if (roll < dew) return spawnDrop(world, 'dew', x, y)
  if (roll < dew + PICKUPS.wind.chance) return spawnDrop(world, 'wind', x, y)
  return null
}

// Elite purified: 大露珠 + 林风, ignoring per-kind caps (01 §11 精英必掉).
export function dropEliteLoot(world, x, y) {
  const kinds = PICKUPS.eliteDrops
  for (let i = 0; i < kinds.length; i += 1) spawnDrop(world, kinds[i], x, y, true)
}

// Expire, attract and collect drops (part of step 11, before spores so 林风 acts this step).
export function stepDrops(world, dt) {
  const drops = world.drops
  const p = world.player
  const radius = world.stats.pickupRadius
  const radius2 = radius * radius
  const collect2 = COLLECT_RADIUS * COLLECT_RADIUS
  for (let i = drops.count - 1; i >= 0; i -= 1) {
    const d = drops.active[i]
    d.life -= dt
    if (d.life <= 1e-9) {
      drops.release(d) // 30 秒后淡出消失（01 §11）
      continue
    }
    const dx = p.x - d.x
    const dy = p.y - d.y
    const d2 = dx * dx + dy * dy
    if (d2 <= collect2) {
      collectDrop(world, d)
      drops.release(d)
      continue
    }
    if (d2 <= radius2) {
      const dist = Math.sqrt(d2) || 1
      const move = ATTRACT_SPEED * dt
      d.x += (dx / dist) * move
      d.y += (dy / dist) * move
    }
  }
}

function collectDrop(world, d) {
  const p = world.player
  world.events.push({ type: 'pickup', kind: d.kind })
  if (d.kind === 'wind') {
    const spores = world.spores
    for (let i = 0; i < spores.count; i += 1) spores.active[i].wind = true
    return
  }
  const amount = Math.min(d.heal, Math.max(0, p.maxHp - p.hp))
  p.hp = Math.min(p.maxHp, p.hp + d.heal)
  if (amount > 0) world.events.push({ type: 'heal', amount })
}
