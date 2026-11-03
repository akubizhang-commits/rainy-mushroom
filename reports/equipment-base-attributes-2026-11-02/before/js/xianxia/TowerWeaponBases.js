// Authored fixed points, independent of the wearer's current level.
import { equipmentTier } from './TowerEquipmentTiers.js'
export function weaponBasePoints(definition) {
  const {tier,quality:q,role}=definition
  if(tier==='fan') return {physical:q?6:5,magic:q?6:5}
  const reference=equipmentTier(tier).referenceAttack
  const round=n=>Number((n*reference).toFixed(1))
  // Equal best-channel budgets: qi physical == formation hybrid average.
  if(role==='qi') return {physical:round(.04*q),magic:round(.016*q)}
  if(role==='formation') return {physical:round(.028*q),magic:round(.052*q)}
  return {physical:round(.0325*q),magic:round(.0325*q)}
}
