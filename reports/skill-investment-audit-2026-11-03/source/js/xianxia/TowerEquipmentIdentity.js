import {FIXED_EQUIPMENT} from './TowerEquipmentFixed.js'
// Fixed identities keep their roster tags; these profiles define combat affinity.
export function weaponSpecialization(d){return ({eq_sword_dingyue:'formation',eq_sword_chengming:'qi',eq_sword_kunwu:'formation'})[d.id]??null}
export function weaponBaseAffinity(d){return d.id==='eq_sword_zhaoyuan'?'qi':weaponSpecialization(d)}
export const RING_IDENTITY_EFFECTS=Object.freeze(Object.fromEntries(
 Object.entries(FIXED_EQUIPMENT).flatMap(([id,d])=>{
  const effect=d.affixes.find(a=>['dotDamage','formationDamage'].includes(a.type))
  return effect?[[id,effect]]:[]
 })))
export const PROTECTED_TAIHENG_TUNING=Object.freeze({
 universal:FIXED_EQUIPMENT.eq_sword_taiheng.affixes.find(a=>a.type==='physical').value,flow:0,
})
export function identityWeaponTuning(d,original){
 // Fixed budgets already subtract specialization from the universal share.
 return {universal:original.universal,flow:original.flow}
}
