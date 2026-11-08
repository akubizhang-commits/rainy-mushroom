import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun } from '../js/xianxia/TowerRun.js'

function fixture(floor, archetype, distance = 60) {
  const run = new TowerRun({ attemptId: 1, floor, seed: 123, hp: 100, xp: 0,
    loadout: { active: { sj_yujian: 1 }, passive: {}, evolutions: [],
      weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 } })
  run.state.player.x = 33
  run.state.player.y = -60
  const e = run._enemy({ id: 'cadence', archetype, x: 33 + distance, y: -60 })
  e.moveSpeed = 0
  run.state.enemies = [e]
  return { run, e }
}

test('early normal enemies get longer ordinary cooldowns; normal skills use the 15/10 second rule', () => {
  for (const [floor, multiplier] of [[1, 2.5], [2, 2], [3, 1.5], [4, 1], [9, 1]]) {
    for (const [id, distance] of [['boar_normal', 60], ['boar_normal', 200],
      ['wolf_normal', 60], ['spider_normal', 60], ['bear_normal', 60],
      ['snake_normal', 200], ['centipede_normal', 60]]) {
      const { run, e } = fixture(floor, id, distance)
      // 83号：出生4秒内只有普通攻击。
      const early = run._attackSpec(e)
      if (early) assert.equal(early.kind, 'bite', `${floor}/${id} before the first skill delay`)
      e.ai.cooldowns = {}
      const base = run._baseAttackSpec(e)
      const actual = run._attackSpec(e)
      assert.ok(base, `${floor}/${id}`)
      const expected = base.kind === 'bite' ? e.attackInterval : floor <= 3 ? 15 : 10
      assert.deepEqual(actual, { ...base, cooldown: expected })
      const interval = { snake: 2.8, bear: 1.8, centipede: 1.6 }[e.family] ?? 1.2
      assert.ok(Math.abs(e.attackInterval - interval * multiplier) < 1e-9, `${floor}/${id} interval`)
    }
  }
})

test('elite and boss ordinary attacks retain their cadence', () => {
  for (const floor of [1, 2, 3, 4]) {
    for (const role of ['elite', 'boss']) {
      const { run, e } = fixture(floor, `wolf_${role}`)
      assert.deepEqual(run._attackSpec(e), run._baseAttackSpec(e))
    }
  }
})

test('first-floor wolf bites at most seven times and uses its skill at most twice in thirty seconds', () => {
  const { run, e } = fixture(1, 'wolf_normal')
  let cooldownChecked = false
  const starts = { bite: 0, sweep: 0 }
  let last = 0
  for (let frame = 1; frame <= 1800; frame++) {
    run.state.time = frame / 60
    run._enemyActions([], { ...run.state.player })
    run._requestAttacks()
    if (e.ai.sequence > last) { last = e.ai.sequence; starts[e.ai.attack.kind]++ }
    if (e.ai.mode === 'approach' && e.ai.cooldowns.bite > run.state.time
      && (e.ai.cooldowns.sweep ?? 0) > run.state.time) {
      // JSON round trips must retain the absolute deadline, not restart an attack.
      const copy = JSON.parse(JSON.stringify(e))
      assert.equal(run._attackSpec(copy), null)
      cooldownChecked = true
    }
  }
  assert.ok(cooldownChecked)
  assert.ok(starts.bite >= 5 && starts.bite <= 7, `bites: ${starts.bite}`)
  assert.ok(starts.sweep >= 1 && starts.sweep <= 2, `skills: ${starts.sweep}`)
})
