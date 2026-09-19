import { EXPLORATION_SPECIES } from '../data/explorationData.js'

export function collectionItems(state,filter='all') {
  return EXPLORATION_SPECIES.filter(species=>{
    const entry=state.profile.collection[species.id]
    return filter==='pending'?entry?.sampled>0&&!entry.identified:
      filter==='identified'?Boolean(entry?.identified):true
  })
}
