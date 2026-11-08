import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TowerCampaignStore, TOWER_CAMPAIGN_KEY, WEAPONS, combatLoadout,
} from '../js/xianxia/TowerCampaign.js'
import { createIronWeapon, rollWeapon } from '../js/xianxia/TowerWeapons.js'
import { TowerRun, validateTowerSnapshot, stats as combatStats } from '../js/xianxia/TowerRun.js'
import { TOWER_XP_CAP, TOWER_RESOURCE_CAP, freshPills } from '../js/xianxia/TowerProfile.js'
import { checksum } from '../js/xianxia/Checksum.js'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { CORE_DROP_RULES, CORE_RANK_VALUES } from '../js/xianxia/TowerLoot.js'
import { FORGE_MATERIALS } from '../js/xianxia/TowerForgeMaterials.js'
import { forgingRecipe, dismantleStoneRefund } from '../js/xianxia/TowerForging.js'

const STONE_VALUES = [1, 100, 10000, 1000000]
function stoneLoot(snapshot) {
  const byGrade = [0, 0, 0, 0]
  for (const [index, count] of coreLoot(snapshot).byRank.entries()) {
    let value = CORE_RANK_VALUES[index + 1] * 10
    for (let grade = 3; grade >= 0; grade--) {
      byGrade[grade] += Math.floor(value / STONE_VALUES[grade]) * count
      value %= STONE_VALUES[grade]
    }
  }
  return { byGrade, count: byGrade.reduce((a, b) => a + b, 0),
    value: byGrade.reduce((sum, count, grade) => sum + count * STONE_VALUES[grade], 0) }
}

const MINUTE = 60000
const SWORD = 'iron'
const DRAWN_SWORD = 'weapon-1'
function weaponPatch(quality = 4, refine = 0, tier = 'fa') {
  const weapon = rollWeapon(tier, quality, () => 0, DRAWN_SWORD)
  weapon.refine = refine
  return { weapons: { iron: createIronWeapon(), [DRAWN_SWORD]: weapon },
    weaponCounters: { iron: 0, [DRAWN_SWORD]: 0 }, weaponSequence: 1 }
}
const copy = value => JSON.parse(JSON.stringify(value))
function coreLoot(snapshot) {
  const byRank = [0, 0, 0, 0, 0, 0, 0]
  assert.equal(snapshot.loot.version, 1)
  for (const kill of snapshot.killLedger) {
    assert.ok(kill.coreRank === 0 || kill.coreRank === ARCHETYPES.find(a => a.id === kill.archetype).rank)
    if (kill.coreRank) byRank[kill.coreRank - 1]++
  }
  return {
    byRank, count: byRank.reduce((sum, count) => sum + count, 0),
    value: byRank.reduce((sum, count, index) => sum + count * CORE_RANK_VALUES[index + 1], 0),
  }
}
function storage() {
  return {
    records: new Map([['xianxia.sect-tower.profile.v1', 'legacy-unread']]),
    fail: false, writes: 0,
    getItem(key) { return this.records.get(key) ?? null },
    setItem(key, value) {
      if (this.fail) throw Error('disk unavailable')
      this.records.set(key, value)
      this.writes++
    },
  }
}
function saveState(disk, state) {
  const data = JSON.stringify(state)
  disk.records.set(TOWER_CAMPAIGN_KEY, JSON.stringify({
    format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data, checksum: checksum(data),
  }))
}
function fixture(patch = {}) {
  if (patch.skills && !patch.skillsInitialized) patch = { ...patch, skills: { sj_arc: 1, ...patch.skills } }
  const disk = storage()
  const initial = new TowerCampaignStore(disk, 0)
  const state = { ...copy(initial.state), ...patch, pills: { ...initial.state.pills, ...patch.pills } }
  if (!patch.skills) { state.skillsInitialized = true; state.skills = { sj_arc: 1 } }
  // Missing inventory can represent dismantled draws; miss history still needs
  // matching lifetime totals. Raw-save corruption tests bypass this helper.
  if (Number.isSafeInteger(state.weaponPity) && state.weaponPity > 0) {
    state.weaponSequence = Math.max(state.weaponSequence, state.weaponPity)
  }
  state.equipmentDraws = { ...state.equipmentDraws }
  for (const category of ['armor', 'ring']) {
    const misses = state.equipmentPity?.[category]
    if (Number.isSafeInteger(misses) && misses > 0) {
      state.equipmentDraws[category] = Math.max(state.equipmentDraws[category], misses)
    }
  }
  const totalEquipmentDraws = state.equipmentDraws.armor + state.equipmentDraws.ring
  if (Number.isSafeInteger(totalEquipmentDraws)) {
    state.equipmentSequence = Math.max(state.equipmentSequence, totalEquipmentDraws)
  }
  saveState(disk, state)
  return { disk, store: new TowerCampaignStore(disk, 0) }
}
function reject(store, disk, action, reason, now = 0, details = {}) {
  const before = store.state
  const raw = disk.records.get(TOWER_CAMPAIGN_KEY)
  const writes = disk.writes
  assert.deepEqual(store.act(action, now), { ok: false, reason, ...details })
  assert.strictEqual(store.state, before)
  assert.equal(disk.records.get(TOWER_CAMPAIGN_KEY), raw)
  assert.equal(disk.writes, writes)
}
function start(store, floor = 1, now = 0) {
  const result = store.act({ type: 'startFloor', floor, seed: 7 }, now)
  assert.equal(result.ok, true, result.reason)
  assert.equal(validateTowerSnapshot(result.snapshot), true)
  return result.snapshot
}
// Controlled positioning and enemy HP exercise real kills/reward ledgers. This
// isolates persistence from survival/balance; it does not fabricate wallet data.
function report(snapshot, { phase = 'playing', kills = 0, hp = 42 } = {}) {
  const run = TowerRun.restore(snapshot)
  run.resume()
  run.advance(1 / 30)
  for (let frame = 0; frame < 100000 && ['playing','paused'].includes(run.state.phase)
    && (phase === 'won' || run.state.killLedger.length < kills); frame++) {
    run.resume() // Reward fixture deliberately continues without breakthrough.
    run.state.player.hp = run.state.player.maxHp
    for (const enemy of run.state.enemies) {
      enemy.hp = 1
      enemy.x = run.state.player.x + 60
      enemy.y = run.state.player.y
      enemy.ai.graceUntil = run.state.time + 10
    }
    run.advance(1 / 30)
  }
  if (phase === 'won') assert.equal(run.state.phase, 'won', `floor ${snapshot.floor} must actually clear`)
  else assert.equal(run.state.killLedger.length, kills)
  run.state.player.hp = phase === 'lost' ? 0 : hp
  if (phase === 'lost') run.advance(1 / 30)
  if (phase === 'abandoned') run.abandon()
  const result = run.snapshot()
  assert.equal(validateTowerSnapshot(result), true, 'test report must obey the Run schema')
  return result
}

test('fresh campaign is isolated, immutable and grants starter gifts only once', () => {
  const disk = storage()
  const store = new TowerCampaignStore(disk, 123)
  assert.deepEqual([store.state.xp, store.state.hp, store.state.spiritStones, store.state.contribution],
    [0, 100, 500, 1000])
  assert.deepEqual(store.state.skills, { sj_arc: 1 })
  assert.deepEqual(store.state.pills, freshPills())
  assert.deepEqual(store.state.weapons, { iron: createIronWeapon() })
  assert.equal(store.state.loadouts.length, 3)
  assert.equal(store.act({ type: 'buyPill', id: 'huichun', count: 1 }, 123).ok, true)
  const reload = new TowerCampaignStore(disk, 123)
  assert.equal(reload.state.spiritStones, 495)
  assert.equal(reload.state.pills.huichun, 4)
  assert.equal(disk.records.get('xianxia.sect-tower.profile.v1'), 'legacy-unread')
  assert.throws(() => { reload.state.pills.huichun = 99 }, TypeError)
  assert.throws(() => { reload.state = {} }, TypeError)
})

test('refinement is disabled across every weapon tier and quality', () => {
  for (const tier of ['fan', 'fa', 'bao', 'ling']) for (const quality of tier === 'fan' ? [1] : [1, 2, 3, 4]) {
    for (const contribution of [0, 1000]) {
      const { store, disk } = fixture({ ...weaponPatch(quality, 0, tier), contribution })
      for (const id of [SWORD, DRAWN_SWORD, 'weapon-999']) {
        reject(store, disk, { type: 'refineWeapon', id }, 'refinement-disabled')
      }
    }
  }
})

test('current-schema saves reject changed fixed weapon quality and nonzero refinement', () => {
  for (const mutate of [
    weapon => { weapon.quality = 1 },
    weapon => { weapon.refine = 1 },
    weapon => { weapon.affixes[0].value += .01 },
  ]) {
    const patch = weaponPatch()
    mutate(patch.weapons[DRAWN_SWORD])
    const { store } = fixture(patch)
    assert.equal(store.readOnly, true)
    assert.equal(store.error, 'corrupt')
  }
})

function forgingFixture(patch = {}) {
  const { store: initial } = fixture()
  return fixture({ xp: 225, contribution: 100000, spiritStones: 100000,
    ...patch, pills: { ...initial.state.pills,
      ...Object.fromEntries(Object.keys(FORGE_MATERIALS).map(id => [id, 10000])), ...patch.pills } })
}
const forgeAction = (quality = 1, sequence = 1, count = 1) => ({
  type: 'craftGear', id: `weapon:fa:q${quality}`, count, sequence, requestId: `forge-${sequence}`,
})

test('retired draw channels cannot charge currency or advance historical pity', () => {
  const {store,disk}=forgingFixture({weaponPity:19})
  for (const type of ['drawWeapon','drawEquipment','drawForge'])
    reject(store,disk,{type,category:'weapon',tier:'fa',count:1},'retired-forge')
  assert.equal(store.state.weaponPity,19)
})

test('duplicate fixed forgings preserve instances and refund only on explicit dismantling', () => {
  for (const quality of [1,2,3,4]) {
    const {store,disk}=forgingFixture()
    // Six products in a pool of at most three necessarily contain duplicates.
    for (const sequence of [1,2]) assert.equal(store.act(forgeAction(quality,sequence,3),0).ok,true)
    const products=Object.values(store.state.weapons).filter(w=>w.tier==='fa'&&w.quality===quality)
    const matches=products.filter(w=>w.definitionId===products.find(p=>products.filter(x=>x.definitionId===p.definitionId).length>=2).definitionId)
    assert.ok(matches.length>=2)
    const [first,second]=matches, before=copy(first), contribution=store.state.contribution, stones=store.state.spiritStones
    assert.deepEqual({...second,id:first.id},first)
    assert.notEqual(first.id,second.id)
    assert.equal(store.act({type:'dismantleWeapon',id:second.id},0).ok,true)
    assert.equal(store.state.contribution,contribution)
    assert.equal(store.state.spiritStones,stones+dismantleStoneRefund(second))
    assert.deepEqual(store.state.weapons[first.id],before)
    assert.equal(store.state.weapons[second.id],undefined)
    assert.equal(store.state.weaponCounters[second.id],undefined)
    assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
    reject(store,disk,{type:'dismantleWeapon',id:second.id},'unowned-weapon')
  }
})

test('selected forging quality cannot change and higher quality preserves old instances', () => {
  const {store}=forgingFixture()
  for (const quality of [1,2,3,4]) {
    const before=copy(store.state.weapons)
    const result=store.act(forgeAction(quality,quality),0)
    assert.equal(result.ok,true)
    const item=store.state.weapons[result.ids[0]]
    assert.equal(item.quality,quality)
    assert.equal(item.refine,0)
    assert.ok(forgingRecipe(`weapon:fa:q${quality}`).definitionIds.includes(item.definitionId))
    for (const [id,old] of Object.entries(before)) assert.deepEqual(store.state.weapons[id],old)
  }
})

test('forging atomically charges exact recipe costs and preserves RNG and wishes on save failure', () => {
  const recipe=forgingRecipe('weapon:fa:q1'), action=forgeAction()
  for (const [spiritStones,contribution] of [[0,20],[39,20],[40,0],[40,19]]) {
    const {store,disk}=forgingFixture({spiritStones,contribution})
    const before=store.state,raw=disk.records.get(TOWER_CAMPAIGN_KEY)
    assert.equal(store.act(action,0).reason,'insufficient')
    assert.equal(store.state,before);assert.equal(disk.records.get(TOWER_CAMPAIGN_KEY),raw)
  }
  const {store,disk}=forgingFixture({spiritStones:recipe.spiritStones,contribution:recipe.contribution})
  const before=store.state
  disk.fail=true;reject(store,disk,action,'save-failed');disk.fail=false
  assert.equal(store.state,before)
  const result=store.act(action,0);assert.equal(result.ok,true)
  assert.deepEqual([store.state.spiritStones,store.state.contribution],[0,0])
  assert.notEqual(store.state.forgeRng,before.forgeRng)
  assert.equal(store.act(action,0).duplicate,true)
  assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
})

test('camp healing clamps and capped cultivation never consumes inventory', () => {
  const { store, disk } = fixture({ hp: 30, clearedFloor: 2 })
  assert.equal(store.act({ type: 'usePill', id: 'huichun' }, 0).healed, 50)
  assert.equal(store.act({ type: 'usePill', id: 'huichun' }, 0).healed, 20)
  reject(store, disk, { type: 'usePill', id: 'huichun' }, 'full-health')
  assert.equal(store.state.pills.huichun, 1)
  assert.equal(store.act({ type: 'buyPill', id: 'peiyuan', count: 2 }, 0).cost, 40)
  assert.equal(store.act({ type: 'usePill', id: 'peiyuan' }, 0).gained, 50)
  assert.equal(store.state.hp, 100)
  assert.equal(store.state.xp, 50)
  for (const id of ['__proto__', 'constructor', 'attack', 'qingxin']) {
    reject(store, disk, { type: 'buyPill', id, count: 1 }, 'unknown-pill')
    reject(store, disk, { type: 'usePill', id }, 'unknown-pill')
  }
  const capped = fixture({ xp: TOWER_XP_CAP - 1, clearedFloor: 1, pills: { zhenyuan: 2 } })
  reject(capped.store, capped.disk, { type: 'usePill', id: 'zhenyuan' }, 'cultivation-overflow-confirmation', 0, { gained: 1, wasted: 159 })
  assert.equal(capped.store.act({ type: 'usePill', id: 'zhenyuan', confirmed: true }, 0).gained, 1)
  reject(capped.store, capped.disk, { type: 'usePill', id: 'zhenyuan' }, 'cultivation-capped')
  assert.equal(capped.store.state.pills.zhenyuan, 1)
})

test('offline rest is saved once, rejects backwards-clock farming and cannot bank full-health time', () => {
  const { store, disk } = fixture({ xp: TOWER_XP_CAP, hp: 1 })
  const maxHp = combatStats(store.state.xp, combatLoadout(store.state)).maxHp
  // Starter armor has no regeneration affix: twenty 3-second pulses per minute.
  const minuteHealing = maxHp / 60 * 20
  assert.equal(store.act({ type: 'sync' }, MINUTE).hp, (1 + minuteHealing))
  const reload = new TowerCampaignStore(disk, MINUTE)
  assert.equal(reload.act({ type: 'sync' }, MINUTE).hp, (1 + minuteHealing))
  assert.equal(reload.act({ type: 'sync' }, 0).hp, (1 + minuteHealing))
  assert.equal(reload.act({ type: 'sync' }, MINUTE).hp, (1 + minuteHealing))
  assert.equal(reload.act({ type: 'sync' }, 200 * MINUTE).hp, maxHp)
  const snapshot = start(reload, 1, 200 * MINUTE)
  assert.equal(reload.act({
    type: 'finishFloor', snapshot: report(snapshot, { phase: 'abandoned', hp: 10 }),
  }, 200 * MINUTE).ok, true)
  assert.equal(reload.act({ type: 'sync' }, 201 * MINUTE).hp, (10 + minuteHealing))
})

test('bad actions, funds, counts and capacities never publish a partial transaction', () => {
  const { store, disk } = fixture({ ...weaponPatch(), contribution: 0, spiritStones: 0 })
  reject(store, disk, { type: 'drawWeapon' }, 'retired-forge')
  for (const action of [
    { type: 'buyPill', id: 'huichun', count: 1 },
  ]) reject(store, disk, action, 'insufficient')
  for (const count of [0, -1, 1.5, '1', NaN, Infinity]) {
    reject(store, disk, { type: 'buyPill', id: 'huichun', count }, 'invalid-count')
  }
  reject(store, disk, { type: 'usePill', id: 'peiyuan' }, 'no-pill')
  reject(store, disk, { type: 'buyBook', id: '__proto__' }, 'unknown-skill')
  for (const type of ['exchange', 'drawBeast', 'buyTalisman']) reject(store, disk, { type }, 'unknown-action')
  reject(store, disk, null, 'invalid-action')
  reject(store, disk, { type: 'sync' }, 'invalid-action', -1)
  const full = fixture({ pills: { zhuji: 0, huichun: TOWER_RESOURCE_CAP, peiyuan: 0 } })
  reject(full.store, full.disk, { type: 'buyPill', id: 'huichun', count: 1 }, 'capacity')
})

test('every camp action publishes only after persistence, including RNG, selection and tutorial', () => {
  for (const action of [
    { type: 'sync' }, { type: 'buyPill', id: 'zhenyuan', count: 1 },
    { type: 'usePill', id: 'huichun' }, { type: 'usePill', id: 'zhenyuan' },
    { type: 'buyBook', id: 'vajra' }, { type: 'buyBook', id: 'evo_wanjian' },
    { type: 'buyGear', id: 'weapon:fan:q1', count: 1, sequence: 1, requestId: 'persistence' },
    { type: 'setLoadout', index: 1, loadout: {
      name: '备用', weaponId: SWORD, armorId: 'basic-armor', ringId: 'basic-ring', active: ['sj_yujian'], passive: [], evolutions: [],
    } },
    { type: 'selectLoadout', index: 1 }, { type: 'tutorialDone' },
    { type: 'startFloor', floor: 1, seed: 5 },
  ]) {
    const { store, disk } = fixture({
      ...weaponPatch(), xp: 10400, hp: 10, spiritStones: 10000, clearedFloor: 6, skills: { sj_yujian: 6, sj_heart: 3 },
      pills: { zhuji: 0, huichun: 3, zhenyuan: 1 },
    })
    disk.fail = true
    reject(store, disk, action, 'save-failed', MINUTE)
    assert.equal(store.error, 'save-failed')
    disk.fail = false
    assert.equal(store.act(action, MINUTE).ok, true, action.type)
    assert.equal(store.error, '')
    assert.deepEqual(new TowerCampaignStore(disk, MINUTE).state, store.state)
  }
})

test('failed forgings retry the same persisted RNG result without free rerolls', () => {
  const failing=forgingFixture({forgeRng:12345}),control=forgingFixture({forgeRng:12345})
  const action=forgeAction(1,1,3)
  failing.disk.fail=true;reject(failing.store,failing.disk,action,'save-failed');failing.disk.fail=false
  assert.deepEqual(failing.store.act(action,0),control.store.act(action,0))
  assert.deepEqual(failing.store.state,control.store.state)
})

test('a stale store cannot overwrite spending or grant the starter balance a second time', () => {
  const disk = storage()
  const first = new TowerCampaignStore(disk, 0)
  const stale = new TowerCampaignStore(disk, 0)
  assert.equal(first.act({ type: 'buyPill', id: 'huichun', count: 4 }, 0).ok, true)
  reject(stale, disk, { type: 'buyPill', id: 'huichun', count: 1 }, 'stale-save')
  assert.equal(new TowerCampaignStore(disk, 0).state.contribution, 1000)
})

test('storage callbacks cannot reenter the store before its transaction is committed', () => {
  const { store, disk } = fixture({ hp: 10 })
  const write = disk.setItem.bind(disk)
  let reentrant
  disk.setItem = (key, value) => {
    assert.equal(store.state.hp, 10)
    assert.equal(store.state.pills.huichun, 3)
    reentrant = store.act({ type: 'usePill', id: 'huichun' }, 0)
    write(key, value)
  }
  assert.equal(store.act({ type: 'usePill', id: 'huichun' }, 0).ok, true)
  assert.deepEqual(reentrant, { ok: false, reason: 'busy' })
  assert.equal(store.state.hp, 60)
  assert.equal(store.state.pills.huichun, 2)
})

test('unreadable, corrupt and newer save records stay read-only and are never replaced', () => {
  for (const [raw, reason] of [
    ['{', 'corrupt'],
    [JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema + 1 }), 'newer'],
    [JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data: '{}', checksum: 'bad' }), 'corrupt'],
  ]) {
    const disk = storage()
    disk.records.set(TOWER_CAMPAIGN_KEY, raw)
    const store = new TowerCampaignStore(disk, 0)
    assert.equal(store.readOnly, true)
    reject(store, disk, { type: 'sync' }, reason)
  }
  const disk = storage()
  disk.getItem = () => { throw Error('unavailable') }
  const store = new TowerCampaignStore(disk, 0)
  assert.equal(store.readOnly, true)
  assert.equal(store.error, 'unreadable')
  reject(store, disk, { type: 'sync' }, 'unreadable')
})

test('checksummed but invalid permanent state cannot bypass ownership, caps or skill locks', () => {
  for (const patch of [
    { hp: 0 }, { hp: 121 }, { xp: TOWER_XP_CAP + 1 }, { contribution: -1 }, { rng: 0 },
    { clearedFloor: 10 }, { weaponPity: Number.MAX_SAFE_INTEGER + 1 }, { normalCoreCounter: 20 },
    { pills: { zhuji: 0, huichun: 3, peiyuan: 0, attack: 1 } },
    weaponPatch(4, 1), weaponPatch(4, 5),
    { skills: { sj_yujian: 5 } }, { evolutions: ['evo_wanjian'] },
    { loadouts: [] }, { selectedLoadout: 3 }, { activeRun: { id: 0 } },
  ]) {
    const { store } = fixture(patch)
    assert.equal(store.readOnly, true, JSON.stringify(patch))
    assert.equal(store.error, 'corrupt')
  }
})

test('entry is free, floor gated, carries HP/loadout/counter and isolates the returned snapshot', () => {
  const { store, disk } = fixture({ hp: 0.25, normalCoreCounter: 19 })
  reject(store, disk, { type: 'startFloor', floor: 2, seed: 7 }, 'floor-locked')
  for (const floor of [0, 10, 1.5, '1']) {
    reject(store, disk, { type: 'startFloor', floor, seed: 7 }, 'invalid-floor')
  }
  const snapshot = start(store)
  assert.equal(snapshot.player.hp, 0.25)
  assert.equal(snapshot.normalCoreCounter, 19)
  assert.equal(snapshot.attemptId, 1)
  assert.equal(snapshot.wave, 1)
  assert.equal(store.state.contribution, 1000)
  assert.deepEqual(snapshot.loadout, combatLoadout(store.state))
  assert.deepEqual(store.state.activeRun.base, { xp: 0, spiritStones: 500, contribution: 1000, normalCoreCounter: 19, tutorialWaves: 0 })
  snapshot.player.hp = 99
  assert.equal(store.state.activeRun.snapshot.player.hp, 0.25)
})

test('paused attempts allow loadout changes, block camp spending and never heal offline', () => {
  const { store, disk } = fixture({ hp: 42 })
  const run = TowerRun.restore(start(store))
  run.pause()
  assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok, true)
  const reload = new TowerCampaignStore(disk, 100 * MINUTE)
  assert.equal(reload.act({ type: 'sync' }, 100 * MINUTE).hp, 42)
  for (const action of [
    { type: 'buyPill', id: 'huichun', count: 1 }, { type: 'usePill', id: 'huichun' },
    { type: 'drawWeapon' },
    { type: 'tutorialDone' }, { type: 'startFloor', floor: 1, seed: 1 },
  ]) reject(reload, disk, action, 'in-tower', 100 * MINUTE)
  for (const action of [
    { type: 'selectLoadout', index: 1 },
    { type: 'setLoadout', index: 1, loadout: store.state.loadouts[0] },
  ]) {
    disk.fail = true
    reject(reload, disk, action, 'save-failed', 100 * MINUTE)
    disk.fail = false
    assert.equal(reload.act(action, 100 * MINUTE).ok, true)
    assert.equal(reload.state.hp, 42)
  }
  const afterEquipment = TowerRun.restore(reload.state.activeRun.snapshot)
  afterEquipment.abandon()
  assert.equal(reload.act({ type: 'finishFloor', snapshot: afterEquipment.snapshot() }, 100 * MINUTE).ok, true)
  assert.equal(reload.state.hp, 42)
  assert.equal(reload.act({ type: 'sync' }, 101 * MINUTE).hp, 42 + 100 / 60 * 20)
})

test('checkpoints use base plus cumulative earnings and persist complete resumable state', () => {
  const { store, disk } = fixture({ xp: 44, normalCoreCounter: 19 })
  const initial = start(store)
  const one = report(initial, { kills: 1 })
  const oneValue = coreLoot(one).value
  assert.equal(one.earned.cores, oneValue)
  assert.equal(store.act({ type: 'checkpoint', snapshot: one }, MINUTE).ok, true)
  assert.deepEqual([store.state.xp, store.state.spiritStones, store.state.contribution, store.state.hp], [45, 500 + oneValue * 10, 1000, 42])
  const reload = new TowerCampaignStore(disk, MINUTE)
  assert.deepEqual(TowerRun.restore(reload.state.activeRun.snapshot).snapshot(), one)
  assert.equal(reload.act({ type: 'checkpoint', snapshot: one }, MINUTE).ok, true)
  assert.equal(reload.state.spiritStones, 500 + oneValue * 10)
  const two = report(one, { kills: 2 })
  const twoValue = coreLoot(two).value
  assert.equal(two.earned.cores, twoValue)
  assert.equal(reload.act({ type: 'checkpoint', snapshot: two }, MINUTE).ok, true)
  assert.deepEqual([reload.state.xp, reload.state.spiritStones, reload.state.contribution], [45, 500 + twoValue * 10, 1000])
  assert.equal(reload.state.normalCoreCounter, 19)
  one.earned.cores = 999
  assert.equal(reload.state.activeRun.snapshot.earned.cores, twoValue)
})

test('foreign, stale, regressing and invalid snapshots cannot replace the recorded attempt', () => {
  const { store, disk } = fixture()
  const initial = start(store)
  const current = report(initial, { kills: 1 })
  assert.equal(store.act({ type: 'checkpoint', snapshot: current }, 0).ok, true)
  for (const patch of [{ attemptId: 2 }, { floor: 2 }]) {
    reject(store, disk, { type: 'checkpoint', snapshot: { ...current, ...patch } }, 'wrong-attempt')
  }
  reject(store, disk, { type: 'checkpoint', snapshot: initial }, 'stale-snapshot')
  reject(store, disk, { type: 'checkpoint', snapshot: { ...current, earned: { ...current.earned, cores: 2 } } }, 'invalid-snapshot')
  for (const snapshot of [null, {}, { ...current, schema: 99 }, { ...current, training: true }]) {
    reject(store, disk, { type: 'checkpoint', snapshot }, 'invalid-snapshot')
  }
  reject(store, disk, { type: 'finishFloor', snapshot: current }, 'invalid-result')
})

test('death retains current-wave earnings, wakes at 1 HP, and new attempts restart wave one', () => {
  const { store, disk } = fixture({ xp: 44, normalCoreCounter: 19 })
  const initial = start(store)
  const dead = report(initial, { phase: 'lost', kills: 1 })
  assert.equal(store.act({ type: 'finishFloor', snapshot: dead }, 100 * MINUTE).ok, true)
  assert.deepEqual([store.state.hp, store.state.xp, store.state.spiritStones, store.state.contribution],
    [1, 45, 500 + coreLoot(dead).value * 10, 1000])
  assert.equal(store.state.clearedFloor, 0)
  assert.equal(store.state.lastResult.outcome, 'lost')
  reject(store, disk, { type: 'finishFloor', snapshot: dead }, 'wrong-attempt', 100 * MINUTE)
  const second = start(store, 1, 100 * MINUTE)
  assert.equal(second.player.hp, 1)
  assert.equal(second.player.xp, 45)
  assert.equal(second.normalCoreCounter, 19)
  assert.notEqual(second.loot.seed, initial.loot.seed, 'same requested seed must still distinguish attempts')
  assert.equal(second.attemptId, 2)
  assert.equal(second.wave, 1)
  assert.equal(second.time, 0)
  assert.deepEqual(second.earned, { xp: 0, cores: 0, contribution: 0 })
})

test('all nine first clears award one resource per floor once and inherit fractional HP', () => {
  const { store, disk } = fixture()
  let spiritStones = 500, contribution = 1000
  for (let floor = 1; floor <= 9; floor++) {
    const initial = start(store, floor)
    if (floor > 1) assert.equal(initial.player.hp, 0.25)
    const victory = report(initial, { phase: 'won', hp: 0.25 })
    const drops = coreLoot(victory), rule = CORE_DROP_RULES[floor]
    assert.ok(drops.count >= rule.minCount && drops.count <= rule.maxCount, `floor ${floor} count`)
    assert.ok(drops.value >= rule.minValue && drops.value <= rule.maxValue, `floor ${floor} value`)
    const floorCores = drops.value + 5 * (floor - 1)
    assert.equal(victory.earned.cores, floorCores)
    assert.equal(store.act({ type: 'finishFloor', snapshot: victory }, 0).ok, true)
    assert.equal(store.state.clearedFloor, floor)
    const bonusStones = [0, 100, 0, 0, 300, 0, 0, 400, 0][floor - 1]
    const bonusContribution = [2000, 0, 0, 2000, 0, 0, 2000, 0, 0][floor - 1]
    spiritStones += floorCores * 10 + bonusStones
    contribution += bonusContribution
    assert.equal(store.state.spiritStones, spiritStones)
    assert.equal(store.state.contribution, contribution)
    assert.equal(store.state.hp, 0.25)
    assert.equal(store.state.lastResult.firstClear, true)
    assert.deepEqual(store.state.lastResult.stoneLoot, stoneLoot(victory), 'clear bonuses do not invent spirit-stone drops')
    assert.deepEqual(store.state.lastResult.earned, {
      xp: victory.earned.xp, spiritStones: floorCores * 10 + bonusStones, contribution: bonusContribution,
    })
    reject(store, disk, { type: 'finishFloor', snapshot: victory }, 'wrong-attempt')
  }
  const replay = report(start(store, 1), { phase: 'won' })
  assert.equal(store.act({ type: 'finishFloor', snapshot: replay }, 0).ok, true)
  assert.equal(store.state.clearedFloor, 9)
  assert.equal(store.state.spiritStones, spiritStones + replay.earned.cores * 10)
  assert.equal(store.state.contribution, contribution)
  assert.equal(store.state.lastResult.firstClear, false)
  assert.deepEqual(store.state.lastResult.stoneLoot, stoneLoot(replay))
  assert.deepEqual(new TowerCampaignStore(disk, 0).state, store.state)
})

test('failed checkpoints and settlements retain one retryable complete transaction', () => {
  for (const type of ['checkpoint', 'finishFloor']) {
    const { store, disk } = fixture()
    const initial = start(store)
    const snapshot = report(initial, { phase: 'won' })
    disk.fail = true
    reject(store, disk, { type, snapshot }, 'save-failed', MINUTE)
    disk.fail = false
    assert.equal(store.act({ type, snapshot }, MINUTE).ok, true)
    const reload = new TowerCampaignStore(disk, MINUTE)
    if (type === 'checkpoint') {
      assert.equal(reload.state.clearedFloor, 0)
      assert.equal(reload.act({ type: 'finishFloor', snapshot }, MINUTE).ok, true)
    }
    assert.deepEqual([reload.state.xp, reload.state.spiritStones, reload.state.contribution],
      [180, 500 + coreLoot(snapshot).value * 10, 3000])
    assert.deepEqual(reload.state.lastResult.stoneLoot, stoneLoot(snapshot))
    assert.equal(reload.state.activeRun, null)
    reject(reload, disk, { type: 'finishFloor', snapshot }, 'wrong-attempt', MINUTE)
  }
})

test('combat XP reaches the cap without blocking other earned resources or storing overflow', () => {
  const { store, disk } = fixture({ xp: TOWER_XP_CAP - 1, normalCoreCounter: 19 })
  const snapshot = report(start(store), { phase: 'abandoned', kills: 2 })
  assert.equal(store.act({ type: 'finishFloor', snapshot }, 0).ok, true)
  assert.deepEqual([store.state.xp, store.state.spiritStones, store.state.contribution],
    [TOWER_XP_CAP, 500 + coreLoot(snapshot).value * 10, 1000])
  assert.equal(store.state.lastResult.earned.xp, 1)
  assert.equal(new TowerCampaignStore(disk, 0).state.xp, TOWER_XP_CAP)
})

test('real combat checkpoint, reload and abandonment preserve the same battle and wallet', () => {
  const { store, disk } = fixture()
  const run = TowerRun.restore(start(store))
  for (let frame = 0; frame < 200; frame++) run.advance(0.05)
  run.pause()
  const snapshot = run.snapshot()
  assert.equal(store.act({ type: 'checkpoint', snapshot }, MINUTE).ok, true)
  const reload = new TowerCampaignStore(disk, MINUTE)
  const resumed = TowerRun.restore(reload.state.activeRun.snapshot)
  assert.deepEqual(resumed.snapshot(), snapshot)
  resumed.abandon()
  assert.equal(reload.act({ type: 'finishFloor', snapshot: resumed.snapshot() }, 2 * MINUTE).ok, true)
  assert.equal(reload.state.spiritStones, 500 + snapshot.earned.cores * 10)
  assert.equal(reload.state.contribution, 1000 + snapshot.earned.contribution)
  assert.equal(reload.state.xp, snapshot.player.xp)
  assert.equal(reload.state.hp, snapshot.phase === 'lost' ? 1 : snapshot.player.hp)
})

test('entry failures retain the same loot seed; death and retreat reentries receive independent plans', () => {
  const failing = fixture(), control = fixture()
  failing.disk.fail = true
  reject(failing.store, failing.disk, { type: 'startFloor', floor: 1, seed: 7 }, 'save-failed')
  failing.disk.fail = false
  const first = start(failing.store), expected = start(control.store)
  assert.deepEqual(first, expected, 'retrying a failed save cannot reroll the candidate')
  const identities = new Set([first.loot.seed])
  let initial = first
  for (const outcome of ['lost', 'abandoned', 'lost']) {
    const terminal = report(initial, { phase: outcome, kills: 1 })
    const expectedLoot = coreLoot(terminal)
    assert.equal(terminal.earned.cores, expectedLoot.value)
    assert.equal(failing.store.act({ type: 'finishFloor', snapshot: terminal }, 0).ok, true)
    assert.deepEqual(failing.store.state.lastResult.stoneLoot, stoneLoot(terminal))
    const next = start(failing.store)
    assert.ok(!identities.has(next.loot.seed), 'new attempt with the same seed argument needs a new loot identity')
    identities.add(next.loot.seed)
    assert.deepEqual(next.earned, { xp: 0, cores: 0, contribution: 0 })
    assert.deepEqual(next.killLedger, [])
    assert.equal(next.time, 0)
    assert.equal(next.wave, 1)
    assert.equal(next.normalCoreCounter, 0)
    initial = next
  }
})

test('checkpoints lock the original loot identity even when the replacement is a valid empty snapshot', () => {
  const { store, disk } = fixture()
  const initial = start(store)
  const rerolled = copy(initial)
  rerolled.loot.seed = (rerolled.loot.seed + 1) >>> 0
  assert.ok(validateTowerSnapshot(rerolled), 'an empty run alone cannot infer its original seed')
  reject(store, disk, { type: 'checkpoint', snapshot: rerolled }, 'invalid-snapshot')
  const downgraded = copy(initial)
  delete downgraded.loot
  delete downgraded.pickups
  assert.ok(validateTowerSnapshot(downgraded), 'historical snapshots remain independently readable')
  reject(store, disk, { type: 'checkpoint', snapshot: downgraded }, 'invalid-snapshot')
  const run = TowerRun.restore(initial)
  run.pause()
  assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok, true)
  const reload = new TowerCampaignStore(disk, 0)
  assert.deepEqual(reload.state.activeRun.snapshot.loot, initial.loot)
  const retreat = TowerRun.restore(rerolled)
  retreat.abandon()
  reject(reload, disk, { type: 'finishFloor', snapshot: retreat.snapshot() }, 'invalid-snapshot')
})

test('accepted grades and credited values cannot be removed or rewritten by a later checkpoint', () => {
  const { store, disk } = fixture()
  const current = report(start(store), { phase: 'won' })
  assert.equal(store.act({ type: 'checkpoint', snapshot: current }, 0).ok, true)
  const index = current.killLedger.findIndex(k => k.coreRank > 0)
  assert.ok(index >= 0)
  for (const mutate of [
    s => { delete s.killLedger[index].coreRank },
    s => { s.killLedger[index].coreRank = 0 },
    s => {
      s.earned.cores -= CORE_RANK_VALUES[s.killLedger[index].coreRank]
      s.killLedger[index].coreRank = 0
      s.drops = s.drops.filter(d => d.killId !== s.killLedger[index].id)
    },
    s => { s.earned.cores++ },
  ]) {
    const corrupt = copy(current)
    mutate(corrupt)
    reject(store, disk, { type: 'checkpoint', snapshot: corrupt }, 'invalid-snapshot')
    reject(store, disk, { type: 'finishFloor', snapshot: corrupt }, 'invalid-snapshot')
  }
  assert.equal(store.act({ type: 'finishFloor', snapshot: current }, 0).ok, true)
  assert.deepEqual(store.state.lastResult.stoneLoot, stoneLoot(current))
})

test('optional settlement grade summaries survive reload, reject corruption and preserve old summaries', () => {
  const { store, disk } = fixture({ clearedFloor: 8 })
  const won = report(start(store, 9), { phase: 'won' })
  assert.equal(store.act({ type: 'finishFloor', snapshot: won }, 0).ok, true)
  const accepted = copy(store.state)
  assert.deepEqual(accepted.lastResult.stoneLoot, stoneLoot(won))
  assert.equal(accepted.lastResult.earned.spiritStones - accepted.lastResult.stoneLoot.value, 400,
    'floor9 only awards a skill point on first clear')
  for (const [label, mutate] of [
    ['null summary', r => { r.stoneLoot = null }],
    ['missing rank count', r => { r.stoneLoot.byGrade.pop() }],
    ['fifth grade', r => { r.stoneLoot.byGrade.push(0) }],
    ['negative rank count', r => { r.stoneLoot.byGrade[0] = -1 }],
    ['fractional rank count', r => { r.stoneLoot.byGrade[0] = .5 }],
    ['string rank count', r => { r.stoneLoot.byGrade[0] = '1' }],
    ['wrong count', r => { r.stoneLoot.count++ }],
    ['wrong value', r => { r.stoneLoot.value++ }],
    ['linear rank sum instead of denomination value', r => {
      const rankSum = r.stoneLoot.byGrade.reduce((sum, count, index) => sum + count * (index + 1), 0)
      assert.notEqual(rankSum, r.stoneLoot.value, 'the fixture must exercise nonlinear denomination validation')
      r.stoneLoot.value = rankSum
    }],
    ['uncredited value', r => {
      const count = r.earned.spiritStones + 1
      r.stoneLoot = { byGrade: [count, 0, 0, 0], count, value: count * STONE_VALUES[0] }
    }],
    ['unknown field', r => { r.stoneLoot.extra = 1 }],
  ]) {
    const invalid = copy(accepted)
    mutate(invalid.lastResult)
    saveState(disk, invalid)
    const raw = disk.records.get(TOWER_CAMPAIGN_KEY), writes = disk.writes
    const reload = new TowerCampaignStore(disk, 0)
    assert.equal(reload.readOnly, true, label)
    assert.equal(reload.error, 'corrupt', label)
    assert.equal(disk.records.get(TOWER_CAMPAIGN_KEY), raw)
    assert.equal(disk.writes, writes)
  }
  const historical = copy(accepted)
  delete historical.lastResult.stoneLoot
  saveState(disk, historical)
  const raw = disk.records.get(TOWER_CAMPAIGN_KEY), writes = disk.writes
  const reload = new TowerCampaignStore(disk, 0)
  assert.equal(reload.readOnly, false)
  assert.deepEqual(reload.state.lastResult, historical.lastResult)
  assert.equal(disk.records.get(TOWER_CAMPAIGN_KEY), raw)
  assert.equal(disk.writes, writes)
})

for (const schema of [1, 2, 3, 4, 5, currentCampaignSchema - 1]) {
  test(`schema${schema} reset writes only this mode's campaign key`, () => {
    const disk = storage()
    disk.records.set('another-game.save', 'keep-another-game')
    disk.records.set('xianxia.sect-tower.playtest.v1', 'keep-other-mode')
    const untouched = new Map(disk.records)
    const data = JSON.stringify({ xp: 9999, cores: 1234, skills: { sj_yujian: 5 } })
    disk.records.set(TOWER_CAMPAIGN_KEY, JSON.stringify({
      format: 'xianxia-sect-tower-campaign', schema, data, checksum: checksum(data),
    }))
    const store = new TowerCampaignStore(disk, 0)
    assert.equal(store.readOnly, false, store.error)
    assert.deepEqual(store.state, new TowerCampaignStore(storage(), 0).state)
    assert.deepEqual(store.migrationReport, { reset: true, fromSchema: schema })
    for (const [key, value] of untouched) assert.equal(disk.records.get(key), value, key)
    assert.equal(disk.records.size, untouched.size + 1)
    assert.equal(disk.writes, 1)
  })
}

for (const phase of ['playing', 'paused', 'reloaded']) test(`both pills are rejected without inventory or save changes while ${phase}`, () => {
  const {store,disk}=fixture({hp:35,pills:{ zhuji: 0,huichun:2,peiyuan:2}})
  const run=TowerRun.restore(start(store))
  if(phase!=='playing'){
    run.pause()
    assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
  }
  const active=phase==='reloaded'?new TowerCampaignStore(disk,0):store
  for(const id of ['huichun','peiyuan']) reject(active,disk,{type:'usePill',id},'in-tower')
})

test('repeat clears and repeated settlement cannot replenish used cultivation allowance', () => {
 const {store,disk}=fixture()
 const first=report(start(store),{phase:'won'})
 disk.fail=true
 reject(store,disk,{type:'finishFloor',snapshot:first},'save-failed')
 disk.fail=false
 assert.equal(store.act({type:'finishFloor',snapshot:first},0).ok,true)
 assert.equal(store.act({type:'buyPill',id:'peiyuan',count:1},0).ok,true)
 assert.equal(store.act({type:'usePill',id:'peiyuan'},0).ok,true)
 reject(store,disk,{type:'finishFloor',snapshot:first},'wrong-attempt')
 const repeat=report(start(store),{phase:'won'})
 assert.equal(store.act({type:'finishFloor',snapshot:repeat},0).ok,true)
 assert.equal(store.state.cultivationPillUses['炼气'],1)
 const reload=new TowerCampaignStore(disk,0)
 assert.equal(reload.state.cultivationPillUses['炼气'],1)
 assert.equal(reload.act({type:'buyPill',id:'peiyuan',count:5},0).ok,true)
 reject(reload,disk,{type:'buyPill',id:'peiyuan',count:1},'cultivation-stock-confirmation',0,{realm:'炼气',total:6,used:1,remaining:5,purchasable:5,inventoryAfter:6})
})
