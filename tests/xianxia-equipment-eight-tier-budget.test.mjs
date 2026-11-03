import test from 'node:test'
import assert from 'node:assert/strict'
import {WEAPONS,createFixedWeapon,weaponFlatAttack,weaponSummary} from '../js/xianxia/TowerWeapons.js'
import {EQUIPMENT,createFixedEquipment,equipmentSummary} from '../js/xianxia/TowerEquipment.js'
import {cultivationAt,cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
const definitions=[...WEAPONS,...EQUIPMENT]
const rows=definitions.map(d=>{
 const item=d.category==='weapon'?createFixedWeapon(d.id,d.quality?d.id:'iron'):createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`)
 const summary=d.category==='weapon'?weaponSummary(item):equipmentSummary(item)
 return {d,item,base:summary.baseAttributes,v:Object.fromEntries(item.affixes.map(a=>[a.type,a.value]))}
})
const attack=level=>100*cultivationAt(cultivationLevelXp(level)).attackMultiplier
const eligible=(r,level)=>(r.d.minLevel??equipmentTier(r.d.tier).minLevel)<=level
const within=(n,[lo,hi],id)=>assert.ok(n>=lo&&n<=hi,`${id}: ${n} outside ${lo}..${hi}`)
// Independent approved v2 table: physical-specialist, magical-specialist,
// balanced attack ranges. Role exceptions are explicit authored identities.
const attacks={
 fa:[[[32,40],[13,16],[24,30],[40,50],[29,36]],[[48,60],[19,24],[36,45],[60,75],[43,54]],[[68,84],[27,34],[51,63],[85,105],[61,76]],[[92,112],[37,45],[69,84],[115,140],[83,101]]],
 bao:[[[80,100],[32,40],[60,75],[100,125],[72,90]],[[116,144],[46,58],[87,108],[145,180],[104,130]],[[160,192],[64,77],[120,144],[200,240],[144,173]],[[212,252],[85,101],[159,189],[265,315],[191,227]]],
 ling:[[[220,270],[88,108],[165,203],[275,338],[198,243]],[[310,370],[124,148],[233,278],[388,463],[279,333]],[[410,480],[164,192],[308,360],[513,600],[369,432]],[[520,600],[208,240],[390,450],[650,750],[468,540]]],
}
test('every fixed weapon follows the approved integer attack ranges; starters and Qingfeng keep exact identities',()=>{
 for(const r of rows.filter(r=>r.d.category==='weapon')){
  const {d,item,base}=r
  assert.equal(weaponFlatAttack(item),base.physicalAttack)
  for(const v of Object.values(base))assert.ok(Number.isInteger(v)&&v>0,d.id)
  if(d.tier==='fan'){
   const n={eq_sword_iron:5,eq_sword_suwen:16,eq_sword_qingfeng:24}[d.id]
   assert.equal(base.physicalAttack,n);assert.equal(base.magicAttack,n);continue
  }
  const role=({eq_sword_zhaoyuan:'qi',eq_sword_dingyue:'formation',eq_sword_chengming:'qi',eq_sword_kunwu:'formation'})[d.id]??d.role
  const a=attacks[d.tier][d.quality-1],limits=role==='qi'?[a[0],a[1]]:role==='formation'?[a[2],a[3]]:[a[4],a[4]]
  within(base.physicalAttack,limits[0],d.id);within(base.magicAttack,limits[1],d.id)
  if(role!=='qi'&&role!=='formation')assert.equal(base.physicalAttack,base.magicAttack)
 }
})
test('conservative three-slot coefficient screening can certify the6x ceiling without claiming full-combat proof',t=>{
 let checks=0,worst={ratio:0};const pairs=new Set()
 const slot=k=>rows.filter(r=>r.d.category===k)
 for(let level=1;level<=30;level++){
  const B=attack(level)
  for(const w of slot('weapon').filter(r=>eligible(r,level)))for(const a of slot('armor').filter(r=>eligible(r,level)))for(const r of slot('ring').filter(r=>eligible(r,level))){
   pairs.add(`${w.d.id}/${r.d.id}`)
   const p=B+w.base.physicalAttack+[w,a,r].reduce((n,x)=>n+(x.base.strength??0),0)
   const m=B+w.base.magicAttack+[w,a,r].reduce((n,x)=>n+(x.base.intelligence??0),0)
   const awareness=[w,a,r].reduce((n,x)=>n+(x.base.awareness??0),0)
   const speed=1+((w.v.attackSpeed??0)+(a.v.attackSpeed??0))/100
   const cast=Math.max(1/(1-(r.v.cooldownReduction??0)/100),1+(awareness+(a.v.castSpeed??0))/(100+level-1))
   const chance=(r.v.critChance??0)/100
   for(const native of [0,1-chance,1])for(const channel of ['basic','qi','formation','magic']){
    const crit=(1+Math.min(1,native+chance)*(.5+(r.v.critBonus??0)/100))/(1+native*.5)
    const point=channel==='formation'?(p+m)/2:channel==='magic'?m:p
    const damage=1+((w.v.physical??0)+(channel==='basic'?0:w.v.element??0)+(w.item.affixes.some(f=>f.type==='flow'&&f.target===channel)?w.v.flow??0:0))/100
    const ring=channel==='basic'?1:1+((r.v.skillDamage??0)+(channel==='formation'?r.v.formationDamage??0:0))/100
    const attached=w.v.bleedConversion?1+.5*((1+(w.v.bleed??0)/100)*1.1-1):1+(w.v.onHit??0)/100
    const ratio=point/(B+5)*damage*ring*crit*attached*(1+(r.v.dotDamage??0)/100)*(channel==='basic'?speed:cast)
    if(ratio>worst.ratio)worst={ratio,level,channel,weapon:w.d.id,armor:a.d.id,ring:r.d.id,native}
    checks++
   }
  }
 }
 assert.equal(pairs.size,36*26)
 t.diagnostic(JSON.stringify({checks,worst,limitations:'Ordinary-effect screening envelope. Skill +1, inherited/passive geometry and real scheduling still require independent combat coverage.'}))
 assert.ok(worst.ratio<=6+1e-10,'Cannot certify the6x ceiling from this overestimate; this is not measured DPS: '+JSON.stringify(worst))
})
test('fixed primary and attack points dilute as cultivation grows instead of scaling with their wearer',()=>{
 for(const r of rows.filter(r=>r.d.category==='weapon'&&r.d.quality)){
  const first=r.d.minLevel??equipmentTier(r.d.tier).minLevel,before=JSON.stringify(r.item)
  const factor=level=>(attack(level)+r.base.physicalAttack+(r.base.strength??0))/(attack(level)+5)
  assert.ok(factor(first)>factor(30),r.d.id)
  assert.equal(JSON.stringify(r.item),before)
 }
})
test('same-role armor upgrades meet the approved physical and magical effective-health bands',()=>{
 const failures=[]
 for(const tier of ['fa','bao','ling'])for(const caster of [false,true])for(const end of [false,true]){
  const level=end?{fa:10,bao:20,ling:30}[tier]:{fa:4,bao:11,ling:21}[tier],B=attack(level)
  const find=(q,role)=>rows.find(r=>r.d.category==='armor'&&r.d.tier===tier&&r.d.quality===q&&r.d.role===role)
  const low=find(1,caster?'recovery':'guard'),top=find(4,caster?'master':'graduate')
  const physical=r=>(B+10*r.base.vitality)*(1+r.base.physicalDefense/1000)
  const magic=r=>B+10*r.base.vitality
  for(const [kind,ratio,bounds] of [['physical',physical(top)/physical(low),end?[1.25,1.80]:[1.35,1.90]],['magic',magic(top)/magic(low),end?[1.10,1.40]:[1.20,1.55]]])
   if(ratio<bounds[0]||ratio>bounds[1])failures.push({tier,caster,level,kind,ratio,bounds})
 }
 assert.deepEqual(failures,[])
})
test('only the two authored swords grant skill levels and pay the reduced ordinary-damage budget',()=>{
 const boosted=rows.filter(r=>r.v.skillLevel)
 assert.deepEqual(boosted.map(r=>r.d.id).sort(),['eq_sword_taiheng','eq_sword_zhaodan'])
 for(const r of boosted){
  assert.equal(r.v.skillLevel,1)
  within(r.v.physical+(r.v.flow??0)+(r.v.element??0),r.d.tier==='fa'?[12,24]:[24,42],r.d.id)
  assert.equal(r.item.affixes.find(a=>a.type==='skillLevel').target,r.d.tier==='fa'?'炼气':'all')
 }
})
