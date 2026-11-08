// Shared class registry. Growth uses the existing realm multiplier exactly once.
// Reserved profiles are available to design tools, not playable character creation.
export const DEFAULT_CLASS_ID = 'sword'
const rows = [
  ['sword', '剑修', 110, 90, 100, 10, 1],
  ['elementalist', '法修', 50, 120, 110, 8, 1.5],
  ['talisman', '符修', 65, 110, 120, 9, 2],
  ['beastmaster', '御兽师', 80, 100, 125, 10, 2],
  ['formation', '阵法师', 55, 105, 130, 9, 2.5],
  ['body', '体修', 115, 40, 80, 14, .5],
  ['occultist', '邪修', 60, 115, 105, 11, 1.5],
]
export const CLASS_PROFILES = Object.freeze(Object.fromEntries(rows.map(
  ([id, name, strength, intelligence, awareness, vitality, awarenessPerLevel]) =>
    [id, Object.freeze({id, name, playable: id === DEFAULT_CLASS_ID, awarenessPerLevel,
      birth: Object.freeze({strength, intelligence, awareness, vitality})})]
)))
export function classProfile(id = DEFAULT_CLASS_ID) {
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(CLASS_PROFILES, id))
    throw new RangeError('Unknown tower class')
  return CLASS_PROFILES[id]
}
export function isPlayableClass(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(CLASS_PROFILES, id)
    && CLASS_PROFILES[id].playable
}
export function classBaseAttributes(id, level, attackMultiplier) {
  const profile = classProfile(id)
  if (!Number.isInteger(level) || level < 1 || level > 30
    || !Number.isFinite(attackMultiplier) || attackMultiplier <= 0)
    throw new RangeError('Invalid class growth')
  return {
    strength: profile.birth.strength * attackMultiplier,
    intelligence: profile.birth.intelligence * attackMultiplier,
    awareness: profile.birth.awareness + (level - 1) * profile.awarenessPerLevel,
    vitality: profile.birth.vitality * attackMultiplier,
  }
}
