import { NORMAL_HP_BY_FLOOR, NORMAL_DAMAGE_BY_FLOOR } from '../js/xianxia/TowerEnemyStats.js' // 2026-11-09：普通怪按楼层加血降伤，精英不受影响
import test from 'node:test'
import assert from 'node:assert/strict'
import { MONSTER_RANK_BASELINE, ARCHETYPES, FLOORS } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'

test('floor-four authored elites keep minor-elite multipliers across the retired wave-ten discount boundary', () => {
  const ids = new Set(FLOORS[3].waves.flatMap(w => w.enemy_groups.map(g => g.archetype)))
  const elites = ARCHETYPES.filter(a => a.role === 'elite' && ids.has(a.id))
  assert.ok(elites.length > 0)
  for (const elite of elites) {
    const normal = towerEnemyStats({ ...elite, role: 'normal' }, 4, 20)
    const expected = towerEnemyStats(elite, 4, 20)
    assert.ok(Math.abs(expected.hp / normal.hp * NORMAL_HP_BY_FLOOR[3] - MONSTER_RANK_BASELINE.elite_hp_multiplier_by_rank[elite.rank]) < 1e-10)
    assert.ok(Math.abs(expected.damage / normal.damage * NORMAL_DAMAGE_BY_FLOOR[3] - MONSTER_RANK_BASELINE.elite_damage_multiplier) < 1e-10)
    assert.equal(expected.moveSpeed, normal.moveSpeed)
    for (const wave of [1, 5, 10, 11, 15, 20]) assert.deepEqual(towerEnemyStats(elite, 4, wave), expected)
  }
})

test('the same authored elite does not gain stats from later floor placement', () => {
  for (const elite of ARCHETYPES.filter(a => a.role === 'elite')) {
    const expected = towerEnemyStats(elite, 1, 20)
    for (let floor = 2; floor <= 9; floor++) {const actual=towerEnemyStats(elite,floor,20);assert.deepEqual({...actual,attackInterval:expected.attackInterval},expected);if(elite.species==='spider')assert.equal(actual.attackInterval,3.2);else assert.equal(actual.attackInterval,expected.attackInterval)}
  }
})
