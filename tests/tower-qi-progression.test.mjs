import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { GROWTH_SKILLS, rankCap, skillStage, skillRequirement, growthSummary } from '../js/xianxia/TowerGrowth.js'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { SKILLS } from '../js/xianxia/TowerContent.js'
import { validateWeapon, weaponDamageModifiers, weaponDescription } from '../js/xianxia/TowerWeapons.js'
import { checksum } from '../js/xianxia/Checksum.js'

const xpAt = level => 30 * (level - 1) + 15 * (level - 1) ** 2
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
  const data = JSON.stringify({ ...fresh.state, xp: xpAt(16), ...patch,
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

test('cross is an independent ten-rank qi active at the Lianqi peak without extending the classic catalog', () => {
  const row = GROWTH_SKILLS.find(s => s.id === 'sj_cross')
  assert.ok(row)
  assert.equal(row.name, '剑啸八方')
  assert.equal(row.kind, 'active')
  assert.equal(row.damageType, 'hybrid')
  assert.equal(row.learnLevel, 7)
  assert.equal(row.maxLevel, 10)
  assert.equal(row.bookCost, 0)
  assert.equal(row.learnClear, 0)
  assert.deepEqual(row.prerequisites, {})
  assert.equal(skillStage('sj_cross').id, 'lianqi-peak')
  assert.deepEqual(row.pointCosts, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
  assert.equal(SKILLS.some(s => s.id === 'sj_cross'), false)
  assert.ok(Object.isFrozen(row))
})

test('cross rank caps follow its four authored realm gates, including the exact XP boundaries', () => {
  const cases = [[7, 0, 3], [10, 3, 6], [13, 6, 9], [16, 9, 10]]
  for (const [level, before, after] of cases) {
    assert.equal(rankCap('sj_cross', xpAt(level) - 1), before)
    assert.equal(rankCap('sj_cross', xpAt(level)), after)
  }
  for (let level = 1; level <= 27; level++) {
    const expected = level < 7 ? 0 : level < 10 ? 3 : level < 13 ? 6 : level < 16 ? 9 : 10
    assert.equal(rankCap('sj_cross', xpAt(level), 9), expected)
  }
  assert.equal(rankCap('sj_arc', xpAt(7)), 9, 'early skills reach their third band at lianqi peak')
  assert.equal(rankCap('sj_line', xpAt(13)), 6)
})

test('cross quotes enforce current stage, next-rank realm and exact costs', () => {
  const { store } = fixture()
  for (const [level, rank, reason] of [[6, 0, 'stage-locked'], [9, 3, 'realm-locked'],
    [12, 6, 'realm-locked'], [15, 9, 'realm-locked']]) {
    const state = { ...store.state, xp: xpAt(level), skills: { sj_arc: 1, ...(rank ? { sj_cross: rank } : {}) } }
    assert.equal(skillRequirement(state, 'sj_cross').reason, reason)
  }
  for (const [level, rank, cost] of [[7, 0, 1], [10, 3, 1], [13, 6, 2], [16, 9, 2]]) {
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
  assert.equal(growthSummary(store.state).available, before.available - 2)
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
  for (const [level, rank] of [[6, 1], [9, 4], [12, 7], [15, 10], [16, 11]]) {
    assert.equal(fixture({ xp: xpAt(level), skills: { sj_cross: rank } }).store.error, 'corrupt', `${level}/${rank}`)
  }
  for (const [level, rank] of [[7, 3], [10, 6], [13, 9], [16, 10]]) {
    assert.equal(fixture({ xp: xpAt(level), skills: { sj_cross: rank } }).store.readOnly, false, `${level}/${rank}`)
  }
})

test('cross receives its own qi weapon affix and the qi flow bonus with readable names', () => {
  const weapon = { id: 'cross-weapon', definitionId: 'eq_sword_zhaodan', tier: 'fa',
    quality: 4, refine: 0, locked: false, affixes: [
      { type: 'physical', value: 1 }, { type: 'skill', target: 'sj_cross', value: 2 },
      { type: 'skill', target: 'sj_arc', value: 2 }, { type: 'flow', target: 'qi', value: 1 },
    ] }
  assert.equal(validateWeapon(weapon), true)
  assert.equal(weaponDamageModifiers(weapon, 'sj_cross', 'physical').flat, .04)
  assert.match(weaponDescription(weapon).join(' '), /剑啸八方伤害＋2%/)
})

test('cross detail requirements show the next realm at ranks zero, three, six and nine', () => {
  const { store } = fixture()
  for (const [rank, characterLevel, label] of [[0, 7, '炼气 · 巅峰'],
    [3, 10, '筑基 · 初期'], [6, 13, '筑基 · 中期'], [9, 16, '筑基 · 巅峰']]) {
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

test('crescent and cross text follows actual form changes rather than the former shared stages', () => {
  const { store } = fixture()
  const view = (id, rank) => skillPresentation({ ...store.state, skills: { sj_arc: 1, [id]: rank } }, id)
  for (const rank of [1, 2, 3]) {
    const p = view('sj_arc', rank)
    assert.match(p.description, /近身|身前/)
    assert.equal(p.currentForm.hits, 1)
  }
  const arc3 = view('sj_arc', 3)
  assert.match(arc3.nextFormLines.join(' '), /近身月牙.*月牙飞射/)
  assert.doesNotMatch(arc3.nextFormLines.join(' '), /本级形态不变/)
  assert.match(view('sj_arc', 2).nextFormLines.join(' '), /范围半径：140 → 150/)
  assert.doesNotMatch(view('sj_arc', 2).nextFormLines.join(' '), /剑路宽度|刃面横宽|索敌距离|射程/)
  for (const rank of [4, 5, 6]) {
    const p = view('sj_arc', rank)
    assert.match(p.description, /一道.*飞行/)
    assert.equal(p.currentForm.hits, 1)
    assert.doesNotMatch(p.formLines.join(' '), /90°扇区|落点半径/)
  }
  assert.match(view('sj_arc', 5).nextFormLines.join(' '), /刃面横宽：192 → 204/)
  assert.doesNotMatch(view('sj_arc', 5).nextFormLines.join(' '), /范围半径|扇区角度/)
  assert.match(view('sj_arc', 6).nextFormLines.join(' '), /1 → 3击/)
  for (const rank of [7, 9, 10]) {
    const p = view('sj_arc', rank)
    assert.match(p.description, /三道|3道/)
    assert.equal(p.currentForm.hits, 3)
  }
  assert.match(view('sj_cross', 3).nextFormLines.join(' '), /近身十字斩.*飞行十字斩/)
  assert.match(view('sj_cross', 6).nextFormLines.join(' '), /大型飞行十字斩/)
  for (const rank of [1, 3, 4, 6, 7, 9, 10]) {
    const p = view('sj_cross', rank)
    assert.equal(p.currentForm.hits, 1)
    assert.match(p.description, /十字/)
    assert.doesNotMatch(p.formLines.join(' '), /落点半径|undefined/)
  }
  assert.match(view('sj_cross', 9).nextFormLines.join(' '), /本级形态不变/)
})
