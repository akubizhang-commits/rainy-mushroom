import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { checksum } from '../js/xianxia/Checksum.js'

const NOW = 1_800_000_000_000
const SEED = 123
const copy = value => JSON.parse(JSON.stringify(value))
const startAction = { type: 'startFloor', floor: 1, seed: SEED }

function storage(raw = null) {
  return {
    raw, fail: false, writes: 0,
    getItem(key) { assert.equal(key, TOWER_CAMPAIGN_KEY); return this.raw },
    setItem(key, value) {
      assert.equal(key, TOWER_CAMPAIGN_KEY)
      if (this.fail) throw Error('disk unavailable')
      this.raw = value
      this.writes++
    },
  }
}

function fresh() {
  const disk = storage(), store = new TowerCampaignStore(disk, NOW)
  assert.equal(store.act({ type: 'sync' }, NOW).ok, true)
  return { disk, store }
}

function options(state, extra = {}) {
  return {
    attemptId: state.activeRun?.id ?? state.attemptSequence + 1,
    floor: state.activeRun?.floor ?? 1, seed: SEED,
    hp: state.hp, xp: state.xp, normalCoreCounter: state.normalCoreCounter,
    loadout: combatLoadout(state), ...extra,
  }
}

function start(store) {
  const result = store.act(startAction, NOW)
  assert.equal(result.ok, true, result.reason)
  assert.equal(validateTowerSnapshot(result.snapshot), true)
  assert.equal(result.snapshot.arenaVersion, 1)
  return result.snapshot
}

function oldRectangleSave(lootVersion = 1) {
  const { disk, store: initial } = fresh(), state = copy(initial.state)
  state.cores = 20
  delete state.spiritStones
  // A real version-zero Run supplies the old geometry, wave plan and loot
  // format. Do not create a "legacy" fixture by deleting a new Run's marker.
  const run = new TowerRun(options(state, { arenaVersion: 0, lootVersion }))
  run.pause()
  const snapshot = run.snapshot()
  assert.equal(Object.hasOwn(snapshot, 'arenaVersion'), false)
  assert.equal(validateTowerSnapshot(snapshot), true)
  state.attemptSequence = snapshot.attemptId
  state.activeRun = {
    id: snapshot.attemptId, floor: snapshot.floor,
    base: {
      xp: state.xp, cores: state.cores, contribution: state.contribution,
      normalCoreCounter: state.normalCoreCounter, tutorialWaves: state.tutorialWaves,
    },
    snapshot,
  }
  const data = JSON.stringify(state)
  disk.raw = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema: 3, data, checksum: checksum(data) })
  disk.writes = 0
  return { disk, snapshot }
}

function rejected(store, disk, action, reason) {
  const state = store.state, raw = disk.raw, writes = disk.writes, candidate = copy(action)
  assert.deepEqual(store.act(action, NOW), { ok: false, reason })
  assert.strictEqual(store.state, state, 'failed action publishes no replacement state')
  assert.equal(disk.raw, raw, 'failed action preserves the stored envelope')
  assert.equal(disk.writes, writes)
  assert.deepEqual(action, candidate, 'the supplied snapshot is read-only input')
}

function reload(disk, expected) {
  const raw = disk.raw, writes = disk.writes
  const store = new TowerCampaignStore(disk, NOW)
  assert.equal(store.readOnly, false, store.error)
  assert.deepEqual(store.state, expected)
  assert.equal(disk.raw, raw)
  assert.equal(disk.writes, writes, 'opening a compatible snapshot needs no migration write')
  return store
}

test('Campaign starts and reloads a hex attempt while standalone Run keeps its legacy default', () => {
  const { disk, store } = fresh()
  const defaultRun = new TowerRun(options(store.state))
  assert.equal(Object.hasOwn(defaultRun.snapshot(), 'arenaVersion'), false)
  const snapshot = start(store)
  assert.equal(snapshot.loot.version, 1)
  assert.deepEqual(store.state.activeRun.snapshot, snapshot)
  assert.equal(JSON.parse(disk.raw).schema, currentCampaignSchema, 'current campaigns use the independent-weapon-instance schema')
  const restored = reload(disk, store.state)
  assert.deepEqual(TowerRun.restore(restored.state.activeRun.snapshot).snapshot(), snapshot)
})

for (const type of ['checkpoint', 'finishFloor']) {
  test(`${type} rejects a valid rectangular replacement for a current hex attempt without writing`, () => {
    const { disk, store } = fresh()
    const current = start(store)
    const rectangular = new TowerRun(options(store.state, { arenaVersion: 0 }))
    if (type === 'finishFloor') rectangular.abandon()
    else rectangular.pause()
    const candidate = rectangular.snapshot()
    assert.equal(validateTowerSnapshot(candidate), true, 'candidate is independently valid under the legacy Run contract')
    assert.equal(Object.hasOwn(candidate, 'arenaVersion'), false)
    assert.deepEqual(candidate.loot, current.loot)
    assert.deepEqual(candidate.player, current.player)
    rejected(store, disk, { type, snapshot: candidate }, 'invalid-snapshot')

    for (const version of [undefined, 0, 2, '1', null, true]) {
      const altered = copy(current)
      if (version === undefined) delete altered.arenaVersion
      else altered.arenaVersion = version
      if (type === 'finishFloor') altered.phase = 'abandoned'
      rejected(store, disk, { type, snapshot: altered }, 'invalid-snapshot')
    }
    reload(disk, store.state)
  })

}

for (const lootVersion of [0, 1]) {
  test(`old rectangle with loot version ${lootVersion} resets before a fresh hex attempt`, () => {
    const { disk, snapshot } = oldRectangleSave(lootVersion)
    const store = new TowerCampaignStore(disk, NOW)
    assert.equal(store.readOnly, false, store.error)
    assert.deepEqual(store.state, new TowerCampaignStore(storage(), NOW).state)
    assert.deepEqual(store.migrationReport, { reset: true, fromSchema: 3 })
    assert.equal(disk.writes, 1)
    rejected(store, disk, { type: 'checkpoint', snapshot }, 'wrong-attempt')
    const terminal = TowerRun.restore(snapshot)
    terminal.abandon()
    rejected(store, disk, { type: 'finishFloor', snapshot: terminal.snapshot() }, 'wrong-attempt')
    const restored = reload(disk, store.state)
    assert.equal(restored.migrationReport, null)
    const next = start(restored)
    assert.equal(next.attemptId, 1)
    assert.equal(next.arenaVersion, 1)
    assert.equal(next.loot.version, 1)
    assert.equal(next.player.hp, 100)
    assert.equal(next.player.xp, 0)
    reload(disk, restored.state)
  })
}

test('failed start and retry create the same hex shape, loot plan and player as one successful transaction', () => {
  const { disk, store } = fresh()
  const controlDisk = storage(disk.raw), control = new TowerCampaignStore(controlDisk, NOW)
  const expected = start(control)
  disk.fail = true
  rejected(store, disk, startAction, 'save-failed')
  assert.equal(store.state.attemptSequence, 0)
  assert.equal(store.state.activeRun, null)
  disk.fail = false
  const actual = start(store)
  assert.deepEqual(actual, expected, 'retry cannot reroll shape, seed, spawns or player state')
  assert.deepEqual(store.state, control.state)
  assert.equal(disk.raw, controlDisk.raw)
  reload(disk, store.state)
})

for (const type of ['checkpoint', 'finishFloor']) {
  test(`failed hex ${type} preserves shape, loot and player until the same snapshot retries successfully`, () => {
    const { disk, store } = fresh()
    const initial = start(store), run = TowerRun.restore(initial)
    run.setInput(-0.5, 0.5)
    run.advance(0.5)
    if (type === 'finishFloor') run.abandon()
    else run.pause()
    const candidate = run.snapshot(), action = { type, snapshot: candidate }
    assert.equal(candidate.arenaVersion, 1)
    assert.equal(validateTowerSnapshot(candidate), true)
    assert.notDeepEqual(candidate.player, initial.player, 'checkpoint contains actual movement')
    assert.deepEqual(candidate.loot, initial.loot)
    const controlDisk = storage(disk.raw), control = new TowerCampaignStore(controlDisk, NOW)
    const expected = control.act(action, NOW)
    assert.equal(expected.ok, true, expected.reason)
    disk.fail = true
    rejected(store, disk, action, 'save-failed')
    assert.deepEqual(store.state.activeRun.snapshot, initial)
    assert.deepEqual(run.snapshot(), candidate)
    reload(disk, store.state)
    disk.fail = false
    assert.deepEqual(store.act(action, NOW), expected)
    assert.deepEqual(store.state, control.state)
    assert.equal(disk.raw, controlDisk.raw)
    assert.deepEqual(run.snapshot(), candidate, 'commit does not mutate the host Run or its snapshot')
    reload(disk, store.state)
  })
}
