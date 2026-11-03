// Initial tuning table: primary attributes feed derived stats exactly once.
import { cultivationAt } from './TowerProfile.js'
import { armorModifiers } from './TowerEquipment.js'
export const BIRTH_ATTRIBUTES = Object.freeze({strength:100,intelligence:100,awareness:100})
export const MANA_COSTS = Object.freeze({
  sj_yujian:.5,sj_arc:1,sj_cross:1,sj_line:1,sj_shadow:1,sj_wanjian:1,sj_formation:1,
  evo_wanjian:4,evo_tiandi:6,evo_wuwo:4,evo_sixiang:8,
})
export function characterAwareness(loadout, xp=0) {
  return BIRTH_ATTRIBUTES.awareness + cultivationAt(xp).level - 1 + Math.min(3,loadout?.passive?.sj_spirit||0)*10
}
export function primaryAttributes(xp, loadout, legacy=false) {
  const growth=cultivationAt(xp,legacy)
  const awareness=characterAwareness(loadout,xp)
  const armor=loadout?.armor ? armorModifiers(loadout.armor) : null
  return {strength:BIRTH_ATTRIBUTES.strength*growth.attackMultiplier+(armor?.strength ?? 0),
    intelligence:BIRTH_ATTRIBUTES.intelligence*growth.attackMultiplier+(armor?.intelligence ?? 0),
    awareness,maxMana:awareness,manaRegen:awareness*.04}
}
export function skillManaCost(id) { return MANA_COSTS[id] ?? 0 }
