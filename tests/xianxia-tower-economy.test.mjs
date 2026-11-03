import test from 'node:test'
import assert from 'node:assert/strict'
import { STONE_VALUES, STONE_CAP, splitSpiritStones, formatSpiritStones,
  legacyRewardToStones, stoneLootFromLegacy, demonEssenceXp } from '../js/xianxia/TowerEconomy.js'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'
import { TowerRun } from '../js/xianxia/TowerRun.js'
import {pendingCoreValue} from '../js/xianxia/TowerPickups.js'
import { checksum } from '../js/xianxia/Checksum.js'

test('all four denominations round-trip exactly and automatic change needs no exchange transaction', () => {
  for (const amount of [0, 1, 99, 100, 101, 9999, 10000, 1000000, STONE_CAP]) {
    const split = splitSpiritStones(amount)
    assert.equal(split.reduce((sum, n, i) => sum + n * STONE_VALUES[i], 0), amount)
    assert.ok(split.slice(0, 3).every(n => n >= 0 && n < 100))
  }
  assert.equal(formatSpiritStones(100 - 30), '70下品')
  assert.equal(formatSpiritStones(1_010_101), '1极品 1上品 1中品 1下品')
  for (const bad of [-1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => splitSpiritStones(bad))
  }
})

test('legacy reward receipts become valued stone bundles, not seven grades of wallet currency', () => {
  const summary = stoneLootFromLegacy({ byRank: [1, 1, 1, 1, 1, 1, 1] })
  assert.equal(summary.value, legacyRewardToStones(1 + 6 + 24 + 30 + 36 + 42 + 48))
  assert.equal(summary.byGrade.length, 4)
  assert.equal(summary.count, summary.byGrade.reduce((a, b) => a + b, 0))
  assert.equal(summary.value, summary.byGrade.reduce((a, b, i) => a + b * STONE_VALUES[i], 0))
})

test('essence budgets are stable per rank and role, never tenfold grade compounding', () => {
  for (let rank = 1; rank <= 9; rank++) {
    assert.equal(demonEssenceXp(rank, 'normal'), rank)
    assert.equal(demonEssenceXp(rank, 'elite'), rank * 5)
    assert.equal(demonEssenceXp(rank, 'boss'), rank * 10)
  }
  assert.throws(() => demonEssenceXp(0, 'normal'))
  assert.throws(() => demonEssenceXp(1, 'unknown'))
})

test('new wallet can hold non-round lower-grade amounts and spending preserves the change', () => {
  let raw
  const disk = { getItem: () => raw ?? null, setItem: (_, value) => { raw = value } }
  const initial = new TowerCampaignStore(disk, 0)
  initial.act({ type: 'sync' }, 0)
  const envelope = JSON.parse(raw), state = JSON.parse(envelope.data)
  state.spiritStones = 29
  envelope.data = JSON.stringify(state); envelope.checksum = checksum(envelope.data)
  raw = JSON.stringify(envelope)
  const store = new TowerCampaignStore(disk, 0)
  assert.equal(store.readOnly, false)
  assert.equal(store.act({ type: 'buyGear', id: 'weapon:fan:q1', count: 1, sequence: 1, requestId: 'wallet-buy-1' }, 0).ok, true)
  assert.equal(store.state.spiritStones, 5)
  const before = store.state, record = raw
  assert.equal(store.act({ type: 'buyGear', id: 'weapon:fan:q1', count: 1, sequence: 2, requestId: 'wallet-buy-2' }, 0).reason, 'insufficient')
  assert.strictEqual(store.state, before)
  assert.equal(raw, record)
})

test('real kill checkpoint translates stones once without converting wallet balance into XP', () => {
  let raw
  const disk = { getItem: () => raw ?? null, setItem: (_, value) => { raw = value } }
  const store = new TowerCampaignStore(disk, 0)
  const started = store.act({ type: 'startFloor', floor: 1, seed: 42 }, 0)
  const run = TowerRun.restore(started.snapshot)
  for (let i = 0; i < 200 && run.state.killLedger.length < 10; i++) {
    for (const enemy of run.state.enemies) enemy.hp = 0
    run.advance(.1)
  }
  run.pause()
  assert.ok(run.state.killLedger.length > 0)
  const snapshot = run.snapshot()
  assert.equal(store.act({ type: 'checkpoint', snapshot }, 0).ok, true)
  assert.equal(store.state.spiritStones, 500 + (snapshot.earned.cores-pendingCoreValue(snapshot)) * 10)
  assert.equal(store.state.xp, snapshot.earned.xp)
  const before = structuredClone(store.state)
  assert.equal(store.act({ type: 'checkpoint', snapshot }, 0).ok, true)
  assert.deepEqual(store.state, before)
  const reloaded = new TowerCampaignStore(disk, 0)
  assert.equal(reloaded.readOnly, false)
  assert.deepEqual(reloaded.state, before)
})
