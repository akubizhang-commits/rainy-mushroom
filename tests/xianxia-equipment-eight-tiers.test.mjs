import test from 'node:test'
import assert from 'node:assert/strict'
import { WEAPONS, createIronWeapon, rollWeapon, validateWeapon, weaponName } from '../js/xianxia/TowerWeapons.js'
import { EQUIPMENT, createBasicEquipment, rollEquipment, validateEquipment } from '../js/xianxia/TowerEquipment.js'

test('all starter equipment belongs to fan tier with explicit starter identity', () => {
  for (const item of [createIronWeapon(), createBasicEquipment('armor'), createBasicEquipment('ring')]) {
    assert.equal(item.tier, 'fan')
    assert.equal(item.quality, 0)
  }
  assert.match(weaponName(createIronWeapon()), /凡器/)
})

test('every open tier and quality has valid deterministic equipment without buying new art', () => {
  const seen = new Set()
  for (const tier of ['fan', 'fa', 'bao', 'ling']) for (const quality of (tier === 'fan' ? [1] : [1, 2, 3, 4])) {
    for (const n of [0, .18, .36, .54, .72, .9, .999]) {
      const w = rollWeapon(tier, quality, () => n, 'weapon-1')
      assert.ok(validateWeapon(w))
      assert.equal(w.tier, tier); assert.equal(w.quality, quality)
      seen.add(w.definitionId)
      for (const category of ['armor', 'ring']) {
        const item = rollEquipment(category, tier, quality, () => n, 'gear-1')
        assert.ok(validateEquipment(item))
        assert.equal(item.tier, tier); assert.equal(item.quality, quality)
        seen.add(item.definitionId)
      }
    }
  }
  assert.equal(WEAPONS.length, 36)
  assert.equal(EQUIPMENT.length, 52)
  assert.equal(seen.size, 84)
})

test('unknown, retired and future tiers cannot be rolled or forged into valid instances', () => {
  for (const tier of ['huang', 'xuan', 'fabao', 'lingbao', 'xian', 'shen', 'no-tier']) {
    assert.throws(() => rollWeapon(tier, 1, () => 0, 'weapon-1'))
    assert.throws(() => rollEquipment('ring', tier, 1, () => 0, 'gear-1'))
  }
  const w = rollWeapon('fan', 1, () => 0, 'weapon-1')
  assert.equal(validateWeapon({ ...w, tier: 'ling' }), false)
  assert.equal(validateWeapon({ ...w, quality: 0 }), false)
})
