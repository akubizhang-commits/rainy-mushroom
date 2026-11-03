import { FLOORS, ARCHETYPES, FLOOR01 } from './TowerContent.js'
import { demonEssenceXp } from './TowerEconomy.js'

const archetypes = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]))
// Allocate integer XP once in authored spawn order, independent of kill order.
// Prefix rounding preserves the exact floor budget without fractional saves.
const rewards = FLOORS.map(f => {
  const units = f.waves.flatMap(w => {
    if (f.floor === 1) return FLOOR01.waves[w.wave - 1].batches.flatMap(b =>
      b.unit_ids.map(id => ({ key: `${w.wave}:${id}`, archetype: b.archetype })))
    let index = 0
    return [...w.enemy_groups].sort((a, b) =>
      Number(archetypes[b.archetype].role === 'boss') - Number(archetypes[a.archetype].role === 'boss'))
      .flatMap(g => Array.from({ length: g.count }, () =>
        ({ key: `${w.wave}:u${++index}`, archetype: g.archetype })))
  })
  const base = a => demonEssenceXp(archetypes[a].rank, archetypes[a].role)
  const total = units.reduce((n, u) => n + base(u.archetype), 0)
  const budget = f.cultivation_xp_budget ?? total
  if (!Number.isSafeInteger(budget) || budget < 0) throw Error('Invalid tower XP budget')
  const roundPrefix = budget < total ? Math.ceil : Math.floor
  let prefix = 0
  return new Map(units.map(u => {
    const before = roundPrefix(prefix * budget / total)
    prefix += base(u.archetype)
    return [u.key, roundPrefix(prefix * budget / total) - before]
  }))
})

export function towerKillXp(floor, wave, localId) {
  return rewards[floor - 1]?.get(`${wave}:${localId}`)
}
