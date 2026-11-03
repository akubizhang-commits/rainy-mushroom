import {definitions,visitWeaponBudget} from './equipment-budget.mjs'
import {WEAPON_BLEED_IDS} from '../../js/xianxia/TowerWeaponBleed.js'
// Preserve the existing three-slot ceiling after allowing maximum DOT stacks.
export function capDotWeapons(values){
 const changed=[]
 for(const d of definitions.filter(d=>WEAPON_BLEED_IDS.includes(d.id))){
  const t=values[d.id],before=t.universal;let cap=before
  visitWeaponBudget(d,row=>{cap=Math.min(cap,100*(3/row.coefficient-1-row.element)-(row.flow?t.flow:0))})
  t.universal=Math.floor(Math.max(0,cap)*1e6)/1e6
  if(t.universal!==before)changed.push({id:d.id,before,after:t.universal})
 }
 return changed
}
