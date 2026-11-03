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
const output = (d, skill, type='physical') => 1 + weapons.weaponDamageModifiers(create(d),skill,type,'none').flat
test('weapon families inherit evolutions once and reserve specialization from a shared damage budget', () => {
  const flowRange={fa:[6,8],bao:[8,12],ling:[12,16]}
  const total={fa:[[8,12],[14,20],[22,30],[30,40]],bao:[[20,28],[28,36],[36,46],[44,56]],ling:[[32,42],[42,54],[54,66],[66,80]]}
  for(const d of expected.filter(d=>d.category==='weapon'&&d.quality&&d.tier!=='fan')){
    const item=create(d),aff=Object.fromEntries(item.affixes.map(a=>[a.type,a.value]))
    assert.equal(aff.physical,aff.magic,d.id)
    const [lo,hi]=d.id==='eq_sword_zhaodan'?[12,24]:d.id==='eq_sword_taiheng'?[24,42]:total[d.tier][d.quality-1]
    const allocated=aff.physical+(aff.flow??0)+(aff.element??0)
    assert.ok(allocated>=lo&&allocated<=hi,`${d.id}: ${allocated} outside ${lo}..${hi}`)
    if(aff.flow){
      const [min,max]=flowRange[d.tier];assert.ok(aff.flow>=min&&aff.flow<=max)
      const family=item.affixes.find(a=>a.type==='flow').target
      const matched=family==='qi'?'sj_arc':'sj_formation',off='sj_yujian'
      assert.ok(Math.abs(output(d,matched)-output(d,off)-aff.flow/100)<1e-10)
    }
    for(const [base,evo] of [['sj_yujian','evo_wanjian'],['sj_line','evo_tiandi'],['sj_wanjian','evo_wuwo'],['sj_formation','evo_sixiang']])
      for(const type of ['physical','magic','hybrid'])assert.equal(output(d,base,type),output(d,evo,type))
    const hasLevels=['eq_sword_zhaodan','eq_sword_taiheng'].includes(d.id)
    assert.equal(Boolean(aff.skillLevel),hasLevels,d.id)
    if(hasLevels)assert.equal(aff.skillLevel,1)
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
  for(const d of snapshot.entries.filter(d=>d.source==='proposed-new')) {
    const entry=LIBRARY_ENTRIES.find(e=>e.id===d.id)
    // The original roster predates delivered art. A declared icon must exist.
    if(entry.icon)assert.ok(fs.existsSync(new URL(`../cocos-pilot/assets/resources/${entry.icon}.png`,import.meta.url)),d.id)
    else assert.equal(entry.icon,'')
  }
})
test('fixed top rings and armor preserve mutually exclusive burst, cadence, guard and caster roles', () => {
  const pick=(tier,category,role)=>create(expected.find(d=>d.tier===tier&&d.category===category&&d.quality===4&&d.role===role))
  for(const tier of ['fa','bao','ling']) {
    const burst=equipment.ringDamageModifiers(pick(tier,'ring','graduate'))
    const cadence=equipment.ringDamageModifiers(pick(tier,'ring','master'))
    assert.ok(burst.critChance>0&&burst.critBonus>0)
    assert.equal(equipment.ringCooldownReduction(pick(tier,'ring','graduate')),0)
    assert.equal(cadence.critChance,0);assert.equal(cadence.critBonus,0)
    assert.ok(equipment.ringCooldownReduction(pick(tier,'ring','master'))>0)
    const guard=equipment.armorModifiers(pick(tier,'armor','graduate'))
    const caster=equipment.armorModifiers(pick(tier,'armor','master'))
    assert.ok(guard.attackSpeed>0);assert.equal(guard.castSpeed,0)
    assert.ok(caster.castSpeed>0);assert.equal(caster.attackSpeed,0)
    assert.ok(guard.physicalDefense>caster.physicalDefense)
    assert.equal(guard.hpBonus,0);assert.equal(caster.hpBonus,0)
    assert.equal(guard.cooldownReduction,0);assert.equal(caster.cooldownReduction,0)
  }
})
