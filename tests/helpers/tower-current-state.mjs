import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY } from '../../js/xianxia/TowerCampaign.js'
import { checksum } from '../../js/xianxia/Checksum.js'
import { currentCampaignSchema } from './tower-schema.mjs'

// No grants or repairs: callers must supply a complete, legal current state.
export function assertCurrentCampaign(store, expected) {
  assert.equal(store.readOnly, false, store.error)
  assert.equal(store.error, '')
  assert.equal(store.migrationReport, null, 'current fixtures must not be reset')
  assert.deepEqual(store.state, expected, 'the Store must retain the exact fixture')
  return store
}

// Exercise the same transaction on an independent writable disk before fault
// injection. This prevents an earlier gate from masking the save-failure check.
export function assertActionSucceeds(state, action, nowMs = 0) {
  const data = JSON.stringify(state)
  let raw = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema,
    data, checksum: checksum(data) })
  let writes = 0
  const disk = {
    getItem(key) { assert.equal(key, TOWER_CAMPAIGN_KEY); return raw },
    setItem(key, value) { assert.equal(key, TOWER_CAMPAIGN_KEY); raw = value; writes++ },
  }
  const control = assertCurrentCampaign(new TowerCampaignStore(disk, nowMs), state)
  const result = control.act(action, nowMs)
  assert.equal(result.ok, true, `positive control ${JSON.stringify(action.type)}: ${result.reason}`)
  assert.equal(writes, 1)
  assertCurrentCampaign(new TowerCampaignStore(disk, nowMs), control.state)
  return result
}
