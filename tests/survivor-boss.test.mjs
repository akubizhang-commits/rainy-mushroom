import test from 'node:test'
import assert from 'node:assert/strict'

import { SurvivorRun } from '../js/survivor/SurvivorRun.js'
import { DT } from '../js/survivor/SimClock.js'
import { WAVES } from '../js/survivor/data/waves.js'
import { ENEMIES } from '../js/survivor/data/enemies.js'
import { LIMITS } from '../js/survivor/data/limits.js'
import { resetEnemy } from '../js/survivor/Enemies.js'

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
  assert.equal(b.maxHp, 10000)
  assert.equal(b.alive, true)
  assert.ok(b.hpRatio > 0.99 && b.hpRatio <= 1)
  assert.ok(['chase', 'windup', 'charge'].includes(b.skill))
  assert.equal(run.bossEnemy.maxHp, 10000, 'fixed hp, no §9.1 growth at minute 7')
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
  run.time = BOSS.enrage.atSec
  const events = stepN(run, 1)
  assert.equal(events.filter((e) => e.type === 'bossEnrage').length, 1)
  assert.equal(run.boss.enraged, true)
  assert.ok(Math.abs(run.bossEnemy.speed - 45 * 1.3) < 1e-9)
  assert.ok(Math.abs(run.bossEnemy.damage - 30) < 1e-9)
  assert.ok(Math.abs(run.boss.bubble.damage - 15) < 1e-9)
  assert.equal(stepN(run, 60).filter((e) => e.type === 'bossEnrage').length, 0, 'once')
  assert.equal(run.state, 'playing', 'no time-out loss')
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
