import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as weapons from '../js/xianxia/TowerWeapons.js'
import * as equipment from '../js/xianxia/TowerEquipment.js'
import { equipmentSource, sourceQualities } from '../js/xianxia/TowerEquipmentSources.js'
const snapshot = JSON.parse(fs.readFileSync(new URL('../design/balance/equipment-roster-2026-11-01/roster.json', import.meta.url)))
const expected = [...snapshot.starters, ...snapshot.entries, {id:'eq_sword_qingfeng',name:'青锋剑',category:'weapon',tier:'fan',quality:2,role:'transition'}]
const create = d => d.category === 'weapon' ? weapons.createFixedWeapon(d.id, d.quality ? `test-${d.id}` : 'iron') : equipment.createFixedEquipment(d.id, d.quality ? `test-${d.id}` : `basic-${d.category}`)
const valid = (d, x) => d.category === 'weapon' ? weapons.validateWeapon(x) : equipment.validateEquipment(x)
test('88 unique fixed identities preserve original roster plus the opening shop weapon', async () => {
  assert.equal(weapons.WEAPONS.length + equipment.EQUIPMENT.length, 88)
  const { EQUIPMENT_ROSTER } = await import('../js/xianxia/TowerEquipmentRoster.js')
  const project = d => [d.id,d.name,d.category,d.tier,d.quality,d.role]
  assert.deepEqual(EQUIPMENT_ROSTER.map(project).sort(), expected.map(project).sort())
  assert.equal(new Set(EQUIPMENT_ROSTER.map(d => d.id)).size, 88)
  for (const d of expected) assert.deepEqual(sourceQualities(d.id), [d.quality])
})
test('fixed factories create detached valid instances and reject altered affixes or identities', () => {
  assert.equal(typeof weapons.createFixedWeapon, 'function')
  assert.equal(typeof equipment.createFixedEquipment, 'function')
  for (const d of expected) {
    const a = create(d), b = create(d)
    assert.ok(valid(d,a), d.id)
    assert.deepEqual(a,b)
    assert.notEqual(a.affixes,b.affixes)
    assert.equal(valid(d,{...a,quality: (a.quality + 1) % 5}),false)
    assert.equal(valid(d,{...a,extra:true}),false)
    if (a.affixes.length) {
      a.affixes[0].value += .01
      assert.equal(valid(d,a),false,d.id)
      assert.ok(valid(d,b))
      assert.ok(valid(d,{...b,affixes:[...b.affixes].reverse()}))
      assert.equal(valid(d,{...b,affixes:[...b.affixes,...b.affixes.slice(0,1)]}),false)
    }
  }
})
test('rolls sample every legal identity with one RNG call and never sample retired channels', () => {
  for (const category of ['weapon','armor','ring']) for (const tier of ['fan','fa','bao','ling']) for (const q of [1,2,3,4]) {
    const pool = expected.filter(d=>d.category===category&&d.tier===tier&&d.quality===q)
    const roll = rng => category==='weapon' ? weapons.rollWeapon(tier,q,rng,'roll') : equipment.rollEquipment(category,tier,q,rng,'roll')
    if (!pool.length) { assert.throws(()=>roll(()=>0),RangeError); continue }
    const results = new Set()
    for (let i=0;i<pool.length;i++) { let calls=0; const a=roll(()=>{ calls++; return (i+.5)/pool.length }); assert.equal(calls,1); results.add(a.definitionId) }
    assert.deepEqual([...results].sort(),pool.map(d=>d.id).sort())
    assert.throws(()=>roll(()=>1),RangeError)
    for (const d of pool) assert.equal(equipmentSource(d.id),tier==='fan'?'shopOnly':'qualityPool')
  }
})
const skills = ['sj_yujian','sj_shadow','sj_arc','sj_line','sj_cross','sj_wanjian','sj_formation','evo_wanjian','evo_tiandi','evo_wuwo','evo_sixiang']
const output = (d, skill, type='physical') => 1 + weapons.weaponDamageModifiers(create(d),skill,type).flat
test('weapon families inherit evolutions once, general helps mixed loadouts and top quality is universal', () => {
  assert.equal(typeof weapons.createFixedWeapon,'function')
  for (const tier of ['fa','bao','ling']) {
    for (const q of [1,2,3]) {
      const pool=expected.filter(d=>d.category==='weapon'&&d.tier===tier&&d.quality===q)
      const general=pool.find(d=>d.role==='general'), qi=pool.find(d=>d.role==='qi'), formation=pool.find(d=>d.role==='formation')
      const ratio=output(qi,'sj_arc')/output(formation,'sj_arc')-1
      assert.ok(ratio>=.02&&ratio<=.04)
      const generalGap=output(qi,'sj_arc')/output(general,'sj_arc')-1
      assert.ok(generalGap>=.01&&generalGap<=.02)
      assert.equal(output(qi,'sj_line'),output(qi,'evo_tiandi'))
      assert.equal(output(formation,'sj_wanjian'),output(formation,'evo_wuwo'))
      const mix=d=>skills.reduce((n,s)=>n+output(d,s),0)
      assert.ok(mix(general)>mix(qi)&&mix(general)>mix(formation))
    }
    const top=expected.filter(d=>d.category==='weapon'&&d.tier===tier&&d.quality===4)
    for (const type of ['physical','magic','hybrid']) for (const skill of skills) {
      const graduate=output(top.find(d=>d.role==='graduate'),skill,type), master=output(top.find(d=>d.role==='master'),skill,type)
      const rd=equipment.EQUIPMENT.find(d=>d.category==='ring'&&d.tier===tier&&d.quality===4&&d.role==='graduate')
      const U=equipment.ringDamageModifiers(create(rd)).skillDamage||0
      assert.ok((master+U)/(graduate+U)-1>=.0049&&(master+U)/(graduate+U)-1<=.0051)
      for (const high of expected.filter(d=>d.category==='weapon'&&d.tier===tier&&d.quality===3)) assert.ok(graduate>output(high,skill,type))
    }
    for(let q=2;q<=4;q++) for(const skill of skills) {
      const next=expected.filter(d=>d.category==='weapon'&&d.tier===tier&&d.quality===q)
      const prev=expected.filter(d=>d.category==='weapon'&&d.tier===tier&&d.quality===q-1)
      assert.ok(Math.min(...next.map(d=>output(d,skill)))>=Math.max(...prev.map(d=>output(d,skill))))
    }
  }
})
test('encyclopedia shows fixed stats, unique quality and explicit art gaps', async () => {
  const {libraryDetails, LIBRARY_ENTRIES}=await import('../js/xianxia/TowerLibrary.js')
  for(const d of expected) {
    const entry=LIBRARY_ENTRIES.find(e=>e.id===d.id)
    assert.deepEqual(entry.qualities,[d.quality])
    const detail=libraryDetails(d.id,4)
    assert.doesNotMatch(JSON.stringify(detail),/随机词条|属性范围|同一名称可有不同品质/)
    if(d.quality) assert.deepEqual(detail.effects,d.category==='weapon'?weapons.weaponDescription(create(d)):equipment.equipmentDescription(create(d)))
  }
  for(const d of snapshot.entries.filter(d=>d.source==='proposed-new')) assert.equal(LIBRARY_ENTRIES.find(e=>e.id===d.id).icon,'')
})
test('fixed top ring and armor cover both roles and combined master gains stay under two percent', () => {
  const pick=(tier,category,quality,role)=>expected.find(d=>d.tier===tier&&d.category===category&&d.quality===quality&&d.role===role)
  // Expected direct-hit formula mirrors combat: native crit extra is outside
  // weapon/bone coefficients. CDR counts casts; focus is amortized over five.
  const damage=(w,r,p=.1,b=.05)=>{
    const m=equipment.ringDamageModifiers(r)
    return ((1+b)*(1+weapons.weaponDamageModifiers(w,'sj_arc','physical').flat+m.special/5)
      +Math.min(1,p+m.critChance)*(.5+(1+b)*m.critBonus))/(1-equipment.ringCooldownReduction(r))
  }
  for(const tier of ['fa','bao','ling']) {
    const wg=create(pick(tier,'weapon',4,'graduate')),wm=create(pick(tier,'weapon',4,'master'))
    const rg=create(pick(tier,'ring',4,'graduate')),rm=create(pick(tier,'ring',4,'master'))
    const gain=damage(wg,rm)/damage(wg,rg)-1
    assert.ok(gain>0&&gain<=.01)
    assert.ok(damage(wm,rm)/damage(wg,rg)-1<=.02)
    for(const role of ['burst','cadence']) assert.ok(damage(wg,rg)>damage(wg,create(pick(tier,'ring',3,role))))
    const ag=equipment.armorModifiers(create(pick(tier,'armor',4,'graduate'))),am=equipment.armorModifiers(create(pick(tier,'armor',4,'master')))
    const burst=m=>(1+m.hpBonus)/(1-m.reduction)
    assert.ok(burst(am)>burst(ag)&&burst(am)/burst(ag)-1<=.02)
    assert.ok(am.healFraction/ag.healFraction-1<=.02)
    for(const role of ['guard','recovery']) {
      const high=equipment.armorModifiers(create(pick(tier,'armor',3,role)))
      assert.ok(burst(ag)>burst(high));assert.ok(ag.healFraction>high.healFraction)
    }
    for(let q=2;q<=3;q++) {
      const lower=equipment.armorModifiers(create(pick(tier,'armor',q-1,'guard')))
      const higher=equipment.armorModifiers(create(pick(tier,'armor',q,'recovery')))
      assert.ok(burst(higher)>burst(lower))
    }
  }
})
