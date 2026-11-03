import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHETYPES, FLOORS } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { TowerCampaignStore, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { TowerRun, stats } from '../js/xianxia/TowerRun.js'
import { createFixedWeapon, WEAPONS } from '../js/xianxia/TowerWeapons.js'
import { cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
import { GROWTH_SKILLS } from '../js/xianxia/TowerGrowth.js'
import { steerMechanics } from '../scripts/verify-monster-mechanics-balance.mjs'

const firstEliteId = FLOORS[0].waves[4].enemy_groups.find(g => ARCHETYPES.find(a => a.id === g.archetype)?.role === 'elite').archetype

test('first elite fits the actual new-character damage budget before the first earned skill point', () => {
  const state = new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state
  const arc = GROWTH_SKILLS.find(s => s.id === 'sj_arc')
  const damage = stats(0, combatLoadout(state)).attack * arc.damage[0]
  const elite = towerEnemyStats(ARCHETYPES.find(a => a.id === firstEliteId), 1, 5)
  const perfectSeconds = (Math.ceil(elite.hp / damage) - 1) * arc.cooldown
  assert.ok(perfectSeconds >= 0 && perfectSeconds <= 30, `ideal first elite ${perfectSeconds}s; leave room for movement within 40s`)
})

test('opening minor elite has no floor or player-equipment scaling', () => {
  const boar = ARCHETYPES.find(a => a.id === firstEliteId)
  const baseline = towerEnemyStats({ ...boar, role: 'normal' }, 1, 20)
  const expected = towerEnemyStats(boar, 1, 5)
  assert.ok(Math.abs(expected.hp / baseline.hp - 2.5) < 1e-10)
  assert.ok(Math.abs(expected.damage / baseline.damage - 1.15) < 1e-10)
  const state = new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state
  const starter = combatLoadout(state)
  const definition = WEAPONS.find(d => d.tier === 'ling' && d.role === 'master')
  const weapon = createFixedWeapon(definition.id, 'high-level-fixture')
  const advanced = { ...starter, weapon, weaponId: weapon.id, weaponQuality: weapon.quality, weaponRefine: 0 }
  for (const [xp, loadout] of [[0, starter], [cultivationLevelXp(30), advanced]]) {
    for (const floor of [1, 4, 9]) {
      const run = new TowerRun({ attemptId: 1, floor, seed: 101, xp, hp: 100, loadout })
      const e = run._enemy({ id: 'authored-elite', archetype: boar.id, x: 100, y: 0 })
      assert.deepEqual({ hp: e.hp, damage: e.damage, moveSpeed: e.moveSpeed }, expected)
    }
  }
})

test('fresh character defeats the first elite within40s with no artificial minimum', t => {
  const state = new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state
  for (const seed of [101, 211, 307]) {
    const run = new TowerRun({ attemptId: 1, floor: 1, seed, xp: 0, hp: 100, loadout: combatLoadout(state), arenaVersion: 1 })
    let started = null, dead = null, id = null
    while (run.state.phase === 'playing' && run.state.time < 300 && dead === null) {
      const s = run.state, p = s.player
      run.setViewport({ xmin: p.x - 560, xmax: p.x + 560, ymin: p.y - 315, ymax: p.y + 315 })
      steerMechanics(run)
      run.advance(1 / 60)
      const e = s.enemies.find(e => e.archetype === firstEliteId)
      if (e && Math.hypot(e.x - p.x, e.y - p.y) <= 460 + e.radius) { started ??= s.time; id = e.id }
      if (id && s.killLedger.some(k => k.id === id)) dead = s.time
    }
    assert.notEqual(dead, null, `seed ${seed}: first elite not defeated`)
    assert.notEqual(started, null)
    assert.ok(dead - started >= 0 && dead - started <= 40, `seed ${seed}: ${dead - started}s`)
    t.diagnostic(`seed ${seed}: visible-to-kill ${(dead-started).toFixed(3)}s`)
  }
})
