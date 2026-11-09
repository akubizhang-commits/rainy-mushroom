import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { GROWTH_SKILLS, rankCap, skillStage, skillRequirement, growthSummary } from '../js/xianxia/TowerGrowth.js'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { SKILLS } from '../js/xianxia/TowerContent.js'
import { createFixedWeapon, validateWeapon, weaponDamageModifiers, weaponDescription } from '../js/xianxia/TowerWeapons.js'
import { checksum } from '../js/xianxia/Checksum.js'

import { cultivationLevelXp as xpAt } from '../js/xianxia/TowerProfile.js'
function fixture(patch = {}) {
  const disk = {
    raw: null, fail: false, writes: 0,
    getItem(key) { assert.equal(key, TOWER_CAMPAIGN_KEY); return this.raw },
    setItem(key, raw) {
      assert.equal(key, TOWER_CAMPAIGN_KEY)
      if (this.fail) throw Error('disk full')
      this.raw = raw; this.writes++
    },
  }
  const fresh = new TowerCampaignStore(disk, 0)
  const data = JSON.stringify({ ...fresh.state, xp: xpAt(27), ...patch,
    skills: { ...fresh.state.skills, ...(patch.skills || {}) } })
  disk.raw = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data, checksum: checksum(data) })
  return { disk, store: new TowerCampaignStore(disk, 0) }
}
function reject(store, disk, action, reason) {
  const state = store.state, raw = disk.raw, writes = disk.writes
  assert.deepEqual(store.act(action, 0), { ok: false, reason })
  assert.strictEqual(store.state, state)
  assert.equal(disk.raw, raw)
  assert.equal(disk.writes, writes)
}

test('cross is an independent ten-rank qi active at the Zhuji middle phase without extending the classic catalog', () => {
  const row = GROWTH_SKILLS.find(s => s.id === 'sj_cross')
  assert.ok(row)
  assert.equal(row.name, '双月斩')
  assert.equal(row.kind, 'active')
  assert.equal(row.damageType, 'physical')
  assert.equal(row.learnLevel, 14)
  assert.equal(row.maxLevel, 10)
  assert.equal(row.bookCost, 0)
  assert.equal(row.learnClear, 0)
  assert.deepEqual(row.prerequisites, {})
  assert.equal(skillStage('sj_cross').id, 'zhuji-middle')
  assert.deepEqual(row.pointCosts, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
  assert.equal(SKILLS.some(s => s.id === 'sj_cross'), false)
  assert.ok(Object.isFrozen(row))
})

test('cross rank caps follow its four authored realm gates, including the exact XP boundaries', () => {
  const cases = [[14, 0, 3], [17, 3, 6], [21, 6, 9], [24, 9, 10]]
  for (const [level, before, after] of cases) {
    assert.equal(rankCap('sj_cross', xpAt(level) - 1), before)
    assert.equal(rankCap('sj_cross', xpAt(level)), after)
  }
  for (let level = 1; level <= 27; level++) {
    const expected = level < 14 ? 0 : level < 17 ? 3 : level < 21 ? 6 : level < 24 ? 9 : 10
    assert.equal(rankCap('sj_cross', xpAt(level), 9), expected)
  }
  assert.equal(rankCap('sj_arc', xpAt(7)), 9, 'early skills reach their third band at lianqi peak')
  assert.equal(rankCap('sj_line', xpAt(21) - 1), 0)
  assert.equal(rankCap('sj_line', xpAt(21)), 3)
})

test('cross quotes enforce current stage, next-rank realm and exact costs', () => {
  const { store } = fixture()
  for (const [level, rank, reason] of [[13, 0, 'stage-locked'], [16, 3, 'realm-locked'],
    [20, 6, 'realm-locked'], [23, 9, 'realm-locked']]) {
    const state = { ...store.state, xp: xpAt(level), skills: { sj_arc: 1, ...(rank ? { sj_cross: rank } : {}) } }
    assert.equal(skillRequirement(state, 'sj_cross').reason, reason)
  }
  for (const [level, rank, cost] of [[14, 0, 1], [17, 3, 1], [21, 6, 1], [24, 9, 1]]) {
    const state = { ...store.state, xp: xpAt(level), skills: { sj_arc: 1, ...(rank ? { sj_cross: rank } : {}) } }
    assert.deepEqual(skillRequirement(state, 'sj_cross'), { ok: true, nextLevel: rank + 1, cost, bookCost: 0 })
  }
})

test('cross purchase and downgrade are atomic and survive reload without double spending', () => {
  const { disk, store } = fixture({ skills: { sj_cross: 9 } })
  assert.equal(store.readOnly, false)
  const before = growthSummary(store.state)
  const stale = new TowerCampaignStore(disk, 0)
  disk.fail = true
  reject(store, disk, { type: 'learnSkill', id: 'sj_cross' }, 'save-failed')
  disk.fail = false
  assert.deepEqual(store.act({ type: 'learnSkill', id: 'sj_cross' }, 0),
    { ok: true, id: 'sj_cross', level: 10, cost: 1, bookCost: 0 })
  assert.equal(growthSummary(store.state).available, before.available - 1)
  assert.equal(combatLoadout(store.state).active.sj_cross, 10)
  reject(stale, disk, { type: 'learnSkill', id: 'sj_cross' }, 'stale-save')
  reject(store, disk, { type: 'learnSkill', id: 'sj_cross' }, 'max-level')
  const loaded = new TowerCampaignStore(disk, 0)
  assert.equal(loaded.readOnly, false)
  assert.equal(loaded.state.skills.sj_cross, 10)
  disk.fail = true
  reject(loaded, disk, { type: 'decreaseSkill', id: 'sj_cross' }, 'save-failed')
  disk.fail = false
  assert.equal(loaded.act({ type: 'decreaseSkill', id: 'sj_cross' }, 0).returned, 1)
  assert.equal(loaded.state.skills.sj_cross, 9)
  assert.equal(growthSummary(loaded.state).available, before.available)
})

test('campaign rejects cross ranks above each realm gate even when points are sufficient', () => {
  for (const [level, rank] of [[13, 1], [16, 4], [20, 7], [23, 10], [27, 11]]) {
    assert.equal(fixture({ xp: xpAt(level), skills: { sj_cross: rank } }).store.error, 'corrupt', `${level}/${rank}`)
  }
  for (const [level, rank] of [[14, 3], [17, 6], [21, 9], [24, 10]]) {
    assert.equal(fixture({ xp: xpAt(level), skills: { sj_cross: rank } }).store.readOnly, false, `${level}/${rank}`)
  }
})

test('cross receives the fixed qi weapon flow bonus with readable names', () => {
  const weapon = createFixedWeapon('eq_sword_zhaodan', 'cross-weapon')
  assert.equal(validateWeapon(weapon), true)
  assert.equal(weaponDamageModifiers(weapon, 'sj_cross', 'physical').flat, .25)
  assert.equal(weaponDamageModifiers(weapon, 'sj_yujian', 'physical').flat, .22)
  assert.match(weaponDescription(weapon).join(' '), /剑气流派伤害 \+3%/)
})

test('cross detail requirements show the next realm at ranks zero, three, six and nine', () => {
  const { store } = fixture()
  for (const [rank, characterLevel, label] of [[0, 14, '筑基 · 中期'],
    [3, 17, '筑基 · 巅峰'], [6, 21, '金丹 · 初期'], [9, 24, '金丹 · 中期']]) {
    const state = { ...store.state, skills: { sj_arc: 1, ...(rank ? { sj_cross: rank } : {}) } }
    const before = JSON.stringify(state), info = skillPresentation(state, 'sj_cross')
    assert.equal(info.nextRequirement.characterLevel, characterLevel)
    assert.equal(info.requirementLines[0], `角色${label}`)
    assert.equal(JSON.stringify(state), before)
  }
  const max = skillPresentation({ ...store.state, skills: { sj_arc: 1, sj_cross: 10 } }, 'sj_cross')
  assert.equal(max.maxed, true)
  assert.equal(max.nextPreview, null)
})

test('crescent keeps three close-range slashes and cross keeps one stationary frontal hit at every rank', () => {
  const { store } = fixture()
  const view = (id, rank) => skillPresentation({ ...store.state, skills: { [id]: rank } }, id)
  for (let rank = 1; rank <= 10; rank++) {
    const arc = view('sj_arc', rank), cross = view('sj_cross', rank)
    assert.equal(arc.currentForm.hits, 3)
    assert.equal(arc.currentForm.shape, 'sector')
    assert.match(arc.description, /三道月弧/)
    assert.equal(cross.currentForm.hits, 1)
    assert.equal(cross.currentForm.shape, 'cross-burst')
    assert.equal(cross.currentForm.angle, 180)
    assert.equal(cross.currentForm.radius, rank < 4 ? 180 : rank < 7 ? 220 : 270)
    assert.match(cross.description, /不向外飞行/)
    assert.doesNotMatch(cross.formLines.join(' '), /undefined/)
  }
  assert.match(view('sj_arc', 2).nextFormLines.join(' '), /范围半径：140 → 150/)
  assert.match(view('sj_cross', 3).nextFormLines.join(' '), /范围半径：180 → 220/)
  assert.match(view('sj_cross', 6).nextFormLines.join(' '), /范围半径：220 → 270/)
  assert.match(view('sj_cross', 9).nextFormLines.join(' '), /本级形态不变/)
})
