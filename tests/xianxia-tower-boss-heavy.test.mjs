import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun } from '../js/xianxia/TowerRun.js'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { enemyAttackSpec } from '../js/xianxia/TowerEnemyAttacks.js'

// Exercise the Run selector with runtime-created enemies. This is a selector
// unit fixture, not a fabricated snapshot claimed to be valid for a floor.
// Native attack geometry is covered here; the new mechanic scheduler has its own integration suite.
function fixture(floor, family, role, distance) {
  const run = new TowerRun({ attemptId: 1, floor, seed: 123, hp: 100, xp: 0,
    normalCoreCounter: 0, arenaVersion: 1,
    loadout: { active: { sj_wanjian: 1 }, passive: {}, evolutions: [],
      weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 } })
  const enemy = run._enemy({ id: 'selector-fixture', archetype: `${family}_${role}`,
    x: run.state.player.x + distance, y: run.state.player.y })
  return { run, enemy }
}

// Expected classes are explicit design cases, not a copy of Run's predicate.
const cases = [
  ['boar', 180, 'charge', true],
  ['bear', 60, 'slam', true],
  ['ape', 60, 'slam', true],
  ['tiger', 60, 'sweep', true],
  ['crocodile', 60, 'sweep', true],
  ['boar', 60, 'bite', false],
  ['wolf', 60, 'bite', false],
  ['centipede', 60, 'sweep', false],
  ['snake', 250, 'shot', false],
  ['falcon', 250, 'shot', false],
  ['bat', 250, 'shot', false],
  ['scorpion', 250, 'shot', false],
  ['spider', 250, 'web', false],
]

for (const [floor, light, heavy] of [[2, 16.1645, 25.861], [9, 127.127, 203.401]]) {
  for (const [family, distance, kind, isHeavy] of cases) {
    test(`floor ${floor} boss ${family} ${kind} uses ${isHeavy ? 'heavy' : 'light'} damage without changing attack timing`, () => {
      const { run, enemy } = fixture(floor, family, 'boss', distance)
      const before = structuredClone(enemy)
      const original = enemyAttackSpec(enemy, distance, run.state.time, enemy.ai.cooldowns)
      const spec = run._baseAttackSpec(enemy)
      assert.equal(spec.kind, kind)
      assert.equal(spec.damage, isHeavy ? heavy : light)
      assert.equal(enemy.damage, light, 'base damage must stay light for other actions')
      assert.deepEqual(spec, { ...original, damage: isHeavy ? heavy : light },
        'only damage may change; geometry, windup, recovery and cooldown must survive')
      assert.deepEqual(enemy, before, 'selection must not mutate enemy or cooldowns')
      enemy.ai.cooldowns[kind] = run.state.time + 10
      assert.equal(run._baseAttackSpec(enemy), null, 'heavy override must preserve unavailable-action null')
    })
  }
}

for (const role of ['normal', 'elite']) {
  for (const [family, distance, kind] of cases.filter(c => c[3])) {
    test(`${role} ${family} ${kind} retains role damage even with a heavy action kind`, () => {
      const { run, enemy } = fixture(2, family, role, distance)
      const spec = run._baseAttackSpec(enemy)
      assert.equal(spec.kind, kind)
      assert.equal(spec.damage, towerEnemyStats(ARCHETYPES.find(a => a.id === enemy.archetype), 2).damage)
      assert.deepEqual(spec, enemyAttackSpec(enemy, distance, run.state.time, enemy.ai.cooldowns))
    })
  }
}

test('first-floor authored boss charge and gore keep absolute damage and phase-two segment semantics', () => {
  const { run, enemy } = fixture(1, 'boar', 'boss', 180)
  assert.equal(run._baseAttackSpec(enemy).damage, 14.928)
  enemy.ai.phase = 2
  const charge = run._baseAttackSpec(enemy)
  assert.equal(charge.kind, 'charge')
  assert.equal(charge.segments, 2)
  assert.equal(charge.damage, 14.928, 'each segment retains single-hit damage')
  enemy.x = run.state.player.x + 60
  const gore = run._baseAttackSpec(enemy)
  assert.equal(gore.kind, 'gore')
  assert.equal(gore.damage, 9.332)
})
