import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { GROWTH_SKILLS, skillRequirement, growthSummary } from '../js/xianxia/TowerGrowth.js'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { checksum } from '../js/xianxia/Checksum.js'

const xpAt = level => 30 * (level - 1) + 15 * (level - 1) ** 2
function fixture(skills = {}, level = 27) {
  const disk = { raw: null, fail: false, writes: 0,
    getItem(key) { assert.equal(key, TOWER_CAMPAIGN_KEY); return this.raw },
    setItem(key, raw) { assert.equal(key, TOWER_CAMPAIGN_KEY); if (this.fail) throw Error('disk full'); this.raw = raw; this.writes++ },
  }
  const fresh = new TowerCampaignStore(disk, 0)
  const data = JSON.stringify({ ...fresh.state, xp: xpAt(level), skills: { ...fresh.state.skills, ...skills } })
  disk.raw = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data, checksum: checksum(data) })
  return { disk, store: new TowerCampaignStore(disk, 0) }
}
function rejected(store, disk, id, reason) {
  const before = store.state, raw = disk.raw, writes = disk.writes
  assert.deepEqual(store.act({ type: 'learnSkill', id }, 0), { ok: false, reason })
  assert.strictEqual(store.state, before)
  assert.equal(disk.raw, raw)
  assert.equal(disk.writes, writes)
}

test('all higher yujian ranks can be purchased without spirit', () => {
  for (let next = 4; next <= 10; next++) {
    const { disk, store } = fixture({ sj_yujian: next - 1 })
    assert.equal(skillRequirement(store.state, 'sj_yujian').ok, true)
    assert.equal(store.act({ type: 'learnSkill', id: 'sj_yujian' }, 0).level, next)
    assert.equal(new TowerCampaignStore(disk, 0).state.skills.sj_yujian, next)
  }
})

test('spirit can be learned during foundation, persists in passive loadouts and has an independent reach effect', () => {
  const { disk, store } = fixture({}, 14)
  const before = growthSummary(store.state).available
  for (let rank = 1; rank <= 2; rank++) assert.equal(store.act({ type: 'learnSkill', id: 'sj_spirit' }, 0).level, rank)
  assert.equal(growthSummary(store.state).available, before - 2)
  assert.equal(combatLoadout(new TowerCampaignStore(disk, 0).state).passive.sj_spirit, 2)
  const info = skillPresentation(store.state, 'sj_spirit')
  assert.equal(info.name, '凝神诀')
  assert.ok(info.statLines.some(line => line.includes('8%')))
  const full = fixture({ sj_spirit: 3 })
  rejected(full.store, full.disk, 'sj_spirit', 'max-level')
  assert.equal(GROWTH_SKILLS.find(s => s.id === 'sj_spirit').reach_bonus[2], .12)
})

test('unlocked yujian purchase is atomic on save failure and stale writers cannot spend twice', () => {
  const { disk, store } = fixture({ sj_yujian: 9, sj_spirit: 3 })
  const stale = new TowerCampaignStore(disk, 0), before = growthSummary(store.state).available
  disk.fail = true
  rejected(store, disk, 'sj_yujian', 'save-failed')
  disk.fail = false
  assert.equal(store.act({ type: 'learnSkill', id: 'sj_yujian' }, 0).level, 10)
  assert.equal(growthSummary(store.state).available, before - 1)
  rejected(stale, disk, 'sj_yujian', 'stale-save')
  rejected(store, disk, 'sj_yujian', 'max-level')
})

test('yujian retains its own realm gate without a spirit prerequisite', () => {
  const { store } = fixture({ sj_yujian: 3 })
  const state = { ...store.state, xp: xpAt(3) }
  assert.equal(skillRequirement(state, 'sj_yujian').reason, 'realm-locked')
  const info = skillPresentation(state, 'sj_yujian')
  assert.deepEqual(info.nextRequirement.prerequisites, {})
  assert.ok(info.requirementLines.every(line => !line.includes('凝神诀')))
})

test('rank previews show stored sword capacity and the full bank damage', () => {
  const { store } = fixture()
  for (let rank = 1; rank <= 10; rank++) {
    const info = skillPresentation({ ...store.state, skills: { sj_arc: 1, sj_yujian: rank } }, 'sj_yujian')
    const row = key => info.stats.find(r => r.key === key).value
    assert.equal(row('swords'), rank)
    assert.equal(info.currentForm.targetCap, rank)
    assert.equal(row('storedDamage'), row('swordDamage') * rank)
    assert.equal(info.cooldown,.5**((rank-1)/9))
  }
})

test('refunding optional spirit leaves yujian ranks intact and returns one point', () => {
  for (const [spirit, yujian] of [[3, 10], [2, 9], [1, 6]]) {
    const { disk, store } = fixture({ sj_yujian: yujian, sj_spirit: spirit })
    const before = growthSummary(store.state).available
    assert.equal(store.act({ type: 'decreaseSkill', id: 'sj_spirit' }, 0).returned, 1)
    assert.equal(growthSummary(store.state).available, before + 1)
    assert.equal(new TowerCampaignStore(disk, 0).state.skills.sj_yujian, yujian)
  }
})

test('yujian reach preview includes equipped spirit without increasing other skill ranges', () => {
  const { store } = fixture({ sj_yujian: 3, sj_spirit: 2 })
  const yujian = skillPresentation(store.state, 'sj_yujian')
  assert.ok(Math.abs(yujian.currentForm.reach - 410.4) < 1e-9)
  const plain = { ...store.state, skills: { sj_arc: 1, sj_yujian: 3 } }
  assert.equal(skillPresentation(store.state, 'sj_arc').currentForm.reach, skillPresentation(plain, 'sj_arc').currentForm.reach)
})
