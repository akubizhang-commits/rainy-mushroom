import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY } from '../js/xianxia/TowerCampaign.js'
import { rollEquipment, armorModifiers } from '../js/xianxia/TowerEquipment.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { checksum } from '../js/xianxia/Checksum.js'

// Exercise the Campaign trust boundary with real Run snapshots. Standalone
// validation deliberately permits some helper-built states; Campaign must also
// check their history against its last committed checkpoint.
const NOW = 1_800_000_000_000
const STEP = 1 / 60
const copy = value => JSON.parse(JSON.stringify(value))
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)

function fixture() {
  const records = new Map(), writes = []
  const disk = {
    getItem: key => records.get(key) ?? null,
    setItem(key, value) { writes.push({ key, value }); records.set(key, value) },
  }
  const fresh = new TowerCampaignStore(disk, NOW), state = copy(fresh.state)
  state.equipment['gear-1'] = rollEquipment('armor', 'fa', 4, () => 1 - Number.EPSILON, 'gear-1')
  state.equipment['gear-2'] = rollEquipment('ring', 'fa', 4, () => 1 - Number.EPSILON, 'gear-2')
  state.xp = 225
  state.equipmentSequence = 2
  state.equipmentDraws = { armor: 1, ring: 1 }
  state.equipmentPity = { armor: 0, ring: 0 }
  state.equipmentCounters['gear-2'] = 0
  state.loadouts[0].armorId = 'gear-1'
  state.loadouts[0].ringId = 'gear-2'
  const data = JSON.stringify(state)
  records.set(TOWER_CAMPAIGN_KEY, JSON.stringify({
    format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data, checksum: checksum(data),
  }))
  const store = new TowerCampaignStore(disk, NOW)
  assert.equal(store.readOnly, false, store.error)
  const entered = store.act({ type: 'startFloor', floor: 1, seed: 123 }, NOW)
  assert.equal(entered.ok, true, entered.reason)
  return { store, disk, records, writes, run: TowerRun.restore(entered.snapshot) }
}

function accept(store, snapshot, type = 'checkpoint') {
  assert.equal(validateTowerSnapshot(snapshot), true, 'real snapshot must remain structurally valid')
  const result = store.act({ type, snapshot }, NOW)
  assert.equal(result.ok, true, result.reason)
  return result
}

function reject(f, snapshot, type = 'checkpoint') {
  assert.equal(validateTowerSnapshot(snapshot), true,
    'this regression must reach Campaign history checks, not fail standalone shape validation')
  const before = f.store.state, records = new Map(f.records), writes = f.writes.length
  const input = copy(snapshot)
  const result = f.store.act({ type, snapshot }, NOW)
  assert.equal(result.ok, false, `Campaign accepted forged ${type} history`)
  assert.equal(typeof result.reason, 'string')
  assert.strictEqual(f.store.state, before, 'rejection cannot publish a new state')
  assert.deepEqual(f.records, records, 'rejection cannot change storage')
  assert.equal(f.writes.length, writes, 'rejection cannot attempt a save')
  assert.deepEqual(snapshot, input, 'rejection cannot rewrite its caller snapshot')
}

function incoming(run) {
  // Only the incoming projectile is a fixture. Actual loss, delayed recovery,
  // cooldown, effects and counters are produced by the normal combat tick.
  run.state.projectiles.push({
    id: 'history-test-hit', x: run.state.player.x, y: run.state.player.y,
    vx: 0, vy: 0, radius: 10, damage: 10, hostile: true,
    hitIds: [], expiresAt: run.state.time + 1,
  })
  run.advance(STEP)
  assert.equal(run.state.armorState.triggerCount, 1)
  assert.ok(run.state.armorState.pending)
}

function healedFixture() {
  const f = fixture()
  const entryArmor = copy(f.run.state.armorState)
  incoming(f.run)
  f.run.advance(2.1)
  f.run.pause()
  const snapshot = f.run.snapshot()
  close(snapshot.armorState.healedTotal, entryArmor.entryMaxHp * armorModifiers(f.run.state.loadout.armor).healFraction)
  assert.equal(snapshot.armorState.pending, null)
  assert.equal(snapshot.armorState.triggerCount, 1)
  accept(f.store, snapshot)
  return { ...f, snapshot, entryArmor }
}

for (const type of ['checkpoint', 'finishFloor']) {
  test(`armor entry-state rollback at unchanged time/HP is rejected by ${type}`, () => {
    const f = healedFixture(), forged = copy(f.snapshot)
    forged.armorState = f.entryArmor
    if (type === 'finishFloor') forged.phase = 'abandoned'
    assert.equal(forged.time, f.snapshot.time)
    assert.equal(forged.player.hp, f.snapshot.player.hp)
    reject(f, forged, type)
  })
}

test('a later tick cannot reset armor recovery total, trigger history or cooldown', () => {
  const f = healedFixture()
  f.run.resume(); f.run.advance(STEP); f.run.pause()
  const later = f.run.snapshot()
  assert.ok(later.ticks > f.snapshot.ticks)
  for (const change of [
    s => { s.armorState = copy(f.entryArmor) },
    s => { s.armorState.healedTotal = 0 },
    s => {
      // Still a valid standalone one-trigger history, but older than the
      // committed trigger at 1/60s and its corresponding 20s cooldown.
      s.armorState.lastTriggerAt = 0
      s.armorState.cooldownUntil = 20
    },
  ]) {
    const forged = copy(later); change(forged)
    reject(f, forged)
  }
  accept(f.store, later, 'checkpoint')
})

for (const type of ['checkpoint', 'finishFloor']) {
  test(`zero-time four-cast focus fabrication is rejected by ${type}`, () => {
    const f = fixture(), forged = f.run.snapshot()
    assert.equal(forged.time, 0)
    assert.equal(forged.weaponState.casts.length, 0)
    Object.assign(forged.weaponState, { effectiveCasts: 4, nextCastId: 5, focusCount: 4 })
    if (type === 'finishFloor') forged.phase = 'abandoned'
    reject(f, forged, type)
    assert.equal(f.store.state.equipmentCounters['gear-2'], 0)
  })
}

test('one elapsed tick cannot hide four fabricated casts behind a later timestamp', () => {
  const f = fixture()
  f.run.advance(STEP); f.run.pause()
  const forged = f.run.snapshot()
  assert.equal(forged.ticks, 1)
  assert.equal(Object.keys(forged.loadout.active).length, 1)
  assert.equal(forged.weaponState.casts.length, 0)
  Object.assign(forged.weaponState, { effectiveCasts: 4, nextCastId: 5, focusCount: 4 })
  reject(f, forged)
  accept(f.store, f.run.snapshot())
})

test('real ring progress cannot roll back after its projectiles have expired', () => {
  const f = fixture()
  for (let i = 0; i < 900 && f.run.state.weaponState.effectiveCasts === 0; i++) {
    for (const e of f.run.state.enemies) {
      e.x = f.run.state.player.x + 60; e.y = f.run.state.player.y
      e.ai.graceUntil = 99999
    }
    f.run.advance(STEP)
  }
  assert.ok(f.run.state.weaponState.effectiveCasts > 0, 'must land a real cast')
  // Stop new casts and allow the real projectile/receipt lifetime to finish.
  for (const id of Object.keys(f.run.state.cooldowns)) f.run.state.cooldowns[id] = 99999
  for (let i = 0; i < 300 && f.run.state.weaponState.casts.length; i++) {
    for (const e of f.run.state.enemies) e.ai.graceUntil = 99999
    f.run.advance(STEP)
  }
  assert.equal(f.run.state.weaponState.casts.length, 0)
  f.run.pause()
  const committed = f.run.snapshot()
  accept(f.store, committed)
  f.run.resume(); f.run.advance(STEP); f.run.pause()
  const later = f.run.snapshot()
  for (const resetIds of [false, true]) {
    const forged = copy(later)
    forged.weaponState.effectiveCasts = 0
    forged.weaponState.focusCount = forged.loadout.weaponFocusCount
    if (resetIds) forged.weaponState.nextCastId = 1
    reject(f, forged)
  }
  accept(f.store, later)
})

test('normal pending-heal reload and repeated checkpoints do not duplicate recovery', () => {
  const f = fixture()
  incoming(f.run); f.run.pause()
  const pending = f.run.snapshot(), expected = pending.armorState.pending.amount
  const hpBefore = pending.player.hp
  accept(f.store, pending)
  accept(f.store, copy(pending))
  const loaded = new TowerCampaignStore(f.disk, NOW)
  assert.equal(loaded.readOnly, false, loaded.error)
  assert.deepEqual(loaded.state.activeRun.snapshot, pending)
  const replay = TowerRun.restore(loaded.state.activeRun.snapshot)
  replay.resume(); replay.advance(2.1); replay.pause()
  const healed = replay.snapshot()
  close(healed.player.hp - hpBefore, expected)
  close(healed.armorState.healedTotal, expected)
  assert.equal(healed.armorState.triggerCount, 1)
  assert.equal(healed.armorState.pending, null)
  accept(loaded, healed)
  accept(loaded, copy(healed))
  replay.resume(); replay.advance(STEP); replay.pause()
  close(replay.state.player.hp, healed.player.hp)
  close(replay.state.armorState.healedTotal, expected)
  accept(loaded, replay.snapshot())
  replay.abandon()
  accept(loaded, replay.snapshot(), 'finishFloor')
  const records = new Map(f.records), writes = f.writes.length
  assert.equal(loaded.act({ type: 'finishFloor', snapshot: replay.snapshot() }, NOW).ok, false)
  assert.equal(f.writes.length, writes)
  assert.deepEqual(f.records, records)
})
