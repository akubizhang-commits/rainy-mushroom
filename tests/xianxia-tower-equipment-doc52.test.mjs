import {equipmentBaseAttributes} from '../js/xianxia/TowerEquipmentBases.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {EQUIPMENT,createFixedEquipment,createBasicEquipment,rollEquipment,validateEquipment,ringDamageModifiers,ringCooldownReduction,armorModifiers,equipmentDescription,equipmentSummary} from '../js/xianxia/TowerEquipment.js'
import {WEAPONS,createFixedWeapon,createIronWeapon,validateWeapon,weaponFlatAttack,weaponDamageModifiers,WEAPON_ATTACK_REFERENCE} from '../js/xianxia/TowerWeapons.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
import {cultivationAt,cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
// Doc52 scheduling/units and validation contracts remain. Its random-slot and
// per-grade percentage allocations were superseded by fixed identity budgets.
const copy=v=>JSON.parse(JSON.stringify(v))
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`)
const ringDefs=EQUIPMENT.filter(d=>d.category==='ring'&&d.quality)
const armorDefs=EQUIPMENT.filter(d=>d.category==='armor'&&d.quality)
const ring=d=>createFixedEquipment(d.id,'ring-test')
const weapon=d=>createFixedWeapon(d.id,d.quality?'weapon-test':'iron')
const sources=[['sj_formation','hybrid'],['evo_sixiang','hybrid'],['sj_wanjian','hybrid'],['evo_wuwo','hybrid'],['sj_line','physical'],['evo_tiandi','physical'],['sj_yujian','physical'],['evo_wanjian','physical'],['sj_cross','physical'],['sj_shadow','physical']]
test('fixed rings retain exclusive crit or CDR slots without retired focus and with exact fractional APIs',()=>{
 for(const d of ringDefs){
  const item=ring(d),types=item.affixes.map(a=>a.type)
  assert.equal(item.refine,0);assert.ok(types.includes('skillDamage'))
  assert.notEqual(types.includes('critChance'),types.includes('cooldownReduction'))
  assert.equal(types.includes('critChance'),types.includes('critBonus'))
  assert.equal(types.includes('focus'),false)
  close(ringCooldownReduction(item),(item.affixes.find(a=>a.type==='cooldownReduction')?.value??0)/100)
  assert.deepEqual(Object.keys(ringDamageModifiers(item)).sort(),['critBonus','critChance','skillDamage','special'])
  assert.deepEqual(JSON.parse(JSON.stringify(item)),item)
  const reversed=copy(item);reversed.affixes.reverse();assert.ok(validateEquipment(reversed))
 }
 close(ringCooldownReduction(createBasicEquipment('ring')),0)
 assert.throws(()=>ringCooldownReduction(createBasicEquipment('armor')))
})
test('ring RNG selects each same-quality identity equally and never changes fixed slots',()=>{
 for(const tier of ['fan','fa','bao','ling'])for(const quality of tier==='fan'?[1]:[1,2,3,4]){
  const pool=ringDefs.filter(d=>d.tier===tier&&d.quality===quality),counts=new Map(pool.map(d=>[d.id,0]))
  for(let n=0;n<100;n++){
   let calls=0;const item=rollEquipment('ring',tier,quality,()=>{calls++;return(n+.5)/100},`choice-${n}`)
   assert.equal(calls,1);counts.set(item.definitionId,counts.get(item.definitionId)+1)
   assert.deepEqual(item.affixes,ring(pool.find(d=>d.id===item.definitionId)).affixes)
  }
  for(const n of counts.values())assert.equal(n,100/pool.length)
 }
})
test('strict ring validation rejects missing/duplicate slots, changed CDR, targets and refinement',()=>{
 for(const d of ringDefs){const item=ring(d)
  for(const mutate of [a=>a.affixes.shift(),a=>a.affixes.pop(),a=>a.affixes.push({type:'critBonus',value:1}),
   a=>{a.affixes[0]=copy(a.affixes[1])},a=>{a.affixes[0].value+=.1},
   a=>{a.affixes[1].value=NaN},a=>{a.affixes[1].value+=.001},a=>{a.affixes[1].target='sj_line'},a=>{a.refine=1}]){
    const invalid=copy(item);mutate(invalid);assert.equal(validateEquipment(invalid),false)
    assert.throws(()=>ringCooldownReduction(invalid))
   }
 }
})
test('all fixed rings preserve the conservative60% standalone offense envelope including precharged focus',()=>{
 for(const d of ringDefs){const item=ring(d),m=ringDamageModifiers(item),cdr=ringCooldownReduction(item)
  assert.ok((1+(m.skillDamage||0)+.5*m.critChance+m.critBonus+m.special)/(1-cdr)<=1.60+1e-12,d.id)
 }
})
test('fixed attack references follow actual unlocks and calculations cannot mutate fixed weapon instances',()=>{
 assert.ok(Object.isFrozen(WEAPON_ATTACK_REFERENCE))
 for(const tier of ['fan','fa','bao','ling'])close(WEAPON_ATTACK_REFERENCE[tier],100*cultivationAt(cultivationLevelXp(equipmentTier(tier).minLevel)).attackMultiplier)
 for(const d of WEAPONS){const w=weapon(d),before=JSON.stringify(w)
  close(weaponFlatAttack(w),equipmentBaseAttributes(d).physicalAttack)
  for(const base of [WEAPON_ATTACK_REFERENCE[d.tier],WEAPON_ATTACK_REFERENCE[d.tier]*3])for(const [skill,type]of sources){
   const flat=weaponDamageModifiers(w,skill,type).flat
   assert.ok((base+weaponFlatAttack(w))/(base+5)*(1+flat)<=4.5+1e-12)
  }
  assert.equal(JSON.stringify(w),before)
  if(d.quality){const wrong=copy(w);wrong.affixes[0].value+=.1;assert.equal(validateWeapon(wrong),false)}
  const duplicate=copy(w);duplicate.affixes.push({type:'physical',value:1});assert.equal(validateWeapon(duplicate),false)
 }
 close(weaponFlatAttack(createIronWeapon()),5)
})
test('all936 fixed weapon/ring identity pairs stay under6x with fixed points, CDR and evolved families',t=>{
 let checks=0,worst=1
 const rings=[createBasicEquipment('ring'),...ringDefs.map(ring)]
 for(const d of WEAPONS)for(const r of rings){
  const w=weapon(d),m=ringDamageModifiers(r),cdr=ringCooldownReduction(r)
  const B=Math.max(WEAPON_ATTACK_REFERENCE[d.tier],WEAPON_ATTACK_REFERENCE[r.tier])
  for(const [skill,type]of sources)for(const p of [0,.11,.5,.97,1])for(const bone of [0,.135,.5])for(const focus of [0,.2,1]){
   const native=.5/(1+bone),flat=weaponDamageModifiers(w,skill,type).flat,factor=(B+weaponFlatAttack(w))/(B+5)
   const ratio=factor*(1+flat+(m.skillDamage||0)+Math.min(1,p+m.critChance)*(native+m.critBonus)+focus*m.special)/(1+p*native)/(1-cdr)
   assert.ok(ratio<=6+1e-10,`${d.id}/${r.definitionId}/${skill}: ${ratio}`)
   assert.ok(factor*(1+flat+(m.skillDamage||0))/(1-cdr)<=6+1e-10)
   worst=Math.max(worst,ratio);checks++
  }
 }
 t.diagnostic(`${checks} combinations; maximum gain${((worst-1)*100).toFixed(6)}%`)
})
test('fixed armor uses physical defense, integer vitality and periodic recovery with strict affix validation',()=>{
 const starter=armorModifiers(createBasicEquipment('armor'))
 assert.equal(starter.physicalDefense,1);assert.equal(starter.magicDefense,0)
 assert.equal(starter.hpBonus,0);assert.equal(starter.healthRegen,0)
 for(const d of armorDefs){const item=createFixedEquipment(d.id,'armor-test'),m=armorModifiers(item)
  assert.equal(m.hpBonus,0);assert.equal(m.magicDefense,0)
  assert.ok(equipmentBaseAttributes(d).vitality>0)
  assert.ok(m.healthRegen>0&&m.healthRegen<=2.5)
  for(const mutate of [a=>a.affixes.pop(),a=>{a.affixes=a.affixes.filter(f=>f.type!=='healthRegen')},
   a=>{a.affixes[0].value+=1},a=>{a.affixes[0].type='cooldownReduction'},a=>a.affixes.push(copy(a.affixes[0]))]){
    const invalid=copy(item);mutate(invalid);assert.equal(validateEquipment(invalid),false)
   }
  assert.match(equipmentDescription(item).join(' '),/体力.*气血/)
  assert.match(equipmentDescription(item).join(' '),/气血回复 .*\/3秒/)
 }
})
test('UI descriptions display both fixed crit and cooldown bonuses with correct units and detached summaries',()=>{
 for(const d of ringDefs){const item=ring(d),before=JSON.stringify(item),lines=equipmentDescription(item).join(' ')
  assert.equal(/所有技能冷却时间 -/.test(lines),ringCooldownReduction(item)>0)
  assert.equal(/暴击伤害 \+/.test(lines),ringDamageModifiers(item).critBonus>0)
  const summary=equipmentSummary(item);close(summary.cooldownReduction,ringCooldownReduction(item))
  summary.affixes[0].value=999;summary.lines.push('changed');assert.equal(JSON.stringify(item),before)
 }
})
test('level-one and later legal fixed loadouts retain damage budgets as cultivation grows',()=>{
 let firstLevelCases=0
 for(let level=1;level<=30;level++){
  const base=100*cultivationAt(cultivationLevelXp(level)).attackMultiplier
  for(const d of WEAPONS.filter(d=>d.quality&&(d.minLevel??equipmentTier(d.tier).minLevel)<=level)){
   const w=weapon(d),flat=Math.max(...sources.map(([skill,type])=>weaponDamageModifiers(w,skill,type).flat))
   for(const rd of ringDefs.filter(d=>(d.minLevel??equipmentTier(d.tier).minLevel)<=level)){
    const r=ring(rd),m=ringDamageModifiers(r),cdr=ringCooldownReduction(r)
    for(const p of [0,.04,.11])for(const bone of [0,.135]){
     const native=.5/(1+bone)
     const ratio=(base+weaponFlatAttack(w))/(base+5)*(1+flat+(m.skillDamage||0)+Math.min(1,p+m.critChance)*(native+m.critBonus)+m.special)/(1+p*native)/(1-cdr)
     assert.ok(ratio<=6+1e-12);if(level===1)firstLevelCases++
    }
   }
  }
 }
 assert.equal(firstLevelCases,6)
})
