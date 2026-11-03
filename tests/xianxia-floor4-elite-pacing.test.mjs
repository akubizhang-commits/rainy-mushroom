import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHETYPES, FLOORS } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'

test('floor-four authored elites keep minor-elite multipliers across the retired wave-ten discount boundary', () => {
  const ids = new Set(FLOORS[3].waves.flatMap(w => w.enemy_groups.map(g => g.archetype)))
  const elites = ARCHETYPES.filter(a => a.role === 'elite' && ids.has(a.id))
  assert.ok(elites.length > 0)
  for (const elite of elites) {
    const normal = towerEnemyStats({ ...elite, role: 'normal' }, 4, 20)
    const expected = towerEnemyStats(elite, 4, 20)
    assert.ok(Math.abs(expected.hp / normal.hp - 2.5) < 1e-10)
    assert.ok(Math.abs(expected.damage / normal.damage - 1.15) < 1e-10)
    assert.equal(expected.moveSpeed, normal.moveSpeed)
    for (const wave of [1, 5, 10, 11, 15, 20]) assert.deepEqual(towerEnemyStats(elite, 4, wave), expected)
  }
})

test('the same authored elite does not gain stats from later floor placement', () => {
  for (const elite of ARCHETYPES.filter(a => a.role === 'elite')) {
    const expected = towerEnemyStats(elite, 1, 20)
    for (let floor = 2; floor <= 9; floor++) assert.deepEqual(towerEnemyStats(elite, floor, 20), expected)
  }
})
