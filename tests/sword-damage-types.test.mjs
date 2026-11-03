import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun } from '../js/xianxia/TowerRun.js'
import { tickSwordBursts } from '../js/xianxia/TowerSwordBurst.js'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS } from '../js/xianxia/TowerGrowth.js'
import { createFixedWeapon } from '../js/xianxia/TowerWeapons.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`)
function fixture(passive = {}, weapon) {
  const loadout = { growthVersion: 1, active: { sj_yujian: 1 }, passive,
    evolutions: [], evolutionLevels: {}, tutorialWaves: 0,
    weaponId: weapon?.id ?? 'eq_sword_suwen', weaponQuality: weapon?.quality ?? 1,
    weaponRefine: 0, ...(weapon ? { weapon, weaponFocusCount: 0 } : {}) }
  const r = new TowerRun({ attemptId: 44, floor: 1, seed: 12, xp: 0, hp: 100, training: true, loadout })
  for (let i = 0; i < 180 && !r.state.enemies.length; i++) step(r, 1)
  r._random = () => 1
  return { r, e: r.state.enemies[0] }
}
function step(r, frames) {
  for (let i = 0; i < frames; i++) {
    for (const id of Object.keys(r.state.cooldowns)) r.state.cooldowns[id] = 9999
    for (const e of r.state.enemies) e.ai.graceUntil = 99999
    r.advance(1 / 60)
  }
}
function hit(r, e, source, damage = 10) {
  r._damageEnemy({ target: e.id, source, damage, direct: true })
  return r.state.effects.findLast(x => x.kind === 'hit' && x.source === source)
}

test('all offensive skill sources and evolution aliases pay the intended parts exactly once', () => {
  for (const [source, physical, magic] of [
    ...['sj_yujian','evo_wanjian','sword_rain','sj_arc','sj_cross','sj_line','evo_tiandi'].map(id=>[id,10,0]),
    ...['sj_shadow', 'shadow',
      'sj_wanjian', 'orbit', 'evo_wuwo', 'sj_formation', 'formation', 'evo_sixiang']
      .map(id => [id, 5, 5]),
  ]) {
    const { r, e } = fixture()
    const before = e.hp, event = hit(r, e, source)
    assert.ok(event.damageParts, source)
    near(event.damageParts.physical, physical)
    near(event.damageParts.magic, magic)
    near(before - e.hp, physical + magic)
  }
})

test('single-type bonuses boost only their half without doubling the total budget', async () => {
  const { splitDamage, scaleDamageParts } = await import('../js/xianxia/TowerDamage.js')
  assert.deepEqual(scaleDamageParts(splitDamage(100, 'hybrid'), 1.2, 1), { physical: 60, magic: 50 })
  assert.deepEqual(scaleDamageParts(splitDamage(100, 'hybrid'), 1, 1.2), { physical: 50, magic: 60 })
  assert.deepEqual(scaleDamageParts(splitDamage(100, 'physical'), 1, 2), { physical: 100, magic: 0 })
})

test('fixed equipment applies each matching bonus once and wounds retain its result', () => {
  const weapon = createFixedWeapon('eq_sword_suwen', 'type-test')
  const { r, e } = fixture({ sj_mark: 4 }, weapon)
  const event = hit(r, e, 'sj_shadow')
  const expected = 10 * (1 + weapon.affixes.find(a => a.type === 'physical').value / 100)
  near(event.damage, expected*.5)
  near(event.damageParts.physical, expected / 4)
  near(event.damageParts.magic, expected / 4)
  near(e.qingping.amount, expected * .5*1.15)
  near(e.qingping.physicalAmount, expected * .25*1.15)
})

test('pending mixed wounds merge actual parts and preserve totals across paused restore and refresh', () => {
  const { r, e } = fixture({ sj_mark: 4 })
  hit(r, e, 'sj_yujian')
  hit(r, e, 'sj_shadow')
  near(e.qingping.amount, 11.5)
  near(e.qingping.physicalAmount, 8.625)
  r.pause()
  const saved = r.snapshot()
  r.advance(1)
  assert.deepEqual(r.snapshot(), saved)
  const resumed = TowerRun.restore(saved)
  resumed.resume()
  const target = resumed.state.enemies.find(x => x.id === e.id)
  const parts = { physical: 0, magic: 0 }
  const original = resumed._effect.bind(resumed)
  resumed._effect = (kind, x, y, radius, extra) => {
    if (extra?.source === 'wound') {
      parts.physical += extra.damageParts.physical
      parts.magic += extra.damageParts.magic
    }
    return original(kind, x, y, radius, extra)
  }
  step(resumed, 30)
  near(parts.physical, 8.625/6*1.01)
  near(parts.magic, 2.875/6*1.01)
  near(target.woundPhysicalBudget, 8.625*5/6)
  hit(resumed, target, 'sj_shadow')
  const next = TowerRun.restore(resumed.snapshot())
  near(next.state.enemies.find(x => x.id === e.id).woundPhysicalBudget, 8.625*5/6+2.875)
  step(resumed, 181)
  near(parts.physical, 8.625/6*1.01+(8.625*5/6+2.875)*1.02)
  near(parts.magic, 2.875/6*1.01+(2.875*5/6+2.875)*1.02)
  near(target.woundBudget, 0)
  near(target.woundPhysicalBudget, 0)
})

test('mitigation and overkill scale both parts; inherited damage is not mitigated again', () => {
  const { r, e } = fixture({ sj_mark: 4 })
  e.mechanic = { armorUntil: 9999, armor: .5 }
  const event = hit(r, e, 'sj_shadow')
  near(event.damage, 2.5)
  near(e.qingping.amount, 2.875)
  near(e.qingping.physicalAmount, 1.4375)
  const before = e.hp
  step(r, 180)
  near(before - e.hp, 2.875)
  e.hp = 3
  const lethal = hit(r, e, 'sj_shadow', 100)
  near(lethal.damageParts.physical, 1.5)
  near(lethal.damageParts.magic, 1.5)
})

test('corrupt pending and active wound components are rejected by snapshot restore', () => {
  const { r, e } = fixture({ sj_mark: 4 })
  hit(r, e, 'sj_shadow')
  for (const value of [-1, NaN, 100]) {
    const bad = r.snapshot()
    bad.enemies.find(x => x.id === e.id).qingping.physicalAmount = value
    assert.throws(() => TowerRun.restore(bad))
  }
  step(r, 29)
  const bad = r.snapshot()
  bad.enemies.find(x => x.id === e.id).woundPhysicalBudget = 100
  assert.throws(() => TowerRun.restore(bad))
})

test('fractional pure physical hits never create negative spell damage or unloadable wounds', () => {
  for (const damage of [.007, 11.324, 10.1]) {
    const { r, e } = fixture({ sj_mark: 4 })
    const event = hit(r, e, 'sj_yujian', damage)
    assert.equal(event.damageParts.magic, 0)
    assert.equal(event.damageParts.physical, event.damage)
    assert.equal(e.qingping.physicalAmount, e.qingping.amount)
    const restored = TowerRun.restore(r.snapshot())
    step(restored, 29)
    assert.doesNotThrow(() => TowerRun.restore(restored.snapshot()))
    step(restored, 121)
    assert.doesNotThrow(() => TowerRun.restore(restored.snapshot()))
  }
})

test('sword gate stays an independent mixed burst without crit or wound recursion', () => {
  const { r, e } = fixture({ sj_gate: 1, sj_mark: 4, sj_heart: 4 })
  r.state.player.attack = 10
  hit(r, e, 'sj_yujian', 1)
  const budget = e.qingping.amount
  r.state.time += .42
  tickSwordBursts(r)
  const event = r.state.effects.findLast(x => x.source === 'sword_burst')
  near(event.damage, 5)
  near(event.damageParts.physical, 2.5)
  near(event.damageParts.magic, 2.5)
  near(e.qingping.amount, budget)
  assert.equal(event.critical, undefined)
  assert.equal(r.state.swordBursts.length, 0)
})

test('skill details show spell terminology, split proportions and source-inherited wounds', () => {
  const state = new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state
  for (const def of [...GROWTH_SKILLS, ...GROWTH_EVOLUTIONS]) {
    const p = skillPresentation(state, def.id)
    assert.doesNotMatch(p.category + p.description, /魔法/)
    if (def.id === 'sj_mark') {
      assert.match(p.description, /继承.*物理.*法术/)
      assert.match(p.category, /继承/)
    } else if (def.damageType === 'hybrid') {
      assert.match(p.description, /50%.*50%/)
    }
  }
  assert.match(skillPresentation(state, 'sj_wanjian').description, /阵中灵力/)
})
