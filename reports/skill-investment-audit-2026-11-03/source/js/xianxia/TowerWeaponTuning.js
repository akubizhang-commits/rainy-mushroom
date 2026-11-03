import {FIXED_EQUIPMENT} from './TowerEquipmentFixed.js'
// Read-only compatibility view for offline audits. Author new values through
// generate-equipment-integer.mjs; runtime reads the fixed catalog directly.
export const WEAPON_TUNING=Object.freeze(Object.fromEntries(
 Object.entries(FIXED_EQUIPMENT).filter(([id])=>id.startsWith('eq_sword_')).map(([id,d])=>[
  id,Object.freeze({universal:d.affixes.find(a=>a.type==='physical')?.value??0,
   flow:d.affixes.find(a=>a.type==='flow')?.value??0}),
 ])))
