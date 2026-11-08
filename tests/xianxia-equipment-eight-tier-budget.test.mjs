import {EQUIPMENT_RANGES} from '../js/xianxia/TowerEquipmentRanges.js'
import {equipmentBaseAttributes} from '../js/xianxia/TowerEquipmentBases.js'
import {weaponBaseAffinity} from '../js/xianxia/TowerEquipmentIdentity.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {WEAPONS,createFixedWeapon,weaponFlatAttack,weaponDamageModifiers} from '../js/xianxia/TowerWeapons.js'
import {EQUIPMENT,createFixedEquipment,ringDamageModifiers,ringCooldownReduction,armorModifiers} from '../js/xianxia/TowerEquipment.js'
import {cultivationAt,cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
const skills=['sj_yujian','sj_shadow','sj_arc','sj_line','sj_cross','sj_wanjian','sj_formation','evo_wanjian','evo_tiandi','evo_wuwo','evo_sixiang']
const types=['physical','magic','hybrid']
const nativeCrit=[0,.11,.5,.97,1], bones=[0,.03,.135,.5], focuses=[0,.2,1]
const weapon=d=>createFixedWeapon(d.id,d.quality?'budget-weapon':'iron')
const item=d=>createFixedEquipment(d.id,d.quality?'budget-item':`basic-${d.category}`)
const attack=level=>100*cultivationAt(cultivationLevelXp(level)).attackMultiplier
const eligible=(d,level)=>(d.minLevel??equipmentTier(d.tier).minLevel)<=level
const weaponRows=WEAPONS.map(d=>({d,w:weapon(d),flat:Math.max(...skills.flatMap(s=>types.map(t=>weaponDamageModifiers(weapon(d),s,t).flat)))}))
const ringRows=EQUIPMENT.filter(d=>d.category==='ring').map(d=>({d,r:item(d),m:ringDamageModifiers(item(d)),R:ringCooldownReduction(item(d))}))
const ratio=(B,w,flat,m,R,p,bone,focus)=>{
 const native=.5/(1+bone),wc=weaponDamageModifiers(w,'basic_attack','physical')
 return (B+weaponFlatAttack(w))/(B+5)*(1+flat+(m.skillDamage||0)+Math.min(1,p+m.critChance+wc.critChance)*(native+m.critBonus+wc.critBonus)+focus*m.special)/(1+p*native)/(1-R)
}
test('fixed weapon attack stays inside the approved integer identity ranges without stacking starter attack',()=>{
 for(const {d,w} of weaponRows){
  const base=equipmentBaseAttributes(d)
  assert.equal(weaponFlatAttack(w),base.physicalAttack)
  if(!d.quality){assert.equal(base.physicalAttack,5);continue}
  const role=weaponBaseAffinity(d)??(['qi','formation'].includes(d.role)?d.role:'general')
  const limits=EQUIPMENT_RANGES[`${d.tier}:${d.quality}`].weapon[role]
  for(const [key,range] of [['physicalAttack',limits[0]],['magicAttack',limits[1]]])
   assert.ok(Number.isInteger(base[key])&&base[key]>=range[0]&&base[key]<=range[1],d.id+'/'+key)
 }
})
test('all legal fixed weapon/ring pairs at levels1–30 stay within6x including capped crit, bone, precharged focus and maximum legal armor CDR',t=>{
 let checks=0,periodic=0,worst=1,worstCase
 const covered=new Set()
 for(let level=1;level<=30;level++){
  const B=attack(level)
  const armorCDR=Math.max(...EQUIPMENT.filter(d=>d.category==='armor'&&eligible(d,level)).map(d=>armorModifiers(item(d)).cooldownReduction||0))
  for(const {d:wd,w,flat} of weaponRows.filter(x=>eligible(x.d,level)))for(const {d:rd,m,R} of ringRows.filter(x=>eligible(x.d,level))){
   covered.add(`${wd.id}/${rd.id}`)
   for(const p of [...nativeCrit,1-m.critChance])for(const bone of bones)for(const focus of focuses){
    const gain=ratio(B,w,flat,m,Math.min(.3,R+armorCDR),p,bone,focus)
    if(gain>worst){worst=gain;worstCase=`Lv${level} ${wd.id}/${rd.id} p${p} bone${bone} focus${focus}`}
    assert.ok(gain<=6+1e-10,`${worstCase}: ${gain}`);checks++
   }
   assert.ok((B+weaponFlatAttack(w))/(B+5)*(1+flat+(m.skillDamage||0))/(1-Math.min(.3,R+armorCDR))<=6+1e-10);periodic++
  }
 }
 assert.equal(covered.size,weaponRows.length*ringRows.length)
 t.diagnostic(`${checks} direct boundaries; ${periodic} periodic bounds; all${covered.size}identity pairs; worst${((worst-1)*100).toFixed(6)}% ${worstCase}`)
})
test('all fixed primary attributes respect the separately authored integer budget and awareness tradeoff',()=>{
 for(const d of [...WEAPONS,...EQUIPMENT].filter(d=>d.quality)){
  const base=equipmentBaseAttributes(d),range=EQUIPMENT_RANGES[`${d.tier}:${d.quality}`][d.category]
  const primary=(base.strength??0)+(base.intelligence??0)
  assert.ok(primary>=range.primary[0]&&primary<=range.primary[1],d.id)
  if(base.awareness){
   assert.ok(base.awareness>=range.awareness[0]&&base.awareness<=range.awareness[1],d.id)
   assert.ok(primary<=Math.floor((range.primary[0]+range.primary[1])/2),d.id)
  }
 }
})
test('armor physical survival grows across quality with finite regeneration after magic defense moves to rings',()=>{
 for(const d of EQUIPMENT.filter(d=>d.category==='armor'&&d.quality)){
  const m=armorModifiers(item(d))
  assert.ok(m.hpBonus<=.31&&m.physicalReduction<.5&&m.magicReduction===0,d.id)
  assert.ok(Number.isFinite(m.healthRegen)&&m.healthRegen>=0,d.id)
 }
 for(const tier of ['fa','bao','ling']){
  const low=EQUIPMENT.filter(d=>d.category==='armor'&&d.tier===tier&&d.quality===1)
  const top=EQUIPMENT.filter(d=>d.category==='armor'&&d.tier===tier&&d.quality===4)
  const ehp=d=>{const m=armorModifiers(item(d));return(1+m.hpBonus)/(1-m.physicalReduction)}
  for(const a of low)for(const b of top)assert.ok(ehp(b)>ehp(a),`${a.id}/${b.id}: ${ehp(b)/ehp(a)}`)
 }
})
test('top identities preserve explicit burst/cadence and physical/caster tradeoffs',()=>{
 for(const tier of ['fa','bao','ling']){
  const pair=category=>['graduate','master'].map(role=>EQUIPMENT.find(d=>d.category===category&&d.tier===tier&&d.role===role))
  const [r0,r1]=pair('ring').map(d=>item(d))
  assert.ok(ringDamageModifiers(r0).critChance>ringDamageModifiers(r1).critChance)
  assert.equal(ringCooldownReduction(r0),0);assert.ok(ringCooldownReduction(r1)>0)
  const [a0,a1]=pair('armor').map(d=>armorModifiers(item(d)))
  assert.ok(a0.physicalDefense>a1.physicalDefense)
  assert.ok(a0.attackSpeed>0&&a1.castSpeed>0)
  assert.equal(a0.castSpeed,0);assert.equal(a1.attackSpeed,0)
 }
})
