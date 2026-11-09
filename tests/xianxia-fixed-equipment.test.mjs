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
const skills = ['sj_yujian','sj_shadow','sj_arc','sj_line','sj_cross','sj_wanjian','sj_formation','evo_wanjian','evo_tiandi','evo_sixiang'] // 周天剑域已退役
const output = (d, skill, type='physical') => 1 + weapons.weaponDamageModifiers(create(d),skill,type).flat
test('weapon specialization is added once and evolution families inherit it',()=>{
 for(const d of expected.filter(d=>d.category==='weapon'&&d.quality)){
  const w=create(d),flow=w.affixes.find(a=>a.type==='flow')
  for(const [base,evo] of [['sj_line','evo_tiandi'],['sj_yujian','evo_wanjian'],['sj_formation','evo_sixiang']])
   assert.equal(output(d,base),output(d,evo))
  if(flow){
   const selected={qi:'sj_arc',yujian:'sj_shadow',formation:'sj_formation'}[flow.target]
   const other=flow.target==='formation'?'sj_arc':'sj_formation'
   assert.ok(Math.abs(output(d,selected)-output(d,other)-flow.value/100)<1e-10,d.id)
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
  for(const d of expected){
    const icon=LIBRARY_ENTRIES.find(e=>e.id===d.id).icon
    if(icon){assert.equal(icon,`tower-equipment/${d.id}`);assert.ok(fs.existsSync(new URL(`../cocos-pilot/assets/resources/${icon}.png`,import.meta.url)))}
  }
  assert.equal(LIBRARY_ENTRIES.find(e=>e.id==='eq_sword_wangshu').icon,'')
})
test('top ring and armor identities retain their mutually exclusive combat roles',()=>{
 const pick=(tier,category,role)=>create(expected.find(d=>d.tier===tier&&d.category===category&&d.quality===4&&d.role===role))
 for(const tier of ['fa','bao','ling']){
  const burst=pick(tier,'ring','graduate'),cadence=pick(tier,'ring','master')
  assert.ok(equipment.ringDamageModifiers(burst).critChance>0)
  assert.equal(equipment.ringCooldownReduction(burst),0)
  assert.equal(equipment.ringDamageModifiers(cadence).critChance,0)
  assert.ok(equipment.ringCooldownReduction(cadence)>0)
  const guard=equipment.armorModifiers(pick(tier,'armor','graduate')),caster=equipment.armorModifiers(pick(tier,'armor','master'))
  assert.ok(guard.physicalDefense>caster.physicalDefense)
  assert.ok(guard.strength>guard.intelligence&&caster.intelligence>caster.strength)
  assert.ok(guard.attackSpeed>0&&caster.castSpeed>0)
  assert.equal(guard.castSpeed,0);assert.equal(caster.attackSpeed,0)
 }
})
