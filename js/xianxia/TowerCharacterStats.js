import {applyEquipmentSkillLevels} from './TowerEquipmentSkillLevels.js'
// Initial tuning table: primary attributes feed derived stats exactly once.
import { cultivationAt } from './TowerProfile.js'
import { equipmentPrimaryBonuses } from './TowerEquipmentBases.js'
export const BIRTH_ATTRIBUTES = Object.freeze({strength:100,intelligence:100,awareness:100})
export const MANA_COSTS = Object.freeze({
  sj_yujian:.5,sj_arc:1,sj_cross:1,sj_line:1,sj_shadow:1,sj_wanjian:1,sj_formation:1,
  evo_wanjian:4,evo_tiandi:6,evo_wuwo:4,evo_sixiang:8,
})
export function characterAwareness(loadout, xp=0) {
  loadout=applyEquipmentSkillLevels(loadout)
  return BIRTH_ATTRIBUTES.awareness + cultivationAt(xp).level - 1 + Math.min(4,loadout?.passive?.sj_spirit||0)*10
    + equipmentPrimaryBonuses(loadout).awareness
}
export function primaryAttributes(xp, loadout, legacy=false) {
  const growth=cultivationAt(xp,legacy)
  const awareness=characterAwareness(loadout,xp)
  const equipment=equipmentPrimaryBonuses(loadout)
  return {strength:BIRTH_ATTRIBUTES.strength*growth.attackMultiplier+equipment.strength,
    intelligence:BIRTH_ATTRIBUTES.intelligence*growth.attackMultiplier+equipment.intelligence,
    vitality:equipment.vitality,awareness,maxMana:awareness,manaRegen:awareness*.04}
}
export function skillManaCost(id) { return MANA_COSTS[id] ?? 0 }
