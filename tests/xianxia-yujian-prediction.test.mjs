import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun } from '../js/xianxia/TowerRun.js'
import { createFixedWeapon } from '../js/xianxia/TowerWeapons.js'
import { createFixedEquipment } from '../js/xianxia/TowerEquipment.js'
import { cultivationLevelXp } from '../js/xianxia/TowerProfile.js'

function fixture(ringId = 'eq_ring_wenpo') {
  const weapon = createFixedWeapon('eq_sword_panxi', 'prediction-weapon')
  const ring = createFixedEquipment(ringId, 'prediction-ring')
  const run = new TowerRun({ attemptId: 1, floor: 1, seed: 419,
    xp: cultivationLevelXp(30), hp: 100,
    loadout: { growthVersion: 1, active: { sj_yujian: 1 },
      passive: { sj_bone: 2 }, evolutions: [], evolutionLevels: {}, tutorialWaves: 0,
      weapon, weaponId: weapon.id, weaponQuality: weapon.quality, weaponRefine: 0,
      weaponFocusCount: 0, ring, ringId: ring.id } })
  for (let i = 0; i < 120 && !run.state.enemies.length; i++) run.advance(1 / 60)
  const target = run.state.enemies[0]
  assert.ok(target)
  target.hp = target.maxHp = 1e6
  run._random = () => .99 // Isolate the deterministic, non-critical receipt.
  const context = { loadout: structuredClone(run.state.loadout), xp: run.state.player.xp }
  const hit = { target: target.id, damage: 100, source: 'sj_yujian', direct: true, castContext: context }
  const hp = target.hp
  run._damageEnemy(hit)
  return { run, target, hit, actual: hp - target.hp }
}

test('御剑在途预测包含戒指功法伤害，与非暴击直接结算一致', () => {
  for (const ring of ['eq_ring_wenmai', 'eq_ring_wenpo', 'eq_ring_dingwei']) {
    const { run, target, hit, actual } = fixture(ring)
    assert.ok(Math.abs(run._yujianDamage(target, hit.damage, hit.castContext.loadout) - actual) < 1e-7, ring)
  }
})

test('戒指加成足以击杀时，本帧及在途飞剑不会留下虚假的剩余生命', () => {
  const { run, target, hit, actual } = fixture()
  target.hp = actual - .01
  run.state.projectiles = []
  assert.ok(run._yujianUnreservedHp(target, [hit]) < 0)
  run.state.projectiles = [{ targetId: target.id, damage: hit.damage, castContext: hit.castContext,
    yujianSlot: 0, dissolveAt: null, expiresAt: run.state.time + 1, hitIds: [] }]
  assert.ok(run._yujianUnreservedHp(target) < 0)
  // An expired shot must not reserve damage.
  run.state.projectiles[0].expiresAt = run.state.time
  assert.equal(run._yujianUnreservedHp(target), target.hp)
})

test('御剑预测使用发射时戒指，且不提前承诺暴击', () => {
  const { run, target, hit, actual } = fixture('eq_ring_huyuan')
  run.state.loadout.ring = createFixedEquipment('eq_ring_dingwei', 'later-ring')
  assert.ok(Math.abs(run._yujianDamage(target, hit.damage, hit.castContext.loadout) - actual) < 1e-7)
  run._random = () => 0
  const hp = target.hp
  run._damageEnemy(hit)
  assert.ok(hp - target.hp > actual)
})
