// Boss 浊雾巨蜗 boss_mist_snail (01 §9.2, 03 §3.4 steps 3–4). Pure logic only: no
// Math.random, no Date.now, no cc/wx.
//
// - Spawned once at WAVES.boss.atSec straight above the player, just off-screen, into
//   one of the enemy pool's reserved slots (03 §3.5). Fixed stats: no §9.1 growth, no
//   far-away relocation (Spawner skips behavior 'boss'), r56 → grid `large` list.
// - Three skills, each on its own start-to-start cooldown counted from the spawn:
//     summon     — every 8 s, 12 gnats evenly around the Boss (global hard cap applies)
//     charge     — every 6 s: 0.8 s windup (stands still, direction locked → bossCharge
//                  event + run.boss.dirX/dirY for the arrow), then 1 s at ×2.5 speed
//     bubbleRing — every 10 s but only while hp < 50%: 8 mist bubbles in 8 directions
// - Enrage at 10:00 if still alive: move speed +30%, all Boss damage +50%.
// - `world.boss` is the read-only render view (position, hp ratio, current skill /
//   warning direction). `world.bossEnemy` is the live pool entity (null once defeated).
import { ENEMIES } from './data/enemies.js'
import { WAVES } from './data/waves.js'
import { LIMITS } from './data/limits.js'
import { resetEnemy } from './Enemies.js'
import { spawnBubble } from './Projectiles.js'

const TWO_PI = Math.PI * 2

function makeBossView(def) {
  return {
    kind: WAVES.boss.enemy,
    x: 0,
    y: 0,
    r: def.radius,
    hp: def.hp,
    maxHp: def.hp,
    hpRatio: 1,
    alive: true,
    skill: 'chase',   // chase | windup (arrow shown) | charge | defeated
    skillLeft: 0,     // seconds left in windup / charge
    dirX: 0,          // locked charge direction (valid during windup / charge)
    dirY: 0,
    enraged: false,
    // Skill cooldowns (seconds until next use, start-to-start).
    summonCd: def.summon.every,
    chargeCd: def.charge.every,
    ringCd: def.bubbleRing.every,
    bubble: { ...def.bubbleRing.bubble }, // mutable copy so enrage can scale damage
  }
}

// Step 3 (after the spawner): 6:58 warning, 7:00 spawn. Each fires once per run.
export function stepBossSchedule(world) {
  const cfg = WAVES.boss
  if (!world.bossWarned && world.time >= cfg.atSec - cfg.warningSec) {
    world.bossWarned = true
    world.events.push({ type: 'bossWarning' })
  }
  if (!world.boss && world.time >= cfg.atSec) spawnBoss(world)
}

export function spawnBoss(world) {
  const def = ENEMIES[WAVES.boss.enemy]
  const e = world.enemies.acquire() // reserved slot: normal spawns stop at 200 of 202
  if (!e) {
    world.diag.dropped.enemies += 1
    return null
  }
  const x = world.player.x
  const y = world.player.y + world.viewport.height / 2 + LIMITS.spawnMarginU + def.radius
  resetEnemy(e, {
    kind: WAVES.boss.enemy,
    x,
    y,
    r: def.radius,
    hp: def.hp,
    speed: def.moveSpeed,
    damage: def.contactDamage,
    xp: def.xp,
    kbRes: def.knockbackResist,
    behavior: 'boss',
  })
  world.bossEnemy = e
  world.boss = makeBossView(def)
  syncBossView(world)
  world.events.push({ type: 'bossSpawn', x, y })
  return e
}

// Step 4 (after stepEnemyBehavior): enrage, skills, movement.
export function stepBoss(world, dt) {
  const e = world.bossEnemy
  if (!e) return
  const b = world.boss
  const def = ENEMIES[e.kind]
  if (!b.enraged && world.time >= def.enrage.atSec) {
    b.enraged = true
    e.speed = def.moveSpeed * def.enrage.speedMul
    e.damage = def.contactDamage * def.enrage.damageMul
    b.bubble.damage = def.bubbleRing.bubble.damage * def.enrage.damageMul
    world.events.push({ type: 'bossEnrage' })
  }
  // Dew-ring slow from last step, cleared like other enemies (03 §3.4 step 4).
  const speed = e.speed * (1 - e.slow)
  e.slow = 0
  const px = world.player.x
  const py = world.player.y
  const dx = px - e.x
  const dy = py - e.y
  const dist = Math.hypot(dx, dy) || 1
  const ux = dx / dist
  const uy = dy / dist

  // Summon 虫群.
  b.summonCd -= dt
  if (b.summonCd <= 0) {
    b.summonCd += def.summon.every
    const n = world.spawner.spawnAround(world, def.summon.enemy, def.summon.count, e.x, e.y, def.summon.radius)
    world.events.push({ type: 'bossSummon', count: n })
  }

  // 浊雾泡环: ready after its cooldown, fires only while hp < hpBelow × maxHp.
  b.ringCd -= dt
  if (b.ringCd <= 0 && e.hp < e.maxHp * def.bubbleRing.hpBelow) {
    b.ringCd = def.bubbleRing.every
    const n = def.bubbleRing.count
    for (let i = 0; i < n; i += 1) {
      const a = (TWO_PI * i) / n
      spawnBubble(world, e.x, e.y, e.x + Math.cos(a), e.y + Math.sin(a), b.bubble, e.kind)
    }
    world.events.push({ type: 'bossBubbleRing' })
  }

  // 雾壳冲撞 state machine: chase → windup (0.8 s, still) → charge (1 s, ×2.5) → chase.
  b.chargeCd -= dt
  let vx = 0
  let vy = 0
  if (b.skill === 'windup') {
    b.skillLeft -= dt
    if (b.skillLeft <= 1e-9) {
      b.skill = 'charge'
      b.skillLeft = def.charge.duration
    }
  } else if (b.skill === 'charge') {
    vx = b.dirX * speed * def.charge.speedMul
    vy = b.dirY * speed * def.charge.speedMul
    b.skillLeft -= dt
    if (b.skillLeft <= 1e-9) {
      b.skill = 'chase'
      b.skillLeft = 0
    }
  } else if (b.chargeCd <= 0) {
    b.chargeCd += def.charge.every
    b.skill = 'windup'
    b.skillLeft = def.charge.windup
    b.dirX = ux
    b.dirY = uy
    world.events.push({ type: 'bossCharge', dx: ux, dy: uy })
  } else {
    vx = ux * speed
    vy = uy * speed
  }
  e.x += vx * dt
  e.y += vy * dt
  e.vx = vx
  e.vy = vy
}

// Copy the live entity into the read-only view (end of each step).
export function syncBossView(world) {
  const e = world.bossEnemy
  if (!e) return
  const b = world.boss
  b.x = e.x
  b.y = e.y
  b.hp = Math.max(0, e.hp)
  b.hpRatio = b.hp / e.maxHp
}

// Boss hp reached 0 (step 10): freeze the view as defeated and drop the entity ref.
export function defeatBoss(world) {
  const b = world.boss
  if (b) {
    syncBossView(world)
    b.hp = 0
    b.hpRatio = 0
    b.alive = false
    b.skill = 'defeated'
    b.skillLeft = 0
  }
  world.bossEnemy = null
}
