import test from 'node:test'
import assert from 'node:assert/strict'

import { SurvivorRun } from '../js/survivor/SurvivorRun.js'
import { DT } from '../js/survivor/SimClock.js'
import { WAVES } from '../js/survivor/data/waves.js'
import { ENEMIES } from '../js/survivor/data/enemies.js'
import { LIMITS } from '../js/survivor/data/limits.js'
import { resetEnemy } from '../js/survivor/Enemies.js'
import { bossEnrageAt } from '../js/survivor/Boss.js'
import { playRun } from '../scripts/survivor/bot.mjs'
import { resetShot, makeWeaponState } from '../js/survivor/Weapons.js'
import { hitDamage } from '../js/survivor/Stats.js'

const BOSS = ENEMIES.boss_mist_snail
const VIEW = { width: 720, height: 1560 }

function newRun(seed = 'boss-test') {
  const run = new SurvivorRun({ seed, viewport: VIEW })
  run.spawner.nextEvent = WAVES.events.length // skip 2:30/4:30/6:30 events when jumping the clock
  return run
}

// Step while keeping the player alive; collects every event drained along the way.
function stepN(run, n, events = []) {
  for (let i = 0; i < n; i += 1) {
    if (run.state === 'levelup') run.choose(0)
    run.player.hp = run.player.maxHp
    run.step()
    for (const e of run.drainEvents()) events.push({ ...e, at: run.time })
  }
  return events
}

// Jump the clock to just before 7:00 and step until the Boss is on the field.
function toBoss(run) {
  run.time = WAVES.boss.atSec
  stepN(run, 1)
  assert.ok(run.boss, 'Boss spawned')
  return run
}

function clearNormals(run) {
  for (let i = run.enemies.count - 1; i >= 0; i -= 1) {
    const e = run.enemies.active[i]
    if (e !== run.bossEnemy) run.enemies.release(e)
  }
  run.mistBubbles.releaseAll()
}

function bossCount(run) {
  let n = 0
  for (let i = 0; i < run.enemies.count; i += 1) if (run.enemies.active[i].kind === 'boss_mist_snail') n += 1
  return n
}

test('6:58 bossWarning, 7:00 Boss spawns once straight above the player, off-screen', () => {
  const run = newRun()
  run.player.x = 37
  run.player.y = -12
  run.time = WAVES.boss.atSec - WAVES.boss.warningSec
  let events = stepN(run, 1)
  assert.equal(events.filter((e) => e.type === 'bossWarning').length, 1, 'warning at 6:58')
  assert.equal(run.boss, null, 'not yet spawned')
  events = stepN(run, Math.round(WAVES.boss.warningSec / DT) + 3)
  assert.equal(events.filter((e) => e.type === 'bossWarning').length, 0, 'warning only once')
  const spawn = events.filter((e) => e.type === 'bossSpawn')
  assert.equal(spawn.length, 1)
  assert.ok(spawn[0].at >= WAVES.boss.atSec - 1e-9 && spawn[0].at < WAVES.boss.atSec + 2 * DT, 'spawned at 7:00')
  assert.ok(Math.abs(spawn[0].x - 37) < 1e-9, 'straight above (same x)')
  assert.ok(spawn[0].y - -12 > VIEW.height / 2 + BOSS.radius, 'above the top edge, off-screen')
  // Read-only view for rendering.
  const b = run.boss
  assert.equal(b.kind, 'boss_mist_snail')
  assert.equal(b.r, 56)
  assert.equal(b.maxHp, 4500) // 08 K7
  assert.equal(b.alive, true)
  assert.ok(b.hpRatio > 0.99 && b.hpRatio <= 1)
  assert.ok(['chase', 'windup', 'charge'].includes(b.skill))
  assert.equal(run.bossEnemy.maxHp, 4500, 'fixed hp, no §9.1 growth at minute 7')
  assert.equal(run.bossEnemy.damage, 20, 'fixed damage, no §9.1 growth')
  assert.ok(run.grid.large.includes(run.bossEnemy), 'r56 → grid large list')
  // Only once, ever.
  stepN(run, 60 * 10)
  assert.equal(bossCount(run), 1)
})

test('Boss is exempt from far-away relocation and not counted in the caps', () => {
  const run = toBoss(newRun())
  clearNormals(run)
  const e = run.bossEnemy
  e.x = 5000
  e.y = 0
  run.boss.chargeCd = 99
  run.boss.summonCd = 99
  stepN(run, 1)
  assert.ok(Math.abs(e.x - (5000 - BOSS.moveSpeed * DT)) < 1e-6, 'moved by its own speed only, not relocated')
  // The Boss sits in a reserved slot: 200 normal enemies still fit next to it.
  clearNormals(run)
  const at = { x: 300, y: 300 }
  for (let i = 0; i < LIMITS.hardCaps.enemies; i += 1) assert.equal(run.spawner._spawnEvent(run, 'gnat', 7, at), true, `normal #${i + 1}`)
  assert.equal(run.spawner._spawnEvent(run, 'gnat', 7, at), false, 'the 201st normal is capped')
  assert.equal(run.enemies.count, LIMITS.hardCaps.enemies + 1)
})

test('summon: 12 gnats every 8 s around the Boss, obeying the hard cap', () => {
  const run = toBoss(newRun())
  clearNormals(run)
  run.boss.chargeCd = 999 // isolate the summon skill
  const events = stepN(run, Math.round(8 / DT) * 2 + 2)
  const summons = events.filter((e) => e.type === 'bossSummon')
  assert.equal(summons.length, 2)
  assert.equal(summons[0].count, 12)
  const spawnAt = WAVES.boss.atSec
  assert.ok(Math.abs(summons[0].at - (spawnAt + 8)) < 3 * DT, `first at +8 s (${summons[0].at})`)
  assert.ok(Math.abs(summons[1].at - summons[0].at - 8) < 2 * DT, 'then every 8 s')
  // Hard cap: 195 normals → only 5 more.
  clearNormals(run)
  for (let i = 0; i < 195; i += 1) {
    const g = run.enemies.acquire()
    resetEnemy(g, { kind: 'gnat', x: 300, y: 300, r: 10, hp: 1e9, speed: 0, damage: 0, xp: 1, kbRes: 1 })
  }
  run.spawner.accumulator = -1e9 // no routine spawns
  run.boss.summonCd = DT / 2
  const ev = stepN(run, 1)
  assert.equal(ev.find((e) => e.type === 'bossSummon').count, 5)
  assert.equal(run.enemies.count - 1, LIMITS.hardCaps.enemies, 'normals stop at 200')
})

test('charge: 6 s cooldown, 0.8 s windup with locked direction, then ×2.5 for 1 s', () => {
  const run = toBoss(newRun())
  clearNormals(run)
  run.boss.summonCd = 999
  run.spawner.accumulator = -1e9
  const e = run.bossEnemy
  const events = []
  // Until the windup starts.
  let guard = 0
  while (run.boss.skill !== 'windup' && guard < 60 * 10) {
    stepN(run, 1, events)
    clearNormals(run)
    guard += 1
  }
  const charge = events.find((x) => x.type === 'bossCharge')
  assert.ok(charge, 'bossCharge event')
  assert.ok(Math.abs(charge.at - (WAVES.boss.atSec + 6)) < 3 * DT, `first windup at +6 s (${charge.at})`)
  // Direction points at the player and is exposed on run.boss.
  const d = Math.hypot(run.player.x - e.x, run.player.y - e.y)
  assert.ok(Math.abs(charge.dx - (run.player.x - e.x) / d) < 1e-6)
  assert.ok(Math.abs(charge.dy - (run.player.y - e.y) / d) < 1e-6)
  assert.equal(run.boss.dirX, charge.dx)
  assert.equal(run.boss.dirY, charge.dy)
  // Windup: stands still for 0.8 s (48 steps).
  const x0 = e.x
  const y0 = e.y
  stepN(run, 47)
  assert.equal(run.boss.skill, 'windup')
  assert.ok(Math.abs(e.x - x0) < 1e-9 && Math.abs(e.y - y0) < 1e-9, 'still during windup')
  stepN(run, 1)
  assert.equal(run.boss.skill, 'charge')
  // Charge: ×2.5 speed along the locked direction.
  const cx = e.x
  const cy = e.y
  stepN(run, 1)
  const moved = Math.hypot(e.x - cx, e.y - cy)
  assert.ok(Math.abs(moved - BOSS.moveSpeed * 2.5 * DT) < 1e-6, `charge speed ${moved / DT}`)
  assert.ok(Math.abs((e.x - cx) / moved - charge.dx) < 1e-6, 'along the locked direction')
  stepN(run, 59)
  assert.equal(run.boss.skill, 'chase', 'charge lasts 1 s')
  // Next windup 6 s after the previous one started.
  const next = []
  stepN(run, Math.round(6 / DT), next)
  const c2 = next.find((x) => x.type === 'bossCharge')
  assert.ok(c2 && Math.abs(c2.at - charge.at - 6) < 2 * DT, 'next windup 6 s after the first')
})

test('bubble ring only fires while hp < 50%: 8 bubbles, speed 120, damage 10, life 4', () => {
  const run = toBoss(newRun())
  run.boss.chargeCd = 999
  run.boss.summonCd = 999
  run.spawner.accumulator = -1e9
  clearNormals(run)
  // Full hp for 12 s: no ring even though the cooldown elapsed.
  let events = stepN(run, 12 * 60)
  assert.equal(events.filter((e) => e.type === 'bossBubbleRing').length, 0)
  assert.equal(run.mistBubbles.count, 0)
  // Exactly 50% is not below 50%.
  run.bossEnemy.hp = run.bossEnemy.maxHp * 0.5
  events = stepN(run, 1)
  assert.equal(events.filter((e) => e.type === 'bossBubbleRing').length, 0)
  // Drop below 50%: fires at once (cooldown already elapsed).
  run.player.x = 5000 // keep the bubbles off the player
  run.bossEnemy.hp = run.bossEnemy.maxHp * 0.49
  events = stepN(run, 1)
  assert.equal(events.filter((e) => e.type === 'bossBubbleRing').length, 1)
  assert.equal(run.mistBubbles.count, 8)
  const angles = []
  for (let i = 0; i < 8; i += 1) {
    const b = run.mistBubbles.active[i]
    assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - 120) < 1e-9)
    assert.equal(b.damage, 10)
    assert.ok(b.life > 4 - 2 * DT && b.life <= 4)
    angles.push(Math.atan2(b.vy, b.vx))
  }
  angles.sort((a, b) => a - b)
  for (let i = 1; i < 8; i += 1) assert.ok(Math.abs(angles[i] - angles[i - 1] - Math.PI / 4) < 1e-9, '8 even directions')
  // 10 s cooldown before the next ring.
  events = stepN(run, Math.round(10 / DT) - 2)
  assert.equal(events.filter((e) => e.type === 'bossBubbleRing').length, 0)
  events = stepN(run, 3)
  assert.equal(events.filter((e) => e.type === 'bossBubbleRing').length, 1)
})

test('10:00 enrage: move speed +30%, contact and bubble damage +50%', () => {
  const run = toBoss(newRun())
  clearNormals(run)
  assert.equal(run.boss.enraged, false)
  run.time = BOSS.enrage[0].atSec
  const events = stepN(run, 1)
  const enr = events.filter((e) => e.type === 'bossEnrage')
  assert.equal(enr.length, 1)
  assert.equal(enr[0].stage, 1)
  assert.equal(run.boss.enraged, true)
  assert.ok(Math.abs(run.bossEnemy.speed - 45 * 1.3) < 1e-9)
  assert.ok(Math.abs(run.bossEnemy.damage - 30) < 1e-9)
  assert.ok(Math.abs(run.boss.bubble.damage - 15) < 1e-9)
  assert.equal(run.boss.cooldownMul, 1)
  assert.equal(run.boss.takenMul, 1)
  assert.equal(stepN(run, 60).filter((e) => e.type === 'bossEnrage').length, 0, 'once')
  assert.equal(run.state, 'playing', 'no time-out loss')
})
// 01 §9.2 超时兜底表（08 K13）: [time, speed, contact, bubble, cooldownMul, takenMul, stage].
const ENRAGE_TABLE = [
  [600, 58.5, 30, 15, 1, 1.0, 1],   // 10:00 狂暴 I
  [660, 72, 40, 20, 0.5, 1.5, 2],   // 11:00 狂暴 II（替换 I，不连乘）
  [720, 72, 40, 20, 0.5, 2.0, 3],   // 12:00 剥落 1 层
  [780, 72, 40, 20, 0.5, 2.5, 4],   // 13:00
  [840, 72, 40, 20, 0.5, 3.0, 5],   // 14:00
  [900, 72, 40, 20, 0.5, 3.5, 6],   // 15:00
  [960, 72, 40, 20, 0.5, 4.0, 7],   // 16:00 封顶
  [1020, 72, 40, 20, 0.5, 4.0, 7],  // 17:00 仍 ×4.0
]
test('timeout fallback: fast-forward 10:00 → 17:00 matches the 01 §9.2 table', () => {
  const run = toBoss(newRun())
  clearNormals(run)
  run.spawner.accumulator = -1e9
  let lastStage = 0
  for (const [t, speed, contact, bubble, cd, taken, stage] of ENRAGE_TABLE) {
    run.time = t
    run.bossEnemy.hp = run.bossEnemy.maxHp // keep it alive
    const events = stepN(run, 1).filter((e) => e.type === 'bossEnrage')
    assert.equal(events.length, stage === lastStage ? 0 : 1, `${t}s: one bossEnrage per new stage`)
    if (events.length) assert.equal(events[0].stage, stage)
    lastStage = stage
    assert.equal(run.boss.enrageStage, stage, `${t}s stage`)
    assert.ok(Math.abs(run.bossEnemy.speed - speed) < 1e-9, `${t}s speed ${run.bossEnemy.speed}`)
    assert.ok(Math.abs(run.bossEnemy.damage - contact) < 1e-9, `${t}s contact`)
    assert.ok(Math.abs(run.boss.bubble.damage - bubble) < 1e-9, `${t}s bubble`)
    assert.equal(run.boss.cooldownMul, cd, `${t}s cooldownMul`)
    assert.ok(Math.abs(run.boss.takenMul - taken) < 1e-9, `${t}s takenMul ${run.boss.takenMul}`)
    assert.equal(run.bossEnemy.takenMul, run.boss.takenMul, 'entity mirrors the view')
    assert.equal(run.state, 'playing', `${t}s: no time-out loss`)
  }
})
test('bossEnrageAt: each erosion layer is its own stage; floor at full minutes; capped', () => {
  assert.equal(bossEnrageAt(BOSS, 599.9).stage, 0)
  assert.equal(bossEnrageAt(BOSS, 659.9).stage, 1)
  assert.equal(bossEnrageAt(BOSS, 719.9).takenMul, 1.5)
  assert.equal(bossEnrageAt(BOSS, 779.9).takenMul, 2.0)
  assert.equal(bossEnrageAt(BOSS, 959.9).takenMul, 3.5)
  assert.equal(bossEnrageAt(BOSS, 960).takenMul, 4.0)
  assert.equal(bossEnrageAt(BOSS, 5000).takenMul, 4.0)
  assert.equal(bossEnrageAt(BOSS, 5000).stage, 7)
})
test('enrage II: skill cooldowns ×0.5 (summon 4 s, charge 3 s, ring 5 s), ring ignores hp > 50%', () => {
  const run = toBoss(newRun())
  clearNormals(run)
  run.spawner.accumulator = -1e9
  run.time = 660
  run.weapons = [] // no player damage: the Boss stays at full hp (> 50%)
  // Keep the player 100 from the Boss (inside the 08 K15 approach band, d ≤ 120) so the
  // approach chase never suppresses a charge windup and the cadence stays measurable.
  const events = []
  for (let i = 0; i < Math.round(20 / DT); i += 1) {
    run.player.x = run.bossEnemy.x + 100
    run.player.y = run.bossEnemy.y
    stepN(run, 1, events)
  }
  assert.equal(run.bossEnemy.hp, run.bossEnemy.maxHp)
  const gaps = (type) => {
    const at = events.filter((e) => e.type === type).map((e) => e.at)
    return at.slice(1).map((t, i) => t - at[i])
  }
  const rings = events.filter((e) => e.type === 'bossBubbleRing')
  assert.ok(rings.length >= 3, `ring fires at full hp in enrage II (${rings.length})`)
  for (const g of gaps('bossBubbleRing')) assert.ok(Math.abs(g - 5) < 2 * DT, `ring every 5 s (${g})`)
  for (const g of gaps('bossSummon')) assert.ok(Math.abs(g - 4) < 2 * DT, `summon every 4 s (${g})`)
  for (const g of gaps('bossCharge')) assert.ok(Math.abs(g - 3) < 2 * DT, `charge every 3 s (${g})`)
  assert.ok(gaps('bossSummon').length >= 3 && gaps('bossCharge').length >= 3)
})
test('Boss takes round(base × might × takenMul) damage, min 1; normal enemies unaffected', () => {
  // Unit: rounding happens after the multiplier.
  assert.equal(hitDamage({ takenMul: 1 }, 7, 7), 7)
  assert.equal(hitDamage({ takenMul: 2.5 }, 7, 7), 18) // round(17.5)
  assert.equal(hitDamage({ takenMul: 1.5 }, 1, 0.4), 1) // min 1
  // Integration: a shot hitting the Boss at 13:00 (×2.5).
  const run = toBoss(newRun())
  clearNormals(run)
  run.spawner.accumulator = -1e9
  run.weapons = []
  run.time = 780
  stepN(run, 1)
  assert.equal(run.boss.takenMul, 2.5)
  const e = run.bossEnemy
  const shot = run.shots.acquire()
  resetShot(shot, { x: e.x, y: e.y, vx: 0, vy: 0, damage: 7, raw: 7, knockback: 0, life: 1, pierce: 1 })
  const hp0 = e.hp
  run.step()
  assert.equal(hp0 - e.hp, 18)
})
test('after 12:00 the run never times out: Boss alive at 17:00, state still playing', () => {
  const run = toBoss(newRun())
  clearNormals(run)
  run.spawner.accumulator = -1e9
  run.time = 1020
  stepN(run, 120)
  assert.equal(run.state, 'playing')
  assert.ok(run.bossEnemy && run.boss.alive)
})

test('Boss contact damages the player (Boss lives in the grid large list)', () => {
  const run = toBoss(newRun())
  clearNormals(run)
  run.bossEnemy.x = run.player.x
  run.bossEnemy.y = run.player.y + 40
  run.player.invuln = 0
  const hp = run.player.hp
  run.step()
  assert.equal(run.player.hp, hp - 20)
  assert.ok(run.player.invuln > 0)
})

test('defeat → cleansing (1.5 s, invulnerable, field purified, no spores) → extract → 2 s inside → won', () => {
  const run = toBoss(newRun())
  stepN(run, 60) // let some normals in
  // A few enemies and a mist bubble on the field.
  for (let i = 0; i < 5; i += 1) {
    const g = run.enemies.acquire()
    resetEnemy(g, { kind: 'gnat', x: 200 + i * 30, y: 200, r: 10, hp: 8, speed: 0, damage: 5, xp: 1, kbRes: 0 })
  }
  const bubble = run.mistBubbles.acquire()
  bubble.x = 9999
  bubble.life = 10
  // Normals survive the weapons this step, so only the cleansing removes them.
  for (let i = 0; i < run.enemies.count; i += 1) if (run.enemies.active[i] !== run.bossEnemy) run.enemies.active[i].hp = 1e9
  const others = run.enemies.count - 1
  const purified0 = run.purified
  const spores0 = run.spores.count
  run.bossEnemy.hp = 0
  run.player.hp = 60
  run.drainEvents()
  run.step()
  let events = run.drainEvents()
  assert.equal(run.state, 'cleansing')
  assert.ok(events.some((e) => e.type === 'bossDefeated'))
  assert.ok(events.some((e) => e.type === 'cleansing'))
  assert.equal(run.enemies.count, 0, 'every enemy purified')
  assert.equal(run.mistBubbles.count, 0, 'every mist bubble purified')
  assert.ok(run.purified >= purified0 + 1 + others, 'Boss + remaining enemies counted (K4)')
  assert.ok(run.spores.count <= spores0, 'no spores dropped by the cleansing')
  assert.equal(run.bossEnemy, null)
  assert.equal(run.boss.alive, false)
  assert.equal(run.boss.hpRatio, 0)
  assert.equal(run.summary().bossDefeated, true)
  // 1.5 s cleansing: invulnerable, nothing spawns, no damage.
  const hp = run.player.hp
  for (let i = 0; i < 89; i += 1) {
    assert.ok(run.player.invuln > 0, 'invulnerable during cleansing')
    run.step()
    assert.equal(run.state, 'cleansing', `still cleansing at step ${i + 1}`)
  }
  assert.equal(run.player.hp, hp, 'no damage during cleansing')
  assert.equal(run.enemies.count, 0)
  run.step()
  assert.equal(run.state, 'extract')
  events = run.drainEvents()
  const open = events.find((e) => e.type === 'extractionOpen')
  assert.ok(open)
  const x = run.extraction
  assert.equal(x.r, 50)
  assert.ok(Math.abs(Math.hypot(x.x - run.player.x, x.y - run.player.y) - 250) < 1e-6, '250 from the player')
  assert.deepEqual([open.x, open.y], [x.x, x.y])
  // Extract: no spawns, +5 hp per second.
  const hpBefore = run.player.hp
  for (let i = 0; i < 180; i += 1) run.step()
  assert.equal(run.enemies.count, 0, 'no spawns while extracting')
  assert.equal(run.player.hp, Math.min(run.player.maxHp, hpBefore + 15), '+5 per second')
  assert.ok(run.drainEvents().filter((e) => e.type === 'heal').every((e) => e.amount === 5))
  assert.equal(run.state, 'extract', 'standing outside never wins')
  assert.equal(x.progress, 0)
  // Walk in: 2 s in a row → won.
  run.player.x = x.x
  run.player.y = x.y
  for (let i = 0; i < 119; i += 1) run.step()
  assert.equal(run.state, 'extract')
  assert.ok(x.progress > 0.99 && x.progress < 1)
  run.step()
  assert.equal(run.state, 'won')
  assert.ok(run.drainEvents().some((e) => e.type === 'won'))
  const s = run.summary()
  assert.equal(s.outcome, 'won')
  assert.equal(s.bossDefeated, true)
  assert.equal(s.killer, '')
  assert.equal(run.advance(1), 0, 'terminal')
})

test('stepping out of the extraction point resets the progress', () => {
  const run = toBoss(newRun())
  run.bossEnemy.hp = 0
  run.step()
  for (let i = 0; i < 90; i += 1) run.step()
  assert.equal(run.state, 'extract')
  const x = run.extraction
  run.player.x = x.x
  run.player.y = x.y
  for (let i = 0; i < 90; i += 1) run.step()
  assert.ok(Math.abs(x.progress - 0.75) < 1e-9)
  assert.ok(Math.abs(x.heldSec - 1.5) < 1e-9)
  // Step out (just beyond r) for one step.
  run.player.x = x.x + x.r + run.player.r
  run.step()
  assert.equal(x.progress, 0)
  assert.equal(run.state, 'extract')
  // Near the edge still counts as inside (player centre within r).
  run.player.x = x.x + x.r * 0.99
  for (let i = 0; i < 119; i += 1) run.step()
  assert.equal(run.state, 'extract')
  run.step()
  assert.equal(run.state, 'won')
})

test('advance drives cleansing and extract like playing', () => {
  const run = toBoss(newRun())
  run.bossEnemy.hp = 0
  run.step()
  assert.equal(run.state, 'cleansing')
  let total = 0
  for (let i = 0; i < 40 && run.state === 'cleansing'; i += 1) total += run.advance(DT * 3)
  assert.equal(run.state, 'extract')
  assert.ok(total >= 89 && total <= 92, `cleansing steps ${total}`)
  const t = run.time
  assert.ok(run.advance(DT * 2) >= 1)
  assert.ok(run.time > t)
})

test('pause / resume work in playing, levelup, cleansing and extract, and not in won/lost', () => {
  const run = toBoss(newRun())
  // playing (Boss fight)
  assert.equal(run.pause(), true)
  let t = run.time
  assert.equal(run.advance(DT * 5), 0)
  assert.equal(run.time, t)
  run.step()
  assert.equal(run.time, t, 'step() is frozen while paused')
  assert.equal(run.resume(), true)
  assert.equal(run.state, 'playing')
  // cleansing
  run.bossEnemy.hp = 0
  run.step()
  assert.equal(run.state, 'cleansing')
  assert.equal(run.pause(), true)
  t = run.time
  assert.equal(run.advance(DT * 5), 0)
  assert.equal(run.time, t)
  assert.equal(run.resume(), true)
  assert.equal(run.state, 'cleansing')
  for (let i = 0; i < 90; i += 1) run.step()
  // extract
  assert.equal(run.state, 'extract')
  run.player.x = run.extraction.x
  run.player.y = run.extraction.y
  for (let i = 0; i < 60; i += 1) run.step()
  const progress = run.extraction.progress
  assert.equal(run.pause(), true)
  assert.equal(run.advance(DT * 5), 0)
  assert.equal(run.extraction.progress, progress, 'progress frozen while paused')
  assert.equal(run.resume(), true)
  assert.equal(run.state, 'extract')
  // abandon from a paused extract → lost
  run.pause()
  assert.equal(run.abandon(), true)
  assert.equal(run.state, 'lost')
  assert.equal(run.pause(), false, 'no pause in a terminal state')
  assert.equal(run.resume(), false)
  // won
  const w = toBoss(newRun('boss-won'))
  w.bossEnemy.hp = 0
  w.step()
  for (let i = 0; i < 90; i += 1) w.step()
  w.player.x = w.extraction.x
  w.player.y = w.extraction.y
  for (let i = 0; i < 120; i += 1) w.step()
  assert.equal(w.state, 'won')
  assert.equal(w.pause(), false)
  assert.equal(w.abandon(), false)
})

test('levelup pause still resumes to levelup (unchanged by the new states)', () => {
  const run = newRun()
  const spore = run.spores.acquire()
  spore.x = run.player.x
  spore.y = run.player.y
  spore.xp = run.progression.needed
  run.step()
  assert.equal(run.state, 'levelup')
  assert.equal(run.pause(), true)
  assert.equal(run.resume(), true)
  assert.equal(run.state, 'levelup')
})

test('player hp reaching 0 in the Boss fight still loses', () => {
  const run = toBoss(newRun())
  clearNormals(run)
  run.bossEnemy.x = run.player.x
  run.bossEnemy.y = run.player.y + 40
  run.player.invuln = 0
  run.player.hp = 5
  run.step()
  assert.equal(run.state, 'lost')
  assert.equal(run.summary().killer, 'boss_mist_snail')
  assert.equal(run.summary().bossDefeated, false)
})

// --- 贴近追击 (01 §9.2, 08 K15 / L13) ---
const AP = BOSS.approach

// Boss in the chase state, `d` away from the player along −x, other skills parked.
function placeBoss(run, t, d) {
  clearNormals(run)
  run.spawner.accumulator = -1e9
  run.weapons = []
  run.time = t
  stepN(run, 1) // apply the enrage stage for t
  const b = run.boss
  b.skill = 'chase'
  b.skillLeft = 0
  b.approaching = false
  b.summonCd = 999
  b.ringCd = 999
  b.chargeCd = 999
  // Isolate the 11:00 rule: restart the 08 K22 no-damage timer at t.
  b.idleApproach = false
  b.spawnedAt = run.time
  run.bossEnemy.x = run.player.x - d
  run.bossEnemy.y = run.player.y
  run.drainEvents()
}
const bossDist = (run) => Math.hypot(run.bossEnemy.x - run.player.x, run.bossEnemy.y - run.player.y)
// One step; returns how far the Boss moved this step and the drained events.
function stepMoved(run) {
  const x = run.bossEnemy.x
  const y = run.bossEnemy.y
  const ev = stepN(run, 1)
  return { moved: Math.hypot(run.bossEnemy.x - x, run.bossEnemy.y - y), ev }
}

test('approach data matches 01 §9.2 and validate() rejects bad approach parameters', async () => {
  const { validateBossApproach, maxPlayerMoveSpeed } = await import('../js/survivor/data/validate.js')
  assert.deepEqual({ ...AP }, { fromStage: 2, enterDist: 120, exitDist: 90, speed: 320, idleSec: 60 })
  assert.equal(BOSS.hp, 4500, '08 K16: Boss hp stays 4500')
  assert.ok(Math.abs(maxPlayerMoveSpeed() - 257.6) < 1e-9, '160 × 1.15 × 1.4')
  assert.deepEqual(validateBossApproach(AP, BOSS.radius), [])
  const bad = (patch) => validateBossApproach({ ...AP, ...patch }, BOSS.radius)
  assert.ok(bad({ enterDist: 90 }).some((m) => m.startsWith('approach.enterDist')), 'enterDist ≤ exitDist')
  assert.ok(bad({ enterDist: 80, exitDist: 80 }).some((m) => m.startsWith('approach.enterDist')))
  assert.ok(bad({ exitDist: 74 }).some((m) => m.startsWith('approach.exitDist')), 'exitDist ≤ 56 + 18')
  assert.ok(bad({ speed: 257.6 }).some((m) => m.startsWith('approach.speed')), 'speed ≤ 257.6')
  assert.ok(bad({ speed: 200 }).some((m) => m.startsWith('approach.speed')))
  assert.ok(bad({ fromStage: 0 }).length > 0)
  assert.ok(bad({ idleSec: 0 }).some((m) => m.startsWith('approach.idleSec')), 'idleSec must be > 0')
  assert.ok(bad({ idleSec: undefined }).some((m) => m.startsWith('approach.idleSec')))
  assert.ok(validateBossApproach(undefined, BOSS.radius).length > 0, 'missing approach')
})

test('10:59 (狂暴 I): Boss 300 away keeps 58.5 and never approaches', () => {
  const run = toBoss(newRun())
  placeBoss(run, 659, 300)
  assert.equal(run.boss.enrageStage, 1)
  for (let i = 0; i < 30; i += 1) {
    const { moved, ev } = stepMoved(run)
    assert.ok(Math.abs(moved - 58.5 * DT) < 1e-9, `speed ${moved / DT}`)
    assert.equal(run.boss.approaching, false)
    assert.equal(ev.filter((e) => e.type === 'bossApproach').length, 0)
  }
})

test('11:00+: Boss 300 away approaches at 320 (one bossApproach), stops at d ≤ 90 and drops back to 72', () => {
  for (const t of [660, 721, 1000]) { // 狂暴 II and later erosion layers
    const run = toBoss(newRun())
    placeBoss(run, t, 300)
    assert.ok(run.boss.enrageStage >= AP.fromStage)
    let { moved, ev } = stepMoved(run)
    assert.equal(run.boss.approaching, true, `${t}s approaching`)
    assert.ok(Math.abs(moved - 320 * DT) < 1e-9, `${t}s approach speed ${moved / DT}`)
    let approachEvents = ev.filter((e) => e.type === 'bossApproach').length
    let steps = 0
    while (run.boss.approaching && steps < 120) {
      const d = bossDist(run)
      ;({ moved, ev } = stepMoved(run))
      approachEvents += ev.filter((e) => e.type === 'bossApproach').length
      if (run.boss.approaching) assert.ok(Math.abs(moved - 320 * DT) < 1e-9, 'fixed 320 while approaching')
      else assert.ok(d <= AP.exitDist + 1e-9, `exits only at d ≤ 90 (${d})`)
      steps += 1
    }
    assert.equal(run.boss.approaching, false)
    assert.equal(approachEvents, 1, 'one bossApproach per entry')
    assert.ok(Math.abs(steps * DT - (300 - 90) / 320) < 3 * DT, `closed 210 in ~0.66 s (${steps * DT})`)
    assert.ok(Math.abs(moved - 72 * DT) < 1e-9, `back to 72 (${moved / DT})`)
    ;({ moved } = stepMoved(run))
    assert.equal(run.boss.approaching, false, 'hysteresis: stays out while d ≤ 120')
    assert.ok(Math.abs(moved - 72 * DT) < 1e-9)
  }
})

// 08 K22 无伤触发: 60 s without any damage → same approach rules, before 11:00.
const IDLE_STEPS = Math.round(AP.idleSec / DT)
test('K22: 60 s without damage (from spawn) starts the approach before 11:00, then latches', () => {
  const run = toBoss(newRun())
  placeBoss(run, 450, 300) // 7:30, 狂暴 none; no weapons → the Boss is never hit
  assert.equal(run.boss.enrageStage, 0)
  const ev = []
  for (let i = 0; i < IDLE_STEPS - 2; i += 1) {
    run.bossEnemy.x = run.player.x - 300 // hold the distance; only the timer matters here
    run.bossEnemy.y = run.player.y
    stepN(run, 1, ev)
    assert.equal(run.boss.approaching, false, `not before 60 s (${i})`)
  }
  assert.equal(ev.filter((e) => e.type === 'bossApproach').length, 0)
  stepN(run, 3, ev)
  assert.equal(run.boss.idleApproach, true)
  assert.equal(run.boss.approaching, true, 'approaching once 60 s passed without damage')
  assert.equal(ev.filter((e) => e.type === 'bossApproach').length, 1)
  const { moved } = stepMoved(run)
  assert.ok(Math.abs(moved - 320 * DT) < 1e-9, `same 320 approach speed (${moved / DT})`)
  // Getting hit again does not switch it off: after exiting at ≤ 90 it re-enters past 120.
  run.bossEnemy.lastHitTime = run.time
  let steps = 0
  while (run.boss.approaching && steps < 120) { stepN(run, 1); steps += 1 }
  assert.equal(run.boss.approaching, false)
  assert.ok(bossDist(run) <= AP.exitDist + 1e-9)
  run.bossEnemy.lastHitTime = run.time
  run.bossEnemy.x = run.player.x - 300
  run.bossEnemy.y = run.player.y
  stepN(run, 1)
  assert.equal(run.boss.idleApproach, true, 'latched for the rest of the fight')
  assert.equal(run.boss.approaching, true)
})

test('K22: a Boss that keeps taking damage (every < 60 s) never approaches before 11:00', () => {
  const run = toBoss(newRun())
  placeBoss(run, 450, 300) // 7:30; 2 min of hits ends at 9:30, well before 11:00
  const ev = []
  const hitEvery = IDLE_STEPS - 60 // a hit every 59 s
  for (let i = 1; i <= IDLE_STEPS * 2; i += 1) {
    if (i % hitEvery === 0) run.bossEnemy.lastHitTime = run.time // what weapon hits record
    run.bossEnemy.x = run.player.x - 300
    run.bossEnemy.y = run.player.y
    stepN(run, 1, ev)
    assert.equal(run.boss.approaching, false, `step ${i}`)
  }
  assert.equal(run.boss.idleApproach, false)
  assert.equal(ev.filter((e) => e.type === 'bossApproach').length, 0)
  // Once hits stop, the 60 s count starts from the last hit.
  const last = run.bossEnemy.lastHitTime
  while (!run.boss.approaching && run.time < last + AP.idleSec + 1) {
    run.bossEnemy.x = run.player.x - 300
    run.bossEnemy.y = run.player.y
    stepN(run, 1)
  }
  assert.equal(run.boss.approaching, true)
  assert.ok(Math.abs(run.time - (last + AP.idleSec)) < 2 * DT, `60 s after the last hit (${run.time - last})`)
})

test('K22: a real weapon hit on the Boss records lastHitTime (the idle timer source)', () => {
  const run = toBoss(newRun())
  placeBoss(run, 480, 60) // within the default spore_shot / umbrella range
  run.weapons = [makeWeaponState('umbrella_blades', 1)]
  const before = run.bossEnemy.lastHitTime
  stepN(run, 120)
  assert.ok(run.bossEnemy.lastHitTime > before, 'umbrella blades hit the Boss and reset the timer')
})

// Player runs straight away from the Boss at `v`; Boss uses all its skills (charge on).
function fleeStraight(v, seconds, seed) {
  const run = toBoss(newRun(seed))
  placeBoss(run, 660, 300)
  run.boss.chargeCd = 0.5
  const dist = []
  for (let i = 0; i < Math.round(seconds / DT); i += 1) {
    run.player.x += v * DT // straight line along +x, away from the Boss
    run.bossEnemy.hp = run.bossEnemy.maxHp
    stepN(run, 1)
    clearNormals(run)
    dist.push(bossDist(run))
  }
  return { run, dist }
}
function maxGapAbove(dist, limit) {
  let gap = 0
  let longest = 0
  for (const d of dist) {
    gap = d <= limit ? 0 : gap + 1
    longest = Math.max(longest, gap)
  }
  return longest * DT
}

test('fleeing straight at 160: within 2 s d ≤ 120, then ≤ 120 at least once in every 3 s charge cycle', () => {
  const { dist } = fleeStraight(160, 40, 'flee-160')
  const first = dist.findIndex((d) => d <= AP.enterDist)
  assert.ok(first >= 0 && first * DT <= 2, `first ≤ 120 at ${first * DT}s`)
  const rest = dist.slice(first)
  for (let s = 0; s + Math.round(3 / DT) <= rest.length; s += Math.round(3 / DT)) {
    const win = rest.slice(s, s + Math.round(3 / DT))
    assert.ok(Math.min(...win) <= AP.enterDist + 1e-9, `3 s window from ${(first + s) * DT}s: min ${Math.min(...win)}`)
  }
  assert.ok(maxGapAbove(rest, AP.enterDist) < 3)
})

test('fleeing straight at 257.6 (max build): ≤ 120 at least once in every 8 s', () => {
  const { dist } = fleeStraight(257.6, 60, 'flee-max')
  const first = dist.findIndex((d) => d <= AP.enterDist)
  assert.ok(first >= 0 && first * DT <= 8, `first ≤ 120 at ${first * DT}s`)
  const rest = dist.slice(first)
  const W = Math.round(8 / DT)
  for (let s = 0; s + W <= rest.length; s += W) {
    assert.ok(Math.min(...rest.slice(s, s + W)) <= AP.enterDist + 1e-9, `8 s window from ${(first + s) * DT}s`)
  }
  assert.ok(maxGapAbove(rest, AP.enterDist) < 8, `longest stretch > 120: ${maxGapAbove(rest, AP.enterDist)}s`)
})

test('any movement: from 11:00 the Boss always closes the distance (circling, zig-zag, standing far away)', () => {
  const patterns = {
    circle: (i) => [Math.cos(i / 40), Math.sin(i / 40)],
    zigzag: (i) => [1, (Math.floor(i / 50) % 2) * 2 - 1],
    reverse: (i) => [(Math.floor(i / 180) % 2) * 2 - 1, 0.3],
    still: () => [0, 0],
  }
  for (const [name, dir] of Object.entries(patterns)) {
    const run = toBoss(newRun(`any-${name}`))
    placeBoss(run, 660, 700)
    run.boss.chargeCd = 1
    const dist = []
    for (let i = 0; i < 40 * 60; i += 1) {
      const [dx, dy] = dir(i)
      const m = Math.hypot(dx, dy)
      if (m > 0) {
        run.player.x += (dx / m) * 257.6 * DT // max-build speed in every pattern
        run.player.y += (dy / m) * 257.6 * DT
      }
      run.bossEnemy.hp = run.bossEnemy.maxHp
      stepN(run, 1)
      clearNormals(run)
      dist.push(bossDist(run))
    }
    const first = dist.findIndex((d) => d <= AP.enterDist)
    assert.ok(first >= 0 && first * DT < 10, `${name}: reached ≤ 120 at ${first * DT}s`)
    assert.ok(maxGapAbove(dist.slice(first), AP.enterDist) < 8, `${name}: never > 120 for 8 s`)
  }
})

test('no windup while approaching; the step after leaving the approach starts exactly one windup', () => {
  const run = toBoss(newRun())
  placeBoss(run, 660, 400)
  run.boss.chargeCd = 0.1 // becomes ready while approaching
  const events = []
  let lastApproachStep = -1
  let i = 0
  while (i < 600) {
    const was = run.boss.approaching
    const ev = stepN(run, 1)
    events.push(...ev)
    if (run.boss.approaching) {
      assert.notEqual(run.boss.skill, 'windup', 'no windup while approaching')
      assert.equal(ev.filter((e) => e.type === 'bossCharge').length, 0)
      assert.ok(run.boss.chargeCd >= 0, 'cooldown clamped at 0 while approaching')
      lastApproachStep = i
    } else if (was) {
      assert.equal(i, lastApproachStep + 1)
      assert.equal(run.boss.skill, 'windup', 'windup right after leaving')
      assert.equal(ev.filter((e) => e.type === 'bossCharge').length, 1, 'exactly one bossCharge')
      break
    }
    i += 1
  }
  assert.ok(lastApproachStep > 0, 'did approach first')
  assert.equal(events.filter((e) => e.type === 'bossCharge').length, 1)
})

test('windup / charge in progress are not interrupted; charge speed is 72 × 2.5 = 180', () => {
  const run = toBoss(newRun())
  placeBoss(run, 660, 100)
  run.boss.chargeCd = DT / 2
  stepN(run, 1)
  assert.equal(run.boss.skill, 'windup')
  // Player teleports far away during the windup: no approach, Boss stays still.
  run.player.x += 600
  const x0 = run.bossEnemy.x
  while (run.boss.skill === 'windup') {
    stepN(run, 1)
    assert.equal(run.boss.approaching, false, 'not judged during windup')
  }
  assert.equal(run.boss.skill, 'charge')
  assert.equal(run.bossEnemy.x, x0, 'still during windup')
  let { moved } = stepMoved(run)
  assert.ok(Math.abs(moved - 180 * DT) < 1e-9, `charge speed ${moved / DT}`)
  while (run.boss.skill === 'charge') {
    assert.equal(run.boss.approaching, false, 'not judged during charge')
    ;({ moved } = stepMoved(run))
  }
  assert.equal(run.boss.skill, 'chase')
  stepN(run, 1)
  assert.equal(run.boss.approaching, true, 'back in chase → approach judged again')
})

test('approach speed ignores the dew-ring slow; normal chase is still slowed', () => {
  const run = toBoss(newRun())
  placeBoss(run, 660, 160) // Lv5 ring 115 + Boss r56 = 171 ≥ 160: Boss is inside the ring
  run.weapons = [makeWeaponState('dew_ring', 5)]
  stepN(run, 1)
  assert.equal(run.boss.approaching, true)
  assert.ok(run.bossEnemy.slow > 0, 'ring slow applied to the Boss')
  const { moved } = stepMoved(run)
  assert.ok(Math.abs(moved - 320 * DT) < 1e-9, `approach not slowed (${moved / DT})`)
  // Non-approaching chase inside the ring: 72 × (1 − 0.25).
  placeBoss(run, 660, 100)
  run.weapons = [makeWeaponState('dew_ring', 5)]
  stepN(run, 1)
  assert.equal(run.boss.approaching, false)
  const slow = run.bossEnemy.slow
  assert.ok(slow > 0)
  const r = stepMoved(run)
  assert.ok(Math.abs(r.moved - 72 * (1 - slow) * DT) < 1e-9, `chase slowed (${r.moved / DT})`)
})

test('balance-15 flee + prefer:spore_shot: Boss hp falls before 12:00 (no longer stuck at 83%)', () => {
  const hp = {}
  let approaches = 0
  const { rec } = playRun({
    seed: 'balance-15',
    move: 'flee',
    pick: 'prefer:spore_shot',
    maxSec: 730,
    hooks: {
      onSecond: (s, run) => { if (run.boss) hp[s] = run.boss.hpRatio },
      onEvent: (ev) => { if (ev.type === 'bossApproach') approaches += 1 },
    },
  })
  // S3 B1–B4（被动 / 进化 / 拾取物 / 精英）后该种子在 11:00 前就能打赢 Boss：此时不需要追击。
  assert.ok(approaches > 0 || (rec.bossDefeatSec !== null && rec.bossDefeatSec < 660), 'the Boss approached the fleeing bot, or fell before 11:00')
  const at660 = hp[660] ?? 1
  const before720 = rec.bossDefeatSec !== null && rec.bossDefeatSec < 720 ? 0 : (hp[719] ?? hp[Math.max(...Object.keys(hp).map(Number))])
  assert.ok(before720 < at660 || (rec.bossDefeatSec !== null && rec.bossDefeatSec < 720), `hp 11:00 ${at660} → 11:59 ${before720}`)
  assert.ok(rec.bossDefeatSec === null || rec.bossDefeatSec < 720, 'ends before 12:00 if defeated')
})

test('a Boss fight past 11:00 with approach chasing stays deterministic', () => {
  const play = () => {
    const run = toBoss(newRun('approach-det'))
    run.time = 650
    const trace = []
    for (let i = 0; i < 30 * 60; i += 1) {
      run.player.x += Math.cos(i / 70) * 200 * DT
      run.player.y += Math.sin(i / 110) * 200 * DT
      run.bossEnemy && (run.bossEnemy.hp = run.bossEnemy.maxHp)
      const ev = stepN(run, 1)
      if (ev.some((e) => e.type === 'bossApproach')) trace.push(`A${i}`)
      if ((i + 1) % 60 === 0) trace.push(`${run.boss.x.toFixed(6)},${run.boss.y.toFixed(6)},${run.boss.skill},${run.boss.approaching}`)
    }
    return trace
  }
  const a = play()
  assert.deepEqual(a, play())
  assert.ok(a.some((x) => x.startsWith('A')), 'approach happened')
})
