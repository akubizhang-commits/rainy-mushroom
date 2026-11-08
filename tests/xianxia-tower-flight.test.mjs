import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { GROWTH_SKILLS, giftSkills, growthSummary, skillStage, skillRequirement, rankCap } from '../js/xianxia/TowerGrowth.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { SKILLS } from '../js/xianxia/TowerContent.js'
import { cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
import { checksum } from '../js/xianxia/Checksum.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'

const clone = value => JSON.parse(JSON.stringify(value))
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)
function fixture(patch = {}) {
  if (patch.skills && !patch.skillsInitialized) patch = { ...patch, skills: { sj_arc: 1, ...patch.skills } }
  const disk = { raw: null, fail: false, writes: 0,
    getItem(key) { assert.equal(key, TOWER_CAMPAIGN_KEY); return this.raw },
    setItem(key, value) {
      assert.equal(key, TOWER_CAMPAIGN_KEY)
      if (this.fail) throw Error('disk full')
      this.raw = value; this.writes++
    },
  }
  const fresh = new TowerCampaignStore(disk, 0)
  const data = JSON.stringify({ ...fresh.state, xp: cultivationLevelXp(11), ...patch })
  disk.raw = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data, checksum: checksum(data) })
  return { disk, store: new TowerCampaignStore(disk, 0) }
}
function reject(store, disk, action, reason) {
  const before = store.state, raw = disk.raw, writes = disk.writes
  assert.deepEqual(store.act(action, 0), { ok: false, reason })
  assert.strictEqual(store.state, before)
  assert.equal(disk.raw, raw)
  assert.equal(disk.writes, writes)
}
function runWith(passive, options = {}) {
  return new TowerRun({ attemptId: 1, floor: 1, seed: 123, hp: 37.5, xp: 10920,
    loadout: { active: giftSkills(0), passive, evolutions: [], evolutionLevels: {},
      growthVersion: 1, tutorialWaves: 0, weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }, ...options })
}

for (const [name, web, slow, root, walking, flying] of [
  ['web', true, 0, false, 165, 240.625],
  ['monster slow', false, .3, false, 154, 233.75],
  ['strongest slow wins', true, .3, false, 154, 233.75],
  ['root overrides resistance', true, .3, true, 0, 0],
]) {
  for (const flight of [false, true]) {
    test(`${name}: ${flight ? 'flying' : 'walking'} movement, pause and replay`, () => {
      const run = runWith(flight ? { sj_flight: 1 } : {})
      const s = run.state
      if (web) run._zone('web', s.player.x, s.player.y, 200, 1, 1, 4, 1, 1, true, false, { phase: 'active' })
      s.monsterControl = { rootUntil: root ? 1 : 0, immuneUntil: 0, slowUntil: 1, slowFraction: slow }
      run.setInput(1, 0)
      const x = s.player.x
      run.advance(.1)
      close(s.player.x - x, (flight ? flying : walking) * .1)
      run.pause()
      const paused = run.snapshot()
      run.advance(.5)
      assert.deepEqual(run.snapshot(), paused)
      assert.equal(validateTowerSnapshot(paused), true)
      const restored = TowerRun.restore(paused)
      run.resume(); restored.resume()
      run.advance(.1); restored.advance(.1)
      assert.deepEqual(restored.snapshot(), run.snapshot())
    })
  }
}

test('flight resistance does not shorten slow duration and ends exactly with the debuff', () => {
  const run = runWith({ sj_flight: 1 })
  run.state.monsterControl = { rootUntil: 0, immuneUntil: 0, slowUntil: .1, slowFraction: .3 }
  run.setInput(1, 0)
  const x = run.state.player.x
  run.advance(5 / 60)
  close(run.state.player.x - x, 233.75 * 5 / 60)
  const last = run.state.player.x
  run.advance(1 / 60)
  close(run.state.player.x - last, 275 / 60)
})

test('flight is a one-rank foundation passive costing one SP without a book, floor or prerequisite', () => {
  const row = GROWTH_SKILLS.find(s => s.id === 'sj_flight')
  assert.ok(row)
  for (const [key, value] of Object.entries({ name: '御剑飞行', kind: 'passive', maxLevel: 1,
    max_level: 1, learnLevel: 11, learnClear: 0, bookCost: 0, special: false })) assert.equal(row[key], value)
  assert.deepEqual(row.pointCosts, [1])
  assert.deepEqual(row.speed_bonus, [.25])
  assert.deepEqual(row.prerequisites, {})
  assert.equal(row.levels.length, 1)
  assert.equal(row.levels[0].speed_bonus, .25)
  assert.equal(skillStage('sj_flight').id, 'zhuji-early')
  assert.ok(Object.isFrozen(row))
  assert.equal(SKILLS.some(s => s.id === 'sj_flight'), false, 'historical five-rank catalog is not retroactively extended')
  const { store } = fixture()
  assert.deepEqual(skillRequirement(store.state, 'sj_flight'), { ok: true, nextLevel: 1, cost: 1, bookCost: 0 })
  assert.equal(skillRequirement({ ...store.state, xp: (cultivationLevelXp(11) - 1) }, 'sj_flight').reason, 'stage-locked')
  assert.equal(rankCap('sj_flight', (cultivationLevelXp(11) - 1)), 0)
  assert.equal(rankCap('sj_flight', cultivationLevelXp(11)), 1)
  assert.equal(rankCap('sj_flight', 10920, 9), 1)
})

test('flight purchase, reload, downgrade and full respec spend and refund exactly one SP', () => {
  const { store, disk } = fixture()
  const stale = new TowerCampaignStore(disk, 0)
  const before = clone(store.state), available = growthSummary(before).available
  disk.fail = true
  reject(store, disk, { type: 'learnSkill', id: 'sj_flight' }, 'save-failed')
  disk.fail = false
  assert.deepEqual(store.act({ type: 'learnSkill', id: 'sj_flight' }, 0), {
    ok: true, id: 'sj_flight', level: 1, cost: 1, bookCost: 0,
  })
  assert.equal(growthSummary(store.state).available, available - 1)
  assert.equal(store.state.spiritStones, before.spiritStones)
  assert.deepEqual(store.state.books, [])
  assert.equal(combatLoadout(store.state).passive.sj_flight, 1)
  reject(stale, disk, { type: 'learnSkill', id: 'sj_flight' }, 'stale-save')
  reject(store, disk, { type: 'learnSkill', id: 'sj_flight' }, 'max-level')
  const loaded = new TowerCampaignStore(disk, 0)
  assert.equal(loaded.readOnly, false)
  assert.deepEqual(loaded.state, store.state)
  assert.equal(loaded.act({ type: 'decreaseSkill', id: 'sj_flight' }, 0).returned, 1)
  assert.equal(loaded.state.skills.sj_flight, undefined)
  assert.equal(growthSummary(loaded.state).available, available)
  assert.equal(loaded.act({ type: 'learnSkill', id: 'sj_flight' }, 0).ok, true)
  assert.equal(loaded.act({ type: 'respecSkills' }, 0).returned, 2)
  assert.deepEqual(loaded.state.skills, {})
  assert.equal(growthSummary(loaded.state).available, available + 1)
  assert.equal(loaded.act({ type: 'respecSkills' }, 0).returned, 0)
  assert.equal(growthSummary(loaded.state).available, available + 1)
})

test('flight preview and learned panel expose the same speed and slow resistance', () => {
  const { store } = fixture()
  const preview = skillPresentation(store.state, 'sj_flight')
  assert.ok(preview.requirementLines.includes('悟道点 1'))
  assert.deepEqual(preview.statLines, ['移速加成 25%', '减速抗性 50%'])
  assert.equal(store.act({ type: 'learnSkill', id: 'sj_flight' }, 0).ok, true)
  const learned = skillPresentation(store.state, 'sj_flight')
  assert.deepEqual(learned.statLines, preview.statLines)
  assert.equal(learned.maxed, true)
})

test('flight rejects forged low-level or excess ranks and retains passive first-learning camp restriction', () => {
  for (const patch of [
    { xp: (cultivationLevelXp(11) - 1), skills: { sj_yujian: 1, sj_flight: 1 } },
    { skills: { sj_yujian: 1, sj_flight: 2 } },
    { skills: { sj_yujian: 1, sj_flight: 1 }, books: ['sj_flight'] },
  ]) assert.equal(fixture(patch).store.error, 'corrupt')
  const locked = fixture({ xp: (cultivationLevelXp(11) - 1) })
  reject(locked.store, locked.disk, { type: 'learnSkill', id: 'sj_flight' }, 'stage-locked')
  const poor = fixture({ tutorialWaves: 3, skills: { ...giftSkills(3), sj_yujian: 5, sj_arc: 7, sj_bone: 2 } }) // 11级共14点（含赠送1级）
  assert.equal(poor.store.readOnly, false)
  assert.equal(growthSummary(poor.store.state).available, 0)
  reject(poor.store, poor.disk, { type: 'learnSkill', id: 'sj_flight' }, 'insufficient-points')
  const { store, disk } = fixture()
  const start = store.act({ type: 'startFloor', floor: 1, seed: 123 }, 0)
  assert.equal(start.ok, true)
  reject(store, disk, { type: 'learnSkill', id: 'sj_flight' }, 'pause-required')
  const run = TowerRun.restore(start.snapshot); run.pause()
  assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok, true)
  assert.equal(store.act({ type: 'learnSkill', id: 'sj_flight' }, 0).ok, true)
})

for (const [passive, speed] of [[{}, 220], [{ sj_flight: 1 }, 275], [{ sj_bone: 4 }, 237.6], [{ sj_bone: 4, sj_flight: 1 }, 292.6]]) {
  test(`actual movement and snapshot replay use additive flight/bone speed ${speed}`, () => {
    const run = runWith(passive)
    close(run.state.player.moveSpeed, speed)
    const start = clone(run.state.player)
    run.setInput(1, 0); run.advance(.25)
    close(run.state.player.x - start.x, speed * .25)
    assert.equal(run.state.player.hp, start.hp)
    assert.equal(run.state.player.maxHp, start.maxHp)
    const snapshot = run.snapshot(), restored = TowerRun.restore(snapshot)
    assert.deepEqual(restored.snapshot(), snapshot)
    run.advance(.1); restored.advance(.1)
    assert.deepEqual(restored.snapshot(), run.snapshot())
    assert.equal(validateTowerSnapshot(run.snapshot()), true)
  })
}

test('all seven learned passives coexist in the campaign, compatibility loadout and saved run', () => {
  const passives = Object.fromEntries(GROWTH_SKILLS.filter(s => s.kind === 'passive').map(s => [s.id, 1]))
  assert.equal(Object.keys(passives).length, 7)
  const books = GROWTH_SKILLS.filter(s => s.kind === 'passive' && s.special).map(s => s.id)
  const { store, disk } = fixture({ xp: 10920, clearedFloor: 9, skills: { ...giftSkills(3), ...passives },
    tutorialWaves: 3, books })
  assert.equal(store.readOnly, false)
  const loadout = { ...store.state.loadouts[0], passive: Object.keys(passives) }
  assert.equal(store.act({ type: 'setLoadout', index: 0, loadout }, 0).ok, true)
  const start = store.act({ type: 'startFloor', floor: 1, seed: 123 }, 0)
  assert.equal(start.ok, true)
  assert.deepEqual(start.snapshot.loadout.passive, passives)
  close(start.snapshot.player.moveSpeed, 279.4)
  const run = TowerRun.restore(start.snapshot); run.advance(.1); run.pause()
  assert.equal(store.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0).ok, true)
  const loaded = new TowerCampaignStore(disk, 0)
  assert.equal(loaded.readOnly, false)
  assert.deepEqual(loaded.state.activeRun.snapshot, run.snapshot())
})

test('old legacy snapshots stay unchanged, while forged flight ranks and derived speed are rejected', () => {
  const original = runWith({})
  const legacy = original.snapshot()
  delete legacy.loadout.growthVersion
  delete legacy.loadout.evolutionLevels
  delete legacy.loadout.tutorialWaves
  delete legacy.base.tutorialWaves
  assert.equal(validateTowerSnapshot(legacy), true)
  assert.deepEqual(TowerRun.restore(legacy).snapshot(), legacy)
  legacy.loadout.passive.sj_flight = 1
  assert.equal(validateTowerSnapshot(legacy), false)
  const current = runWith({ sj_flight: 1 }).snapshot()
  for (const rank of [0, 2, 1.5, '1']) {
    const forged = clone(current); forged.loadout.passive.sj_flight = rank
    assert.equal(validateTowerSnapshot(forged), false)
  }
  const forged = clone(current); forged.player.moveSpeed = 220
  assert.equal(validateTowerSnapshot(forged), false)
})
