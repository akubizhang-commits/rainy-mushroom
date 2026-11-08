import test from 'node:test'
import assert from 'node:assert/strict'
import { MONSTER_RANK_BASELINE, ARCHETYPES, FLOORS } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { TowerCampaignStore, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { TowerRun } from '../js/xianxia/TowerRun.js'
import { createFixedWeapon, WEAPONS } from '../js/xianxia/TowerWeapons.js'
import { cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
import { mitigateMonsterDamage } from '../js/xianxia/TowerMonsterAttributes.js'
import { steerMechanics } from '../scripts/verify-monster-mechanics-balance.mjs'

const firstEliteId = FLOORS[0].waves[4].enemy_groups.find(g => ARCHETYPES.find(a => a.id === g.archetype)?.role === 'elite').archetype

test('opening elite follows the approved rank-two durability and physical defense budget', () => {
  const archetype = ARCHETYPES.find(a => a.id === firstEliteId)
  const elite = towerEnemyStats(archetype, 1, 5)
  const normal = towerEnemyStats({ ...archetype, role: 'normal' }, 1, 5)
  assert.equal(archetype.rank, 2)
  close(elite.hp, normal.hp * 4)
  close(elite.damage, normal.damage * 1.7)
  const resolved = mitigateMonsterDamage(elite, 0, { physical: 100, magic: 0 })
  close(resolved.physical, 100 * 500 / (500 + elite.physicalDefense))
  assert.equal(resolved.magic, 0)
})

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`)
}

test('opening minor elite has no floor or player-equipment scaling', () => {
  const boar = ARCHETYPES.find(a => a.id === firstEliteId)
  const baseline = towerEnemyStats({ ...boar, role: 'normal' }, 1, 20)
  const expected = towerEnemyStats(boar, 1, 5)
  assert.ok(Math.abs(expected.hp / baseline.hp - MONSTER_RANK_BASELINE.elite_hp_multiplier_by_rank[boar.rank]) < 1e-10)
  assert.ok(Math.abs(expected.damage / baseline.damage - MONSTER_RANK_BASELINE.elite_damage_multiplier) < 1e-10)
  const state = new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state
  const starter = combatLoadout(state)
  const definition = WEAPONS.find(d => d.tier === 'ling' && d.role === 'master')
  const weapon = createFixedWeapon(definition.id, 'high-level-fixture')
  const advanced = { ...starter, weapon, weaponId: weapon.id, weaponQuality: weapon.quality, weaponRefine: 0 }
  for (const [xp, loadout] of [[0, starter], [cultivationLevelXp(30), advanced]]) {
    for (const floor of [1, 4, 9]) {
      const run = new TowerRun({ attemptId: 1, floor, seed: 101, xp, hp: 100, loadout })
      const e = run._enemy({ id: 'authored-elite', archetype: boar.id, x: 100, y: 0 })
      assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key=>[key,e[key]])), expected)
    }
  }
})

test('fresh character defeats the first elite with a conserved damage ledger', t => {
  const state = new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state
  for (const seed of [101, 211, 307]) {
    const run = new TowerRun({ attemptId: 1, floor: 1, seed, xp: 0, hp: 100, loadout: combatLoadout(state), arenaVersion: 1 })
    let totalDamage = 0, firstHp = null, firstHit = null
    const sources = new Set()
    const original = run._damageEnemy.bind(run)
    run._damageEnemy = hit => {
      const enemy = run.state.enemies.find(e => e.id === hit.target && e.archetype === firstEliteId && e.hp > 0)
      if (!enemy) return original(hit)
      const before = enemy.hp
      firstHp ??= before
      firstHit ??= run.state.time
      original(hit)
      const loss = before - enemy.hp
      assert.ok(Number.isFinite(loss) && loss >= 0)
      totalDamage += loss
      if (loss > 0) sources.add(hit.source)
    }
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
    // 79-monster-rank-role-and-equipment.md supersedes the old 20–40s target.
    // The 300s loop cap is only a watchdog against a stalled simulation.
    assert.ok(firstHit >= started && dead >= firstHit)
    close(totalDamage, firstHp)
    assert.ok(sources.has('basic_attack'))
    assert.ok(sources.has('sj_arc'))
    assert.ok(run.state.player.hp > 0)
    t.diagnostic(`seed ${seed}: visible-to-kill ${(dead-started).toFixed(3)}s`)
  }
})
