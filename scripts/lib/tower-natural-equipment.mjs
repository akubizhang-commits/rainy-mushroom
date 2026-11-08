import {combatLoadout} from '../../js/xianxia/TowerCampaign.js'
import {stats,characterCombatAttributes} from '../../js/xianxia/TowerRun.js'
import {outgoingDamageFactor} from '../../js/xianxia/TowerAttributeRules.js'
// Deterministic shopping policy, not a measured DPS prediction. It preserves
// useful old-tier items and evaluates each candidate with the actual other slots.
export function naturalEquipmentScore(state,route,item,category) {
  const l={...combatLoadout(state),[category]:item}
  const s=stats(state.xp,l),a=characterCombatAttributes(l,state.xp)
  const skill=['array','formation'].includes(route)?'sj_formation':route==='pursuit'?'sj_shadow':'sj_arc'
  const hybrid=['array','formation','pursuit','mixed'].includes(route)
  const hit=(id,isSkill)=>{
    const physical=s.attack*outgoingDamageFactor(l,id,'physical',isSkill)
    const magic=s.magicAttack*outgoingDamageFactor(l,id,'magic',isSkill)
    return hybrid&&isSkill?(physical+magic)/2:physical
  }
  const damage=(.8*hit(skill,true)/(1-a.cooldownReduction)+.2*hit('basic_attack',false)*(1+a.attackSpeed))
    *(1+a.critChance*a.physicalCritExtra)*((1-a.bleedConversion)*(1+a.attachedDamage)+a.bleedConversion*(1+a.bleedBonus)*1.1)
    *(1+a.scarVulnerability*3/(a.scarCooldown||10))
  // Defensive shopping values EHP directly; the modest offense weight breaks
  // close ties without treating every cast-speed point as a full DPS multiplier.
  return category==='armor'?s.maxHp/(1-a.reduction)*Math.sqrt(damage):damage
}
