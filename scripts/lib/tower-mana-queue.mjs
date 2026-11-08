import {nextSkillCandidate} from '../../js/xianxia/TowerAttackActions.js'
import {skillManaCost} from '../../js/xianxia/TowerCharacterStats.js'

const formId=(run,id)=>id==='evo_wanjian'?id:run._castForm({
  skill:id,level:run.state.loadout.active[id],castContext:{loadout:run.state.loadout}}).id

// Read at the runtime's basic fallback, after its automatic pill attempt.
// An affordable alternative is an observation, not a recommendation to cast it.
export function manaQueueBlock(run){
  const s=run.state
  const head=nextSkillCandidate(s.actions,s.time,run._basicReady())
  if(!head)return null
  const cost=skillManaCost(formId(run,head))
  if(s.player.mana>=cost)return null
  const alternatives=Object.keys(s.actions.waiting).filter(id=>id!==head
    &&s.player.mana>=skillManaCost(formId(run,id)))
  return {time:s.time,head,cost,mana:s.player.mana,alternatives}
}
