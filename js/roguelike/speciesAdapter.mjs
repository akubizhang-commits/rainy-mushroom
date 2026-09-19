import { SPECIES } from '../data/species.js'
import { EXPANDED_SPECIES } from '../data/speciesExpansion.js'

export const HABITAT_WARM_MIXED = 'warmMixedForest'

// MVP: combine first 6 SPECIES and first 4 EXPANDED_SPECIES (exactly 10 cards)
const HABITAT_TABLE = {
  [HABITAT_WARM_MIXED]: [
    ...SPECIES.slice(0, 6),
    ...EXPANDED_SPECIES.slice(0, 4)
  ]
}

/**
 * @typedef {Object} MushroomCard
 * @property {string} id
 * @property {string} name
 * @property {1|2|3} rarity
 * @property {[string, string, string]} clues
 * @property {string} colorCap
 * @property {string} colorStem
 * @property {number} weightInPool
 */

/**
 * Load mushroom cards for a given habitat.
 * @param {string} habitatId
 * @returns {MushroomCard[]}
 * @throws {Error} if habitat is unknown
 */
export function loadMushroomsForHabitat(habitatId) {
  const raw = HABITAT_TABLE[habitatId]
  if (!raw) throw new Error(`unknown habitat: ${habitatId}`)

  return raw.map(s => {
    // Extract clues: use s.clues if available (length >= 3), else build from ecology/description/keyClue
    const clues = s.clues && s.clues.length >= 3
      ? [s.clues[0], s.clues[1], s.clues[2]]
      : [s.ecology, s.description, s.keyClue]

    // Clamp rarity to {1, 2, 3}
    const rarity = Math.min(3, Math.max(1, s.rarity ?? 3))

    return {
      id: s.id,
      name: s.name,
      rarity,
      clues,
      colorCap: s.style.cap,
      colorStem: s.style.stem,
      weightInPool: 4 - rarity
    }
  })
}
