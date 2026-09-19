import { SPECIES, SPECIES_BY_ID } from '../data/species.js'
import { EVENTS, ROUTE_BY_ID } from '../data/routes.js'
import { WEATHERS, clamp } from '../constants.js'
import { SeededRandom } from './Random.js'

export class RunGenerator {
  generate({ routeId, toolId, seed, ecology = 60, undiscoveredIds = [], pity = 0 }) {
    const route = ROUTE_BY_ID[routeId]
    if (!route) throw new Error(`Unknown route: ${routeId}`)

    const random = new SeededRandom(`${seed}:${routeId}`)
    const selected = []
    const unseenOnRoute = undiscoveredIds.filter((id) => route.speciesPool.includes(id))
    const shouldGuaranteeNew = unseenOnRoute.length > 0 && (toolId === 'tracker' || pity >= 3)

    if (shouldGuaranteeNew) selected.push(random.pick(unseenOnRoute))

    const available = route.speciesPool.filter((id) => !selected.includes(id))
    while (selected.length < 3 && available.length) {
      const weighted = []
      available.forEach((id) => {
        const species = SPECIES_BY_ID[id]
        const ecologyBonus = ecology >= 65 && species.rarity === 1 ? 1 : 0
        const weight = Math.max(1, 4 - species.rarity + ecologyBonus)
        for (let i = 0; i < weight; i += 1) weighted.push(id)
      })
      const chosen = random.pick(weighted)
      selected.push(chosen)
      available.splice(available.indexOf(chosen), 1)
    }

    const fungusEncounters = selected.map((speciesId) => ({
      kind: 'fungus',
      speciesId,
      candidates: this._makeCandidates(speciesId, random),
      observed: 0,
      identifiedId: null,
      correct: null,
      decision: null
    }))

    const eventEncounter = {
      kind: 'event',
      eventId: route.eventId,
      resolvedOptionId: null
    }
    const eventPosition = random.int(1, 3)
    fungusEncounters.splice(eventPosition, 0, eventEncounter)

    return {
      seed,
      routeId,
      toolId,
      weatherId: random.pick(WEATHERS).id,
      index: 0,
      encounters: fungusEncounters,
      ecologyStart: clamp(ecology, 0, 100),
      ecologyCurrent: clamp(ecology, 0, 100),
      totals: { coins: 0, research: 0, correct: 0, xp: 0 },
      collectionDelta: {},
      newSpecies: [],
      completed: false,
      result: null
    }
  }

  _makeCandidates(correctId, random) {
    const alternatives = SPECIES
      .map((species) => species.id)
      .filter((id) => id !== correctId)
    return random.shuffle([correctId, ...random.shuffle(alternatives).slice(0, 2)])
  }

  getEvent(eventId) {
    return EVENTS[eventId]
  }
}
