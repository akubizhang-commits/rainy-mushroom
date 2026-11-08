import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { createIronWeapon, rollWeapon } from '../js/xianxia/TowerWeapons.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { growthSummary } from '../js/xianxia/TowerGrowth.js'
import {freshPills, cultivationAt} from '../js/xianxia/TowerProfile.js'
import { checksum } from '../js/xianxia/Checksum.js'

const clone = value => JSON.parse(JSON.stringify(value))
const SWORD = 'eq_sword_suwen'
function storage() {
  return {
    raw: null, fail: false, writes: 0,
    getItem() { return this.raw },
    setItem(key, value) {
      assert.equal(key, TOWER_CAMPAIGN_KEY)
      if (this.fail) throw Error('disk full')
      this.raw = value
      this.writes++
    },
  }
}
function put(disk, state, schema = currentCampaignSchema) {
  const data = JSON.stringify(state)
  disk.raw = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema, data, checksum: checksum(data) })
}
function fixture(patch = {}) {
  if (patch.skills && !patch.skillsInitialized) patch = { ...patch, skills: { sj_arc: 1, ...patch.skills } }
  const disk = storage()
  const initial = new TowerCampaignStore(disk, 0)
  put(disk, { ...clone(initial.state), ...patch })
  return { disk, store: new TowerCampaignStore(disk, 0) }
}
function rejected(store, disk, action, reason, now = 0) {
  const before = store.state, raw = disk.raw, writes = disk.writes
  assert.deepEqual(store.act(action, now), { ok: false, reason })
  assert.strictEqual(store.state, before)
  assert.equal(disk.raw, raw)
  assert.equal(disk.writes, writes)
}
function enter(store, floor = 1) {
  const result = store.act({ type: 'startFloor', floor, seed: 123 }, 0)
  assert.equal(result.ok, true, result.reason)
  assert.equal(validateTowerSnapshot(result.snapshot), true)
  return TowerRun.restore(result.snapshot)
}
function clearUntil(run, count) {
  for (let i = 0; i < 100000 && run.state.phase === 'playing' && run.state.clearedWaves.length < count; i++) {
    run.state.player.hp = run.state.player.maxHp
    for (const enemy of run.state.enemies) {
      enemy.hp = 1
      enemy.x = run.state.player.x + 60
      enemy.y = run.state.player.y
      enemy.ai.graceUntil = run.state.time + 10
    }
    run.advance(1 / 60)
  }
  assert.equal(run.state.clearedWaves.length, count)
}

test('battle level healing checkpoints atomically, survives reload and is not repeated by settlement', () => {
  const { disk, store } = fixture({ xp: 44, hp: 10 })
  const run = enter(store)
  run.state.cooldowns.sj_yujian = 999999
  for (let i = 0; i < 300 && !run.state.enemies.length; i++) run.advance(1 / 60)
  const enemy = run.state.enemies[0]
  assert.ok(enemy)
  enemy.ai.graceUntil = 999999
  enemy.x = -700; enemy.y = -900
  run._damageEnemy({ target: enemy.id, damage: enemy.hp * 100, direct: false, scaled: true, source: 'fixture' })
  run.advance(1 / 60)
  run.pause()
  const snapshot = run.snapshot()
  assert.equal(snapshot.player.xp, 45)
  assert.ok(Math.abs(snapshot.player.hp - 42.4) < 1e-9)
  assert.equal(validateTowerSnapshot(snapshot), true)
  disk.fail = true
  rejected(store, disk, { type: 'checkpoint', snapshot }, 'save-failed')
  assert.equal(store.state.hp, 10)
  disk.fail = false
  assert.ok(store.act({ type: 'checkpoint', snapshot }, 0).ok)
  assert.equal(store.state.hp, snapshot.player.hp)
  assert.ok(store.act({ type: 'checkpoint', snapshot }, 0).ok)
  assert.equal(store.state.hp, snapshot.player.hp, 'duplicate checkpoint copies HP, never re-awards it')
  const reloaded = new TowerCampaignStore(disk, 0)
  assert.equal(reloaded.readOnly, false)
  assert.equal(reloaded.state.hp, snapshot.player.hp)
  const restored = TowerRun.restore(reloaded.state.activeRun.snapshot)
  assert.deepEqual(restored.snapshot(), snapshot)
  restored.abandon()
  assert.ok(reloaded.act({ type: 'finishFloor', snapshot: restored.snapshot() }, 0).ok)
  assert.equal(reloaded.state.hp, snapshot.player.hp)
  assert.equal(new TowerCampaignStore(disk, 0).state.hp, snapshot.player.hp)
})

for (const [xp,id,gain] of [[44,'peiyuan',50],[1484,'peiyuan',50],[5399,'heqi',100]]) {
  test(`camp pill crossing a level from ${xp} XP keeps existing HP and natural regeneration`, () => {
    const {disk,store}=fixture({xp,hp:10,clearedFloor:1,pills:{...freshPills(),[id]:1}})
    assert.equal(store.act({type:'usePill',id},0).ok,true)
    assert.equal(store.state.xp,xp+gain)
    assert.equal(store.state.hp,10,'camp leveling never applies battle-only healing')
    const reloaded=new TowerCampaignStore(disk,0)
    assert.equal(reloaded.state.hp,10)
    assert.equal(reloaded.act({type:'sync'},60000).ok,true)
    const expected=Math.min(cultivationAt(xp+gain).maxHp,10+cultivationAt(xp+gain).maxHp/3)
    assert.ok(Math.abs(reloaded.state.hp-expected)<1e-9)
  })
}

function legacy(patch = {}) {
  return {
    xp: 0, hp: 100, cores: 20, contribution: 300, pills: { zhuji: 0, huichun: 3, peiyuan: 0 },
    skills: { sj_yujian: 1 }, evolutions: [], weapons: { [SWORD]: { quality: 1, refine: 0 } },
    loadouts: ['一', '二', '三'].map(name => ({
      name, weaponId: SWORD, active: ['sj_yujian'], passive: [], evolutions: [],
    })),
    selectedLoadout: 0, clearedFloor: 0, normalCoreCounter: 0, weaponPity: 0, rng: 123,
    restAt: 0, attemptSequence: 0, activeRun: null, tutorialDone: false, lastResult: null,
    ...patch,
  }
}

test('schema11 starts with bound sword only and cannot upgrade before reaching level two', () => {
  const disk = storage(), store = new TowerCampaignStore(disk, 0)
  assert.deepEqual(store.state.books, [])
  assert.deepEqual(store.state.evolutionRanks, {})
  assert.equal(store.state.researchPurchases, 0)
  assert.equal(store.state.tutorialWaves, 0)
  assert.deepEqual(store.state.skills, { sj_arc: 1 })
  rejected(store, disk, { type: 'learnSkill', id: 'sj_yujian' }, 'stage-locked')
  assert.equal(store.act({ type: 'sync' }, 0).ok, true)
  assert.equal(JSON.parse(disk.raw).schema, currentCampaignSchema)
})

test('realm points are derived from permanent XP and buyBook aliases SP learning without a spirit-stone charge', () => {
  const { store, disk } = fixture({ xp: 120 })
  assert.equal(store.act({ type: 'buyBook', id: 'sj_arc' }, 0).ok, true)
  assert.equal(store.state.skills.sj_arc, 2)
  assert.equal(store.state.spiritStones, 500)
  rejected(store, disk, { type: 'learnSkill', id: 'vajra' }, 'stage-locked')
  const reload = new TowerCampaignStore(disk, 0)
  assert.equal(reload.act({type:'learnSkill',id:'sj_arc'},0).level,3)
  rejected(reload, disk, { type: 'learnSkill', id: 'sj_yujian' }, 'insufficient-points')
})

test('current starter and learned roots retain realm checks after respec', () => {
  const { store, disk } = fixture({ xp: 10920 })
  assert.equal(store.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok, true)
  assert.equal(store.act({ type: 'learnSkill', id: 'sj_wanjian' }, 0).ok, true)
  const bound = fixture({ xp: 120, tutorialWaves: 3, skills: { sj_arc: 1, sj_yujian: 1 } })
  assert.equal(bound.store.act({ type: 'respecSkills' }, 0).ok, true)
  assert.deepEqual(bound.store.state.skills, {})
  rejected(bound.store, bound.disk, { type: 'learnSkill', id: 'vajra' }, 'stage-locked')
})

test('special unlock and first rank cost spirit stones and points together, then the book stays paid', () => {
  const { store, disk } = fixture({ xp: 10920, clearedFloor: 1, spiritStones: 1000, skills: { sj_yujian: 2 } })
  const result = store.act({ type: 'learnSkill', id: 'sj_shadow' }, 0)
  assert.equal(result.ok, true, result.reason)
  assert.equal(store.state.skills.sj_shadow, 1)
  assert.equal(store.state.spiritStones, 800)
  assert.deepEqual(store.state.books, ['sj_shadow'])
  assert.equal(store.act({ type: 'learnSkill', id: 'sj_shadow' }, 0).ok, true)
  assert.equal(store.state.spiritStones, 800)
  assert.equal(store.act({ type: 'respecSkills' }, 0).ok, true)
  assert.equal(store.state.skills.sj_shadow, undefined)
  assert.deepEqual(store.state.books, ['sj_shadow'])
  assert.equal(store.act({ type: 'learnSkill', id: 'sj_yujian' }, 0).ok, true)
  assert.equal(store.act({ type: 'learnSkill', id: 'sj_shadow' }, 0).ok, true)
  assert.equal(store.state.spiritStones, 800)
  assert.equal(new TowerCampaignStore(disk, 0).readOnly, false)
})

test('failed growth actions do not publish books, SP allocation or respec', () => {
  for (const action of [
    { type: 'learnSkill', id: 'sj_shadow' }, { type: 'buyBook', id: 'vajra' },
    { type: 'respecSkills' },
  ]) {
    const { store, disk } = fixture({ xp: 10920, clearedFloor: 9, spiritStones: 10000, skills: { sj_yujian: 2 } })
    disk.fail = true
    rejected(store, disk, action, 'save-failed')
    disk.fail = false
    assert.equal(store.act(action, 0).ok, true, action.type)
    assert.deepEqual(new TowerCampaignStore(disk, 0).state, store.state)
  }
})

test('retired research never writes or charges at any old gate', () => {
 for(const clearedFloor of [0,3,6,9]){const {store,disk}=fixture({clearedFloor,spiritStones:10000});rejected(store,disk,{type:'researchPoint'},'retired-research')}
})

test('all learned skills act automatically regardless of the old four-slot arrays', () => {
  const skills = { sj_yujian: 1, sj_arc: 1, sj_wanjian: 1, sj_line: 1, sj_shadow: 1, sj_formation: 1,
    sj_heart: 1, vajra: 1, sj_spirit: 1, sj_mark: 1, sj_bone: 1, sj_gate: 1 }
  const books = ['sj_line', 'sj_shadow', 'sj_formation', 'sj_mark', 'sj_gate']
  const { store } = fixture({ xp: 10920, clearedFloor: 9, tutorialWaves: 3, skills, books })
  assert.equal(store.readOnly, false)
  const loadout = combatLoadout(store.state)
  assert.equal(Object.keys(loadout.active).length, 6)
  assert.equal(Object.keys(loadout.passive).length, 6)
  assert.equal(loadout.growthVersion, 1)
  assert.deepEqual(loadout.evolutionLevels, {})
  assert.equal(enter(store).state.loadout.growthVersion, 1)
})

test('respec clears skills and returns points without refunding spirit stones or books', () => {
  const { store, disk } = fixture({ xp: 10920, clearedFloor: 9, spiritStones: 10000, tutorialWaves: 3,
    skills: { sj_yujian: 6, sj_arc: 1, sj_wanjian: 1, sj_heart: 4 },
    books: ['evo_wanjian'], evolutions: ['evo_wanjian'], evolutionRanks: { evo_wanjian: 1 } })
  assert.equal(store.readOnly, false)
  assert.equal(store.act({ type: 'respecSkills' }, 0).ok, true)
  assert.deepEqual(store.state.skills, {})
  assert.deepEqual(store.state.books, ['evo_wanjian'])
  assert.deepEqual(store.state.evolutionRanks, {})
  assert.deepEqual(store.state.evolutions, [])
  assert.equal(store.state.spiritStones, 10000)
  assert.equal(store.act({ type: 'respecSkills' }, 0).ok, true)
  assert.equal(new TowerCampaignStore(disk, 0).state.spiritStones, 10000)
})

test('corrupt schema11 cannot forge points, research provenance, books or bound grants', () => {
  for (const patch of [
    { researchPurchases: 1 }, { researchPurchases: 4, clearedFloor: 9 },
    { skills: { sj_yujian: 2 } }, 
    { tutorialWaves: 0, skills: { sj_yujian: 1, sj_arc: 1 } },
    { xp: 10920, skills: { sj_yujian: 1, sj_line: 1 } },
    { books: ['unknown'] }, { books: ['sj_line', 'sj_line'] },
    { evolutionRanks: { evo_wanjian: 1 }, evolutions: ['evo_wanjian'] },
  ]) {
    const { store } = fixture(patch)
    assert.equal(store.readOnly, true, JSON.stringify(patch))
    assert.equal(store.error, 'corrupt')
  }
})

test('floor-one wave-eight teaching merges atomically and later waves do not grant orbit', () => {
  const { store, disk } = fixture()
  const run = enter(store)
  clearUntil(run, 8)
  const first = run.snapshot()
  assert.equal(store.act({ type: 'checkpoint', snapshot: first }, 1000).ok, true)
  assert.equal(store.state.tutorialWaves, 0)
  assert.deepEqual(store.state.skills, { sj_arc: 1 })
  clearUntil(run, 9)
  run.pause()
  assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 2000).ok, true)
  assert.equal(store.state.tutorialWaves, 0)
  assert.equal(store.state.skills.sj_wanjian, undefined)
  assert.deepEqual(TowerRun.restore(new TowerCampaignStore(disk, 2000).state.activeRun.snapshot).snapshot(), run.snapshot())
  rejected(store, disk, { type: 'checkpoint', snapshot: first }, 'stale-snapshot', 2000)
})

test('paused learning atomically updates the saved Run without touching time, RNG, HP or kills', () => {
  const { store, disk } = fixture({ xp: 120 })
  const run = enter(store)
  run.advance(1)
  run.pause()
  assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 1000).ok, true)
  const before = store.state.activeRun.snapshot
  disk.fail = true
  rejected(store, disk, { type: 'learnSkill', id: 'sj_arc' }, 'save-failed', 1000)
  disk.fail = false
  const learned = store.act({ type: 'learnSkill', id: 'sj_arc' }, 1000)
  assert.equal(learned.ok, true, learned.reason)
  assert.equal(learned.snapshot.loadout.active.sj_arc, 2)
  for (const key of ['time', 'rng', 'loot', 'earned', 'killLedger', 'enemies', 'pending', 'reserved', 'cooldowns']) {
    assert.deepEqual(learned.snapshot[key], before[key], key)
  }
  assert.equal(learned.snapshot.player.hp, before.player.hp)
  const reload = new TowerCampaignStore(disk, 600000)
  assert.equal(reload.state.activeRun.snapshot.loadout.active.sj_arc, 2)
  assert.equal(reload.act({ type: 'sync' }, 600000).hp, before.player.hp)
  rejected(reload, disk, { type: 'checkpoint', snapshot: before }, 'invalid-snapshot', 600000)
})

test('playing and unsaved-paused runs cannot learn; saved pause still rejects library actions', () => {
  const { store, disk } = fixture({ xp: 10920, clearedFloor: 9, spiritStones: 10000 })
  const run = enter(store)
  rejected(store, disk, { type: 'learnSkill', id: 'sj_yujian' }, 'pause-required')
  run.pause()
  rejected(store, disk, { type: 'learnSkill', id: 'sj_yujian' }, 'pause-required')
  assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok, true)
  for (const action of [{ type: 'respecSkills' }, { type: 'researchPoint' }, { type: 'usePill', id: 'huichun' }]) {
    rejected(store, disk, action, 'in-tower')
  }
  assert.equal(store.act({ type: 'learnSkill', id: 'sj_line' }, 0).ok, true)
  assert.equal(new TowerCampaignStore(disk, 0).readOnly, false)
})

test('a real 35-point build spends its exact budget and repeated respec cannot mint points or spirit stones', () => {
  const {store,disk}=fixture({xp:14400,clearedFloor:9,spiritStones:10000})
  const targets={sj_formation:10,evo_sixiang:2,sj_yujian:3,sj_arc:10,sj_bone:4,vajra:1}
  for(const [id,target] of Object.entries(targets)) while((store.state.skills[id]||store.state.evolutionRanks[id]||0)<target){
    const result=store.act({type:'learnSkill',id},0);assert.equal(result.ok,true,`${id}: ${result.reason}`)
  }
  assert.deepEqual(growthSummary(store.state),{total:35,spent:35,available:0,realm:35,firstClear:0,research:0,cap:35})
  assert.equal(store.state.spiritStones,7400)
  rejected(store,disk,{type:'learnSkill',id:'sj_flight'},'insufficient-points')
  assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
  assert.equal(store.act({type:'respecSkills'},0).returned,36)
  assert.equal(store.act({type:'respecSkills'},0).returned,0)
  assert.equal(growthSummary(store.state).available,36)
  assert.equal(store.state.spiritStones,7400)
  assert.deepEqual(store.state.books,['sj_formation','evo_sixiang'])
  assert.equal(store.state.researchPurchases,0)
})

test('weapon-only presets retain three choices and cannot switch learned skills off', () => {
  // This early-level preset test must use a legal Huang weapon.
  const weapon = rollWeapon('fan', 1, () => 0, 'weapon-1')
  const { store, disk } = fixture({ xp: 225, skills: { sj_yujian: 2, vajra: 1 },
    weapons: { iron: createIronWeapon(), 'weapon-1': weapon },
    weaponCounters: { iron: 0, 'weapon-1': 0 }, weaponSequence: 1 })
  assert.equal(store.act({ type: 'setLoadout', index: 2,
    loadout: { name: '新武器', weaponId: 'weapon-1', armorId: 'basic-armor', ringId: 'basic-ring' } }, 0).ok, true)
  assert.equal(store.act({ type: 'selectLoadout', index: 2 }, 0).ok, true)
  assert.deepEqual(combatLoadout(store.state).active, { sj_arc: 1, sj_yujian: 2 })
  assert.deepEqual(combatLoadout(store.state).passive, { vajra: 1 })
  assert.equal(combatLoadout(store.state).weaponId, 'weapon-1')
  assert.equal(store.state.loadouts.length, 3)
  assert.equal(new TowerCampaignStore(disk, 0).readOnly, false)
  rejected(store, disk, { type: 'selectLoadout', index: 3 }, 'invalid-index')
})

test('tutorial transaction survives failed writes, terminal reloads and three distinct first-wave retries', () => {
  let { store, disk } = fixture()
  for (let attempt = 1; attempt <= 3; attempt++) {
    const run = enter(store)
    assert.equal(run.state.attemptId, attempt)
    clearUntil(run, 1)
    if (attempt === 2) {
      run.state.player.hp = 0
      run.advance(1 / 60)
      assert.equal(run.state.phase, 'lost')
    } else run.abandon()
    const snapshot = run.snapshot()
    disk.fail = true
    rejected(store, disk, { type: 'checkpoint', snapshot }, 'save-failed')
    assert.equal(store.state.tutorialWaves, 0)
    disk.fail = false
    assert.equal(store.act({ type: 'checkpoint', snapshot }, 0).ok, true)
    store = new TowerCampaignStore(disk, 600000)
    assert.equal(store.state.tutorialWaves, 0)
    rejected(store, disk, { type: 'learnSkill', id: 'sj_yujian' }, 'pause-required')
    assert.equal(store.act({ type: 'finishFloor', snapshot }, 0).ok, true)
    if (attempt === 2) assert.equal(store.state.hp, 1)
    rejected(store, disk, { type: 'finishFloor', snapshot }, 'wrong-attempt')
    assert.equal(store.state.tutorialWaves, 0)
  }
  assert.equal(store.state.skills.sj_wanjian, undefined)
  const run = enter(store)
  const training = new TowerRun({ attemptId: run.state.attemptId, floor: 1, hp: store.state.hp,
    xp: store.state.xp, loadout: combatLoadout(store.state), training: true })
  assert.equal(validateTowerSnapshot(training.snapshot()), true)
  rejected(store, disk, { type: 'checkpoint', snapshot: training.snapshot() }, 'invalid-snapshot')
})

test('checkpoints cannot rewind object IDs, reroll an unchanged tick, rewrite entry HP or replace accepted kills', () => {
  const { store, disk } = fixture()
  const run = enter(store)
  clearUntil(run, 1)
  run.pause()
  const accepted = run.snapshot()
  assert.equal(store.act({ type: 'checkpoint', snapshot: accepted }, 0).ok, true)
  const rewound = clone(accepted), rerolled = clone(accepted), replaced = clone(accepted), rebased = clone(accepted)
  rewound.nextId--
  rerolled.rng = accepted.rng === 1 ? 2 : 1
  ;[replaced.killLedger[0], replaced.killLedger[1]] = [replaced.killLedger[1], replaced.killLedger[0]]
  rebased.base.hp = 99
  for (const [snapshot, reason] of [[rewound, 'stale-snapshot'], [rerolled, 'stale-snapshot'],
    [replaced, 'stale-snapshot'], [rebased, 'invalid-snapshot']]) {
    assert.equal(validateTowerSnapshot(snapshot), true)
    rejected(store, disk, { type: 'checkpoint', snapshot }, reason)
  }
  run.resume()
  run.setInput(1, 0)
  run.advance(1 / 60)
  assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok, true)
})

test('schema11 reload checks the Run entry XP and normal-core counter even when XP is capped', () => {
  const { store, disk } = fixture({ xp: 10920 })
  const run = enter(store)
  clearUntil(run, 1)
  assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok, true)
  for (const [key, value] of [['xp', 10919], ['normalCoreCounter', 1]]) {
    const inconsistent = clone(store.state)
    inconsistent.activeRun.base[key] = value
    put(disk, inconsistent)
    const reload = new TowerCampaignStore(disk, 0)
    assert.equal(reload.readOnly, true, key)
    assert.equal(reload.error, 'corrupt')
  }
})

for (const schema of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
  test(`schema${schema} resets all old progression once and preserves subsequent current-schema spending`, () => {
    const disk = storage(), now = 12345
    const old = legacy({ xp: 10920, hp: 37, cores: 777, contribution: 888,
      skills: { sj_yujian: 5, sj_line: 3 }, books: ['sj_line'],
      tutorialDone: true, tutorialWaves: 3, researchPurchases: 0, clearedFloor: 9,
      evolutionRanks: {}, lastResult: { outcome: 'won', floor: 9, firstClear: true,
        earned: { xp: 10, cores: 30, contribution: 50 } },
    })
    put(disk, old, schema)
    const store = new TowerCampaignStore(disk, now)
    assert.equal(store.readOnly, false, store.error)
    assert.deepEqual(store.state, new TowerCampaignStore(storage(), now).state)
    assert.deepEqual([store.state.spiritStones, store.state.contribution, store.state.xp, store.state.hp],
      [500, 1000, 0, 100])
    assert.deepEqual(store.migrationReport, { reset: true, fromSchema: schema })
    assert.equal(JSON.parse(disk.raw).schema, currentCampaignSchema)
    assert.equal(disk.writes, 1)
    const raw = disk.raw
    const reload = new TowerCampaignStore(disk, now + 1000)
    assert.equal(reload.migrationReport, null)
    assert.deepEqual(reload.state, store.state)
    assert.equal(disk.raw, raw)
    assert.equal(disk.writes, 1)
    assert.ok(reload.act({ type: 'buyPill',id:'huichun',count:1 }, now + 1000).ok)
    assert.equal(reload.state.spiritStones, 495)
    const spent = new TowerCampaignStore(disk, now + 2000)
    assert.deepEqual(spent.state, reload.state)
    assert.equal(spent.migrationReport, null)
    assert.equal(disk.writes, 2, 'reload never resets or awards starter resources again')
  })

  test(`schema${schema} failed reset leaves the old record intact and retries once`, () => {
    const disk = storage(), now = 12345
    put(disk, legacy({ xp: 120, cores: 777, skills: { sj_yujian: 2 } }), schema)
    const raw = disk.raw
    disk.fail = true
    const failed = new TowerCampaignStore(disk, now)
    assert.equal(failed.readOnly, true)
    assert.equal(failed.error, 'save-failed')
    assert.equal(failed.migrationReport, null)
    assert.equal(disk.raw, raw)
    assert.equal(disk.writes, 0)
    rejected(failed, disk, { type: 'drawWeapon' }, 'save-failed', now)
    disk.fail = false
    const retry = new TowerCampaignStore(disk, now)
    assert.equal(retry.readOnly, false, retry.error)
    assert.deepEqual(retry.state, new TowerCampaignStore(storage(), now).state)
    assert.deepEqual(retry.migrationReport, { reset: true, fromSchema: schema })
    assert.equal(disk.writes, 1)
    const reload = new TowerCampaignStore(disk, now)
    assert.deepEqual(reload.state, retry.state)
    assert.equal(reload.migrationReport, null)
    assert.equal(disk.writes, 1)
  })

  test(`schema${schema} reset CAS cannot replace another host's schema11 save`, () => {
    const disk = storage()
    put(disk, legacy({ xp: 120, cores: 777 }), schema)
    const winner = fixture({ spiritStones: 170, xp: 120 }).disk.raw
    let reads = 0
    disk.getItem = function () {
      if (++reads === 2) this.raw = winner
      return this.raw
    }
    const store = new TowerCampaignStore(disk, 0)
    assert.equal(store.readOnly, true)
    assert.equal(store.error, 'stale-save')
    assert.equal(store.migrationReport, null)
    assert.equal(disk.raw, winner)
    assert.equal(disk.writes, 0)
  })
}

for (const phase of ['paused', 'won', 'lost']) {
  test(`old ${phase} battle is discarded on reset and cannot settle old rewards`, () => {
    const { store: source } = fixture({ xp: 120 })
    const run = enter(source)
    clearUntil(run, phase === 'won' ? 20 : 1)
    if (phase === 'paused') run.pause()
    if (phase === 'lost') {
      run.state.player.hp = 0
      run.advance(1 / 60)
    }
    const snapshot = run.snapshot()
    assert.equal(snapshot.phase, phase)
    const disk = storage()
    put(disk, legacy({ xp: snapshot.player.xp, hp: snapshot.player.hp,
      cores: 20 + snapshot.earned.cores, attemptSequence: 1,
      activeRun: { id: 1, floor: 1, base: { xp: 120, cores: 20, contribution: 300,
        normalCoreCounter: 0, tutorialWaves: 0 }, snapshot },
    }), 3)
    const store = new TowerCampaignStore(disk, 0)
    assert.equal(store.readOnly, false, store.error)
    assert.deepEqual(store.state, new TowerCampaignStore(storage(), 0).state)
    assert.equal(store.state.activeRun, null)
    assert.equal(store.state.lastResult, null)
    rejected(store, disk, { type: 'checkpoint', snapshot }, 'wrong-attempt')
    rejected(store, disk, { type: 'finishFloor', snapshot }, 'wrong-attempt')
    assert.deepEqual(new TowerCampaignStore(disk, 0).state, store.state)
  })
}

test('book and research purchases reject low spirit-stone balances without spending points or contribution', () => {
  const book = fixture({ xp: 10920, clearedFloor: 1, spiritStones: 199, skills: { sj_yujian: 2 } })
  rejected(book.store, book.disk, { type: 'learnSkill', id: 'sj_shadow' }, 'insufficient')
  assert.deepEqual(book.store.state.books, [])
  for(const spiritStones of [0,799,800,1600,2400,10000]){
    const f=fixture({clearedFloor:9,spiritStones})
    rejected(f.store,f.disk,{type:'researchPoint'},'retired-research')
  }
})

test('initialization clears every rank, releases teaching points once and survives reload', () => {
  const {store, disk} = fixture({xp:10920, tutorialWaves:3,
    skills:{sj_yujian:4,sj_arc:1,sj_wanjian:1,sj_heart:2}})
  const before = growthSummary(store.state)
  const reset = store.act({type:'respecSkills'},0)
  assert.equal(reset.ok,true)
  assert.deepEqual(store.state.skills,{})
  assert.equal(reset.returned,before.spent+1)
  assert.equal(growthSummary(store.state).available,before.available+reset.returned)
  const reload = new TowerCampaignStore(disk,0)
  assert.equal(reload.readOnly,false)
  assert.deepEqual(reload.state.skills,{})
  assert.equal(reload.act({type:'respecSkills'},0).returned,0)
  const points = growthSummary(reload.state).available
  assert.equal(reload.act({type:'learnSkill',id:'sj_yujian'},0).ok,true)
  assert.equal(reload.state.skills.sj_yujian,1)
  assert.equal(growthSummary(reload.state).available,points-1)
  const run = enter(reload)
  assert.equal(validateTowerSnapshot(run.snapshot()),true)
  assert.equal(run.state.loadout.active.sj_arc,undefined)
})

test('failed initialization keeps all ranks and points unchanged', () => {
  const {store,disk}=fixture({xp:10920,skills:{sj_yujian:4}})
  const state=clone(store.state),raw=disk.raw
  disk.fail=true
  assert.equal(store.act({type:'respecSkills'},0).ok,false)
  assert.deepEqual(store.state,state)
  assert.equal(disk.raw,raw)
  disk.fail=false
  assert.equal(store.act({type:'respecSkills'},0).ok,true)
  assert.deepEqual(store.state.skills,{})
})

test('initialized empty build can enter, learn while paused and never regains old teaching skills', () => {
  const {store,disk}=fixture({xp:10920,tutorialWaves:3,skills:{sj_yujian:1,sj_arc:1,sj_wanjian:1}})
  assert.equal(store.act({type:'respecSkills'},0).ok,true)
  const run=enter(store)
  assert.deepEqual(run.state.loadout.active,{})
  run.pause()
  assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
  assert.equal(store.act({type:'learnSkill',id:'sj_yujian'},0).ok,true)
  const resumed=TowerRun.restore(store.state.activeRun.snapshot)
  resumed.resume()
  clearUntil(resumed,1)
  assert.equal(resumed.state.loadout.active.sj_arc,undefined)
  assert.equal(resumed.state.loadout.active.sj_wanjian,undefined)
  assert.equal(store.act({type:'checkpoint',snapshot:resumed.snapshot()},0).ok,true)
  assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
})

test('new teaching milestones after initialization give points once instead of readding skills', () => {
  const {store}=fixture({xp:10920})
  assert.equal(store.act({type:'respecSkills'},0).ok,true)
  assert.equal(store.act({type:'learnSkill',id:'sj_yujian'},0).ok,true)
  const before=growthSummary(store.state).available
  const run=enter(store)
  clearUntil(run,8)
  assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
  assert.equal(store.state.tutorialWaves,0)
  assert.equal(store.state.skills.sj_arc,undefined)
  assert.equal(growthSummary(store.state).available,before)
  assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
  assert.equal(growthSummary(store.state).available,before)
})
