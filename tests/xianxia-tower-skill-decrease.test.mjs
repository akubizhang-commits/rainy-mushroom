import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import * as Growth from '../js/xianxia/TowerGrowth.js'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { CORE_RANK_VALUES } from '../js/xianxia/TowerLoot.js'
import { STONE_CAP, STONE_VALUES, stoneLootFromLegacy } from '../js/xianxia/TowerEconomy.js'
import { checksum } from '../js/xianxia/Checksum.js'

const clone = value => JSON.parse(JSON.stringify(value))
const gifts = { sj_yujian: 1, sj_arc: 1, sj_wanjian: 1 }
const decrease = id => ({ type: 'decreaseSkill', id })

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
  put(disk, {
    ...clone(initial.state), xp: 10920, clearedFloor: 9, tutorialWaves: 3,
    researchPurchases: 3, skills: { ...gifts }, ...patch,
  })
  const store = new TowerCampaignStore(disk, 0)
  assert.equal(store.readOnly, false, store.error)
  return { store, disk }
}

function quote(state, id) {
  assert.equal(typeof Growth.decreaseSkillQuote, 'function', 'Growth exports the decrement preview')
  return Growth.decreaseSkillQuote(state, id)
}

function rejected(store, disk, action, reason) {
  const before = store.state, raw = disk.raw, writes = disk.writes
  assert.deepEqual(store.act(action, 600000), { ok: false, reason })
  assert.strictEqual(store.state, before, 'failed actions publish no state, including passive healing')
  assert.equal(disk.raw, raw)
  assert.equal(disk.writes, writes)
}

function committed(store, disk, id, returned, changes) {
  const before = store.state, raw = disk.raw, writes = disk.writes
  const preview = quote(before, id)
  assert.equal(preview.ok, true, preview.reason)
  assert.equal(preview.returned, returned)
  assert.deepEqual(preview.changes, changes)
  assert.strictEqual(store.state, before)
  assert.equal(disk.raw, raw)
  const result = store.act(decrease(id), 0)
  assert.equal(result.ok, true, result.reason)
  assert.equal(result.returned, returned)
  assert.deepEqual(result.changes, changes)
  assert.deepEqual(store.state.skills, preview.skills)
  assert.deepEqual(store.state.evolutionRanks, preview.evolutionRanks)
  assert.equal(Growth.growthSummary(store.state).available - Growth.growthSummary(before).available, returned)
  for (const key of ['books', 'spiritStones', 'contribution', 'loadouts', 'selectedLoadout', 'researchPurchases']) {
    assert.deepEqual(store.state[key], before[key], key)
  }
  assert.equal(disk.writes, writes + 1, 'the entire cascade commits once')
  const reload = new TowerCampaignStore(disk, 0)
  assert.equal(reload.readOnly, false, reload.error)
  assert.deepEqual(reload.state, store.state)
  return result
}

test('only the initial arc rank is protected from direct refund', () => {
 for(const tutorialWaves of [0,1,3]){
 const {store,disk}=fixture({tutorialWaves,skills:{sj_arc:2}})
 committed(store,disk,'sj_arc',1,[{id:'sj_arc',from:2,to:1}])
 rejected(store,disk,decrease('sj_arc'),'gift-floor')
 assert.equal(Growth.growthSummary(store.state).spent,0)
 }
})

test('decrement returns the actual last-rank cost for basic, special and passive nodes', () => {
  for (const [id, rank, returned, skills, books] of [
    ['sj_yujian', 7, 1, { ...gifts, sj_yujian: 7 }, []],
    ['sj_shadow', 7, 2, { ...gifts, sj_yujian: 2, sj_shadow: 7 }, ['sj_shadow']],
    ['sj_heart', 4, 1, { ...gifts, sj_heart: 4 }, []],
    ['sj_mark', 4, 2, { ...gifts, sj_mark: 4 }, ['sj_mark']],
  ]) {
    const { store, disk } = fixture({ skills: { ...skills, sj_spirit: 2 }, books })
    committed(store, disk, id, returned, [{ id, from: rank, to: rank - 1 }])
    assert.equal(store.state.skills.sj_spirit, 2)
  }
})

test('decreasing former base prerequisites leaves special skills and their evolutions intact', () => {
  for (const [root, special, evolution] of [
    ['sj_arc', 'sj_line', 'evo_tiandi'], ['sj_wanjian', 'sj_formation', 'evo_sixiang'],
  ]) {
    const { store, disk } = fixture({
      skills: { ...gifts, [root]: 2, [special]: 6, vajra: 2 },
      books: [special, evolution], evolutionRanks: { [evolution]: 1 }, evolutions: [evolution],
    })
    committed(store, disk, root, 1, [{ id: root, from: 2, to: 1 }])
    assert.equal(store.state.skills[special], 6)
    assert.deepEqual(store.state.evolutionRanks, { [evolution]: 1 })
    assert.deepEqual(store.state.evolutions, [evolution])
    assert.equal(store.state.skills.vajra, 2)
    assert.equal(store.act({ type: 'learnSkill', id: special }, 0).ok, true)
  }
})

test('shadow investment survives decreasing its former base prerequisite to the gift floor', () => {
  const { store, disk } = fixture({
    skills: { ...gifts, sj_yujian: 3, sj_shadow: 3 }, books: ['sj_shadow'],
  })
  committed(store, disk, 'sj_yujian', 1, [{ id: 'sj_yujian', from: 3, to: 2 }])
  committed(store, disk, 'sj_yujian', 1, [{ id: 'sj_yujian', from: 2, to: 1 }])
  assert.equal(store.state.skills.sj_shadow, 3)
})

test('an unrelated decrement preserves legacy special investments allowed by the learning-only validator', () => {
  const { store, disk } = fixture({
    skills: { ...gifts, sj_shadow: 2, vajra: 2 }, books: ['sj_shadow'],
  })
  committed(store, disk, 'vajra', 1, [{ id: 'vajra', from: 2, to: 1 }])
  assert.equal(store.state.skills.sj_shadow, 2)
})

test('all paired passives can be fully refunded without reducing evolution ranks or changing their combat form', () => {
  for (const row of Growth.GROWTH_EVOLUTIONS) {
    const books = [row.id, ...Growth.GROWTH_SKILLS.filter(s => s.special && [row.parent, row.passive].includes(s.id)).map(s => s.id)]
    const { store, disk } = fixture({
      skills: { ...gifts, [row.parent]: 6, [row.passive]: 4 }, books,
      evolutionRanks: { [row.id]: 2 }, evolutions: [row.id],
    })
    for (let rank = 4; rank >= 1; rank--) {
      const returned = Growth.GROWTH_SKILLS.find(s => s.id === row.passive).pointCosts[rank - 1]
      committed(store, disk, row.passive, returned, [{ id: row.passive, from: rank, to: rank - 1 }])
      assert.deepEqual(store.state.evolutionRanks, { [row.id]: 2 })
      assert.deepEqual(store.state.evolutions, [row.id])
      assert.equal(store.state.skills[row.parent], 6)
    }
    assert.equal(Object.hasOwn(store.state.skills, row.passive), false)
    const start = store.act({ type: 'startFloor', floor: 1, seed: 12 }, 0)
    assert.equal(start.ok, true, start.reason)
    assert.equal(validateTowerSnapshot(start.snapshot), true)
    const run = TowerRun.restore(start.snapshot)
    assert.equal(run.state.loadout.evolutionLevels[row.id], 2)
    assert.ok(run.state.loadout.evolutions.includes(row.id))
    assert.equal(Object.hasOwn(run.state.loadout.passive, row.passive), false)
  }
})

test('refunding parent ranks lowers inherited evolution strength without removing its rank', () => {
  for (const row of Growth.GROWTH_EVOLUTIONS) {
    const special = Growth.GROWTH_SKILLS.find(skill => skill.id === row.parent).special
    const { store, disk } = fixture({
      skills: { ...gifts, [row.parent]: 9 }, books: special ? [row.parent, row.id] : [row.id],
      evolutionRanks: { [row.id]: 2 }, evolutions: [row.id],
    })
    const highCost = special ? 2 : 1, lowCost = highCost
    committed(store, disk, row.parent, highCost, [{ id: row.parent, from: 9, to: 8 }])
    committed(store, disk, row.parent, highCost, [
      { id: row.parent, from: 8, to: 7 },
    ])
    committed(store, disk, row.parent, highCost, [{ id: row.parent, from: 7, to: 6 }])
    committed(store, disk, row.parent, lowCost, [
      { id: row.parent, from: 6, to: 5 },
    ])
    assert.deepEqual(store.state.evolutions, [row.id])
    assert.equal(combatLoadout(store.state).active[row.parent], 5)
    rejected(store, disk, { type: 'learnSkill', id: row.id }, 'max-level')
  }
})

test('direct evolution decrease refunds only its rank and preserves another evolution and legacy presets', () => {
  const { store, disk } = fixture({
    skills: { ...gifts, sj_yujian: 8, sj_heart: 3, sj_wanjian: 6, sj_bone: 4 },
    books: ['evo_wanjian', 'evo_wuwo', 'sj_bone'],
    evolutionRanks: { evo_wanjian: 2, evo_wuwo: 1 }, evolutions: ['evo_wanjian', 'evo_wuwo'],
    selectedLoadout: 1,
    loadouts: [
      { name: 'legacy', weaponId: 'iron', armorId: 'basic-armor', ringId: 'basic-ring', active: ['sj_yujian'], passive: ['sj_heart'],
        evolutions: ['evo_wanjian'] },
      { name: 'weapon only', weaponId: 'iron', armorId: 'basic-armor', ringId: 'basic-ring' },
      { name: 'empty', weaponId: 'iron', armorId: 'basic-armor', ringId: 'basic-ring', active: [], passive: [], evolutions: [] },
    ],
  })
  committed(store, disk, 'evo_wanjian', 2, [{ id: 'evo_wanjian', from: 2, to: 1 }])
  committed(store, disk, 'evo_wanjian', 2, [{ id: 'evo_wanjian', from: 1, to: 0 }])
  assert.deepEqual(store.state.evolutions, ['evo_wuwo'])
  assert.equal(store.state.skills.sj_yujian, 8)
  assert.equal(store.state.skills.sj_heart, 3)
  assert.equal(store.act({ type: 'learnSkill', id: 'evo_wanjian' }, 0).bookCost, 0)
  assert.equal(store.state.spiritStones, 500)
})

test('special book remains paid after rank zero and relearning consumes points without charging spirit stones', () => {
  const { store, disk } = fixture({ skills: { ...gifts, sj_yujian: 2 }, spiritStones: 200 })
  const learned = store.act({ type: 'learnSkill', id: 'sj_shadow' }, 0)
  assert.equal(learned.ok, true, learned.reason)
  assert.equal(learned.bookCost, 200)
  assert.equal(store.state.spiritStones, 0)
  committed(store, disk, 'sj_shadow', 2, [{ id: 'sj_shadow', from: 1, to: 0 }])
  assert.equal(Object.hasOwn(store.state.skills, 'sj_shadow'), false)
  const reload = new TowerCampaignStore(disk, 0)
  assert.deepEqual(reload.state.books, ['sj_shadow'])
  const relearned = reload.act({ type: 'learnSkill', id: 'sj_shadow' }, 0)
  assert.equal(relearned.ok, true, relearned.reason)
  assert.equal(relearned.cost, 2)
  assert.equal(relearned.bookCost, 0)
  assert.equal(reload.state.spiritStones, 0)
})

test('quotes detach proposed ranks and never mutate the frozen campaign or its books', () => {
  const { store, disk } = fixture({ skills: { ...gifts, vajra: 1 } })
  const before = clone(store.state), raw = disk.raw
  const preview = quote(store.state, 'vajra')
  assert.equal(preview.returned, 1)
  assert.equal(Object.hasOwn(preview.skills, 'vajra'), false)
  preview.skills.sj_yujian = 10
  preview.evolutionRanks.evo_wanjian = 2
  preview.changes[0].to = 8
  assert.deepEqual(store.state, before)
  assert.equal(disk.raw, raw)
  assert.deepEqual(quote(store.state, 'vajra').changes, [{ id: 'vajra', from: 1, to: 0 }])
})

test('unknown and unlearned nodes cannot refund points, heal or write a save', () => {
  const { store, disk } = fixture({ hp: 1 })
  for (const [id, reason] of [
    ['unknown', 'unknown-skill'], ['__proto__', 'unknown-skill'], [undefined, 'unknown-skill'],
    ['sj_shadow', 'not-learned'], ['evo_wanjian', 'not-learned'], ['vajra', 'not-learned'],
  ]) {
    assert.deepEqual(quote(store.state, id), { ok: false, reason, returned: 0, changes: [] })
    rejected(store, disk, decrease(id), reason)
  }
})

test('playing and paused tower runs reject decreases without changing their snapshots', () => {
  const { store, disk } = fixture({ skills: { ...gifts, sj_yujian: 2 } })
  const start = store.act({ type: 'startFloor', floor: 1, seed: 12 }, 0)
  assert.equal(start.ok, true, start.reason)
  rejected(store, disk, decrease('sj_yujian'), 'in-tower')
  assert.deepEqual(quote(store.state, 'sj_yujian'), {
    ok: false, reason: 'in-tower', returned: 0, changes: [],
  })
  const run = TowerRun.restore(start.snapshot)
  run.pause()
  assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok, true)
  rejected(store, disk, decrease('sj_yujian'), 'in-tower')
})

test('a failed cascade save publishes none of the refund, ranks or passive healing and can retry', () => {
  const { store, disk } = fixture({
    hp: 1, skills: { ...gifts, sj_arc: 2, sj_line: 6, sj_mark: 4 },
    books: ['sj_line', 'sj_mark', 'evo_tiandi'],
    evolutionRanks: { evo_tiandi: 1 }, evolutions: ['evo_tiandi'],
  })
  disk.fail = true
  rejected(store, disk, decrease('sj_line'), 'save-failed')
  assert.deepEqual(new TowerCampaignStore(disk, 0).state, store.state)
  disk.fail = false
  committed(store, disk, 'sj_line', 2, [
    { id: 'sj_line', from: 6, to: 5 },
  ])
})

test('a stale host cannot commit a preview against a newer allocation or manufacture the refund', () => {
  const { store, disk } = fixture({ skills: { ...gifts, sj_yujian: 2 } })
  const other = new TowerCampaignStore(disk, 0)
  assert.equal(quote(store.state, 'sj_yujian').returned, 1)
  assert.equal(other.act({ type: 'learnSkill', id: 'sj_yujian' }, 0).ok, true)
  rejected(store, disk, decrease('sj_yujian'), 'stale-save')
  const reload = new TowerCampaignStore(disk, 0)
  assert.equal(reload.state.skills.sj_yujian, 3)
  committed(reload, disk, 'sj_yujian', 1, [{ id: 'sj_yujian', from: 3, to: 2 }])
})

test('read-only and unreadable storage cannot publish a decrease', () => {
  const { disk, store } = fixture({ skills: { ...gifts, sj_yujian: 2 } })
  for (const [schema, reason] of [[99, 'newer'], [0, 'corrupt']]) {
    put(disk, store.state, schema)
    const readOnly = new TowerCampaignStore(disk, 0)
    assert.equal(readOnly.readOnly, true)
    rejected(readOnly, disk, decrease('sj_yujian'), reason)
  }
  const unreadable = storage()
  unreadable.getItem = () => { throw Error('unavailable') }
  rejected(new TowerCampaignStore(unreadable, 0), unreadable, decrease('sj_yujian'), 'unreadable')
})

test('insufficient learning cannot mutate state and a zero-available-point build can refund and reinvest', () => {
  const { store, disk } = fixture({
    xp: 45, clearedFloor: 0, researchPurchases: 0, hp: 1,
    skills: { sj_arc:1, sj_wanjian: 1 }, spiritStones: 0,
  })
  assert.equal(Growth.growthSummary(store.state).available, 0)
  rejected(store, disk, { type: 'learnSkill', id: 'sj_arc' }, 'insufficient-points')
  committed(store, disk, 'sj_wanjian', 1, [{ id: 'sj_wanjian', from: 1, to: 0 }])
  assert.equal(store.act({ type: 'learnSkill', id: 'sj_arc' }, 0).ok, true)
  rejected(store, disk, { type: 'learnSkill', id: 'sj_wanjian' }, 'insufficient-points')
  assert.equal(new TowerCampaignStore(disk, 0).state.skills.sj_arc, 2)
})

test('the existing validator still rejects zero ranks and orphaned evolutions on reload', () => {
  const { store, disk } = fixture()
  for (const patch of [
    { skills: { ...gifts, vajra: 0 } },
    { books: ['evo_wanjian'], evolutionRanks: { evo_wanjian: 0 }, evolutions: ['evo_wanjian'] },
  ]) {
    put(disk, { ...store.state, ...patch })
    const reload = new TowerCampaignStore(disk, 0)
    assert.equal(reload.readOnly, true)
    assert.equal(reload.error, 'corrupt')
  }
})

test('schema11 reload accepts optional typed stone loot and rejects inconsistent totals or extra fields', () => {
  const value = 2 * STONE_VALUES[0] + 3 * STONE_VALUES[1] + STONE_VALUES[3]
  const lastResult = {
    outcome: 'won', floor: 3, firstClear: true,
    earned: { xp: 100, spiritStones: value + 200, contribution: 50 },
    stoneLoot: { byGrade: [2, 3, 0, 1], count: 6, value },
  }
  const overCount = Math.floor(lastResult.earned.spiritStones / STONE_VALUES[3]) + 1
  const { store, disk } = fixture({ lastResult })
  assert.deepEqual(store.state.lastResult.stoneLoot, lastResult.stoneLoot)
  assert.equal(store.act({ type: 'sync' }, 0).ok, true)
  assert.deepEqual(new TowerCampaignStore(disk, 0).state.lastResult, lastResult)
  for (const stoneLoot of [
    null, { ...lastResult.stoneLoot, byGrade: [2, 3] },
    { ...lastResult.stoneLoot, count: 7 }, { ...lastResult.stoneLoot, value: value + 1 },
    { ...lastResult.stoneLoot, byGrade: [2, 3, 0, -1] },
    { ...lastResult.stoneLoot, extra: true },
    { byGrade: [0, 0, 0, overCount], count: overCount, value: overCount * STONE_VALUES[3] },
  ]) {
    put(disk, { ...store.state, lastResult: { ...lastResult, stoneLoot } })
    const reload = new TowerCampaignStore(disk, 0)
    assert.equal(reload.readOnly, true, JSON.stringify(stoneLoot))
    assert.equal(reload.error, 'corrupt')
  }
  put(disk, { ...store.state, lastResult: { ...lastResult, extra: 1 } })
  assert.equal(new TowerCampaignStore(disk, 0).error, 'corrupt')
})

function campaignWithLoot(loot) {
  const { store, disk } = fixture()
  assert.equal(store.act({ type: 'startFloor', floor: 1, seed: 12 }, 0).ok, true)
  const state = clone(store.state)
  if (loot) state.activeRun.snapshot.loot = loot
  else delete state.activeRun.snapshot.loot
  put(disk, state)
  const reload = new TowerCampaignStore(disk, 0)
  assert.equal(reload.readOnly, false, reload.error)
  return { store: reload, disk }
}

test('checkpoint rejects introducing, removing or reseeding the attempt loot contract', () => {
  for (const [before, after] of [
    [undefined, { version: 1, seed: 123 }],
    [{ version: 1, seed: 123 }, undefined],
    [{ version: 1, seed: 123 }, { version: 1, seed: 456 }],
  ]) {
    const { store, disk } = campaignWithLoot(before)
    const snapshot = clone(store.state.activeRun.snapshot)
    if (after) snapshot.loot = after
    else delete snapshot.loot
    assert.equal(validateTowerSnapshot(snapshot), true, 'each empty attempt is independently valid')
    rejected(store, disk, { type: 'checkpoint', snapshot }, 'invalid-snapshot')
  }
})

test('new attempt settlement persists typed kill loot while legacy settlement retains its old result shape', () => {
  for (const loot of [undefined, { version: 1, seed: 123 }]) {
    const { store, disk } = campaignWithLoot(loot)
    const run = TowerRun.restore(store.state.activeRun.snapshot)
    run.abandon()
    const result = store.act({ type: 'finishFloor', snapshot: run.snapshot() }, 0)
    assert.equal(result.ok, true, result.reason)
    if (loot) assert.deepEqual(result.stoneLoot, { byGrade: [0, 0, 0, 0], count: 0, value: 0 })
    else assert.equal(Object.hasOwn(result, 'stoneLoot'), false)
    assert.deepEqual(store.state.lastResult.stoneLoot, result.stoneLoot)
    assert.deepEqual(new TowerCampaignStore(disk, 0).state.lastResult, store.state.lastResult)
  }
})

function clearThirdFloor(store) {
  const start = store.act({ type: 'startFloor', floor: 3, seed: 12 }, 0)
  assert.equal(start.ok, true, start.reason)
  const run = TowerRun.restore(start.snapshot)
  for (let frame = 0; frame < 100000 && run.state.phase === 'playing'; frame++) {
    run.state.player.hp = run.state.player.maxHp
    for (const enemy of run.state.enemies) {
      enemy.hp = 1
      enemy.x = run.state.player.x + 60
      enemy.y = run.state.player.y
      enemy.ai.graceUntil = run.state.time + 10
    }
    run.advance(1 / 30)
  }
  assert.equal(run.state.phase, 'won')
  return run.snapshot()
}

test('typed settlement counts actual kills and excludes boss-clear and first-clear spirit-stone awards', () => {
  const { store, disk } = fixture({ clearedFloor: 2, researchPurchases: 0, spiritStones: 0 })
  const snapshot = clearThirdFloor(store)
  assert.equal(snapshot.loot?.version, 1, 'new Campaign attempts use the graded drop plan')
  const result = store.act({ type: 'finishFloor', snapshot }, 0)
  assert.equal(result.ok, true, result.reason)
  const counted = [1, 2, 3, 4, 5, 6, 7].map(rank =>
    snapshot.killLedger.filter(kill => kill.coreRank === rank).length)
  assert.deepEqual(result.stoneLoot, stoneLootFromLegacy({ byRank: counted }))
  assert.ok(result.stoneLoot.count > 0)
  assert.equal(result.stoneLoot.value,
    snapshot.killLedger.reduce((sum, kill) => sum + CORE_RANK_VALUES[kill.coreRank] * 10, 0))
  assert.equal(result.earned.spiritStones - result.stoneLoot.value, 200, 'floor3 boss-clear 100 plus first-clear stones 100')
  assert.equal(store.state.spiritStones, result.earned.spiritStones)
  assert.deepEqual(new TowerCampaignStore(disk, 0).state.lastResult.stoneLoot, result.stoneLoot)
  rejected(store, disk, { type: 'finishFloor', snapshot }, 'wrong-attempt')
})

test('resource-capped settlement succeeds and omits optional loot that exceeds credited earnings', () => {
  const { store, disk } = fixture({ clearedFloor: 2, researchPurchases: 0, spiritStones: STONE_CAP })
  const snapshot = clearThirdFloor(store)
  const result = store.act({ type: 'finishFloor', snapshot }, 0)
  assert.equal(result.ok, true, result.reason)
  assert.equal(result.earned.spiritStones, 0)
  assert.equal(Object.hasOwn(result, 'stoneLoot'), false)
  assert.equal(store.state.spiritStones, STONE_CAP)
  assert.deepEqual(new TowerCampaignStore(disk, 0).state, store.state)
})
