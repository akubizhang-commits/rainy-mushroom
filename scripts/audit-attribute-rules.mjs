import fs from 'node:fs'
import {WEAPONS,createFixedWeapon,weaponDamageModifiers,weaponFlatAttack,weaponAttackProfile} from '../js/xianxia/TowerWeapons.js'
import {RINGS,ARMORS,createFixedEquipment,ringDamageModifiers,ringCooldownReduction,armorModifiers} from '../js/xianxia/TowerEquipment.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
import {cultivationAt,cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
const skills=['sj_yujian','sj_shadow','sj_arc','sj_line','sj_cross','sj_wanjian','sj_formation']
let count=0,worst={ratio:0},overOldTarget=0
const weapons=WEAPONS.map(d=>({d,w:createFixedWeapon(d.id,d.quality?'audit-w':'iron')}))
const rings=RINGS.map(d=>({d,r:createFixedEquipment(d.id,d.quality?'audit-r':'basic-ring')}))
for(let level=1;level<=30;level++){
 const B=100*cultivationAt(cultivationLevelXp(level)).attackMultiplier
 const armorCDR=Math.max(...ARMORS.filter(d=>equipmentTier(d.tier).minLevel<=level).map(d=>armorModifiers(createFixedEquipment(d.id,d.quality?'audit-a':'basic-armor')).cooldownReduction))
 for(const {d:wd,w} of weapons.filter(x=>equipmentTier(x.d.tier).minLevel<=level))for(const {d:rd,r} of rings.filter(x=>equipmentTier(x.d.tier).minLevel<=level)){
  const m=ringDamageModifiers(r),wc=weaponDamageModifiers(w,'sj_arc','physical'),flat=Math.max(...skills.map(id=>weaponDamageModifiers(w,id,'hybrid').flat))
  for(const p of [0,.08,.28,1])for(const bone of [0,.06,.25]){
   const coefficient=((1+flat)*(1+(m.skillDamage||0))+bone)*(1+Math.min(1,p+m.critChance+wc.critChance)*(.5+m.critBonus+wc.critBonus))*(1+weaponAttackProfile(w).onHit+weaponAttackProfile(w).bleedConversion*((1+weaponAttackProfile(w).bleed)*1.1-1))
   const ratio=(B+weaponFlatAttack(w))/(B+5)*coefficient/((1+bone)*(1+p*.5))/(1-Math.min(.3,armorCDR+ringCooldownReduction(r)))
   count++;if(ratio>3)overOldTarget++
   if(ratio>worst.ratio)worst={ratio,level,weapon:wd.id,ring:rd.id,nativeCrit:p,passiveDamage:bone}
  }
 }
}
const result={scope:'Formula estimate including attached damage and CDR; not a measured clear-rate or TTK result. Cast animation and target coverage are not simulated.',count,oldTarget:3,overOldTarget,worst}
fs.writeFileSync('reports/attribute-rules-2026-11-02/balance.json',JSON.stringify(result,null,2)+'\n')
console.log(result)
