import test from 'node:test'
import assert from 'node:assert/strict'
import { CORE_DROP_RULES } from '../js/xianxia/TowerLoot.js'

test('high-rank normal and elite authored encounters are eligible for graded loot', () => {
  for (const [floor, role, rank] of [[6,'normal',4],[8,'normal',5],[9,'normal',4],[9,'normal',5],[6,'elite',5],[9,'elite',6]]) {
    const p = CORE_DROP_RULES[floor].chancesByRole[role][rank]
    assert.ok(p > 0 && p < 1, `${floor}/${role}/${rank} cannot silently lose rewards`)
  }
})
