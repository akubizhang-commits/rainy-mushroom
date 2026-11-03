import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'
import { checksum } from '../js/xianxia/Checksum.js'
import { inventoryQuote } from '../js/xianxia/TowerInventory.js'
import { cultivationPillAllowance } from '../js/xianxia/TowerPills.js'

function fixture(clearedFloor) {
  const disk = { raw: null, getItem() { return this.raw }, setItem(k, v) { this.raw = v } }
  const base = new TowerCampaignStore(disk, 0)
  base.act({ type: 'sync' }, 0)
  const env = JSON.parse(disk.raw)
  env.data = JSON.stringify({ ...base.state, clearedFloor, pills: {
    ...base.state.pills, ningqi: 1, peiyuan: 1,
    yusuizhi: 10, lingshenxu: 10, linglu: 10, huangjing: 10, ningluzhi: 10,
  } })
  env.checksum = checksum(env.data)
  disk.raw = JSON.stringify(env)
  return { disk, store: new TowerCampaignStore(disk, 0) }
}

test('before first clear, stock confirmation and owned pills cannot bypass the opening gate', () => {
  for (const id of ['ningqi', 'peiyuan']) {
    const { disk, store } = fixture(0)
    assert.equal(cultivationPillAllowance(store.state).purchasable, 0)
    for (const action of [
      { type: 'buyPill', id, count: 1, confirmed: true },
      { type: 'craftPill', id, count: 1, confirmed: true, sequence: 1, requestId: id },
      { type: 'usePill', id, confirmed: true },
    ]) {
      const before = store.state, raw = disk.raw
      assert.equal(store.act(action, 0).reason, action.type === 'buyPill' && id === 'ningqi'
        ? 'craft-only' : 'cultivation-floor-locked')
      assert.equal(store.state, before)
      assert.equal(disk.raw, raw)
    }
    assert.match(inventoryQuote(store.state, id, 'use').reason, /通关.*第1层/)
    assert.equal(store.act({ type: 'buyPill', id: 'huichun', count: 1 }, 0).ok, true)
    assert.equal(store.act({ type: 'buyPill', id: 'zhuji', count: 1 }, 0).ok, true)
  }
})

test('first clear and reload unlock purchase, crafting and use with the same six-dose limit', () => {
  const { disk, store } = fixture(1)
  assert.equal(cultivationPillAllowance(store.state).purchasable, 6)
  assert.equal(store.act({ type: 'buyPill', id: 'ningqi', count: 1 }, 0).reason, 'craft-only')
  assert.equal(store.act({ type: 'buyPill', id: 'peiyuan', count: 1 }, 0).ok, true)
  assert.equal(store.act({ type: 'craftPill', id: 'ningqi', count: 1, sequence: 1, requestId: 'unlock' }, 0).ok, true)
  const reloaded = new TowerCampaignStore(disk, 0)
  assert.equal(reloaded.act({ type: 'usePill', id: 'ningqi' }, 0).gained, 90)
  assert.equal(reloaded.state.cultivationPillUses.炼气, 1)
})
