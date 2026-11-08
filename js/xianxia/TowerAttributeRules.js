import {armorEffectValue} from './TowerArmorEffects.js'
import { resonanceDamageFactor } from './TowerResonance.js'
// Shared arithmetic for the character sheet, combat and authored descriptions.
import { weaponDamageModifiers } from './TowerWeapons.js'
import { COMBAT_SKILLS as GROWTH_SKILLS } from './TowerCombatSkills.js'
import {applyEquipmentSkillLevels} from './TowerEquipmentSkillLevels.js'
export const REGEN_INTERVAL = 3
export const BASE_REGEN_FRACTION = 1 / 60
export const MAX_REGEN_FRACTION = 1 / 40
export function multipliedEquipmentBonus(bonuses, passive = 0) {
  return bonuses.reduce((factor, bonus) => factor * (1 + bonus), 1) + passive
}
export function passiveDamageBonus(loadout) {
  loadout=applyEquipmentSkillLevels(loadout)
  const rank = loadout?.passive?.sj_bone || 0
  if (!rank) return 0
  const values = GROWTH_SKILLS.find(s => s.id === 'sj_bone').damage_bonus
  return values[Math.min(rank, values.length) - 1]
}
export function equipmentSkillBonuses(loadout) {
  return ['weapon', 'armor', 'ring'].flatMap(slot => {
    const item = loadout?.[slot]
    return item ? [item.affixes.filter(a => a.type === 'skillDamage').reduce((n,a) => n + a.value / 100, 0)] : []
  })
}
export function outgoingDamageFactor(loadout, skillId, type, isSkill, element) {
  const weaponBonus = loadout?.weapon ? weaponDamageModifiers(loadout.weapon, skillId, type, element).flat : 0
  const bonuses = ['weapon', 'armor', 'ring'].map(slot => {
    const item = loadout?.[slot]
    return (slot === 'weapon' ? weaponBonus : 0) + (isSkill && item
      ? item.affixes.filter(a => a.type === 'skillDamage'||a.type==='formationDamage'&&['sj_wanjian','sj_sancai','sj_formation','evo_wuwo','evo_sixiang'].includes(skillId)).reduce((n,a) => n + a.value / 100, 0) : 0)
  })
  // 85号：主修流派共鸣只乘一次，只作用于该流派的功法。
  return multipliedEquipmentBonus(bonuses, passiveDamageBonus(loadout)) * (isSkill ? resonanceDamageFactor(loadout, skillId) : 1)
}
export function criticalMultiplier(extraBonuses = []) {
  return 1.5 + extraBonuses.reduce((sum, bonus) => sum + bonus, 0)
}
export function regenerationFraction(loadout, state) {
  const bonus = loadout?.armor?.affixes.find(a => a.type === 'healthRegen')?.value || 0
  const safe=state?.armorState&&state.time-state.armorState.lastHitAt>=4?armorEffectValue(loadout,'safeRecovery')/100:0
  const fraction = BASE_REGEN_FRACTION + bonus / 100 + safe
  return fraction >= MAX_REGEN_FRACTION - 1e-7 ? MAX_REGEN_FRACTION : fraction
}
export function regenerationAmount(maxHp, loadout, state) {
  return maxHp * regenerationFraction(loadout,state)
}
// Historical healing may include enhanced pulses even if a later hit ended
// the effect. Both snapshot validators must use the same attainable bound.
export function maximumRegenerationAmount(maxHp, loadout) {
  return maxHp * Math.min(MAX_REGEN_FRACTION,
    regenerationFraction(loadout) + armorEffectValue(loadout,'safeRecovery') / 100)
}
