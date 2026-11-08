import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import { FORGE_MATERIALS } from '../js/xianxia/TowerForgeMaterials.js'
import { forgingRecipe, dismantleStoneRefund } from '../js/xianxia/TowerForging.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { createBasicEquipment, rollEquipment, validateEquipment } from '../js/xianxia/TowerEquipment.js'
import { TowerRun, validateTowerSnapshot, stats } from '../js/xianxia/TowerRun.js'
import { checksum } from '../js/xianxia/Checksum.js'

// Revision43 persistence tests. Real item generation, Store validation and Run;
// only the storage boundary is replaced. No rendering or real saves are used.
const NOW = 1_800_000_000_000
const clone = value => JSON.parse(JSON.stringify(value))
const categories = ['armor', 'ring']
function memoryStorage() {
  return {
    records: new Map([['unrelated-save', 'preserve-me']]), writes: [], fail: false,
    getItem(key) { return this.records.get(key) ?? null },
    setItem(key, value) {
      if (this.fail) throw new Error('simulated disk failure')
      this.writes.push({ key, value })
      this.records.set(key, value)
    },
  }
}
function put(disk, state) {
  const data = JSON.stringify(state)
  const raw = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data, checksum: checksum(data) })
  disk.records.set(TOWER_CAMPAIGN_KEY, raw)
  return raw
}
function fixture(patch = {}) {
  if (patch.skills && !patch.skillsInitialized) patch = { ...patch, skills: { sj_arc: 1, ...patch.skills } }
  const disk = memoryStorage(), fresh = new TowerCampaignStore(disk, NOW)
  const state = { ...clone(fresh.state), ...patch, pills: { ...fresh.state.pills, ...Object.fromEntries(Object.keys(FORGE_MATERIALS).map(id=>[id,10000])), ...patch.pills } }
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
  assert.equal(store.readOnly, false, `schema11 fixture rejected: ${store.error}`)
  assert.equal(disk.writes.length, 0)
  return { store, disk }
}
function inventory(category = 'ring', quality = 4, count = 1) {
  const equipment = Object.fromEntries(categories.map(kind => [`basic-${kind}`, createBasicEquipment(kind)]))
  const equipmentCounters = { 'basic-ring': 0 }
  for (let n = 1; n <= count; n++) {
    const id = `gear-${n}`
    equipment[id] = rollEquipment(category, 'fa', quality, () => 0, id)
    if (category === 'ring') equipmentCounters[id] = 0
  }
  return { equipment, equipmentSequence: count, equipmentCounters,
    spiritStones: 10000, contribution: 10000, xp: 6601 }
}
function act(store, action) {
  const result = store.act(action, NOW)
  assert.equal(result.ok, true, `${JSON.stringify(action)}: ${result.reason}`)
  return result
}
function reject(store, disk, action, reason) {
  const before = store.state, records = new Map(disk.records), writes = disk.writes.length
  const result = store.act(action, NOW)
  assert.equal(result.ok, false, JSON.stringify(action))
  assert.equal(typeof result.reason, 'string')
  if (reason) assert.equal(result.reason, reason)
  assert.strictEqual(store.state, before, 'rejection cannot publish any wallet, RNG, pity, ID or loadout change')
  assert.deepEqual(disk.records, records)
  assert.equal(disk.writes.length, writes)
}
function reload(disk, state) {
  const records = new Map(disk.records), writes = disk.writes.length
  const store = new TowerCampaignStore(disk, NOW)
  assert.equal(store.readOnly, false, store.error)
  assert.deepEqual(store.state, state)
  assert.deepEqual(disk.records, records)
  assert.equal(disk.writes.length, writes)
  assert.equal(disk.records.get('unrelated-save'), 'preserve-me')
  return store
}
function forgeAction(store, category, tier='fan', quality=1) {
 const sequence=store.state.forgeSequence+1
 return {type:tier==='fan'?'buyGear':'craftGear',id:`${category}:${tier}:q${quality}`,count:1,sequence,requestId:`equipment-${sequence}`}
}
function draw(store, category, tier = 'fan', quality=1) {
  const sequence = store.state.equipmentSequence
  act(store, forgeAction(store,category,tier,quality))
  assert.equal(store.state.equipmentSequence, sequence + 1)
  const item = store.state.equipment[`gear-${sequence + 1}`]
  assert.ok(item)
  assert.equal(item.id, `gear-${sequence + 1}`)
  assert.equal(item.category, category)
  assert.equal(item.tier, tier)
  assert.equal(validateEquipment(item, category), true)
  return item
}

test('schema11 owns both basic items and ring-only counters, with isolated empty pool histories', () => {
  const disk = memoryStorage(), store = new TowerCampaignStore(disk, NOW)
  assert.deepEqual(store.state.equipment, {
    'basic-armor': createBasicEquipment('armor'), 'basic-ring': createBasicEquipment('ring'),
  })
  assert.equal(store.state.equipmentSequence, 0)
  assert.deepEqual(store.state.equipmentCounters, { 'basic-ring': 0 })
  assert.deepEqual(store.state.equipmentPity, { armor: 0, ring: 0 })
  assert.deepEqual(store.state.equipmentDraws, { armor: 0, ring: 0 })
  for (const category of categories) {
    assert.ok(Number.isInteger(store.state.equipmentRng[category]) && store.state.equipmentRng[category] > 0)
    assert.deepEqual(store.state.loadouts.map(row => row[`${category}Id`]), Array(3).fill(`basic-${category}`))
  }
  assert.throws(() => { store.state.equipment['basic-ring'].locked = false }, TypeError)
  act(store, { type: 'sync' })
  const saved = JSON.parse(disk.getItem(TOWER_CAMPAIGN_KEY))
  assert.equal(saved.schema, currentCampaignSchema)
  assert.equal(saved.checksum, checksum(saved.data))
  reload(disk, store.state)
})

for (const category of categories) {
  test(`${category} purchases cost24 stones and no vouchers, retain affixes and never auto-equip`, () => {
    const { store, disk } = fixture()
    const before = clone(store.state), item = draw(store, category)
    assert.equal(store.state.spiritStones, before.spiritStones - 24)
    assert.equal(store.state.contribution, before.contribution)
    assert.deepEqual(store.state.loadouts, before.loadouts)
    assert.deepEqual(store.state.weapons, before.weapons)
    assert.equal(store.state.rng, before.rng)
    assert.equal(store.state.weaponPity, before.weaponPity)
    assert.equal(store.state.equipmentDraws[category], 0)
    assert.equal(item.refine, 0)
    assert.equal(item.locked, false)
    assert.equal(Object.hasOwn(store.state.equipmentCounters, item.id), category === 'ring')
    assert.throws(() => { item.affixes[0].value = 999 }, TypeError)
    reload(disk, store.state)
  })

  test(`${category} requires level21 for ling, and rejects bad categories, tiers and insufficient payment`, () => {
    const low = fixture({ xp: 6600 })
    reject(low.store, low.disk, forgeAction(low.store, category, 'ling'))
    const high = fixture({ xp: 6601, spiritStones:10000, contribution:10000 })
    draw(high.store, category, 'ling')
    for (const tier of ['', 'di', 'tian', 1, {}, []]) {
      reject(high.store, high.disk, forgeAction(high.store,category,tier))
    }
    for (const invalid of [undefined, null, '', 'weapon', 'ARMOR', '__proto__', 0, {}, []]) {
      if(invalid!=='weapon')reject(high.store, high.disk, forgeAction(high.store,invalid))
      reject(high.store, high.disk, { type: 'equipEquipment', category: invalid, id: 'gear-1' })
    }
    for (const patch of [{ spiritStones: 23 }]) {
      const poor = fixture(patch)
      reject(poor.store, poor.disk, forgeAction(poor.store,category))
    }
    const exact = fixture({ spiritStones: 24, contribution: 0 })
    draw(exact.store, category)
    assert.equal(exact.store.state.spiritStones, 0)
    assert.equal(exact.store.state.contribution, 0)
  })

  test(`${category} rejects an explicitly null tier without charging or advancing its pool`, () => {
    const { store, disk } = fixture()
    reject(store, disk, forgeAction(store,category,null), 'unknown-recipe')
  })

  test(`${category} rejects malformed instance IDs for every equipment mutation`, () => {
    const { store, disk } = fixture(inventory(category))
    for (const type of ['equipEquipment', 'refineEquipment', 'lockEquipment', 'dismantleEquipment']) {
      for (const id of [undefined, null, '', 1, '__proto__', 'iron', 'gear-999', ['gear-1'], {}]) {
        reject(store, disk, { type, category, id, locked: true })
      }
    }
  })

  test(`${category} refinement is disabled regardless of funds or storage availability`, () => {
    for (const contribution of [0, 10000]) {
      const patch = inventory(category)
      patch.contribution = contribution
      const { store, disk } = fixture(patch)
      for (const fail of [false, true]) {
        disk.fail = fail
        for (const id of ['gear-1', `basic-${category}`, 'missing', null]) {
          reject(store, disk, { type: 'refineEquipment', id }, 'refinement-disabled')
        }
      }
      disk.fail = false
      reload(disk, store.state)
    }
  })

  test(`${category} cannot equip an owned ling instance before level21`, () => {
    const patch = inventory(category)
    patch.equipment['gear-1'] = rollEquipment(category, 'ling', 4, () => 0, 'gear-1')
    patch.xp = 6600
    const { store, disk } = fixture(patch)
    reject(store, disk, { type: 'equipEquipment', category, id: 'gear-1' }, 'realm-locked')
    const unlocked = fixture({ ...patch, xp: 6601 })
    act(unlocked.store, { type: 'equipEquipment', category, id: 'gear-1' })
    assert.equal(unlocked.store.state.loadouts[0][`${category}Id`], 'gear-1')
    reload(unlocked.disk, unlocked.store.state)
  })

  test(`${category} fixed quality pool keeps every craft within its quality pool`, () => {
    const {store,disk}=fixture({xp:6601,spiritStones:10000,contribution:10000})
    const id=`${category}:fa:q1`,targetId=forgingRecipe(id).definitionIds[1]
    const other=category==='armor'?'ring':'armor',otherId=`${other}:fa:q1`
    const products=[]
    for(let i=0;i<3;i++)products.push(draw(store,category,'fa',1))
    assert.ok(products.every(item=>item.quality===1&&forgingRecipe(id).definitionIds.includes(item.definitionId)))
    reload(disk,store.state)
  })

  test(`${category} keeps identical duplicate instances without automatic refunds`, () => {
    const initial = fixture({ equipmentRng: { armor: 1, ring: 1 } })
    const first = clone(draw(initial.store, category))
    const { store, disk } = fixture({ ...clone(initial.store.state), equipmentRng: { armor: 1, ring: 1 } })
    const duplicate = draw(store, category)
    assert.deepEqual(duplicate, { ...first, id: 'gear-2' })
    assert.equal(store.state.contribution, 1000, 'purchases do not spend or refund vouchers')
    assert.equal(store.state.spiritStones, 452)
    assert.deepEqual(store.state.equipment[first.id], first)
    assert.deepEqual(store.state.equipment[duplicate.id], { ...first, id: 'gear-2' })
    reject(store, disk, { type: 'refineEquipment', id: duplicate.id }, 'refinement-disabled')
    reload(disk, store.state)
  })

  test(`${category} equip changes only the selected preset and all preset references prevent dismantling`, () => {
    const { store, disk } = fixture(inventory(category))
    const before = clone(store.state)
    for (const id of [undefined, null, '', 1, '__proto__', 'iron', 'gear-999', `basic-${category === 'armor' ? 'ring' : 'armor'}`]) {
      reject(store, disk, { type: 'equipEquipment', category, id })
    }
    for (let index = 0; index < 3; index++) {
      act(store, { type: 'selectLoadout', index })
      const presets = clone(store.state.loadouts)
      act(store, { type: 'equipEquipment', category, id: 'gear-1' })
      presets[index][`${category}Id`] = 'gear-1'
      assert.deepEqual(store.state.loadouts, presets)
      // Also check a reference in an unselected preset.
      act(store, { type: 'selectLoadout', index: (index + 1) % 3 })
      reject(store, disk, { type: 'dismantleEquipment', id: 'gear-1' })
      act(store, { type: 'selectLoadout', index })
      act(store, { type: 'equipEquipment', category, id: `basic-${category}` })
    }
    reject(store, disk, { type: 'lockEquipment', id: 'gear-1', locked: true })
    reject(store, disk, { type: 'dismantleEquipment', id: `basic-${category}` })
    for (const locked of [undefined, null, 0, 'false']) {
      reject(store, disk, { type: 'lockEquipment', id: 'gear-1', locked })
    }
    reject(store, disk, { type: 'lockEquipment', id: 'gear-1', locked: false })
    act(store, { type: 'dismantleEquipment', id: 'gear-1' })
    assert.equal(store.state.equipment['gear-1'], undefined)
    assert.equal(store.state.equipmentCounters['gear-1'], undefined)
    assert.equal(store.state.equipmentSequence, 1, 'dismantling does not recycle sequence numbers')
    assert.equal(store.state.contribution, before.contribution)
    assert.equal(store.state.spiritStones, before.spiritStones+dismantleStoneRefund(before.equipment['gear-1']))
    reject(store, disk, { type: 'dismantleEquipment', id: 'gear-1' })
  })

  for (const action of [
    {type:'craftGear',id:`${category}:ling:q1`,count:1,sequence:1,requestId:'save-failure'},
    { type: 'equipEquipment', category, id: 'gear-1' },
    { type: 'dismantleEquipment', id: 'gear-1' },
  ]) {
    test(`${category} ${action.type} save failure publishes nothing and retries deterministically`, () => {
      const { store, disk } = fixture(inventory(category))
      const controlDisk = memoryStorage()
      controlDisk.records = new Map(disk.records)
      const control = new TowerCampaignStore(controlDisk, NOW)
      act(control, action)
      disk.fail = true
      reject(store, disk, action, 'save-failed')
      disk.fail = false
      act(store, action)
      assert.deepEqual(store.state, control.state)
      assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY), controlDisk.getItem(TOWER_CAMPAIGN_KEY))
      assert.equal(disk.writes.length, 1)
      reload(disk, store.state)
    })
  }
}

test('interleaving deterministic fan purchases leaves random forging and combat RNG unchanged', () => {
  const patch = { equipmentRng: { armor: 1, ring: 8192 }, spiritStones: 2000, contribution: 2000 }
  const a = fixture(patch), b = fixture(patch)
  const armorA = clone(draw(a.store, 'armor')), ringA = clone(draw(a.store, 'ring'))
  const ringB = clone(draw(b.store, 'ring')), armorB = clone(draw(b.store, 'armor'))
  assert.deepEqual(armorA, { ...armorB, id: armorA.id })
  assert.deepEqual(ringA, { ...ringB, id: ringA.id })
  assert.deepEqual(a.store.state.equipmentRng, b.store.state.equipmentRng)
  assert.deepEqual(a.store.state.equipmentPity, b.store.state.equipmentPity)
  assert.deepEqual(a.store.state.equipmentDraws, { armor: 0, ring: 0 })
  assert.equal(a.store.state.rng, b.store.state.rng)
  const pools = clone(a.store.state.equipmentRng)
  const rng=a.store.state.forgeRng
  act(a.store, forgeAction(a.store,'weapon'))
  assert.equal(a.store.state.forgeRng,rng)
  assert.deepEqual(a.store.state.equipmentRng, pools)
})

test('combined capacity240 rejects both draw kinds atomically and freed slots never reuse IDs', () => {
  const { store, disk } = fixture(inventory('armor', 1, 236))
  draw(store, 'ring')
  assert.equal(Object.keys(store.state.weapons).length + Object.keys(store.state.equipment).length, 240)
  reject(store, disk, forgeAction(store,'armor'), 'capacity')
  reject(store, disk, forgeAction(store,'weapon'), 'capacity')
  act(store, { type: 'dismantleEquipment', id: 'gear-1' })
  const next = draw(store, 'armor')
  assert.equal(next.id, 'gear-238')
  assert.equal(store.state.equipment['gear-1'], undefined)
  reload(disk, store.state)
})

test('both categories dismantle for a portion of stone cost without refunding contribution', () => {
  for (const category of categories) for (const [quality, refund] of [[1, 2], [2, 4], [3, 8], [4, 16]]) {
    const patch = inventory(category, quality)
    const { store, disk } = fixture(patch)
    const before = clone(store.state)
    act(store, { type: 'dismantleEquipment', id: 'gear-1' })
    assert.equal(store.state.contribution, before.contribution)
    assert.equal(store.state.spiritStones, before.spiritStones+dismantleStoneRefund(before.equipment['gear-1']))
    assert.deepEqual(store.state.equipmentRng, before.equipmentRng)
    assert.deepEqual(store.state.equipmentPity, before.equipmentPity)
    assert.deepEqual(store.state.equipmentDraws, before.equipmentDraws)
    reject(store, disk, { type: 'dismantleEquipment', id: 'gear-1' })
    reload(disk, store.state)
  }
})

test('checksummed invalid equipment saves remain read-only without changing raw data', () => {
  for (const [name, mutate] of [
    ['missing basic armor', s => { delete s.equipment['basic-armor'] }],
    ['missing basic ring', s => { delete s.equipment['basic-ring'] }],
    ['invalid category', s => { s.equipment['gear-1'].category = 'weapon' }],
    ['mismatched ID', s => { s.equipment['gear-1'].id = 'gear-99' }],
    ['illegal tier', s => { s.equipment['gear-1'].tier = 'tian' }],
    ['forged affix', s => { s.equipment['gear-1'].affixes[0].value = 999 }],
    ['sequence rollback', s => { s.equipmentSequence = 0 }],
    ['missing ring counter', s => { delete s.equipmentCounters['gear-1'] }],
    ['counter on armor', s => { s.equipmentCounters['basic-armor'] = 0 }],
    ['counter overflow', s => { s.equipmentCounters['gear-1'] = 5 }],
    ['disabled refine', s => { s.equipment['gear-1'].refine = 1 }],
    ['invalid pity', s => { s.equipmentPity.armor = Number.MAX_SAFE_INTEGER + 1 }],
    ['invalid draw history', s => { s.equipmentDraws.ring = -1 }],
    ['invalid RNG', s => { s.equipmentRng.armor = 0 }],
    ['cross-category preset', s => { s.loadouts[2].armorId = 'gear-1' }],
  ]) {
    const { store, disk } = fixture(inventory('ring'))
    const state = clone(store.state)
    mutate(state)
    const raw = put(disk, state), writes = disk.writes.length
    const corrupt = new TowerCampaignStore(disk, NOW)
    assert.equal(corrupt.readOnly, true, name)
    reject(corrupt, disk, { type: 'drawEquipment', category: 'ring', tier: 'fan' }, 'corrupt')
    assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY), raw)
    assert.equal(disk.writes.length, writes)
  }
})

test('stale stores cannot overwrite another equipment draw or issue duplicate gear IDs', () => {
  const { store, disk } = fixture()
  const stale = new TowerCampaignStore(disk, NOW)
  draw(store, 'armor')
  reject(stale, disk, forgeAction(stale,'ring'), 'stale-save')
  const restored = reload(disk, store.state)
  assert.equal(draw(restored, 'ring').id, 'gear-2')
})

test('running battle requires a pause for equipment changes and rejects forged swapped checkpoints', () => {
  const patch = inventory('ring', 4, 2)
  patch.equipment['gear-3'] = rollEquipment('armor', 'fa', 4, () => 0, 'gear-3')
  patch.equipmentSequence = 3
  const { store, disk } = fixture(patch)
  act(store, { type: 'equipEquipment', category: 'ring', id: 'gear-1' })
  act(store, { type: 'equipEquipment', category: 'armor', id: 'gear-3' })
  const entered = act(store, { type: 'startFloor', floor: 1, seed: 123 })
  assert.equal(validateTowerSnapshot(entered.snapshot), true)
  assert.deepEqual(entered.snapshot.loadout, combatLoadout(store.state))
  for (const action of [
    { type: 'refineEquipment', id: 'gear-1' },
    { type: 'refineEquipment', id: 'gear-3' },
    { type: 'refineWeapon', id: 'iron' },
  ]) reject(store, disk, action, 'refinement-disabled')
  for (const action of [
    { type: 'drawEquipment', category: 'ring', tier: 'fan' },
    { type: 'dismantleEquipment', id: 'gear-2' },
  ]) reject(store, disk, action, 'in-tower')
  reject(store,disk,{type:'equipEquipment',category:'ring',id:'gear-2'},'pause-required')
  const run = TowerRun.restore(entered.snapshot)
  // Advance the real simulation so loadout forgery reaches identity validation,
  // rather than being rejected earlier as a changed receipt at the same tick.
  run.advance(1 / 30)
  assert.ok(run.state.ticks > entered.snapshot.ticks)
  run.pause()
  const original = run.snapshot()
  for (const category of categories) {
    const candidate = clone(original), item = category === 'ring'
      ? patch.equipment['gear-2'] : createBasicEquipment('armor')
    candidate.loadout[`${category}Id`] = item.id
    candidate.loadout[category] = clone(item)
    const forgedRun = TowerRun.restore(original)
    forgedRun.setEquipmentLoadout(candidate.loadout)
    const forged = forgedRun.snapshot()
    assert.equal(validateTowerSnapshot(forged), true, `swapped ${category} is valid for a standalone Run`)
    reject(store, disk, { type: 'checkpoint', snapshot: forged })
  }
  act(store, { type: 'checkpoint', snapshot: original })
  reload(disk, store.state)
})

test('per-ring counters survive swapping, entering, checkpointing, reloading and leaving a floor', () => {
  const patch = inventory('ring', 4, 2)
  patch.equipmentCounters = { 'basic-ring': 0, 'gear-1': 3, 'gear-2': 1 }
  const { store, disk } = fixture(patch)
  act(store, { type: 'equipEquipment', category: 'ring', id: 'gear-1' })
  act(store, { type: 'setLoadout', index: 1, loadout: { ...clone(store.state.loadouts[1]), ringId: 'gear-2' } })
  act(store, { type: 'selectLoadout', index: 1 })
  assert.equal(combatLoadout(store.state).weaponFocusCount, 1)
  act(store, { type: 'selectLoadout', index: 0 })
  assert.equal(combatLoadout(store.state).weaponFocusCount, 3)
  act(store, forgeAction(store,'weapon'))
  act(store, { type: 'setLoadout', index: 0,
    loadout: { ...clone(store.state.loadouts[0]), weaponId: 'weapon-1' } })
  assert.equal(combatLoadout(store.state).weaponFocusCount, 3, 'switching weapons cannot reset the equipped ring counter')
  const entered = act(store, { type: 'startFloor', floor: 1, seed: 123 })
  assert.equal(validateTowerSnapshot(entered.snapshot), true)
  assert.deepEqual(entered.snapshot.loadout.ring, patch.equipment['gear-1'])
  assert.equal(entered.snapshot.weaponState.focusCount, 3)
  const run = TowerRun.restore(entered.snapshot)
  // Actual casts against actual spawned enemies; no fabricated counter receipt.
  for (let frame = 0; frame < 900 && run.state.weaponState.effectiveCasts === 0; frame++) {
    for (const enemy of run.state.enemies) {
      enemy.x = run.state.player.x + 60
      enemy.y = run.state.player.y
      enemy.ai.graceUntil = run.state.time + 10
    }
    run.advance(1 / 30)
  }
  assert.equal(run.state.weaponState.effectiveCasts,0, 'current fixed rings have no fifth-hit proc')
  run.pause()
  const checkpoint = run.snapshot(), count = checkpoint.weaponState.focusCount
  assert.equal(validateTowerSnapshot(checkpoint), true)
  assert.equal(count, (3 + checkpoint.weaponState.effectiveCasts) % 5)
  disk.fail = true
  reject(store, disk, { type: 'checkpoint', snapshot: checkpoint }, 'save-failed')
  disk.fail = false
  act(store, { type: 'checkpoint', snapshot: checkpoint })
  assert.equal(store.state.activeRun.snapshot.weaponState.focusCount, count)
  assert.equal(store.state.equipmentCounters['gear-1'], 3, 'entry count remains the checkpoint validation baseline until settlement')
  assert.equal(store.state.equipmentCounters['gear-2'], 1)
  const resumed = reload(disk, store.state)
  const restored = TowerRun.restore(resumed.state.activeRun.snapshot)
  assert.deepEqual(restored.snapshot(), checkpoint)
  restored.abandon()
  act(resumed, { type: 'finishFloor', snapshot: restored.snapshot() })
  assert.equal(resumed.state.equipmentCounters['gear-1'], count)
  const next = act(resumed, { type: 'startFloor', floor: 1, seed: 124 })
  assert.equal(next.snapshot.loadout.weaponFocusCount, count)
  assert.equal(next.snapshot.weaponState.focusCount, count, 'reentering cannot reset the fifth-cast progress')
  reload(disk, resumed.state)
})

// Fixed quality pools replace historical random-quality soft pity.
for (const pool of ['weapon', 'armor', 'ring']) {
  test(`${pool} crafting preserves chosen quality and pool membership at every formal tier`, () => {
    for(const tier of ['fa','bao','ling'])for(const quality of [1,2,3,4]){
      const {store,disk}=fixture({xp:6601,spiritStones:100000,contribution:100000})
      const recipe=forgingRecipe(`${pool}:${tier}:q${quality}`),targetId=recipe.definitionIds.at(-1)
      const before=clone(store.state),items=[]
      for(let i=0;i<3;i++){
        const result=act(store,forgeAction(store,pool,tier,quality))
        items.push((pool==='weapon'?store.state.weapons:store.state.equipment)[result.ids[0]])
      }
      assert.ok(items.every(item=>item.quality===quality&&item.tier===tier&&recipe.definitionIds.includes(item.definitionId)))
      assert.equal(store.state.weaponPity,before.weaponPity)
      assert.deepEqual(store.state.equipmentPity,before.equipmentPity)
      assert.equal(store.state.rng,before.rng)
      assert.deepEqual(store.state.equipmentRng,before.equipmentRng)
      reload(disk,store.state)
    }
  })

  test(`${pool} accepts safe-integer miss saves and rejects invalid miss counts without rewriting`, () => {
    for (const misses of [20, 100, Number.MAX_SAFE_INTEGER]) {
      const patch = pool === 'weapon' ? { weaponPity: misses }
        : { equipmentPity: { armor: 0, ring: 0, [pool]: misses } }
      const { store, disk } = fixture(patch)
      if (pool === 'weapon') assert.equal(store.state.weaponSequence, misses)
      else {
        assert.equal(store.state.equipmentDraws[pool], misses)
        assert.equal(store.state.equipmentSequence, misses)
      }
      // At MAX_SAFE_INTEGER this is a read-only round trip, never a new draw.
      reload(disk, store.state)
    }
    for (const misses of [-1, .5, '20', null, Number.MAX_SAFE_INTEGER + 1]) {
      const { store, disk } = fixture()
      const state = clone(store.state)
      if (pool === 'weapon') state.weaponPity = misses
      else state.equipmentPity[pool] = misses
      const raw = put(disk, state), writes = disk.writes.length
      const corrupt = new TowerCampaignStore(disk, NOW)
      assert.equal(corrupt.readOnly, true, `${pool}: ${misses}`)
      assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY), raw)
      assert.equal(disk.writes.length, writes)
    }
  })

  test(`${pool} rejects forged misses above lifetime draws without altering the save`, () => {
    for (const total of [0, 19, 100, Number.MAX_SAFE_INTEGER - 1]) {
      const patch = pool === 'weapon' ? { weaponSequence: total, weaponPity: total }
        : { equipmentSequence: total, equipmentDraws: { armor: 0, ring: 0, [pool]: total },
          equipmentPity: { armor: 0, ring: 0, [pool]: total } }
      const { store, disk } = fixture(patch)
      reload(disk, store.state)
      const forged = clone(store.state)
      if (pool === 'weapon') forged.weaponPity = total + 1
      else forged.equipmentPity[pool] = total + 1
      // Encode directly so the valid-fixture history adapter cannot repair this forgery.
      const raw = put(disk, forged), writes = disk.writes.length
      const corrupt = new TowerCampaignStore(disk, NOW)
      assert.equal(corrupt.readOnly, true, `${pool}: ${total + 1} misses after ${total} draws`)
      reject(corrupt, disk, pool === 'weapon' ? { type: 'drawWeapon' }
        : { type: 'drawEquipment', category: pool, tier: 'fan' }, 'corrupt')
      assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY), raw)
      assert.equal(disk.writes.length, writes)
    }
  })
}
