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
      .map(id => [id, 5, 5 * 90 / 110]),
  ]) {
    const { r, e } = fixture()
    const before = e.hp, event = hit(r, e, source)
    assert.ok(event.damageParts, source)
    near(event.damageParts.physical, physical*500/(500+e.physicalDefense))
    near(event.damageParts.magic, magic*500/(500+e.magicDefense))
    near(before - e.hp, physical*500/(500+e.physicalDefense) + magic*500/(500+e.magicDefense))
  }
})

test('single-type bonuses boost only their half without doubling the total budget', async () => {
  const { splitDamage, scaleDamageParts } = await import('../js/xianxia/TowerDamage.js')
  assert.deepEqual(scaleDamageParts(splitDamage(100, 'hybrid'), 1.2, 1), { physical: 60, magic: 50 })
  assert.deepEqual(scaleDamageParts(splitDamage(100, 'hybrid'), 1, 1.2), { physical: 50, magic: 60 })
  assert.deepEqual(scaleDamageParts(splitDamage(100, 'physical'), 1, 2), { physical: 100, magic: 0 })
})

test('fixed equipment bonuses apply once; scar only multiplies subsequent direct hits', () => {
  const weapon=createFixedWeapon('eq_sword_suwen','type-test'),{r,e}=fixture({sj_mark:1},weapon)
  const event=hit(r,e,'sj_shadow')
  const p=1+weapon.affixes.find(a=>a.type==='physical').value/100
  const m=1+weapon.affixes.find(a=>a.type==='magic').value/100
  near(event.damageParts.physical,5*p*500/(500+e.physicalDefense))
  near(event.damageParts.magic,5*r.state.player.magicAttack/r.state.player.attack*m*500/(500+e.magicDefense))
  const next=hit(r,e,'sj_shadow')
  near(next.damageParts.physical,event.damageParts.physical*1.2*(500+e.physicalDefense)/(500+e.physicalDefense*.8))
  near(next.damageParts.magic,event.damageParts.magic*1.2)
})

test('fractional pure physical hits never create negative spell damage or unloadable wounds', () => {
  for (const damage of [.007, 11.324, 10.1]) {
    const { r, e } = fixture({ sj_mark:1 })
    const event = hit(r, e, 'sj_yujian', damage)
    assert.equal(event.damageParts.magic, 0)
    assert.equal(event.damageParts.physical, event.damage)
    assert.equal(e.scarDebuff.vulnerability,.2)
    const restored = TowerRun.restore(r.snapshot())
    step(restored, 29)
    assert.doesNotThrow(() => TowerRun.restore(restored.snapshot()))
    step(restored, 121)
    assert.doesNotThrow(() => TowerRun.restore(restored.snapshot()))
  }
})

test('sword gate stays an independent mixed burst without crit or wound recursion', () => {
  const { r, e } = fixture({ sj_gate: 1, sj_mark:1, sj_heart: 4 })
  r.state.player.attack = 10
  hit(r, e, 'sj_line', 1)
  const status = structuredClone(e.scarDebuff)
  r.state.time += .42
  tickSwordBursts(r)
  const event = r.state.effects.findLast(x => x.source === 'sword_burst')
  near(event.damage, 2.5*500/(500+e.physicalDefense*.8) + 2.5 * 90 / 110*500/(500+e.magicDefense))
  near(event.damageParts.physical, 2.5*500/(500+e.physicalDefense*.8))
  near(event.damageParts.magic, 2.5 * 90 / 110*500/(500+e.magicDefense))
  assert.deepEqual(e.scarDebuff, status)
  assert.equal(event.critical, undefined)
  assert.equal(r.state.swordBursts.length, 0)
})

test('skill details show spell terminology, split proportions and non-damaging scar debuff', () => {
  const state = new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state
  for (const def of [...GROWTH_SKILLS, ...GROWTH_EVOLUTIONS]) {
    const p = skillPresentation(state, def.id)
    assert.doesNotMatch(p.category + p.description, /魔法/)
    if (def.id === 'sj_mark') {
      assert.match(p.description, /后续直接伤害提高20%/)
      assert.doesNotMatch(p.category, /混合/)
    } else if (def.damageType === 'hybrid') {
      assert.match(p.description, /50%.*50%/)
    }
  }
  assert.match(skillPresentation(state, 'sj_wanjian').description, /阵中灵力/)
})
