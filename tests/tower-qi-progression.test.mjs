import { assertCurrentCampaign, assertActionSucceeds } from './helpers/tower-current-state.mjs'
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
function fixture(patch = {}, valid = true) {
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
  const data = JSON.stringify({ ...fresh.state, xp: xpAt(17), ...patch,
    skills: { ...fresh.state.skills, ...(patch.skills || {}) } })
  disk.raw = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data, checksum: checksum(data) })
  const store = new TowerCampaignStore(disk, 0)
  if (valid) assertCurrentCampaign(store, JSON.parse(data))
  return { disk, store }
}
function reject(store, disk, action, reason) {
  const state = store.state, raw = disk.raw, writes = disk.writes
  if (reason === 'save-failed') assertActionSucceeds(store.state, action, 0)
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
  assert.equal(row.damageType, 'physical')
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
  // 71/91: the peak skill progresses at levels 7/11/14/17.
  const cases = [[720, 0, 3], [1801, 3, 6], [2925, 6, 9], [4320, 9, 10]]
  for (const [xp, before, after] of cases) {
    assert.equal(rankCap('sj_cross', xp - 1), before)
    assert.equal(rankCap('sj_cross', xp), after)
  }
  for (let level = 1; level <= 30; level++) {
    const expected = level < 7 ? 0 : level < 11 ? 3 : level < 14 ? 6 : level < 17 ? 9 : 10
    assert.equal(rankCap('sj_cross', xpAt(level), 9), expected)
  }
  assert.equal(rankCap('sj_arc', 720), 9, 'early skills reach their third band at lianqi peak')
  assert.equal(rankCap('sj_line', 2925), 6)
})

test('cross quotes enforce current stage, next-rank realm and exact costs', () => {
  const { store } = fixture()
  for (const [level, rank, reason] of [[6, 0, 'stage-locked'], [10, 3, 'realm-locked'],
    [13, 6, 'realm-locked'], [16, 9, 'realm-locked']]) {
    const state = { ...store.state, xp: xpAt(level), skills: { sj_arc: 1, ...(rank ? { sj_cross: rank } : {}) } }
    assert.equal(skillRequirement(state, 'sj_cross').reason, reason)
  }
  for (const [level, rank, cost] of [[7, 0, 1], [11, 3, 1], [14, 6, 1], [17, 9, 1]]) {
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
  for (const [level, rank] of [[6, 1], [10, 4], [13, 7], [16, 10], [17, 11]]) {
    assert.equal(fixture({ xp: xpAt(level), skills: { sj_cross: rank } }, false).store.error, 'corrupt', `${level}/${rank}`)
  }
  for (const [level, rank] of [[7, 3], [11, 6], [14, 9], [17, 10]]) {
    assert.equal(fixture({ xp: xpAt(level), skills: { sj_cross: rank } }).store.readOnly, false, `${level}/${rank}`)
  }
})

test('cross shares the current qi weapon flow and fixed identities reject forged skill affixes', () => {
  const weapon = createFixedWeapon('eq_sword_songfeng', 'cross-weapon')
  assert.equal(validateWeapon(weapon), true)
  const flow = weapon.affixes.find(a => a.type === 'flow' && a.target === 'qi')
  assert.ok(flow, 'the authored qi weapon retains its flow identity')
  const cross = weaponDamageModifiers(weapon, 'sj_cross', 'physical').flat
  for (const id of ['sj_arc', 'sj_line']) assert.equal(weaponDamageModifiers(weapon, id, 'physical').flat, cross)
  const ordinary = weaponDamageModifiers(weapon, 'sj_yujian', 'physical').flat
  assert.ok(Math.abs(cross - ordinary - flow.value / 100) < 1e-12, 'qi bonus applies exactly once')
  assert.match(weaponDescription(weapon).join(' '), /剑气流派伤害 \+/)
  const forged = structuredClone(weapon)
  forged.affixes.push({ type: 'skill', target: 'sj_cross', value: 2 })
  assert.equal(validateWeapon(forged), false, 'retired random affixes cannot be added to a fixed identity')
})

test('cross detail requirements show the next realm at ranks zero, three, six and nine', () => {
  const { store } = fixture()
  for (const [rank, characterLevel, label] of [[0, 7, '炼气 · 巅峰'],
    [3, 11, '筑基 · 初期'], [6, 14, '筑基 · 中期'], [9, 17, '筑基 · 巅峰']]) {
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
  assert.match(view('sj_cross', 3).nextFormLines.join(' '), /范围半径：180 → 220/)
  assert.match(view('sj_cross', 6).nextFormLines.join(' '), /范围半径：220 → 270/)
  for (const rank of [1, 3, 4, 6, 7, 9, 10]) {
    const p = view('sj_cross', rank)
    assert.equal(p.currentForm.hits, 1)
    assert.match(p.description, /自身|周围|爆发/)
    assert.doesNotMatch(p.description + p.formLines.join(' '), /飞行十字斩|远程落点|射程/)
    assert.doesNotMatch(p.formLines.join(' '), /落点半径|undefined/)
  }
  assert.match(view('sj_cross', 9).nextFormLines.join(' '), /本级形态不变/)
})
