import {weaponSpecialization,identityWeaponTuning} from '../../js/xianxia/TowerEquipmentIdentity.js'
// Offline expected-damage envelope. Uses fixed identity data, all three slots,
// native-crit breakpoints and separate basic/cast/cooldown frequency bounds.
import {FIXED_EQUIPMENT} from '../../js/xianxia/TowerEquipmentFixed.js'
import { EQUIPMENT_ROSTER } from '../../js/xianxia/TowerEquipmentRoster.js'
import { equipmentBaseAttributes } from '../../js/xianxia/TowerEquipmentBases.js'
import { equipmentTier } from '../../js/xianxia/TowerEquipmentTiers.js'
import { createFixedEquipment, armorModifiers, ringDamageModifiers, ringCooldownReduction } from '../../js/xianxia/TowerEquipment.js'
import { cultivationAt, cultivationLevelXp } from '../../js/xianxia/TowerProfile.js'
import { primaryAttributes } from '../../js/xianxia/TowerCharacterStats.js'
export const baseAttack = level => 100 * cultivationAt(cultivationLevelXp(level)).attackMultiplier
export const definitions = EQUIPMENT_ROSTER.map(d => {
  const item=d.category==='weapon'?null:createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`)
  return {...d,specialization:weaponSpecialization(d),dotDamage:item?.affixes.find(a=>a.type==='dotDamage')?.value??0,formationDamage:item?.affixes.find(a=>a.type==='formationDamage')?.value??0,base:equipmentBaseAttributes(d),minLevel:equipmentTier(d.tier).minLevel,
    modifiers:d.category==='armor'?armorModifiers(item):d.category==='ring'?ringDamageModifiers(item):{},
    cdr:d.category==='ring'?ringCooldownReduction(item):d.category==='armor'?armorModifiers(item).cooldownReduction:0}
})
export function weaponExtras(d) {
  const v=Object.fromEntries(FIXED_EQUIPMENT[d.id].affixes.map(a=>[a.type,a.value]))
  return {element:(v.element??0)/100,chance:(v.critChance??0)/100,bonus:(v.critBonus??0)/100,
    attached:v.bleedConversion?(v.bleedConversion/100)*((1+(v.bleed??0)/100)*1.1-1):(v.onHit??0)/100,
    speed:(v.attackSpeed??0)/100}

}
export function budgetRows(w,level,a,r,native) {
  const base=primaryAttributes(cultivationLevelXp(level),null),e=weaponExtras(w),rm=r.modifiers,am=a.modifiers
  const physical=base.strength+w.base.physicalAttack+[w,a,r].reduce((n,d)=>n+(d.base.strength||0),0)
  const magic=base.intelligence+w.base.magicAttack+[w,a,r].reduce((n,d)=>n+(d.base.intelligence||0),0)
  const crit=(1+Math.min(1,native+e.chance+rm.critChance)*(.5+e.bonus+rm.critBonus))/(1+native*.5)
  const common=crit*(1+e.attached)*(1+r.dotDamage/100)
  const awareness=[w,a,r].reduce((n,d)=>n+(d.base.awareness||0),0)
  // Zero spirit passive maximizes relative cast-speed gain. Cooldown and body
  // phases are not multiplied together: either can be the timing bottleneck.
  const frequency=Math.max(1/(1-Math.min(.3,a.cdr+r.cdr)),
    1+(awareness/100+am.castSpeed)/(1+(level-1)/100))
  return [
    {channel:'basic',coefficient:physical/(base.strength+5)*common*(1+e.speed+am.attackSpeed),flow:false},
    {channel:'qi',coefficient:physical/(base.strength+5)*common*(1+(rm.skillDamage||0))*frequency,flow:(w.specialization??w.role)==='qi'},
    {channel:'formation',coefficient:(physical+magic)/(base.strength+base.intelligence+10)*common*(1+(rm.skillDamage||0)+r.formationDamage/100)*frequency,flow:(w.specialization??w.role)==='formation'},
    {channel:'magic',coefficient:magic/(base.intelligence+5)*common*(1+(rm.skillDamage||0))*frequency,flow:false},
  ].map(row=>({...row,element:e.element}))
}
export function visitWeaponBudget(w,visit) {
  for(let level=w.minLevel;level<=30;level++){
    const armors=definitions.filter(d=>d.category==='armor'&&d.minLevel<=level)
    const rings=definitions.filter(d=>d.category==='ring'&&d.minLevel<=level)
    for(const a of armors)for(const r of rings){
      const e=weaponExtras(w)
      for(const native of [0,1,Math.max(0,1-e.chance-r.modifiers.critChance)]){
        for(const row of budgetRows(w,level,a,r,native))
          visit(row,{level,weapon:w.id,armor:a.id,ring:r.id,native,channel:row.channel})
      }
    }
  }
}
export function envelope(w,tuning) {
  tuning=identityWeaponTuning(w,tuning)
  let max=0,worst,count=0
  visitWeaponBudget(w,(row,context)=>{
    const ratio=row.coefficient*(1+tuning.universal/100+row.element+(row.flow?tuning.flow/100:0))
    if(ratio>max){max=ratio;worst=context}
    count++
  })
  return {max,worst,count}
}
