import { characterAwareness } from './TowerCharacterStats.js'
// Cooldown reduction and cast speed are separate: only cast speed changes body
// phases. Projectile travel, zone ticks and orbit hit windows keep their timing.
import { ringCooldownReduction, armorModifiers } from './TowerEquipment.js'
import { weaponAttackProfile } from './TowerWeapons.js'

// Weapon/armor speed is additive. Combat, presentation and snapshot validation
// consume this same profile, including the frozen loadout of an ongoing swing.
export function equipmentAttackProfile(loadout) {
  const profile = weaponAttackProfile(loadout.weapon)
  const speed = profile.speed + (loadout.armor ? armorModifiers(loadout.armor).attackSpeed : 0)
  return {...profile,speed,interval:1/(1+speed),duration:.2/(1+speed)}
}

export const EQUIPMENT_COOLDOWN_CAP = .30
export function cooldownFromBonuses(seconds, bonuses) {
  if (!Number.isFinite(seconds) || seconds <= 0) return seconds
  if (!Array.isArray(bonuses) || bonuses.some(n => !Number.isFinite(n) || n < 0)) throw new RangeError('Invalid cooldown bonus')
  return seconds * (1 - Math.min(EQUIPMENT_COOLDOWN_CAP, bonuses.reduce((sum,n) => sum+n,0)))
}
export function equipmentCooldownReduction(loadout) {
  return 1 - cooldownFromBonuses(1, [
    loadout?.ring ? ringCooldownReduction(loadout.ring) : 0,
    loadout?.armor ? armorModifiers(loadout.armor).cooldownReduction : 0,
  ])
}

export function skillCooldown(seconds, loadout) {
  if (!Number.isFinite(seconds) || seconds <= 0) return seconds
  return seconds * (1 - equipmentCooldownReduction(loadout))
}

// Timing designers must opt a phase in. Never pass projectile travel, channel
// lifetime, hit intervals or basic attacks here merely because they have a duration.
export function applyCastSpeed(seconds, speedBonus, scalable = false) {
  if (!Number.isFinite(speedBonus) || speedBonus < 0) throw new RangeError('Invalid cast speed')
  if (!Number.isFinite(seconds) || seconds <= 0 || !scalable) return seconds
  return seconds / (1 + speedBonus)
}
export function skillCastTime(seconds, loadout, scalable = false) {
  return applyCastSpeed(seconds, equipmentCastSpeed(loadout), scalable)
}

// Only character-owned phases belong here. Zone pulses and projectile clocks
// remain in the form data and never pass through this table.
export const CAST_ACTIONS = Object.freeze({
  sj_yujian: [.20, .08], sj_arc: [.18, .06], sj_moon: [.18, .06], sj_moon_triple: [.18, .08], sj_cross: [.30, .08],
  sj_wanjian: [.18, .06], sj_line: [.35, .08], sj_shadow: [.15, .05],
  sj_sancai: [.25, .05], sj_formation: [.35, .08], evo_wanjian: [.35, .10],
  evo_wuwo: [.20, .05], evo_tiandi: [.45, .10], evo_sixiang: [.45, .10],
})
export function equipmentCastSpeed(loadout, xp=0) {
  return Math.max(0,(characterAwareness(loadout,xp)-100)/100) + (loadout?.armor ? armorModifiers(loadout.armor).castSpeed : 0)
}
export function castActionTiming(id, hits = 1, speed = 0) {
  if (!CAST_ACTIONS[id] || !Number.isInteger(hits) || hits < 1
    || !Number.isFinite(speed) || speed < 0) throw new RangeError('Invalid cast timing')
  const [windup, recovery] = CAST_ACTIONS[id]
  const count = ['sj_arc', 'sj_moon', 'sj_moon_triple', 'sj_line'].includes(id) ? hits : 1
  const ticks = seconds => Math.max(1, Math.ceil(seconds / (1 + speed) * 60 - 1e-9))
  const releases = []
  for (let i = 0; i < count; i++)
    releases.push(Math.max(i ? releases[i - 1] * 60 + 1 : 1, ticks(windup + i * .16)) / 60)
  return {
    releases, windup: releases[0],
    lock: Math.min(releases[0], ticks(windup * 2 / 3) / 60),
    duration: Math.max(releases.at(-1) * 60 + 1, ticks(windup + (count - 1) * .16 + recovery)) / 60,
  }
}
