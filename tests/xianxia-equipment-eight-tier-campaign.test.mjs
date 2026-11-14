import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { rollWeapon } from '../js/xianxia/TowerWeapons.js'
import { rollEquipment } from '../js/xianxia/TowerEquipment.js'
import { checksum } from '../js/xianxia/Checksum.js'
import { inventoryEntries, inventoryDetail, inventoryQuote } from '../js/xianxia/TowerInventory.js'

import { cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
import { FORGE_MATERIALS } from '../js/xianxia/TowerForgeMaterials.js'
const now = 1800000000000
function fixture(level) {
  const records = new Map([['unrelated', 'preserve']])
  const disk = { fail: false, getItem: key => records.get(key) ?? null,
    setItem(key, value) { if (this.fail) throw Error('disk-full'); records.set(key, value) } }
  const initial = new TowerCampaignStore(disk, now)
  assert.ok(initial.act({ type: 'sync' }, now).ok)
  const record = JSON.parse(records.get(TOWER_CAMPAIGN_KEY)), state = JSON.parse(record.data)
  state.xp = cultivationLevelXp(level)
  Object.assign(state.pills, Object.fromEntries(Object.keys(FORGE_MATERIALS).map(id => [id, 10000])))
  state.spiritStones = 10000; state.contribution = 10000
  record.data = JSON.stringify(state); record.checksum = checksum(record.data)
  records.set(TOWER_CAMPAIGN_KEY, JSON.stringify(record))
  return { disk, records, store: new TowerCampaignStore(disk, now) }
}
for (const [tier, minLevel] of [['fan', 1], ['fa', 4], ['bao', 11], ['ling', 21]]) {
  for (const level of [...new Set([Math.max(1, minLevel - 1), minLevel, 27])]) {
    test(`${tier} forging and reload enforce minimum level at ${level}`, () => {
      const { store, disk, records } = fixture(level)
      const before = JSON.stringify(store.state)
      const r = store.act({ type: tier === 'fan' ? 'buyGear' : 'craftGear', id: `weapon:${tier}:q1`, count: 1, sequence: 1, requestId: 'realm' }, now)
      assert.equal(r.ok, level >= minLevel, r.reason)
      if (!r.ok) { assert.equal(JSON.stringify(store.state), before); return }
      const item = store.state.weapons[r.ids[0]]
      assert.equal(item.tier, tier)
      const result = store.act({ type: 'setLoadout', index: 0,
        loadout: { ...store.state.loadouts[0], weaponId: item.id } }, now)
      assert.ok(result.ok, result.reason)
      const loaded = new TowerCampaignStore(disk, now)
      assert.equal(loaded.state.loadouts[0].weaponId, item.id)
      assert.equal(records.get('unrelated'), 'preserve')
      assert.match(inventoryDetail(loaded.state, inventoryEntries(loaded.state).find(row => row.id === item.id)).rank,
        new RegExp({ fan: '凡器', fa: '法器', bao: '宝器', ling: '灵器' }[tier]))
    })
  }
}
test('all entry points reject unmet tiers even for valid held equipment', () => {
  for (const [tier, level] of [['bao', 10], ['ling', 20]]) {
    const { disk, records } = fixture(level)
    const record = JSON.parse(records.get(TOWER_CAMPAIGN_KEY)), state = JSON.parse(record.data)
    const weapon = rollWeapon(tier, 4, () => 0, 'weapon-1')
    state.weapons[weapon.id] = weapon; state.weaponSequence = 1; state.weaponCounters[weapon.id] = 0
    for (const [i, category] of ['armor', 'ring'].entries()) {
      const item = rollEquipment(category, tier, 4, () => 0, `gear-${i + 1}`)
      state.equipment[item.id] = item
      state.equipmentDraws[category] = 1
      if (category === 'ring') state.equipmentCounters[item.id] = 0
    }
    state.equipmentSequence = 2
    record.data = JSON.stringify(state); record.checksum = checksum(record.data)
    records.set(TOWER_CAMPAIGN_KEY, JSON.stringify(record))
    const store = new TowerCampaignStore(disk, now), before = JSON.stringify(store.state)
    assert.ok(store.state.weapons['weapon-1'], 'held equipment remains legal before equip level')
    for (const [key, id] of [['weaponId', 'weapon-1'], ['armorId', 'gear-1'], ['ringId', 'gear-2']]) {
      assert.equal(inventoryQuote(store.state, id, 'equip').ok, false)
      assert.equal(store.act({ type: 'setLoadout', index: 0, loadout: { ...store.state.loadouts[0], [key]: id } }, now).ok, false)
    }
    assert.equal(store.act({ type: 'equipEquipment', category: 'ring', id: 'gear-2' }, now).ok, false)
    assert.equal(JSON.stringify(store.state), before)
  }
})
test('failed ten-item forge restores balances, RNG, wishes and inventory in every tier', () => {
  for (const tier of ['fan', 'fa', 'bao', 'ling']) {
    const { store, disk, records } = fixture(27)
    const before = JSON.stringify(store.state), saved = records.get(TOWER_CAMPAIGN_KEY)
    disk.fail = true
    assert.equal(store.act({ type: tier === 'fan' ? 'buyGear' : 'craftGear', id: `armor:${tier}:q1`, count: 10, sequence: 1, requestId: 'atomic' }, now).reason, 'save-failed')
    assert.equal(JSON.stringify(store.state), before)
    assert.equal(records.get(TOWER_CAMPAIGN_KEY), saved)
  }
})
test('starter fan equipment stays protected while ordinary fan can be sold', () => {
  const { store } = fixture(1)
  assert.equal(inventoryQuote(store.state, 'iron', 'sell').ok, false)
  assert.equal(inventoryQuote(store.state, 'basic-armor', 'sell').ok, false)
  const r = store.act({ type: 'buyGear', id: 'weapon:fan:q1', count: 1, sequence: 1, requestId: 'starter' }, now)
  assert.ok(r.ok)
  assert.ok(store.act({ type: 'sellGear', ids: [r.ids[0]] }, now).ok)
})

test('direct runs and restored snapshots cannot bypass equipment realm requirements', () => {
  const { store } = fixture(1)
  for (const [tier, minXp] of [['bao', cultivationLevelXp(11)], ['ling', cultivationLevelXp(21)]]) {
    const state = structuredClone(store.state), item = rollWeapon(tier, 1, () => 0, 'weapon-1')
    state.weapons[item.id] = item; state.loadouts[0].weaponId = item.id
    const loadout = combatLoadout(state)
    assert.throws(() => new TowerRun({ attemptId: 1, floor: 1, xp: 0, hp: 100, loadout }))
    const run = new TowerRun({ attemptId: 1, floor: 1, xp: minXp, hp: 100, loadout })
    assert.ok(validateTowerSnapshot(run.snapshot()))
    const forged = run.snapshot(); forged.player.xp = 0
    assert.equal(validateTowerSnapshot(forged), false)
  }
})

for (const level of [1, 2, 3]) test(`held fa gear equips atomically and reloads at level ${level}`, () => {
  const { disk, records } = fixture(level)
  const record = JSON.parse(records.get(TOWER_CAMPAIGN_KEY)), state = JSON.parse(record.data)
  const weapon = rollWeapon('fa', 2, () => 0, 'weapon-1')
  state.weapons[weapon.id] = weapon; state.weaponSequence = 1; state.weaponCounters[weapon.id] = 0
  for (const [i, category] of ['armor', 'ring'].entries()) {
    const item = rollEquipment(category, 'fa', 2, () => 0, `gear-${i + 1}`)
    state.equipment[item.id] = item; state.equipmentDraws[category] = 1
    if (category === 'ring') state.equipmentCounters[item.id] = 0
  }
  state.equipmentSequence = 2
  record.data = JSON.stringify(state); record.checksum = checksum(record.data)
  records.set(TOWER_CAMPAIGN_KEY, JSON.stringify(record))
  const store = new TowerCampaignStore(disk, now)
  for (const id of ['weapon-1', 'gear-1', 'gear-2']) {
    const quote = inventoryQuote(store.state, id, 'equip')
    assert.ok(quote.ok, quote.reason)
    const before = JSON.stringify(store.state), saved = records.get(TOWER_CAMPAIGN_KEY)
    disk.fail = true
    assert.equal(store.act(quote.action, now).reason, 'save-failed')
    assert.equal(JSON.stringify(store.state), before)
    assert.equal(records.get(TOWER_CAMPAIGN_KEY), saved)
    disk.fail = false
    assert.ok(store.act(quote.action, now).ok)
  }
  const loaded = new TowerCampaignStore(disk, now)
  assert.deepEqual(loaded.state.loadouts, store.state.loadouts)
  assert.equal(loaded.state.loadouts[0].weaponId, 'weapon-1')
  assert.equal(loaded.state.loadouts[0].armorId, 'gear-1')
  assert.equal(loaded.state.loadouts[0].ringId, 'gear-2')
  assert.equal(records.get('unrelated'), 'preserve')
  const run = new TowerRun({ attemptId: 1, floor: 1, xp: loaded.state.xp, hp: 100, loadout: combatLoadout(loaded.state) })
  assert.ok(validateTowerSnapshot(run.snapshot()))
})
