import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {EQUIPMENT_ROSTER} from '../js/xianxia/TowerEquipmentRoster.js'
import {FIXED_EQUIPMENT} from '../js/xianxia/TowerEquipmentFixed.js'
import {EQUIPMENT_RANGES} from '../js/xianxia/TowerEquipmentRanges.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
import {cultivationAt,cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {createFixedWeapon,weaponSummary,validateWeapon} from '../js/xianxia/TowerWeapons.js'
import {createFixedEquipment,equipmentSummary,validateEquipment} from '../js/xianxia/TowerEquipment.js'
import {weaponBaseAffinity} from '../js/xianxia/TowerEquipmentIdentity.js'
const out=new URL('../reports/equipment-integer-v2-2026-11-03/',import.meta.url)
const [oldW,oldG]=await Promise.all(['TowerWeapons','TowerEquipment'].map(n=>import(new URL(`before/js/xianxia/${n}.js`,out))))
const errors=[],check=(condition,message)=>{if(!condition)errors.push(message)}
const within=(n,b)=>b&&Number.isFinite(n)&&n>=b[0]-1e-8&&n<=b[1]+1e-8
const entries=EQUIPMENT_ROSTER.map(d=>{
 const data=FIXED_EQUIPMENT[d.id],v=Object.fromEntries(data.affixes.map(a=>[a.type,a.value]))
 const item=d.category==='weapon'?createFixedWeapon(d.id,d.quality?d.id:'iron'):createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`)
 const existed=(d.category==='weapon'?oldW.WEAPONS:oldG.EQUIPMENT).some(row=>row.id===d.id)
 const old=!existed?null:d.category==='weapon'?oldW.weaponSummary(oldW.createFixedWeapon(d.id,d.quality?d.id:'iron')):oldG.equipmentSummary(oldG.createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`))
 const summary=d.category==='weapon'?weaponSummary(item):equipmentSummary(item)
 check((d.category==='weapon'?validateWeapon:validateEquipment)(item),`${d.id}: instance rejected`)
 if(d.quality){
  const r=EQUIPMENT_RANGES[`${d.tier}:${d.quality}`],s=r[d.category],b=data.base
  for(const [key,n] of Object.entries(b))check(Number.isInteger(n)&&n>0,`${d.id}: ${key} not positive integer`)
  check(within((b.strength??0)+(b.intelligence??0),s.primary),`${d.id}: primary budget`)
  if(b.awareness){check(within(b.awareness,s.awareness),`${d.id}: awareness`);check((b.strength??0)+(b.intelligence??0)<=Math.floor((s.primary[0]+s.primary[1])/2),`${d.id}: awareness exchange`)}
  if(d.category==='weapon'){
   const role=weaponBaseAffinity(d)??(['qi','formation'].includes(d.role)?d.role:'general'),limits=s[role]
   check(within(b.physicalAttack,limits[0])&&within(b.magicAttack,limits[1]),`${d.id}: attack range`)
   const t=(b.physicalAttack-limits[0][0])/Math.max(1,limits[0][1]-limits[0][0])
   check(Math.abs(b.magicAttack-(limits[1][0]+t*(limits[1][1]-limits[1][0])))<=2,`${d.id}: attack pairing`)
   const budget=v.skillLevel?(d.tier==='fa'?[12,24]:[24,42]):r.ordinary.budget
   check(v.physical===v.magic&&within((v.physical??0)+(v.flow??0)+(v.element??0),budget),`${d.id}: weapon damage budget`)
   check(within(v.attackSpeed,r.ordinary.weaponSpeed),`${d.id}: weapon speed`)
  }else{
   check(within(b[d.category==='armor'?'physicalDefense':'magicDefense'],s.defense),`${d.id}: defense`)
   if(d.category==='armor'){
    check(within(b.vitality,s.vitality),`${d.id}: vitality`)
    check(!v.hpBonus,`${d.id}: duplicate HP bonus`)
    if(v.castSpeed)check(within(v.castSpeed,r.ordinary.castSpeed),`${d.id}: cast speed`)
    if(v.attackSpeed)check(within(v.attackSpeed,r.ordinary.armorSpeed),`${d.id}: armor speed`)
   }else{
    check(!b.vitality,`${d.id}: ring vitality`)
    check(!(v.critChance&&v.cooldownReduction),`${d.id}: contradictory ring role`)
    if(v.critChance)check(within(v.critChance,r.ordinary.crit)&&within(v.critBonus,r.ordinary.critBonus),`${d.id}: ring crit`)
    if(v.cooldownReduction)check(within(v.cooldownReduction,r.ordinary.cdr),`${d.id}: ring CDR`)
    check(v.dotDamage||v.formationDamage?v.skillDamage===r.ordinary.skill[0]-5:within(v.skillDamage,r.ordinary.skill),`${d.id}: ring damage`)
   }
  }
 }
 return {...d,base:data.base,affixes:data.affixes,v,minLevel:d.minLevel??equipmentTier(d.tier).minLevel,oldBase:old?.baseAttributes??null,oldAffixes:old?.affixes??null,lines:summary.lines}
})
let combinations=0,channels=0,worst={ratio:0},worstWithRankEstimate={ratio:0}
const gear=slot=>entries.filter(d=>d.category===slot)
// Ordinary-effect timing envelope: upper of cooldown/body speed, not their product.
// Skill-rank estimate is deliberately reported separately: quantities/geometry/mana
// make it insufficient as a proof about all builds.
for(const w of gear('weapon'))for(const a of gear('armor'))for(const r of gear('ring')){
 const first=Math.max(w.minLevel,a.minLevel,r.minLevel)
 const v=w.v,rv=r.v,av=a.v
 for(let level=first;level<=30;level++){
  combinations++
  const B=100*cultivationAt(cultivationLevelXp(level)).attackMultiplier
  const p=B+w.base.physicalAttack+[w,a,r].reduce((s,d)=>s+(d.base.strength??0),0)
  const m=B+w.base.magicAttack+[w,a,r].reduce((s,d)=>s+(d.base.intelligence??0),0)
  const awareness=[w,a,r].reduce((s,d)=>s+(d.base.awareness??0),0)
  const speed=1+((v.attackSpeed??0)+(av.attackSpeed??0))/100
  const cast=Math.max(1/(1-Math.min(.3,(rv.cooldownReduction??0)/100)),
   1+(awareness/100+(av.castSpeed??0)/100)/(1+(level-1)/100))
  const chance=(rv.critChance??0)/100
  for(const native of [0,1-chance,1]){
   const crit=(1+Math.min(1,native+chance)*(.5+(rv.critBonus??0)/100))/(1+native*.5)
   const attached=v.bleedConversion?1+.5*((1+(v.bleed??0)/100)*1.1-1):1+(v.onHit??0)/100
   for(const channel of ['basic','qi','formation','magic']){
    channels++
    const attack=channel==='formation'?(p+m)/2:channel==='magic'?m:p
    const damage=1+((v.physical??0)+(channel==='basic'?0:v.element??0)+(w.affixes.some(f=>f.type==='flow'&&f.target===channel)?v.flow??0:0))/100
    const ring=channel==='basic'?1:1+((rv.skillDamage??0)+(channel==='formation'?rv.formationDamage??0:0))/100
    const dot=1+(rv.dotDamage??0)/100
    const ratio=attack/(B+5)*damage*ring*crit*attached*dot*(channel==='basic'?speed:cast)
    const context={ratio,level,channel,native,weapon:w.id,armor:a.id,ring:r.id}
    if(ratio>worst.ratio)worst=context
    const rankEstimate=ratio*(v.skillLevel&&channel!=='basic'?1.6:1)
    if(rankEstimate>worstWithRankEstimate.ratio)worstWithRankEstimate={...context,ratio:rankEstimate}
   }
  }
 }
}
const report={identities:entries.length,errors,rangeStatus:errors.length?'FAILED':'PASSED',combinations,channels,worstOrdinaryEnvelope:worst,
 worstWithRankEstimate,limit:6,limitStatus:worst.ratio<=6?'ORDINARY_ENVELOPE_WITHIN_LIMIT':'CONCERNS',
 limitations:['Envelope is conservative ordinary-effect scheduling, not measured DPS. Dot boost is deliberately applied as if all damage were DoT.',
 'The 1.6 skill-rank estimate is a screening heuristic, not a proof including all rank/passive/geometry interactions.',
 'All legal equipment identities/levels were enumerated; build-specific rank effects and special shields need actual combat tests.'],entries}
mkdirSync(out,{recursive:true});writeFileSync(new URL('catalog-audit.json',out),JSON.stringify(report,null,2)+'\n')
writeFileSync(new URL('fixed-catalog.md',out),'# 装备固定数值新旧对照\n\n'+entries.map(d=>`## ${d.name} (${d.id})\n\n旧基础：${JSON.stringify(d.oldBase)}\n\n新数值：\n\n${d.lines.map(s=>'- '+s).join('\n')}\n`).join('\n'))
console.log(JSON.stringify({...report,entries:undefined},null,2))
assert.equal(errors.length,0)
