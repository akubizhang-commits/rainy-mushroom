// One attack budget, two damage channels. Elements remain an independent axis.
export function splitDamage(amount, type) {
  if (type === 'physical') return { physical: amount, magic: 0 }
  if (type === 'magic') return { physical: 0, magic: amount }
  if (type === 'hybrid') return { physical: amount / 2, magic: amount / 2 }
  throw new RangeError(`Damage type needs an explicit source: ${type}`)
}

export function scaleDamageParts(parts, physicalFactor, magicFactor = physicalFactor) {
  return { physical: parts.physical * physicalFactor, magic: parts.magic * magicFactor }
}

// Runtime skill coefficients are stored against the physical attack scalar.
// Replace only the magic share with its own base before bonuses or crits.
export function attackDamageParts(amount, type, physicalAttack, magicAttack) {
  const parts = splitDamage(amount, type)
  if (!(physicalAttack > 0) || !Number.isFinite(magicAttack) || magicAttack < 0)
    throw new RangeError('Invalid attack channels')
  return { physical: parts.physical, magic: parts.magic * magicAttack / physicalAttack }
}
