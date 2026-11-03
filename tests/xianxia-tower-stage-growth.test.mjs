import { assertCurrentCampaign, assertActionSucceeds } from './helpers/tower-current-state.mjs'
import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GROWTH_STAGES, GROWTH_SKILLS, GROWTH_EVOLUTIONS, GROWTH_POINT_CAP,
  growthStageAt, skillStage, skillRequirement, rankCap, giftSkills, growthSummary, decreaseSkillQuote,
} from '../js/xianxia/TowerGrowth.js'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout, weaponBonus } from '../js/xianxia/TowerCampaign.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { cultivationAt, freshPills, TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'
import { ARCHETYPES, FLOORS, FLOOR01 } from '../js/xianxia/TowerContent.js'
import { checksum } from '../js/xianxia/Checksum.js'

const copy = value => JSON.parse(JSON.stringify(value))
const thresholds = [0, 225, 720, 1801, 2925, 4320, 6601, 8625, 10920]
const minLevels = [1, 4, 7, 11, 14, 17, 21, 24, 27]
const maxLevels = [3, 6, 10, 13, 16, 20, 23, 26, 30]
const allocation = [
  ['sj_arc', 'sj_yujian', 'sj_bone'], ['vajra'], ['sj_heart', 'sj_cross'],
  ['sj_line', 'sj_shadow', 'sj_formation', 'sj_flight', 'sj_spirit'], ['sj_mark'], ['sj_gate', 'sj_wanjian'],
  ['evo_wanjian'], ['evo_tiandi', 'evo_wuwo'], ['evo_sixiang'],
]
const definitions = [...GROWTH_SKILLS, ...GROWTH_EVOLUTIONS]
const gifts = giftSkills(3)

function disk() {
  return {
    raw: null, writes: 0, fail: false,
    getItem(key) { assert.equal(key, TOWER_CAMPAIGN_KEY); return this.raw },
    setItem(key, raw) {
      assert.equal(key, TOWER_CAMPAIGN_KEY)
      if (this.fail) throw Error('disk full')
      this.raw = raw
      this.writes++
    },
  }
}
function put(storage, state, schema = currentCampaignSchema) {
  const data = JSON.stringify(state)
  storage.raw = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema, data, checksum: checksum(data) })
}
function fixture(patch = {}) {
  if (patch.skills && !patch.skillsInitialized) patch = { ...patch, skills: { sj_arc: 1, ...patch.skills } }
  const storage = disk(), initial = new TowerCampaignStore(storage, 0)
  const expected = { ...copy(initial.state), ...patch }
  put(storage, expected)
  const store = new TowerCampaignStore(storage, 0)
  assertCurrentCampaign(store, expected)
  return { store, storage }
}
function stateFor(id, xp) {
  const row = definitions.find(row => row.id === id)
  const skills = { ...gifts, ...row.prerequisites }
  if (row.kind === 'evolution') {
    const parent = GROWTH_SKILLS.find(skill => skill.id === row.parent)
    Object.assign(skills, parent.prerequisites, { [row.parent]: 6 })
  }
  return { xp, clearedFloor: 9, tutorialWaves: 3, researchPurchases: 3,
    skills, books: [], evolutionRanks: {}, evolutions: [] }
}
function reject(store, storage, action, reason) {
  const state = store.state, raw = storage.raw, writes = storage.writes
  if (reason === 'save-failed') assertActionSucceeds(store.state, action, 60000)
  assert.deepEqual(store.act(action, 60000), { ok: false, reason })
  assert.strictEqual(store.state, state)
  assert.equal(storage.raw, raw)
  assert.equal(storage.writes, writes)
}

test('nine immutable stages cover all 30 character levels and exactly the 6/8/4 skill allocation', () => {
  assert.equal(GROWTH_STAGES.length, 9)
  assert.deepEqual(GROWTH_STAGES.map(stage => stage.skillIds), allocation)
  assert.deepEqual(['炼气', '筑基', '金丹'].map(realm =>
    GROWTH_STAGES.filter(stage => stage.realm === realm).flatMap(stage => stage.skillIds).length), [6, 8, 4])
  assert.deepEqual(allocation.flat().slice().sort(), definitions.map(row => row.id).sort())
  for (const [i, stage] of GROWTH_STAGES.entries()) {
    assert.equal(stage.minLevel, minLevels[i])
    assert.equal(stage.maxLevel, maxLevels[i])
    assert.equal(stage.minRank, i % 3 * 3 + 1)
    assert.equal(stage.maxRank, i % 3 * 3 + 3)
    assert.equal(stage.phase, ['初期', '中期', '巅峰'][i % 3])
    assert.equal(stage.label, `${stage.realm}${stage.phase}`)
    assert.strictEqual(growthStageAt(thresholds[i]), stage)
    if (i) {
      const previous = GROWTH_STAGES[i - 1]
      if ([3, 6].includes(i)) {
        assert.deepEqual(growthStageAt(thresholds[i] - 1), { ...previous, phase: '大圆满', label: `${previous.realm}大圆满` })
      } else assert.strictEqual(growthStageAt(thresholds[i] - 1), previous)
    }
    const lastXp = i === 8 ? TOWER_XP_CAP : thresholds[i + 1] - 1
    if ([1800, 6600, 14400].includes(lastXp)) {
      assert.deepEqual(growthStageAt(lastXp), { ...stage, phase: '大圆满', label: `${stage.realm}大圆满` })
    } else assert.strictEqual(growthStageAt(lastXp), stage)
    for (const id of stage.skillIds) {
      assert.strictEqual(skillStage(id), stage)
      assert.equal(definitions.find(row => row.id === id).learnLevel, id === 'sj_yujian' ? 2 : stage.minLevel)
    }
    assert.throws(() => { stage.skillIds.push('forged') }, TypeError)
  }
  assert.equal(skillStage('missing'), null)
  for (const xp of [-1, 0.5, TOWER_XP_CAP + 1, NaN]) assert.throws(() => growthStageAt(xp), RangeError)
})

for (const [index, ids] of allocation.entries()) for (const id of ids) {
  test(`${id} first learning and further investment obey its Lv${id === 'sj_yujian' ? 2 : minLevels[index]} stage boundary`, () => {
    const threshold = id === 'sj_yujian' ? 45 : thresholds[index]
    const at = stateFor(id, threshold), original = copy(at)
    if (index === 0) {
      assert.equal(skillRequirement(at, id).ok, true, 'the requested rank is permitted at its exact learning level')
      assert.equal(skillRequirement({ ...at, xp: 45 }, id).ok, true)
    } else assert.equal(skillRequirement(at, id).ok, true)
    assert.deepEqual(at, original, 'quoting is pure')
    if (!threshold) return // Level-one skills have no lower valid XP state.
    const below = { ...at, xp: threshold - 1 }
    assert.equal(skillRequirement(below, id).reason, 'stage-locked')
    const row = definitions.find(row => row.id === id), key = row.kind === 'evolution' ? 'evolutionRanks' : 'skills'
    const invested = { ...below, books: [id], [key]: { ...below[key], [id]: 1 } }
    assert.equal(skillRequirement(invested, id).reason, row.maxLevel === 1 ? 'max-level' : 'stage-locked', 'old investment cannot bypass stage or maximum rank')
    if (row.kind === 'passive') {
      assert.equal(skillRequirement(invested, id, { inTower: true }).reason, row.maxLevel === 1 ? 'max-level' : 'stage-locked')
    }
    assert.equal(skillRequirement({ ...at, books: [id] }, id).bookCost, 0, 'owned books are never charged again')
  })
}

test('first three waves retain only the starter sword and consume no skill points', () => {
  const { store, storage } = fixture()
  assert.deepEqual(store.state.skills, { sj_arc: 1 })
  assert.equal(store.act({ type: 'startFloor', floor: 1, seed: 123 }, 0).ok, true)
  const run = TowerRun.restore(store.state.activeRun.snapshot)
  // Assist and positioning isolate tutorial milestones, not survival/balance.
  run.setPlaytestAssist(true)
  for (let wave = 1; wave <= 3; wave++) {
    for (let i = 0; i < 20000 && run.state.clearedWaves.length < wave; i++) {
      for (const enemy of run.state.enemies) { enemy.x = run.state.player.x + 60; enemy.y = run.state.player.y }
      run.advance(1 / 60)
    }
    assert.equal(run.state.clearedWaves.length, wave)
    assert.equal(run.state.player.xp, [4, 9, 15][wave - 1])
    assert.equal(cultivationAt(run.state.player.xp).level, 1)
    assert.deepEqual(run.state.loadout.active, giftSkills(0))
  }
  run.pause()
  assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok, true)
  assert.deepEqual(store.state.skills, {sj_arc:1})
  assert.equal(growthSummary(store.state).spent, 0)
  assert.equal(validateTowerSnapshot(run.snapshot()), true)
  assert.deepEqual(new TowerCampaignStore(storage, 0).state, store.state)
})

test('nominal nine-floor XP reaches level 27 while the full cultivation cap is level 30', () => {
  const archetypes = Object.fromEntries(ARCHETYPES.map(row => [row.id, row]))
  const killXp = id => archetypes[id].rank * ({ normal: 1, elite: 5, boss: 10 }[archetypes[id].role])
  let xp = 0
  const totals = FLOORS.map((floor, index) => {
    const waves = index ? floor.waves.map(w => w.enemy_groups) : FLOOR01.waves.map(w => w.batches)
    xp += floor.cultivation_xp_budget ?? waves.flat().reduce((sum, group) => sum + group.count * killXp(group.archetype), 0)
    return [xp, cultivationAt(xp).level, growthStageAt(xp).label]
  })
  assert.deepEqual(totals.map(([xp, level]) => [xp, level]),
    [[180, 3], [630, 6], [1350, 9], [2300, 12], [3476, 15], [5037, 18], [6600, 20], [8625, 24], [10920, 27]])
  assert.equal(totals.at(-1)[2], '金丹巅峰')
  assert.equal(TOWER_XP_CAP, 14400)
  assert.equal(cultivationAt(TOWER_XP_CAP).level, 30)
  assert.equal(GROWTH_POINT_CAP, 80)
  assert.equal(growthSummary(stateFor('sj_yujian', TOWER_XP_CAP)).total, 80)
  assert.equal(weaponBonus(4, 4), 0.3)
})

for (const ownedBook of [false, true]) {
  test(`book action cannot bypass the stage; at unlock its book is charged ${ownedBook ? 'zero' : 'once'}`, () => {
    const { store, storage } = fixture({ xp: 1800, clearedFloor: 1, tutorialWaves: 3, spiritStones: 1000,
      skills: { ...gifts, sj_yujian: 2 }, books: ownedBook ? ['sj_shadow'] : [],
      pills: { ...freshPills(), zhuji: 1 }, breakthroughRng: 1 })
    for (const type of ['buyBook', 'learnSkill']) {
      reject(store, storage, { type, id: 'sj_shadow', ignoreStage: true }, 'stage-locked')
    }
    const breakthrough = store.act({ type: 'usePill', id: 'zhuji' }, 0)
    assert.equal(breakthrough.ok, true)
    assert.equal(breakthrough.success, true)
    assert.equal(store.state.xp, 1801)
    const before = growthSummary(store.state)
    storage.fail = true
    reject(store, storage, { type: 'buyBook', id: 'sj_shadow' }, 'save-failed')
    storage.fail = false
    const result = store.act({ type: 'buyBook', id: 'sj_shadow' }, 0)
    assert.equal(result.ok, true, result.reason)
    assert.equal(result.bookCost, ownedBook ? 0 : 200)
    assert.equal(store.state.spiritStones, ownedBook ? 1000 : 800)
    assert.deepEqual(store.state.books, ['sj_shadow'])
    assert.equal(store.state.skills.sj_shadow, 1)
    assert.equal(growthSummary(store.state).spent - before.spent, 2)
    assert.deepEqual(new TowerCampaignStore(storage, 0).state, store.state)
  })
}

test('current-schema investments below their starting realm are rejected without rewriting the save', () => {
  const storage = disk(), initial = new TowerCampaignStore(storage, 0)
  put(storage, { ...copy(initial.state), xp: 720, skills: { ...gifts, sj_shadow: 1 }, books: ['sj_shadow'] })
  const raw = storage.raw
  const reopened = new TowerCampaignStore(storage, 0)
  assert.equal(reopened.readOnly, true)
  assert.equal(reopened.error, 'corrupt')
  assert.equal(storage.raw, raw)
})

for (const id of ['evo_tiandi', 'evo_wuwo', 'evo_sixiang']) {
  test(`${id}: obsolete Lv19 resets; legal ranks survive; premature current-schema evolution is rejected`, () => {
    const row = GROWTH_EVOLUTIONS.find(row => row.id === id)
    const oldStorage = disk(), initial = new TowerCampaignStore(oldStorage, 0)
    const old = { ...copy(initial.state), ...stateFor(id, 5400),
      evolutionRanks: { [id]: 1 }, evolutions: [id] }
    old.books = [...GROWTH_SKILLS.filter(skill => old.skills[skill.id] && skill.special).map(skill => skill.id), id]
    put(oldStorage, old, 18)
    const reset = new TowerCampaignStore(oldStorage, 0)
    assert.equal(reset.readOnly, false)
    assert.equal(reset.state.xp, 0)
    assert.deepEqual(reset.migrationReport, { reset: true, fromSchema: 18 })
    const patch = stateFor(id, id === 'evo_sixiang' ? 10920 : 8625)
    patch.skills[row.passive] = 3
    Object.assign(patch, { evolutionRanks: { [id]: 1 }, evolutions: [id],
      books: [...GROWTH_SKILLS.filter(skill => patch.skills[skill.id] && skill.special).map(skill => skill.id), id] })
    const { store, storage } = fixture(patch)
    const before = copy(store.state), raw = storage.raw
    assert.deepEqual(new TowerCampaignStore(storage, 0).state, before)
    assert.equal(storage.raw, raw, 'current reload does not migrate or rewrite investments')
    reject(store, storage, { type: 'learnSkill', id }, 'realm-locked')
    const preview = decreaseSkillQuote(store.state, row.passive)
    assert.equal(preview.evolutionRanks[id], 1, 'paired passive rank does not gate the retained evolution')
    assert.equal(store.act({ type: 'decreaseSkill', id: row.passive }, 0).ok, true)
    assert.equal(store.state.evolutionRanks[id], 1)
    assert.deepEqual(store.state.books, before.books)
    assert.equal(store.act({ type: 'startFloor', floor: 1, seed: 123 }, 0).ok, true)
    const run = TowerRun.restore(store.state.activeRun.snapshot)
    assert.ok(run.state.loadout.evolutions.includes(id))
    run.advance(1)
    run.pause()
    assert.equal(validateTowerSnapshot(run.snapshot()), true)
    assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok, true)
    assert.equal(new TowerCampaignStore(storage, 0).readOnly, false)

    // A current save has no grandfathered allocation. 75/91 require the
    // first-learning stage even when the caller supplies a valid checksum.
    // Keep ordinary skills legal so only the premature evolution is rejected.
    const firstXp = id === 'evo_sixiang' ? 10920 : 8625
    const early = { ...before, xp: firstXp - 1, skills: { ...gifts, [row.parent]: 1 } }
    const unevolved = fixture({ ...early, evolutionRanks: {}, evolutions: [] }).store
    assert.equal(skillRequirement(unevolved.state, id).reason, 'stage-locked')
    const eligible = fixture({ ...early, xp: firstXp, evolutionRanks: {}, evolutions: [] }).store
    assertActionSucceeds(eligible.state, { type: 'learnSkill', id }, 0)
    const invalidStorage = disk()
    put(invalidStorage, early)
    const invalidRaw = invalidStorage.raw
    const invalid = new TowerCampaignStore(invalidStorage, 0)
    assert.equal(invalid.readOnly, true, `${id}: current schema must enforce its first-learning stage`)
    assert.equal(invalid.error, 'corrupt')
    assert.equal(invalidStorage.raw, invalidRaw)
    assert.equal(invalidStorage.writes, 0)
  })
}

test('current evolution saves enforce major realm, book, parent, rank and SP validation', () => {
  const id = 'evo_tiandi', patch = stateFor(id, 8625)
  Object.assign(patch, { books: ['sj_line', 'sj_mark', id], evolutionRanks: { [id]: 1 }, evolutions: [id] })
  const { store } = fixture(patch)
  for (const change of [
    { xp: 6600 }, { books: ['sj_line', 'sj_mark'] },
    { skills: { sj_arc: 1 } },
    { xp: 14400, skills: Object.fromEntries(GROWTH_SKILLS.map(s => [s.id, s.maxLevel])),
      books: [...GROWTH_SKILLS.filter(s => s.special).map(s => s.id), id] },
    { evolutionRanks: { [id]: 2 } },
  ]) {
    const storage = disk()
    put(storage, { ...copy(store.state), ...change })
    const raw = storage.raw, reopened = new TowerCampaignStore(storage, 0)
    assert.equal(reopened.readOnly, true)
    assert.equal(reopened.error, 'corrupt')
    assert.equal(storage.raw, raw)
    assert.equal(storage.writes, 0)
  }
})

test('each evolution can be learned and upgraded without its paired passive, with atomic book payment', () => {
  for (const row of GROWTH_EVOLUTIONS) {
    const patch = stateFor(row.id, 14400)
    patch.skills[row.parent] = 8
    patch.books = GROWTH_SKILLS.filter(skill => patch.skills[skill.id] && skill.special).map(skill => skill.id)
    patch.spiritStones = row.bookCost
    const { store, storage } = fixture(patch)
    assert.equal(Object.hasOwn(store.state.skills, row.passive), false)
    storage.fail = true
    reject(store, storage, { type: 'learnSkill', id: row.id }, 'save-failed')
    storage.fail = false
    for (const rank of [1, 2]) {
      const before = growthSummary(store.state).spent, writes = storage.writes
      const result = store.act({ type: 'learnSkill', id: row.id }, 0)
      assert.equal(result.ok, true, result.reason)
      assert.equal(result.bookCost, rank === 1 ? row.bookCost : 0)
      assert.equal(store.state.spiritStones, 0)
      assert.equal(store.state.evolutionRanks[row.id], rank)
      assert.equal(growthSummary(store.state).spent - before, row.pointCosts[rank - 1])
      assert.equal(storage.writes, writes + 1)
      assert.equal(Object.hasOwn(store.state.skills, row.passive), false)
      assert.deepEqual(new TowerCampaignStore(storage, 0).state, store.state)
    }
    reject(store, storage, { type: 'learnSkill', id: row.id }, 'max-level')
  }
})

test('rank caps include the level-two entry and level-thirty second evolution gates', () => {
  for (const row of GROWTH_SKILLS) {
    assert.equal(rankCap(row.id, 0, 9), row.id === 'sj_arc' ? 3 : row.id === 'sj_bone' ? 1 : 0)
    assert.equal(rankCap(row.id, 14400, 9), row.maxLevel)
  }
  for (const row of GROWTH_EVOLUTIONS) {
    const secondXp = row.id === 'evo_sixiang' ? 13485 : 10920
    const state = stateFor(row.id, secondXp)
    state.skills[row.parent] = 1
    state.evolutionRanks[row.id] = 1
    state.books = [row.id]
    assert.deepEqual(skillRequirement(state, row.id), { ok: true, nextLevel: 2, cost: row.pointCosts[1], bookCost: 0 })
    assert.equal(skillRequirement({ ...state, xp: secondXp - 1 }, row.id).reason, 'realm-locked')
    assert.equal(skillRequirement({ ...state, clearedFloor: 0, researchPurchases: 0 }, row.id).ok, true)
    assert.equal(skillRequirement({ ...state, evolutionRanks: { [row.id]: 2 } }, row.id).reason, 'max-level')
    assert.equal(rankCap(row.id, 6600, 9), 0)
    assert.equal(rankCap(row.id, 6601, 0), 1, 'rank validity retains the major-realm gate; learning also checks its stage')
    assert.equal(rankCap(row.id, secondXp, 0), 2)
  }
})

for (const schema of [1, 2, 3, 4, 5, 6, 18]) {
  test(`obsolete schema${schema} restarts development progression rather than retaining allocations`, () => {
    const storage = disk(), initial = new TowerCampaignStore(storage, 0)
    const old = { ...copy(initial.state), xp: 225, skills: { sj_yujian: 3 } }
    put(storage, old, schema)
    const store = new TowerCampaignStore(storage, 0)
    assert.equal(store.readOnly, false, store.error)
    assert.equal(store.state.xp, 0)
    assert.deepEqual(store.state.skills, { sj_arc: 1 })
    assert.equal(store.state.spiritStones, 500)
    assert.deepEqual(store.migrationReport, { reset: true, fromSchema: schema })
    assert.equal(JSON.parse(storage.raw).schema, currentCampaignSchema)
    const raw = storage.raw, writes = storage.writes
    assert.deepEqual(new TowerCampaignStore(storage, 0).state, store.state)
    assert.equal(storage.raw, raw)
    assert.equal(storage.writes, writes)
  })
}
