import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { MONSTER_RANK_BASELINE, ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { fixture, steerMechanics } from '../scripts/verify-monster-mechanics-balance.mjs'

test('current floor-three array fixture defeats the first minor elite with movement-only inputs', t => {
  // Current authored entry fixture, not a natural acquisition claim. Never
  // restore the retired rank/loot snapshot or rewrite an enemy's HP to fit it.
  const f = fixture(3, 'array', 1)
  const run = new TowerRun({ attemptId: 1, floor: 3, seed: 419, xp: f.xp,
    hp: f.stats.maxHp, loadout: f.loadout, arenaVersion: 1 })
  assert.ok(validateTowerSnapshot(run.snapshot()))
  let visible = null, target = null, dead = null
  while (run.state.phase === 'playing' && run.state.time < 600 && dead === null) {
    const p = run.state.player
    run.setViewport({ xmin: p.x - 560, xmax: p.x + 560, ymin: p.y - 315, ymax: p.y + 315 })
    steerMechanics(run)
    run.advance(1 / 60)
    target ??= run.state.enemies.find(e => e.role === 'elite' && !e.temporary)
    if (target && Math.hypot(target.x - p.x, target.y - p.y) <= 460 + target.radius) visible ??= run.state.time
    if (target && run.state.killLedger.some(k => k.id === target.id)) dead = run.state.time
  }
  assert.ok(target, 'current waves actually spawned an elite')
  assert.notEqual(visible, null)
  assert.notEqual(dead, null, 'movement-only fixture defeated elite without death or timeout')
  assert.ok(dead - visible <= 40, `minor elite ${dead - visible}s; no retired20s minimum`)
  assert.ok(validateTowerSnapshot(run.snapshot()))
  assert.deepEqual(TowerRun.restore(run.snapshot()).snapshot(), run.snapshot())
  t.diagnostic(`current array lower-quality fixture visible-to-kill ${(dead - visible).toFixed(3)}s`)
})

test('floor-three elites use the approved rank-based HP/damage budget without early-wave discounts', () => {
  for (const archetype of ARCHETYPES.filter(a => a.role === 'elite')) {
    const baseline = towerEnemyStats({ ...archetype, role: 'normal' }, 3, 20)
    const expected = towerEnemyStats(archetype, 3, 20)
    assert.ok(Math.abs(expected.hp / baseline.hp - MONSTER_RANK_BASELINE.elite_hp_multiplier_by_rank[archetype.rank]) < 1e-10)
    assert.ok(Math.abs(expected.damage / baseline.damage - MONSTER_RANK_BASELINE.elite_damage_multiplier) < 1e-10)
    for (const wave of [1, 5, 6, 10, 20]) assert.deepEqual(towerEnemyStats(archetype, 3, wave), expected)
  }
})
