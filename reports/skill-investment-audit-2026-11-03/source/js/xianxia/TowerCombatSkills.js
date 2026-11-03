import {GROWTH_SKILLS,GROWTH_EVOLUTIONS} from './TowerGrowth.js'
// One equipment-only rank. Learning costs, realm gates and trained caps stay in Growth.
function extend(d){
 const result={...d,learnedMaxLevel:d.maxLevel,maxLevel:d.maxLevel+1,max_level:d.maxLevel+1}
 for(const [key,v] of Object.entries(d)){
  if(!Array.isArray(v)||v.length!==d.maxLevel||!v.every(Number.isFinite))continue
  const last=v.at(-1),previous=v.at(-2)??last
  // Preserve accepted geometry/cadence above trained cap. Numeric power advances.
  let next=last
  if(key==='damage')next=previous>0?last*last/previous:last
  if(['crit_chance','damage_bonus','speed_bonus','reduction','cast_speed','reach_bonus','pickup_bonus','dot_bonus','proc_damage','budgetMultipliers','innerMultiplier'].includes(key))next=last+(last-previous)
  if(d.id==='sj_flight'&&key==='speed_bonus')next=.30
  if(d.id==='sj_yujian'&&key==='swords')next=10
  result[key]=Object.freeze([...v,next])
 }
 // Growth stores per-rank sword shares, not full-volley shares. Preserve the
 // former eleven-sword total: 11 * 0.5 / 10 = 0.55 per visible sword.
 if(d.id==='sj_yujian')result.sword_damage_share=Object.freeze([
  ...d.sword_damage_share,d.sword_damage_share.at(-1)*11/10,
 ])
 return Object.freeze(result)
}
export const COMBAT_SKILLS=Object.freeze(GROWTH_SKILLS.map(extend))
export const COMBAT_EVOLUTIONS=Object.freeze(GROWTH_EVOLUTIONS.map(extend))
