import { ARCHETYPES } from './TowerContent.js'
import { CAMP_PILLS } from './TowerProfile.js'
const bosses = new Set(ARCHETYPES.filter(row => row.role === 'boss').map(row => row.id))
// A separate domain and immutable original seed keep material rolls independent
// of core loot, checkpoint frequency, combat RNG and later realm promotions.
export function breakthroughDrops(snapshot, start = 0) {
  if (!snapshot.loot || snapshot.training) return []
  const entry = Object.entries(CAMP_PILLS).find(([, item]) => item.material && item.floor === snapshot.floor)
  if (!entry) return []
  const [id, item] = entry
  return snapshot.killLedger.slice(start).filter(kill => {
    if (!bosses.has(kill.archetype)) return false
    let x = (snapshot.loot.seed ^ Math.imul(snapshot.floor, 0x9e3779b9) ^ Math.imul(kill.wave, 0x85ebca6b) ^ 0x4d41544c) >>> 0
    x = Math.imul(x ^ x >>> 16, 0x7feb352d)
    x = Math.imul(x ^ x >>> 15, 0x846ca68b)
    return ((x ^ x >>> 16) >>> 0) / 0x100000000 < item.dropChance
  }).map(() => id)
}
