import { GROWTH_EVOLUTIONS, growthSummary, skillRequirement } from '../../js/xianxia/TowerGrowth.js'

const definitions = new Map(GROWTH_EVOLUTIONS.map(row => [row.id, row]))
const unlocked = quote => quote.ok || quote.reason === 'insufficient-points'

// Pure preview only. Execute each action through Campaign; never copy projected
// currency or ranks into a live save. Base training remains useful after evolution.
export function planNaturalGrowth(state, priorities, evolutionIds, completionPriorities = []) {
  let projected = structuredClone(state)
  const actions = []
  const quote = id => skillRequirement(projected, id, { inTower: !!projected.activeRun })
  function purchase(id, q) {
    const field = definitions.has(id) ? 'evolutionRanks' : 'skills'
    projected = { ...projected, spiritStones: projected.spiritStones - q.bookCost,
      books: q.bookCost ? [...projected.books, id] : projected.books,
      [field]: { ...projected[field], [id]: q.nextLevel } }
    if (field === 'evolutionRanks') projected.evolutions = Object.keys(projected.evolutionRanks)
    actions.push({ type: 'learnSkill', id })
  }
  function firstRanks() {
    for (const id of evolutionIds) {
      if (projected.evolutionRanks[id]) continue
      const q = quote(id)
      if (q.ok && projected.spiritStones >= q.bookCost) purchase(id, q)
    }
  }
  const pendingReserve = () => evolutionIds.reduce((sum, id) => {
    if (projected.evolutionRanks[id]) return sum
    const q = quote(id)
    return sum + (unlocked(q) ? q.cost : 0)
  }, 0)
  firstRanks()
  // Train the foundations before buying a second evolution rank. Neither a
  // first-rank purchase nor an unaffordable transition dismantles the old build.
  for (const [id, target] of priorities) {
    while ((projected.skills[id] || 0) < target) {
      const q = quote(id)
      if (!q.ok || projected.spiritStones < q.bookCost
        || growthSummary(projected).available - q.cost < pendingReserve()) break
      purchase(id, q)
    }
  }
  firstRanks() // A base first learned in this plan can now unlock its evolution.
  for (const id of evolutionIds) {
    if (!projected.evolutionRanks[id]) continue
    const q = quote(id)
    if (q.ok && projected.spiritStones >= q.bookCost
      && growthSummary(projected).available - q.cost >= pendingReserve()) purchase(id, q)
  }
  // Do not let a cheap filler consume points while a core skill is still
  // realm-locked. Completion is opt-in and uses the same real purchase quotes.
  if (priorities.every(([id, target]) => (projected.skills[id] || 0) >= target)) {
    for (const [id, target] of completionPriorities) {
      while ((projected.skills[id] || 0) < target) {
        const q = quote(id)
        if (!q.ok || projected.spiritStones < q.bookCost
          || growthSummary(projected).available - q.cost < pendingReserve()) break
        purchase(id, q)
      }
    }
  }
  return actions
}
