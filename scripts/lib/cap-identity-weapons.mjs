import {definitions,visitWeaponBudget} from './equipment-budget.mjs'
import {weaponSpecialization,PROTECTED_TAIHENG_TUNING} from '../../js/xianxia/TowerEquipmentIdentity.js'
export function capIdentityWeapons(values){
 const changed=[]
 for(const d of definitions.filter(d=>d.category==='weapon'&&d.quality&&d.id!=='eq_sword_taiheng')){
  const t=values[d.id],before=t.universal;let cap=before
  visitWeaponBudget(d,row=>{
   const limit=100*(3/row.coefficient-1-row.element)
   cap=Math.min(cap,weaponSpecialization(d)?(row.flow?limit:limit*1.07+8.75):limit-(row.flow?t.flow:0))
  })
  t.universal=Math.floor(Math.max(0,cap)*1e6)/1e6
  if(t.universal!==before)changed.push({id:d.id,before,after:t.universal})
 }
 values.eq_sword_taiheng={...PROTECTED_TAIHENG_TUNING}
 return changed
}
