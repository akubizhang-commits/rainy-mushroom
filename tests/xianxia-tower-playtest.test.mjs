import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import { rollWeapon } from '../js/xianxia/TowerWeapons.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY } from '../js/xianxia/TowerCampaign.js'
import { playtestStorage, readPlaytestTools, savePlaytestTools, TOWER_PLAYTEST_KEY, TOWER_PLAYTEST_TOOLS_KEY } from '../js/xianxia/TowerPlaytest.js'
import { growthSummary, GROWTH_POINT_CAP } from '../js/xianxia/TowerGrowth.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { checksum } from '../js/xianxia/Checksum.js'
const disk = () => {const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}}
test('assisted campaign seeds once and cannot mutate ordinary progression',()=>{
 const storage=disk(), normal=new TowerCampaignStore(storage,0);assert.ok(normal.act({type:'sync'},0).ok)
 const raw=storage.getItem(TOWER_CAMPAIGN_KEY), adapter=playtestStorage(storage,raw)
 const trial=new TowerCampaignStore(adapter,0);assert.ok(trial.act({type:'buyPill',id:'huichun',count:1},0).ok)
 assert.equal(trial.state.pills.huichun,4)
 assert.equal(storage.getItem(TOWER_CAMPAIGN_KEY),raw)
 const updated=storage.getItem(TOWER_PLAYTEST_KEY);playtestStorage(storage,raw)
 assert.equal(storage.getItem(TOWER_PLAYTEST_KEY),updated)
 assert.equal(new TowerCampaignStore(storage,0).state.xp,0)
 assert.equal(new TowerCampaignStore(adapter,0).state.pills.huichun,4)
 assert.throws(()=>adapter.setItem('unrelated','x'))
})
test('playtest preferences whitelist 1/2/3, persist separately and reject invalid speeds',()=>{
 const storage=disk();assert.deepEqual(readPlaytestTools(storage),{speed:1,invincible:false})
 savePlaytestTools(storage,{speed:3,invincible:true});assert.deepEqual(readPlaytestTools(storage),{speed:3,invincible:true})
 assert.throws(()=>savePlaytestTools(storage,{speed:9,invincible:true}))
 assert.throws(()=>savePlaytestTools(storage,{speed:2,invincible:1}))
 storage.setItem(TOWER_PLAYTEST_TOOLS_KEY,'broken');assert.deepEqual(readPlaytestTools(storage),{speed:1,invincible:false})
 assert.equal(storage.getItem(TOWER_CAMPAIGN_KEY),null)
})
test('playtest storage retains campaign stale-write and disk-failure protections',()=>{
 const storage=disk(), adapter=playtestStorage(storage), a=new TowerCampaignStore(adapter,0), b=new TowerCampaignStore(adapter,0)
 assert.ok(a.act({type:'sync'},0).ok)
 assert.equal(b.act({type:'buyPill',id:'huichun',count:1},0).reason,'stale-save')
 const original=storage.setItem;storage.setItem=()=>{throw Error('disk')}
 const before=structuredClone(a.state);assert.equal(a.act({type:'buyPill',id:'huichun',count:1},0).reason,'save-failed')
 assert.deepEqual(a.state,before);storage.setItem=original
})

function setupTools() {
 const storage = disk(), normal = new TowerCampaignStore(storage, 0)
 assert.ok(normal.act({ type: 'sync' }, 0).ok)
 const original = storage.getItem(TOWER_CAMPAIGN_KEY)
 const adapter = playtestStorage(storage, original)
 return { storage, original, adapter, store: new TowerCampaignStore(adapter, 0) }
}
function denied(store, storage, action, reason, now = 0) {
 const before = store.state, records = new Map(storage.data)
 assert.deepEqual(store.act(action, now), { ok: false, reason })
 assert.strictEqual(store.state, before)
 assert.deepEqual(storage.data, records)
}
function putTrial(storage, state) {
 const data = JSON.stringify(state)
 storage.setItem(TOWER_PLAYTEST_KEY, JSON.stringify({
  format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data, checksum: checksum(data),
 }))
}
// Fixture XP keeps these isolated tool tests independent of the first-clear pill gate.
function gainCultivation(store, count = 1) {
 const data = JSON.stringify({ ...store.state, xp: store.state.xp + count * 50 })
 store.storage.setItem(TOWER_CAMPAIGN_KEY, JSON.stringify({
  format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data, checksum: checksum(data),
 }))
 const loaded = new TowerCampaignStore(store.storage, 0)
 assert.equal(loaded.readOnly, false)
 return loaded
}

test('playtest adapter brands its isolated storage and stores cache capability at construction', () => {
 const { storage, adapter, original } = setupTools()
 assert.equal(adapter.allowPlaytestTools, true)
 const mutable = {
  allowPlaytestTools: true,
  getItem: adapter.getItem, setItem: adapter.setItem,
 }
 const allowed = new TowerCampaignStore(mutable, 0)
 mutable.allowPlaytestTools = false
 assert.ok(allowed.act({ type: 'playtestSkillPoints' }, 0).ok)
 const ordinary = new TowerCampaignStore(storage, 0)
 storage.allowPlaytestTools = true
 denied(ordinary, storage, { type: 'playtestSkillPoints' }, 'playtest-only')
 denied(ordinary, storage, { type: 'playtestReset' }, 'playtest-only')
 assert.equal(storage.getItem(TOWER_CAMPAIGN_KEY), original)
})

test('set remaining SP is exact, spendable, idempotent and reloadable without changing normal saves', () => {
 let { storage, original, adapter, store } = setupTools()
 store = gainCultivation(store, 5) // The middle phase permits ranks through six.
 assert.ok(store.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok)
 const before = store.state, summary = growthSummary(before)
 const result = store.act({ type: 'playtestSkillPoints' }, 0)
 assert.equal(result.ok, true)
 assert.equal(result.growth.available, 999)
 assert.equal(store.state.playtestSkillPoints, 999 + summary.spent - summary.total)
 assert.deepEqual(store.state, { ...before, playtestSkillPoints: store.state.playtestSkillPoints })
 const raw = storage.getItem(TOWER_PLAYTEST_KEY)
 assert.ok(store.act({ type: 'playtestSkillPoints' }, 0).ok)
 assert.equal(storage.getItem(TOWER_PLAYTEST_KEY), raw, 'set does not stack another grant')
 assert.ok(store.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok)
 assert.equal(growthSummary(store.state).available, 998)
 const reloaded = new TowerCampaignStore(adapter, 0)
 assert.equal(reloaded.readOnly, false)
 assert.deepEqual(reloaded.state, store.state)
 assert.equal(growthSummary(reloaded.state).available, 998)
 assert.equal(reloaded.act({ type: 'playtestSkillPoints' }, 0).growth.available, 999)
 assert.equal(growthSummary(reloaded.state).total, 1001, 'remaining includes already spent points')
 assert.equal(reloaded.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok, true)
 assert.equal(reloaded.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok, true)
 assert.equal(reloaded.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok, true)
 denied(reloaded, storage, { type: 'learnSkill', id: 'sj_arc' }, 'realm-locked')
 assert.equal(reloaded.act({ type: 'learnSkill', id: 'sj_yujian' }, 0).ok, true)
 denied(reloaded, storage, { type: 'learnSkill', id: 'sj_heart' }, 'stage-locked')
 assert.equal(storage.getItem(TOWER_CAMPAIGN_KEY), original)
 assert.equal(growthSummary(new TowerCampaignStore(storage, 0).state).cap, GROWTH_POINT_CAP)
})

test('999 bonus SP cannot bypass the level-one or level-two active rank caps', () => {
 let { storage, adapter, store } = setupTools()
 assert.ok(store.act({ type: 'playtestSkillPoints' }, 0).ok)
 assert.equal(store.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok, true)
 store = gainCultivation(store)
 assert.equal(store.state.xp, 50)
 assert.equal(store.state.skills.sj_arc, 2)
 assert.equal(store.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok, true)
 denied(store, storage, { type: 'learnSkill', id: 'sj_arc' }, 'realm-locked')
 const reloaded = new TowerCampaignStore(adapter, 0)
 denied(reloaded, storage, { type: 'learnSkill', id: 'sj_arc' }, 'realm-locked')
})

test('reset replaces the whole experience profile and clears active run, receipts and bonus', () => {
 let { storage, original, adapter, store } = setupTools()
 assert.ok(store.act({ type: 'playtestSkillPoints' }, 0).ok)
 store = gainCultivation(store)
 assert.ok(store.act({ type: 'buyPill', id: 'huichun', count: 2 }, 0).ok)
 assert.ok(store.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok)
 assert.ok(store.act({ type: 'tutorialDone' }, 0).ok)
 assert.ok(store.act({ type: 'startFloor', floor: 1, seed: 123 }, 0).ok)
 const run = TowerRun.restore(store.state.activeRun.snapshot)
 run.advance(.2); run.pause()
 assert.ok(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok)
 const now = 12345
 assert.ok(store.act({ type: 'playtestReset' }, now).ok)
 assert.deepEqual(store.state, new TowerCampaignStore(disk(), now).state)
 assert.equal(Object.hasOwn(store.state, 'playtestSkillPoints'), false)
 assert.equal(store.state.activeRun, null)
 assert.equal(growthSummary(store.state).available, 0)
 assert.deepEqual(new TowerCampaignStore(adapter, now).state, store.state)
 assert.equal(storage.getItem(TOWER_CAMPAIGN_KEY), original)
 denied(store, storage, { type: 'checkpoint', snapshot: run.snapshot() }, 'wrong-attempt', now)
})

for (const phase of ['camp', 'playing', 'paused']) {
 test(`reset clears a developed ${phase} profile without touching ordinary records or tool preferences`, () => {
  const { storage, original, adapter, store: initial } = setupTools()
  putTrial(storage, {
   ...initial.state,
   xp: 10920, hp: 37.5, clearedFloor: 9, researchPurchases: 0, tutorialWaves: 3,
   skills: { sj_arc: 3, sj_yujian: 1, sj_wanjian: 1, sj_line: 1 },
   books: ['sj_line'], spiritStones: 40000, contribution: 8000,
   pills: { ...initial.state.pills, zhuji: 0, huichun: 17, peiyuan: 24 }, tutorialDone: true,
   normalCoreCounter: 13, weaponPity: 8, selectedLoadout: 1, attemptSequence: 7,
   weapons: { ...initial.state.weapons, 'weapon-1': {...rollWeapon('fa',4,()=>0,'weapon-1'), refine:0} },
   weaponSequence:8, weaponCounters:{iron:0,'weapon-1':0},
   lastResult: { outcome: 'won', floor: 9, firstClear: true, earned: { xp: 12, spiritStones: 400, contribution: 50 } },
  })
  savePlaytestTools(storage, { speed: 3, invincible: true })
  const prefs = storage.getItem(TOWER_PLAYTEST_TOOLS_KEY)
  const store = new TowerCampaignStore(adapter, 0)
  assert.equal(store.readOnly, false)
  assert.equal(store.act({ type: 'playtestSkillPoints' }, 0).growth.available, 999)
  if (phase !== 'camp') {
   const result = store.act({ type: 'startFloor', floor: 9, seed: 987 }, 0)
   assert.equal(result.ok, true)
   if (phase === 'paused') {
    const run = TowerRun.restore(result.snapshot); run.pause()
    assert.ok(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok)
   }
  }
  assert.ok(store.act({ type: 'playtestReset' }, 12345).ok)
  assert.deepEqual(store.state, new TowerCampaignStore(disk(), 12345).state)
  assert.equal(store.state.xp, 0)
  assert.deepEqual(store.state.skills, { sj_arc: 1 })
  assert.equal(store.state.spiritStones, 500)
  assert.equal(store.state.contribution, 1000)
  assert.deepEqual(store.state.pills, new TowerCampaignStore(disk(),12345).state.pills)
  assert.equal(storage.getItem(TOWER_CAMPAIGN_KEY), original)
  assert.equal(storage.getItem(TOWER_PLAYTEST_TOOLS_KEY), prefs)
 })
}

test('paused SP grants preserve the entire active snapshot and never enter the combat loadout', () => {
 let { store, adapter, storage } = setupTools()
 store = gainCultivation(store)
 const start = store.act({ type: 'startFloor', floor: 1, seed: 123 }, 0)
 assert.equal(start.ok, true)
 denied(store, storage, { type: 'playtestSkillPoints' }, 'pause-required')
 const run = TowerRun.restore(start.snapshot)
 run.advance(.2); run.pause()
 assert.ok(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok)
 const active = structuredClone(store.state.activeRun)
 assert.equal(store.act({ type: 'playtestSkillPoints' }, 0).growth.available, 999)
 assert.deepEqual(store.state.activeRun, active, 'HP, RNG, time, input, loot and loadout are unchanged')
 assert.equal(validateTowerSnapshot(store.state.activeRun.snapshot), true)
 assert.equal(JSON.stringify(store.state.activeRun).includes('playtestSkillPoints'), false)
 const reloaded = new TowerCampaignStore(adapter, 0)
 assert.equal(reloaded.readOnly, false)
 assert.deepEqual(reloaded.state.activeRun, active)
 const learned = reloaded.act({ type: 'learnSkill', id: 'sj_arc' }, 0)
 assert.equal(learned.ok, true)
 assert.equal(learned.snapshot.phase, 'paused')
 assert.equal(learned.snapshot.player.hp, active.snapshot.player.hp)
 assert.equal(learned.snapshot.rng, active.snapshot.rng)
 assert.equal(learned.snapshot.time, active.snapshot.time)
 assert.equal(learned.snapshot.loadout.active.sj_arc, 2)
 assert.equal(growthSummary(reloaded.state).available, 998)
 assert.equal(validateTowerSnapshot(learned.snapshot), true)
 assert.equal(JSON.stringify(learned.snapshot).includes('playtestSkillPoints'), false)
})

test('normal stores reject bonus-bearing records and normal overspends remain corrupt', () => {
 let { storage, store } = setupTools()
 store = gainCultivation(store, 5)
 assert.ok(store.act({ type: 'playtestSkillPoints' }, 0).ok)
 assert.ok(store.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok)
 for (const id of ['sj_arc', 'sj_yujian', 'sj_bone', 'sj_yujian', 'sj_arc', 'sj_yujian']) assert.ok(store.act({ type: 'learnSkill', id }, 0).ok)
 assert.equal(growthSummary(store.state).spent, 7)
 assert.equal(growthSummary(store.state).realm, 3, 'all ranks are legal but require the bonus to fund them')
 const trial = storage.getItem(TOWER_PLAYTEST_KEY)
 storage.setItem(TOWER_CAMPAIGN_KEY, trial)
 const ordinary = new TowerCampaignStore(storage, 0)
 assert.equal(ordinary.readOnly, true)
 assert.equal(ordinary.error, 'corrupt')
 denied(ordinary, storage, { type: 'playtestReset' }, 'corrupt')
 const withoutBonus = { ...store.state }; delete withoutBonus.playtestSkillPoints
 putTrial(storage, withoutBonus)
 storage.setItem(TOWER_CAMPAIGN_KEY, storage.getItem(TOWER_PLAYTEST_KEY))
 assert.equal(new TowerCampaignStore(storage, 0).error, 'corrupt')
})

test('even a zero bonus is forbidden in ordinary records and action fields cannot grant capability', () => {
 let { storage, store } = setupTools()
 const ordinary = new TowerCampaignStore(storage, 0)
 for (const type of ['playtestReset', 'playtestSkillPoints']) {
  denied(ordinary, storage, { type, allowPlaytestTools: true, playtestSkillPoints: 999 }, 'playtest-only')
 }
 putTrial(storage, { ...store.state, playtestSkillPoints: 0 })
 storage.setItem(TOWER_CAMPAIGN_KEY, storage.getItem(TOWER_PLAYTEST_KEY))
 assert.equal(new TowerCampaignStore(storage, 0).error, 'corrupt')
 const branded = new TowerCampaignStore(playtestStorage(storage), 0)
 assert.equal(branded.readOnly, false)
 assert.equal(growthSummary(branded.state).available, 0)
})

test('branded saves still reject invalid bonus values and unrelated extra state keys', () => {
 for (const patch of [
  { playtestSkillPoints: -1 }, { playtestSkillPoints: 1.5 }, { playtestSkillPoints: '999' },
  { playtestSkillPoints: null }, { playtestSkillPoints: 10001 }, { playtestSkillPoints: Number.MAX_SAFE_INTEGER },
  { playtestSkillPoints: 999, debug: true },
 ]) {
  let { storage, adapter, store } = setupTools()
  putTrial(storage, { ...store.state, ...patch })
  const raw = storage.getItem(TOWER_PLAYTEST_KEY)
  const loaded = new TowerCampaignStore(adapter, 0)
  assert.equal(loaded.readOnly, true, JSON.stringify(patch))
  assert.equal(loaded.error, 'corrupt')
  denied(loaded, storage, { type: 'playtestReset' }, 'corrupt')
  assert.equal(storage.getItem(TOWER_PLAYTEST_KEY), raw)
 }
})

test('the 10000 bonus boundary reloads and can be set back to exactly 999 remaining', () => {
 let { storage, adapter, store } = setupTools()
 putTrial(storage, { ...store.state, playtestSkillPoints: 10000 })
 const loaded = new TowerCampaignStore(adapter, 0)
 assert.equal(loaded.readOnly, false)
 assert.equal(growthSummary(loaded.state).available, 10000)
 assert.equal(loaded.act({ type: 'playtestSkillPoints' }, 0).growth.available, 999)
 assert.equal(new TowerCampaignStore(adapter, 0).state.playtestSkillPoints, 999)
})

for (const type of ['playtestReset', 'playtestSkillPoints']) {
 test(`${type} preserves atomicity on write/read failure and rejects stale stores`, () => {
  let { storage, adapter, store, original } = setupTools()
  store = gainCultivation(store)
  assert.ok(store.act({ type: 'playtestSkillPoints' }, 0).ok)
  assert.ok(store.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok)
  const stale = new TowerCampaignStore(adapter, 0)
  assert.ok(store.act({ type: 'buyPill', id: 'huichun', count: 1 }, 0).ok)
  denied(stale, storage, { type }, 'stale-save', 5000)
  const get = storage.getItem, set = storage.setItem
  storage.setItem = () => { throw Error('disk full') }
  denied(store, storage, { type }, 'save-failed', 5000)
  storage.setItem = set
  storage.getItem = () => { throw Error('unreadable') }
  denied(store, storage, { type }, 'save-failed', 5000)
  storage.getItem = get
  assert.ok(store.act({ type }, 5000).ok, 'same transaction retries after storage recovers')
  assert.equal(store.error, '')
  assert.equal(new TowerCampaignStore(adapter, 5000).readOnly, false)
  assert.equal(storage.getItem(TOWER_CAMPAIGN_KEY), original)
 })

 test(`${type} cannot reenter the campaign while its atomic write is in progress`, () => {
  let { storage, store } = setupTools()
  const set = storage.setItem
  let writes = 0
  storage.setItem = (key, value) => {
   writes++
   assert.deepEqual(store.act({ type }, 0), { ok: false, reason: 'busy' })
   set(key, value)
  }
  assert.ok(store.act({ type }, 0).ok)
  assert.equal(writes, 1)
 })
}

for (const schema of [1, 2, 3]) {
 test(`old schema${schema} playtest reset is isolated from ordinary saves and preferences`, () => {
  const { storage, original, adapter } = setupTools()
  savePlaytestTools(storage, { speed: 3, invincible: true })
  storage.setItem('another-game.save', 'keep-other-game')
  const preferences = storage.getItem(TOWER_PLAYTEST_TOOLS_KEY)
  const data = JSON.stringify({ xp: 9999, cores: 1234, playtestSkillPoints: 999 })
  const old = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema, data, checksum: checksum(data) })
  storage.setItem(TOWER_PLAYTEST_KEY, old)
  const set = storage.setItem
  storage.setItem = () => { throw Error('disk full') }
  const failed = new TowerCampaignStore(adapter, 0)
  assert.equal(failed.readOnly, true)
  assert.equal(failed.error, 'save-failed')
  assert.equal(failed.migrationReport, null)
  assert.equal(storage.getItem(TOWER_PLAYTEST_KEY), old)
  assert.equal(storage.getItem(TOWER_CAMPAIGN_KEY), original)
  storage.setItem = set
  const reset = new TowerCampaignStore(adapter, 0)
  assert.equal(reset.readOnly, false, reset.error)
  assert.deepEqual(reset.state, new TowerCampaignStore(disk(), 0).state)
  assert.deepEqual(reset.migrationReport, { reset: true, fromSchema: schema })
  assert.equal(Object.hasOwn(reset.state, 'playtestSkillPoints'), false)
  assert.equal(storage.getItem(TOWER_CAMPAIGN_KEY), original)
  assert.equal(storage.getItem(TOWER_PLAYTEST_TOOLS_KEY), preferences)
  assert.equal(storage.getItem('another-game.save'), 'keep-other-game')
  const raw = storage.getItem(TOWER_PLAYTEST_KEY)
  const reloaded = new TowerCampaignStore(adapter, 1000)
  assert.deepEqual(reloaded.state, reset.state)
  assert.equal(reloaded.migrationReport, null)
  assert.equal(storage.getItem(TOWER_PLAYTEST_KEY), raw)
 })
}
