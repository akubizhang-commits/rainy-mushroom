import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  TowerProfileStore, TOWER_PROFILE_KEY, TOWER_XP_CAP, TOWER_RESOURCE_CAP,
  CAMP_PILLS, cultivationAt,
} from '../js/xianxia/TowerProfile.js'
import { checksum } from '../js/xianxia/Checksum.js'

const MINUTE = 60000
function storage() {
  return {
    records: new Map([['xianxia.equipment-test.v1', 'legacy-unread']]),
    fail: false, writes: 0,
    getItem(key) { return this.records.get(key) ?? null },
    setItem(key, value) {
      if (this.fail) throw Error('disk unavailable')
      this.records.set(key, value)
      this.writes++
    },
  }
}
function fixture(patch = {}) {
  if (patch.skills && !patch.skillsInitialized) patch = { ...patch, skills: { sj_arc: 1, ...patch.skills } }
  const disk = storage()
  const initial = new TowerProfileStore(disk, 0)
  const state = { ...JSON.parse(JSON.stringify(initial.state)), ...patch,
    pills: { ...initial.state.pills, ...patch.pills } }
  const data = JSON.stringify(state)
  disk.records.set(TOWER_PROFILE_KEY, JSON.stringify({
    format: 'xianxia-sect-tower-profile', schema: 5, data, checksum: checksum(data),
  }))
  return { disk, store: new TowerProfileStore(disk, 0) }
}
function reject(store, disk, action, reason, now = 0) {
  const state = store.state
  const raw = disk.records.get(TOWER_PROFILE_KEY)
  const writes = disk.writes
  assert.deepEqual(store.act(action, now), { ok: false, reason })
  assert.strictEqual(store.state, state)
  assert.equal(disk.records.get(TOWER_PROFILE_KEY), raw)
  assert.equal(disk.writes, writes)
}

test('profile and medicine stay aligned with the approved generated economy', () => {
  const spec = JSON.parse(readFileSync(new URL(
    '../docs/xianxia/sect-tower-v1/data/economy-v2.json', import.meta.url,
  ), 'utf8'))
  assert.equal(spec.cultivation_cap.max_xp, TOWER_XP_CAP)
  assert.equal(spec.storage_cap, TOWER_RESOURCE_CAP)
  assert.equal(CAMP_PILLS.huichun.price, spec.supplies['回春丹'].cost)
  assert.equal(CAMP_PILLS.huichun.healShare, spec.supplies['回春丹'].heal_max_hp_fraction)
  assert.equal(CAMP_PILLS.peiyuan.price, spec.supplies['培元丹'].cost)
  assert.equal(CAMP_PILLS.peiyuan.xp, spec.supplies['培元丹'].cultivation)
  const { store } = fixture({ hp: spec.health_rules.death_return_hp })
  assert.deepEqual(store.state.skills, spec.starter.learned)
  assert.equal(store.state.cores, spec.starter.core_units)
  // This retained standalone Profile adapter predates the Campaign wallet; it
  // retains its independent 300-credit contract and storage key.
  assert.equal(store.state.contribution, 300)
  assert.equal(store.state.pills.huichun, spec.starter.supplies['回春丹'])
  const healed = store.act({ type: 'sync' }, MINUTE).hp - spec.health_rules.death_return_hp
  assert.equal(healed, 100 * spec.health_rules.out_of_combat_regen_max_hp_fraction_per_minute)
})

test('new mode starts once with its own resources and three healing pills', () => {
  const disk = storage()
  const store = new TowerProfileStore(disk, 123)
  assert.equal(store.state.contribution, 300)
  assert.equal(store.state.cores, 20)
  assert.deepEqual(store.state.skills, { sj_yujian: 1 })
  assert.deepEqual(store.state.pills, Object.fromEntries(
    Object.keys(CAMP_PILLS).map(id => [id, id === 'huichun' ? 3 : 0])))
  assert.equal(store.state.hp, 100)
  assert.equal(store.act({ type: 'buyPill', id: 'huichun', count: 1 }, 123).cost, 5)
  const reload = new TowerProfileStore(disk, 123)
  assert.equal(reload.state.pills.huichun, 4)
  assert.equal(reload.state.contribution, 295)
  assert.equal(disk.records.get('xianxia.equipment-test.v1'), 'legacy-unread')
  assert.throws(() => { reload.state.pills.huichun = 99 }, TypeError)
})

test('cultivation boundaries retain 30 levels with separate compounded attack and HP growth', () => {
  assert.equal(cultivationAt(44).level, 1)
  assert.equal(cultivationAt(45).level, 2)
  assert.equal(cultivationAt(10919).level, 26)
  assert.equal(cultivationAt(10920).level, 27)
  assert.equal(cultivationAt(10920).capped, false)
  assert.deepEqual(cultivationAt(14400), {
    level: 30, realm: '金丹', layer: 10, consummated: true, breakthroughReady: false,
    xpStart: 13485, xpEnd: 14400, maxHp: 100 * 1.08 ** 27 * 1.35 ** 2,
    attackMultiplier: 1.08 ** 27 * 1.35 ** 2, capped: true,
  })
  for (const xp of [-1, 14401, NaN, Infinity, 1.5]) assert.throws(() => cultivationAt(xp))
})

test('offline camp healing is 1% max HP per minute, capped and persisted once', () => {
  const { store, disk } = fixture({ xp: TOWER_XP_CAP, hp: 1 })
  const maxHp = 100 * 1.08 ** 27 * 1.35 ** 2
  assert.equal(store.act({ type: 'sync' }, MINUTE).hp, 1 + maxHp * .01)
  const reload = new TowerProfileStore(disk, MINUTE)
  assert.equal(reload.act({ type: 'sync' }, MINUTE).hp, 1 + maxHp * .01)
  assert.ok(Math.abs(reload.act({ type: 'sync' }, 2 * MINUTE).hp - (1 + maxHp * .02)) < 1e-10)
  assert.equal(reload.act({ type: 'sync' }, 200 * MINUTE).hp, maxHp)
})

test('high-realm medicine uses the new HP ceiling and preserves atomic save and reload behavior', () => {
  const maxHp = 100 * 1.08 ** 27 * 1.35 ** 2
  const { store, disk } = fixture({ xp: TOWER_XP_CAP, hp: 100 })
  assert.equal(store.readOnly, false)
  disk.fail = true
  reject(store, disk, { type: 'usePill', id: 'huichun' }, 'save-failed')
  disk.fail = false
  assert.equal(store.act({ type: 'usePill', id: 'huichun' }, 0).healed, maxHp / 2)
  assert.equal(store.state.hp, 100 + maxHp / 2)
  const reload = new TowerProfileStore(disk, 0)
  assert.deepEqual(reload.state, store.state)
  assert.ok(reload.act({ type: 'usePill', id: 'huichun' }, 0).ok)
  assert.equal(reload.state.hp, maxHp)
  reject(reload, disk, { type: 'usePill', id: 'huichun' }, 'full-health')
  assert.equal(new TowerProfileStore(disk, 0).state.hp, maxHp)
})

test('backwards time and time at full HP cannot be banked for later healing', () => {
  const { store } = fixture({ hp: 50 })
  assert.equal(store.act({ type: 'sync' }, 10 * MINUTE).hp, 60)
  assert.equal(store.act({ type: 'sync' }, 5 * MINUTE).hp, 60)
  assert.equal(store.act({ type: 'sync' }, 10 * MINUTE).hp, 60)
  assert.equal(store.act({ type: 'sync' }, 11 * MINUTE).hp, 61)
  store.act({ type: 'sync' }, 500 * MINUTE)
  const start = store.act({ type: 'beginAttempt' }, 500 * MINUTE)
  store.act({ type: 'finishAttempt', attemptId: start.attemptId, hp: 10, outcome: 'withdrawn' }, 500 * MINUTE)
  assert.equal(store.act({ type: 'sync' }, 501 * MINUTE).hp, 11)
})

test('entry, withdrawal and next attempt inherit HP rather than restore it', () => {
  const { store } = fixture({ hp: 42 })
  const first = store.act({ type: 'beginAttempt' }, 0)
  assert.equal(first.hp, 42)
  assert.equal(store.act({ type: 'sync' }, 100 * MINUTE).hp, 42)
  assert.equal(store.act({
    type: 'finishAttempt', attemptId: first.attemptId, hp: 7, outcome: 'cleared',
  }, 100 * MINUTE).hp, 7)
  const second = store.act({ type: 'beginAttempt' }, 100 * MINUTE)
  assert.equal(second.hp, 7)
  assert.equal(second.attemptId, first.attemptId + 1)
})

test('a living character below 1 HP keeps that fractional health on withdrawal', () => {
  const { store, disk } = fixture()
  const start = store.act({ type: 'beginAttempt' }, 0)
  assert.equal(store.act({
    type: 'finishAttempt', attemptId: start.attemptId, hp: 0.25, outcome: 'withdrawn',
  }, 0).hp, 0.25)
  assert.equal(new TowerProfileStore(disk, 0).state.hp, 0.25)
})

test('death wakes in camp at 1 HP, no battle/offline time contributes healing', () => {
  const { store, disk } = fixture({ hp: 70 })
  const attempt = store.act({ type: 'beginAttempt' }, 0)
  const reload = new TowerProfileStore(disk, 10 * MINUTE)
  assert.equal(reload.act({ type: 'sync' }, 10 * MINUTE).hp, 70)
  assert.equal(reload.act({
    type: 'finishAttempt', attemptId: attempt.attemptId, hp: 0, outcome: 'dead',
  }, 10 * MINUTE).hp, 1)
  assert.equal(reload.act({ type: 'sync' }, 11 * MINUTE).hp, 2)
  reject(reload, disk, {
    type: 'finishAttempt', attemptId: attempt.attemptId, hp: 0, outcome: 'dead',
  }, 'wrong-attempt', 11 * MINUTE)
})

test('battle rejects medicine purchase, usage and a second start, even after reload', () => {
  const { store, disk } = fixture({ hp: 5 })
  store.act({ type: 'beginAttempt' }, 0)
  const reload = new TowerProfileStore(disk, MINUTE)
  reject(reload, disk, { type: 'usePill', id: 'huichun' }, 'in-tower', MINUTE)
  reject(reload, disk, { type: 'buyPill', id: 'peiyuan', count: 1 }, 'in-tower', MINUTE)
  reject(reload, disk, { type: 'beginAttempt' }, 'in-tower', MINUTE)
})

test('legacy profile medicine preserves healing, contribution prices and clamped effects', () => {
  const { store, disk } = fixture({ hp: 30 })
  assert.equal(CAMP_PILLS.huichun.price, 5)
  assert.equal(CAMP_PILLS.peiyuan.price, 20)
  assert.equal(store.act({ type: 'usePill', id: 'huichun' }, 0).healed, 50)
  assert.equal(store.state.hp, 80)
  assert.equal(store.act({ type: 'usePill', id: 'huichun' }, 0).healed, 20)
  reject(store, disk, { type: 'usePill', id: 'huichun' }, 'full-health')
  assert.equal(store.state.pills.huichun, 1)
  assert.equal(store.act({ type: 'buyPill', id: 'peiyuan', count: 2 }, 0).cost, 40)
  const xp = store.act({ type: 'usePill', id: 'peiyuan' }, 0)
  assert.equal(xp.gained, 50)
  assert.equal(xp.cultivation.level, 2)
  assert.equal(store.state.hp, 100, 'raising max HP does not refill health')
  assert.ok(cultivationAt(store.state.xp).maxHp > 100)
})

test('cultivation pill stops at 金丹圆满, does not bank overflow or consume at cap', () => {
  const { store, disk } = fixture({
    xp: 14399, hp: 50, pills: { zhuji: 0, huichun: 3, peiyuan: 2 },
  })
  assert.equal(store.act({ type: 'usePill', id: 'peiyuan' }, 0).gained, 1)
  assert.equal(store.state.xp, 14400)
  assert.equal(store.state.hp, 50)
  assert.equal(store.state.pills.peiyuan, 1)
  reject(store, disk, { type: 'usePill', id: 'peiyuan' }, 'cultivation-capped')
})

test('bad item IDs/counts, missing pills and insufficient funds never mutate', () => {
  const { store, disk } = fixture({ contribution: 0 })
  for (const id of ['__proto__', 'constructor', '凝神丹', 'huashen']) {
    reject(store, disk, { type: 'usePill', id }, 'unknown-pill')
  }
  for (const count of [0, -1, 1.1, 100, '1', NaN]) {
    reject(store, disk, { type: 'buyPill', id: 'huichun', count }, 'invalid-count')
  }
  reject(store, disk, { type: 'buyPill', id: 'huichun', count: 1 }, 'insufficient')
  reject(store, disk, { type: 'usePill', id: 'peiyuan' }, 'no-pill')
  reject(store, disk, { type: 'exchange', quality: 'gold' }, 'unknown-action')
  reject(store, disk, { type: 'usePill', id: 'huichun' }, 'invalid-action', -1)
})

test('inventory capacity is all-or-nothing', () => {
  const { store, disk } = fixture({ pills: { zhuji: 0, huichun: TOWER_RESOURCE_CAP, peiyuan: 0 } })
  reject(store, disk, { type: 'buyPill', id: 'huichun', count: 1 }, 'capacity')
})

test('save failure does not debit, consume, heal or advance the healing timestamp', () => {
  const { store, disk } = fixture({ hp: 10 })
  disk.fail = true
  reject(store, disk, { type: 'buyPill', id: 'peiyuan', count: 1 }, 'save-failed', MINUTE)
  reject(store, disk, { type: 'usePill', id: 'huichun' }, 'save-failed', MINUTE)
  assert.equal(store.error, 'save-failed')
  disk.fail = false
  assert.equal(store.act({ type: 'usePill', id: 'huichun' }, MINUTE).healed, 50)
  assert.equal(store.state.hp, 61)
  assert.equal(store.state.pills.huichun, 2)
  assert.equal(store.state.restAt, MINUTE)
  assert.equal(store.error, '')
})

test('finish failure can retry once, but wrong attempt or contradictory HP is rejected', () => {
  const { store, disk } = fixture()
  const start = store.act({ type: 'beginAttempt' }, 0)
  for (const result of [
    { hp: 1, outcome: 'dead' }, { hp: 0, outcome: 'cleared' },
    { hp: 101, outcome: 'withdrawn' }, { hp: NaN, outcome: 'dead' },
  ]) reject(store, disk, { type: 'finishAttempt', attemptId: start.attemptId, ...result }, 'invalid-result')
  const end = { type: 'finishAttempt', attemptId: start.attemptId, hp: 0, outcome: 'dead' }
  disk.fail = true
  reject(store, disk, end, 'save-failed', MINUTE)
  disk.fail = false
  assert.equal(store.act(end, MINUTE).hp, 1)
  reject(store, disk, end, 'wrong-attempt', MINUTE)
})

test('corrupt, unknown-schema and unavailable saves cannot be overwritten', () => {
  for (const raw of [
    '{',
    JSON.stringify({ format: 'xianxia-sect-tower-profile', schema: 2 }),
    JSON.stringify({ format: 'xianxia-sect-tower-profile', schema: 1, data: '{}', checksum: 'bad' }),
  ]) {
    const disk = storage()
    disk.records.set(TOWER_PROFILE_KEY, raw)
    const store = new TowerProfileStore(disk, 0)
    assert.equal(store.readOnly, true)
    reject(store, disk, { type: 'sync' }, store.error)
  }
  const disk = storage()
  disk.getItem = () => { throw Error('unavailable') }
  const store = new TowerProfileStore(disk, 0)
  assert.equal(store.error, 'unreadable')
  assert.equal(store.readOnly, true)
})

test('invalid checksummed state is rejected, not silently reset or repaired', () => {
  for (const patch of [
    { hp: 0 }, { hp: 121 }, { xp: 14401 }, { contribution: -1 },
    { pills: { zhuji: 0, huichun: 1, peiyuan: 0, attack: 1 } },
    { activeAttempt: { id: 4, startedAt: 0 } },
  ]) {
    const { store } = fixture(patch)
    assert.equal(store.readOnly, true)
    assert.equal(store.error, 'corrupt')
  }
})
