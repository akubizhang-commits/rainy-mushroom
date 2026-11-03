import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { createIronWeapon, rollWeapon, validateWeapon } from '../js/xianxia/TowerWeapons.js'
import { TowerRun, validateTowerSnapshot, stats as combatStats } from '../js/xianxia/TowerRun.js'
import { FORGE_MATERIALS } from '../js/xianxia/TowerForgeMaterials.js'
import { forgingRecipe, forgingQuote } from '../js/xianxia/TowerForging.js'
import { cultivationAt, cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
import { checksum } from '../js/xianxia/Checksum.js'

// Fixed-identity Campaign contract, independent of rendering and other test files.
// Fixtures are encoded current schema records, not mutations of the Store's frozen state.
const NOW = 1_800_000_000_000
const UNRELATED = 'unrelated-profile'
const clone = value => JSON.parse(JSON.stringify(value))
function memoryStorage() {
  return {
    records: new Map([[UNRELATED, 'leave-this-record-alone']]),
    writes: [], fail: false,
    getItem(key) { return this.records.get(key) ?? null },
    setItem(key, value) {
      if (this.fail) throw new Error('simulated storage failure')
      this.writes.push({ key, value })
      this.records.set(key, value)
    },
  }
}
function put(disk, state, schema = currentCampaignSchema) {
  const data = JSON.stringify(state)
  const raw = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema, data, checksum: checksum(data) })
  disk.records.set(TOWER_CAMPAIGN_KEY, raw)
  return raw
}
function fixture(patch = {}) {
  if (patch.skills && !patch.skillsInitialized) patch = { ...patch, skills: { sj_arc: 1, ...patch.skills } }
  const disk = memoryStorage(), initial = new TowerCampaignStore(disk, NOW)
  const state = { ...clone(initial.state), ...patch, pills: {...initial.state.pills,...Object.fromEntries(Object.keys(FORGE_MATERIALS).map(id=>[id,10000])),...patch.pills} }
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
  put(disk, state)
  const store = new TowerCampaignStore(disk, NOW)
  assert.equal(store.readOnly, false, `current schema fixture rejected: ${store.error}`)
  assert.equal(disk.writes.length, 0, 'reading a current fixture must not reset it')
  return { disk, store }
}
function ownedPatch({ tier = 'fan', quality = 1, count = 1, ...patch } = {}) {
  const weapons = { iron: createIronWeapon() }, weaponCounters = { iron: 0 }
  for (let n = 1; n <= count; n++) {
    const id = `weapon-${n}`
    weapons[id] = rollWeapon(tier, quality, () => 0, id)
    weaponCounters[id] = 0
  }
  return { weapons, weaponCounters, weaponSequence: count, spiritStones: 10000, contribution: 10000, ...patch }
}
function forge(store,tier='fan',quality=1) { return {type:tier==='fan'?'buyGear':'craftGear',id:`weapon:${tier}:q${quality}`,count:1,sequence:store.state.forgeSequence+1,requestId:`forge-${store.state.forgeSequence+1}`} }
function act(store, action) {
  const result = store.act(action, NOW)
  assert.equal(result.ok, true, `${JSON.stringify(action)}: ${result.reason}`)
  return result
}
function rejected(store, disk, action, reason) {
  const state = store.state, records = new Map(disk.records), writes = disk.writes.length
  const result = store.act(action, NOW)
  assert.equal(result.ok, false, JSON.stringify(action))
  assert.equal(typeof result.reason, 'string')
  if (reason) assert.equal(result.reason, reason)
  assert.strictEqual(store.state, state, 'rejection must retain the complete published state, including RNG/pity/sequence')
  assert.deepEqual(disk.records, records, 'rejection must preserve every stored byte')
  assert.equal(disk.writes.length, writes, 'rejection must not write')
  return result
}
function reload(disk, expected) {
  const writes = disk.writes.length, store = new TowerCampaignStore(disk, NOW)
  assert.equal(store.readOnly, false, store.error)
  if (expected) assert.deepEqual(store.state, expected)
  assert.equal(disk.writes.length, writes, 'reopening current schema neither rerolls nor resets')
  assert.equal(disk.records.get(UNRELATED), 'leave-this-record-alone')
  return store
}
function equip(store, id, index = 0) {
  act(store, { type: 'setLoadout', index, loadout: { ...clone(store.state.loadouts[index]), weaponId: id } })
}

test('current schema starts with one immutable iron instance, zero counters and iron in all three loadouts', () => {
  const disk = memoryStorage(), store = new TowerCampaignStore(disk, NOW)
  assert.deepEqual(store.state.weapons, { iron: createIronWeapon() })
  assert.deepEqual(store.state.weaponCounters, { iron: 0 })
  assert.equal(store.state.weaponSequence, 0)
  assert.deepEqual(store.state.loadouts.map(row => row.weaponId), ['iron', 'iron', 'iron'])
  assert.deepEqual([store.state.spiritStones, store.state.contribution, store.state.xp], [500, 300, 0])
  assert.throws(() => { store.state.weapons.iron.locked = false }, TypeError)
  act(store, { type: 'sync' })
  const envelope = JSON.parse(disk.getItem(TOWER_CAMPAIGN_KEY))
  assert.equal(envelope.schema, currentCampaignSchema)
  assert.equal(envelope.checksum, checksum(envelope.data))
  reload(disk, store.state)
})

for (const schema of [1, 2, 3, 4, 5]) {
  test(`obsolete schema${schema} resets once to current schema instead of migrating equipment`, () => {
    const disk = memoryStorage(), fresh = clone(new TowerCampaignStore(disk, NOW).state)
    put(disk, { ...fresh, xp: 630, spiritStones: 9999, contribution: 8888,
      weapons: { eq_sword_suwen: { quality: 4, refine: 4 } } }, schema)
    const store = new TowerCampaignStore(disk, NOW)
    assert.equal(store.readOnly, false)
    assert.deepEqual(store.state, fresh)
    assert.deepEqual(store.migrationReport, { reset: true, fromSchema: schema })
    assert.equal(disk.writes.length, 1)
    assert.equal(JSON.parse(disk.getItem(TOWER_CAMPAIGN_KEY)).schema, currentCampaignSchema)
    assert.equal(reload(disk, fresh).migrationReport, null)
  })
}

test('failed obsolete-save reset stays read-only and preserves the original raw record', () => {
  const disk = memoryStorage()
  const raw = put(disk, { obsoleteEquipment: true }, 4)
  disk.fail = true
  const store = new TowerCampaignStore(disk, NOW)
  assert.equal(store.readOnly, true)
  assert.equal(store.error, 'save-failed')
  assert.equal(store.migrationReport, null)
  rejected(store, disk, { type: 'drawWeapon' }, 'save-failed')
  assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY), raw)
  disk.fail = false
  const recovered = new TowerCampaignStore(disk, NOW)
  assert.equal(recovered.readOnly, false)
  assert.deepEqual(recovered.state.weapons, { iron: createIronWeapon() })
  assert.equal(disk.writes.length, 1)
})

test('fan purchase charges its quote and creates a detached fixed serialized instance', () => {
  const {store,disk}=fixture(),before=clone(store.state),action=forge(store)
  const quote=forgingQuote(before,action.id,1,'buy')
  const result=act(store,action)
  assert.deepEqual(result.ids,['weapon-1'])
  assert.equal(store.state.spiritStones,before.spiritStones-quote.spiritStones)
  assert.equal(store.state.contribution,before.contribution-quote.contribution)
  for(const row of quote.ingredients)assert.equal(store.state.pills[row.id],before.pills[row.id]-row.required)
  const weapon=store.state.weapons['weapon-1']
  assert.deepEqual(Object.keys(weapon).sort(),['affixes','definitionId','id','locked','quality','refine','tier'])
  assert.equal(weapon.definitionId,'eq_sword_suwen');assert.equal(weapon.quality,1)
  assert.ok(validateWeapon(weapon));assert.equal(store.state.weaponCounters['weapon-1'],0)
  assert.deepEqual(store.state.loadouts,before.loadouts);assert.deepEqual(store.state.skills,before.skills)
  assert.throws(()=>{weapon.affixes[0].value=999},TypeError)
  const committed=store.state
  assert.equal(act(store,action).duplicate,true);assert.deepEqual(store.state,committed)
  reload(disk,store.state)
})

test('ling forging opens exactly at cultivation level21; unsupported pools never spend or roll', () => {
  const low=fixture({xp:cultivationLevelXp(21)-1})
  assert.equal(cultivationAt(low.store.state.xp).level,20)
  rejected(low.store,low.disk,forge(low.store,'ling'),'realm-locked')
  const high=fixture({xp:cultivationLevelXp(21)})
  act(high.store,forge(high.store,'ling'))
  assert.equal(high.store.state.weapons['weapon-1'].tier,'ling')
  for(const tier of ['di','tian','iron','',1])rejected(high.store,high.disk,forge(high.store,tier),'unknown-recipe')
})

for (const patch of [{ spiritStones: 0 }, { contribution: 0 }]) {
  test(`forge rejects insufficient ${Object.keys(patch)[0]} before changing RNG or pity`, () => {
    const { store, disk } = fixture({ ...patch, weaponPity: 19 })
    rejected(store, disk, forge(store))
  })
}

test('explicit forging quality never rolls another grade and retired draw actions cannot bypass it', () => {
  for(const tier of ['fa','bao','ling'])for(const quality of [1,2,3,4]){
    const {store,disk}=fixture({xp:cultivationLevelXp(21),spiritStones:100000,contribution:100000})
    act(store,forge(store,tier,quality))
    const w=store.state.weapons['weapon-1']
    assert.equal(w.tier,tier);assert.equal(w.quality,quality)
    assert.ok(forgingRecipe(`weapon:${tier}:q${quality}`).definitionIds.includes(w.definitionId))
    for(const type of ['drawWeapon','drawForge'])rejected(store,disk,{type,tier},'retired-forge')
  }
})
test('forge random state and products survive reload',()=>{
 const {store,disk}=fixture({xp:225,spiritStones:100000,contribution:100000})
 for(let i=0;i<4;i++){act(store,forge(store,'fa'));reload(disk,store.state)}
 assert.equal('forgeWishes' in store.state,false)
})

test('identical fixed products retain separate instances without dismantling or refunds',()=>{
  const {store,disk}=fixture(),before=clone(store.state),quote=forgingQuote(store.state,'weapon:fan:q1',1,'buy')
  act(store,forge(store));const first=clone(store.state.weapons['weapon-1'])
  act(store,forge(store))
  assert.deepEqual(store.state.weapons['weapon-1'],first)
  assert.deepEqual(store.state.weapons['weapon-2'],{...first,id:'weapon-2'})
  assert.equal(store.state.spiritStones,before.spiritStones-2*quote.spiritStones)
  assert.equal(store.state.contribution,before.contribution-2*quote.contribution)
  assert.notStrictEqual(store.state.weapons['weapon-1'],store.state.weapons['weapon-2'])
  reload(disk,store.state)
})

test('combined capacity240 rejects before charging, advancing RNG/pity/sequence, or discarding any duplicate', () => {
  const { store, disk } = fixture(ownedPatch({ count: 236, weaponPity: 19 }))
  act(store, forge(store))
  assert.equal(Object.keys(store.state.weapons).length + Object.keys(store.state.equipment).length, 240)
  const kept = clone(store.state.weapons)
  rejected(store, disk, forge(store), 'capacity')
  assert.deepEqual(store.state.weapons, kept)
  act(store, { type: 'dismantleWeapon', id: 'weapon-1' })
  act(store, forge(store))
  assert.equal(store.state.weaponSequence, 238)
  assert.equal(store.state.weapons['weapon-238'].id, 'weapon-238')
  assert.equal(store.state.weapons['weapon-1'], undefined, 'freed IDs are never reused')
  reload(disk, store.state)
})

test('weapon refinement is disabled even with ample funds or unavailable storage', () => {
  const { store, disk } = fixture(ownedPatch())
  for (const fail of [false, true]) {
    disk.fail = fail
    for (const id of ['iron', 'weapon-1', 'missing', null]) {
      rejected(store, disk, { type: 'refineWeapon', id }, 'refinement-disabled')
    }
  }
  disk.fail = false
  reload(disk, store.state)
})

test('locking is removed and dismantling still rejects iron and every referenced loadout', () => {
  const { store, disk } = fixture(ownedPatch())
  rejected(store, disk, { type: 'dismantleWeapon', id: 'iron' })
  rejected(store, disk, { type: 'lockWeapon', id: 'weapon-1', locked: true })
  rejected(store, disk, { type: 'lockWeapon', id: 'weapon-1', locked: false })
  for (let index = 0; index < 3; index++) {
    equip(store, 'weapon-1', index)
    rejected(store, disk, { type: 'dismantleWeapon', id: 'weapon-1' })
    equip(store, 'iron', index)
  }
  for (const locked of [undefined, null, 0, 'false']) rejected(store, disk, { type: 'lockWeapon', id: 'weapon-1', locked })
  rejected(store, disk, { type: 'lockWeapon', id: 'missing', locked: true })
  rejected(store, disk, { type: 'dismantleWeapon', id: 'missing' })
})

for (const [quality, refund] of [[1, 2], [2, 4], [3, 8], [4, 16]]) {
  test(`dismantling quality${quality} refunds exactly${refund} contribution, never the forge costs`, () => {
    const patch = ownedPatch({ tier:quality===1?'fan':'fa',quality,xp:225 })
    patch.weaponCounters['weapon-1'] = 3
    const { store, disk } = fixture(patch)
    const before = clone(store.state)
    act(store, { type: 'dismantleWeapon', id: 'weapon-1' })
    assert.equal(store.state.contribution, before.contribution + refund)
    assert.equal(store.state.spiritStones, before.spiritStones)
    assert.equal(store.state.weapons['weapon-1'], undefined)
    assert.equal(store.state.weaponCounters['weapon-1'], undefined)
    assert.equal(store.state.weaponSequence, before.weaponSequence)
    assert.equal(store.state.rng, before.rng)
    assert.equal(store.state.weaponPity, before.weaponPity)
    reload(disk, store.state)
    rejected(store, disk, { type: 'dismantleWeapon', id: 'weapon-1' })
  })
}

for (const action of [
  { type: 'craftGear', id: 'weapon:ling:q1', count:1, sequence:1, requestId:'atomic-forge' },
  { type: 'dismantleWeapon', id: 'weapon-1' },
]) {
  test(`${action.type} save failure is atomic; retry matches one successful transaction exactly`, () => {
    const { store, disk } = fixture(ownedPatch({ xp: cultivationLevelXp(21), weaponPity: 19 }))
    const controlDisk = memoryStorage()
    controlDisk.records = new Map(disk.records)
    const control = new TowerCampaignStore(controlDisk, NOW)
    act(control, action)
    disk.fail = true
    rejected(store, disk, action, 'save-failed')
    disk.fail = false
    act(store, action)
    assert.deepEqual(store.state, control.state)
    assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY), controlDisk.getItem(TOWER_CAMPAIGN_KEY))
    assert.equal(disk.writes.length, 1)
    reload(disk, store.state)
  })
}

test('a stale second store cannot overwrite a newer forge or reuse its instance sequence', () => {
  const { store, disk } = fixture({ spiritStones: 1000, contribution: 1000 })
  const stale = new TowerCampaignStore(disk, NOW)
  act(store, forge(store))
  rejected(stale, disk, forge(stale), 'stale-save')
  const current = reload(disk, store.state)
  act(current, forge(current))
  assert.deepEqual(Object.keys(current.state.weapons).sort(), ['iron', 'weapon-1', 'weapon-2'])
})

test('checksummed current schema rejects forged instances, affixes, ownership and counter records without rewriting', () => {
  for (const [name, mutate] of [
    ['unknown identity', state => { state.weapons['weapon-1'].definitionId = 'invented' }],
    ['mismatched instance key', state => { state.weapons['weapon-1'].id = 'weapon-2' }],
    ['out-of-budget affix', state => { state.weapons['weapon-1'].affixes[0].value = 999 }],
    ['disabled refine', state => { state.weapons['weapon-1'].refine = 1 }],
    ['refine overflow', state => { state.weapons['weapon-1'].refine = 5 }],
    ['sequence rollback', state => { state.weaponSequence = 0 }],
    ['missing counter', state => { delete state.weaponCounters['weapon-1'] }],
    ['orphan counter', state => { state.weaponCounters['weapon-99'] = 0 }],
    ['counter overflow', state => { state.weaponCounters['weapon-1'] = 5 }],
    ['definition is not an owned instance', state => { state.loadouts[2].weaponId = state.weapons['weapon-1'].definitionId }],
  ]) {
    const { disk, store } = fixture(ownedPatch())
    const state = clone(store.state)
    mutate(state)
    const raw = put(disk, state), writes = disk.writes.length
    const corrupt = new TowerCampaignStore(disk, NOW)
    assert.equal(corrupt.readOnly, true, name)
    assert.equal(corrupt.error, 'corrupt', name)
    rejected(corrupt, disk, { type: 'drawWeapon' }, 'corrupt')
    assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY), raw, name)
    assert.equal(disk.writes.length, writes, name)
  }
})

test('valid standalone snapshots cannot swap equipped instances, improve affixes or forge entry counters', () => {
  const { disk, store } = fixture(ownedPatch({ count: 2 }))
  equip(store, 'weapon-1')
  const entered = act(store, { type: 'startFloor', floor: 1, seed: 123 })
  const run = TowerRun.restore(entered.snapshot)
  // Advance the real simulation so loadout forgery reaches identity validation,
  // rather than being rejected earlier as a changed receipt at the same tick.
  run.advance(1 / 30)
  assert.ok(run.state.ticks > entered.snapshot.ticks)
  run.pause()
  const original = run.snapshot()
  for (const [name, mutate] of [
    ['improved affix', snapshot => {
      snapshot.loadout.weapon.affixes[0].value += .1
      assert.equal(validateWeapon(snapshot.loadout.weapon),false)
    }],
    ['different owned instance', snapshot => {
      snapshot.loadout.weapon.id = 'weapon-2'
      snapshot.loadout.weaponId = 'weapon-2'
    }],
    ['counter advance', snapshot => {
      snapshot.loadout.weaponFocusCount = 4
      snapshot.weaponState.focusCount = 4
    }],
  ]) {
    const snapshot = clone(original)
    mutate(snapshot)
    assert.equal(validateTowerSnapshot(snapshot), name !== 'improved affix', `${name}: fixed-affix tampering is invalid even standalone`)
    rejected(store, disk, { type: 'checkpoint', snapshot }, 'invalid-snapshot')
  }
  for (const action of [
    forge(store),
      { type: 'dismantleWeapon', id: 'weapon-2' },
  ]) rejected(store, disk, action, 'in-tower')
  act(store, { type: 'checkpoint', snapshot: original })
  reload(disk, store.state)
})

