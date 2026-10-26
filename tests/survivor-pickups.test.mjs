// PICK · 拾取物：露珠 / 大露珠 / 一阵林风（01 §11，09 B3）。掉落走 `${seed}:drop` 子流；
// 场上上限 露珠 3 / 林风 1；精英必掉大露珠 + 林风；共用 limits.pools.pickups（5）；30 秒消失；
// 回复不超过最大生命；cleansing 净化不掉拾取物。
import test from 'node:test'
import assert from 'node:assert/strict'
import { SurvivorRun } from '../js/survivor/SurvivorRun.js'
import { PICKUPS } from '../js/survivor/data/pickups.js'
import { LIMITS } from '../js/survivor/data/limits.js'
import { rollDrop, spawnDrop, dropCount, dropEliteLoot, dropSpore } from '../js/survivor/Pickups.js'
import { resetEnemy } from '../js/survivor/Enemies.js'

function newRun(seed = 'pickups') {
  const run = new SurvivorRun({ seed, viewport: { width: 720, height: 1560 } })
  run.weapons = [] // nothing fires unless a test says so
  run.spawner.step = () => {} // no routine spawns / events
  return run
}
function stepN(run, n) {
  for (let i = 0; i < n && run.state === 'playing'; i += 1) run.step()
}
function placeEnemy(run, kind, x, y, extra = {}) {
  const e = run.enemies.acquire()
  resetEnemy(e, { kind, x, y, r: 10, hp: 1, speed: 0, damage: 0, xp: 1, kbRes: 1, ...extra })
  return e
}

test('100 000 normal purifications: 露珠 0.8% / 林风 0.15% within 10% relative error (fixed seed)', () => {
  const run = newRun('drop-rate')
  const N = 100000
  const got = { dew: 0, wind: 0 }
  for (let i = 0; i < N; i += 1) {
    const d = rollDrop(run, 0, 0)
    if (d) {
      got[d.kind] += 1
      run.drops.release(d) // keep the field empty so caps never interfere
    }
  }
  for (const k of ['dew', 'wind']) {
    const rate = got[k] / N
    const want = PICKUPS[k].chance
    assert.ok(Math.abs(rate - want) / want < 0.1, `${k}: ${rate} vs ${want}`)
  }
  assert.equal(run.diag.dropped.pickups, 0)
})

test('on-field caps: 露珠 ≤ 3, 林风 ≤ 1; capped rolls drop nothing and count as capSkipped', () => {
  const run = newRun('drop-cap')
  for (let i = 0; i < 20000; i += 1) rollDrop(run, 500, 500)
  assert.equal(dropCount(run, 'dew'), 3)
  assert.equal(dropCount(run, 'wind'), 1)
  assert.equal(run.drops.count, 4)
  assert.ok(run.diag.capSkipped.pickups > 0)
  assert.equal(run.diag.dropped.pickups, 0, 'pool (5) never full from capped kinds')
  assert.equal(LIMITS.pools.pickups, 5)
})

test('elite always drops 大露珠 + 林风, ignoring caps; a full pool (5) drops the rest and counts it', () => {
  const run = newRun('elite-loot')
  dropEliteLoot(run, 300, 0)
  assert.deepEqual(run.drops.active.slice(0, run.drops.count).map((d) => d.kind), ['bigDew', 'wind'])
  // Field already holding 3 露珠 + 1 林风: the elite's 大露珠 takes the 5th slot, its 林风 is dropped.
  const full = newRun('elite-full')
  for (let i = 0; i < 3; i += 1) spawnDrop(full, 'dew', 500, 0)
  spawnDrop(full, 'wind', 500, 0)
  dropEliteLoot(full, 300, 0)
  assert.equal(full.drops.count, 5)
  assert.equal(dropCount(full, 'bigDew'), 1)
  assert.equal(dropCount(full, 'wind'), 1)
  assert.equal(full.diag.dropped.pickups, 1)
})

test('露珠 / 林风 / 大露珠 vanish after 30 s; spores stay', () => {
  const run = newRun('expire')
  spawnDrop(run, 'dew', 2000, 0)
  spawnDrop(run, 'wind', 2000, 50)
  spawnDrop(run, 'bigDew', 2000, 100, true)
  dropSpore(run, 2000, 150, 3)
  stepN(run, 30 * 60 - 2)
  assert.equal(run.drops.count, 3, 'still there just before 30 s')
  stepN(run, 3)
  assert.equal(run.drops.count, 0, 'gone after 30 s')
  assert.equal(run.spores.count, 1, 'spores never vanish')
})

test('露珠 +20 and 大露珠 +50, never above max hp; pulled in from the pickup radius', () => {
  const run = newRun('heal')
  run.player.hp = 50
  spawnDrop(run, 'dew', 100, 0) // inside pickup radius 140 → flies in at 600/s
  stepN(run, 30)
  assert.equal(run.drops.count, 0)
  assert.equal(run.player.hp, 70)
  const ev = run.drainEvents()
  assert.ok(ev.some((e) => e.type === 'pickup' && e.kind === 'dew'))
  assert.ok(ev.some((e) => e.type === 'heal' && e.amount === 20))
  run.player.hp = 95
  spawnDrop(run, 'bigDew', 0, 0, true)
  stepN(run, 1)
  assert.equal(run.player.hp, run.player.maxHp, 'clamped to max hp')
  assert.ok(run.drainEvents().some((e) => e.type === 'heal' && e.amount === 5))
  // Outside the pickup radius a drop stays put.
  spawnDrop(run, 'dew', 400, 0)
  stepN(run, 60)
  assert.equal(run.drops.active[0].x, 400)
})

test('一阵林风: every spore on the field flies in and is banked within a few seconds', () => {
  const run = newRun('wind')
  const far = [[1500, 0], [-1200, 800], [0, -2000], [600, 600], [3000, 3000]]
  let xp = 0
  for (const [x, y] of far) {
    dropSpore(run, x, y, 1)
    xp += 1
  }
  run.progression.needed = 1e9 // no level-up interruptions
  const before = run.progression.xp
  stepN(run, 60)
  assert.equal(run.spores.count, far.length, 'out of reach without the wind')
  spawnDrop(run, 'wind', 0, 0)
  const t0 = run.time
  while (run.spores.count > 0 && run.time - t0 < 10) stepN(run, 1)
  assert.equal(run.spores.count, 0)
  assert.ok(run.time - t0 <= 4.0, `all banked in ${(run.time - t0).toFixed(2)} s`)
  assert.equal(run.progression.xp - before, xp)
  // Spores dropped after the wind was collected are not pulled in.
  dropSpore(run, 1000, 0, 1)
  stepN(run, 120)
  assert.equal(run.spores.count, 1)
})

test('combat purifications roll drops on the drop stream; same seed → same drops', () => {
  const play = (seed) => {
    const run = newRun(seed)
    const out = []
    for (let i = 0; i < 3000; i += 1) {
      placeEnemy(run, 'gnat', 2000 + (i % 50), 0, { hp: 0 })
      stepN(run, 1)
      for (const d of run.drops.active.slice(0, run.drops.count)) out.push(`${i}:${d.kind}`)
      run.drops.releaseAll()
    }
    return out
  }
  const a = play('roll-a')
  assert.ok(a.length > 0, 'some drops in 3000 purifications')
  assert.deepEqual(a, play('roll-a'))
  assert.notDeepEqual(a, play('roll-b'))
})

test('cleansing purification drops no pickups (08 K4)', () => {
  const run = newRun('cleanse')
  for (let i = 0; i < 150; i += 1) placeEnemy(run, 'gnat', 2000 + i, 0, { hp: 5 })
  run._enterCleansing()
  assert.equal(run.enemies.count, 0)
  assert.equal(run.drops.count, 0)
  assert.equal(run.spores.count, 0)
})

test('the elite purified in combat drops 50 xp + 大露珠 + 林风 and counts eliteDefeated', () => {
  const run = newRun('elite-death')
  placeEnemy(run, 'elite_beetle', 2000, 0, { hp: 0, xp: 50, r: 28, behavior: 'charge' })
  stepN(run, 1)
  assert.equal(dropCount(run, 'bigDew'), 1)
  assert.equal(dropCount(run, 'wind'), 1)
  assert.equal(run.spores.count, 1)
  assert.equal(run.spores.active[0].xp, 50)
  assert.equal(run.summary().eliteDefeated, 1)
  assert.ok(run.drainEvents().some((e) => e.type === 'eliteDefeated'))
})
