import { FORGE_COMMON_MATERIALS, forgeMainMaterial } from './TowerForgeMaterials.js'
import { ARCHETYPES } from './TowerContent.js'
import { breakthroughDrops } from './TowerBreakthroughLoot.js'
const roles = Object.fromEntries(ARCHETYPES.map(row=>[row.id,row.role]))
export const COMMON_HERBS = Object.freeze(['huichuncao','bailuhua','huangjing','lingshenxu','ningluzhi','linglu'])
function roll(snapshot,kill,slot) {
 let x=(snapshot.loot.seed^Math.imul(snapshot.floor,0x9e3779b9)^Math.imul(kill.wave,0x85ebca6b)^slot)>>>0
 for(const c of String(kill.id))x=Math.imul(x^c.charCodeAt(0),0x01000193)>>>0
 x=Math.imul(x^x>>>16,0x7feb352d);x=Math.imul(x^x>>>15,0x846ca68b)
 return ((x^x>>>16)>>>0)/0x100000000
}
export function materialDrops(snapshot,start=0) {
 if(!snapshot.loot||snapshot.training||snapshot.rewardIsolated)return []
 const main=['yusuizhi','zilinghua','jinsuiguo'][Math.floor((snapshot.floor-1)/3)]
 if(!main)return []
 const drops=[]
 for(const kill of snapshot.killLedger.slice(start)) {
  const role=roles[kill.archetype]
  if(role==='boss')drops.push(...Array(4).fill(forgeMainMaterial(snapshot.floor)), 'forge_ninglingjing')
  else if(role==='elite')drops.push(forgeMainMaterial(snapshot.floor),forgeMainMaterial(snapshot.floor))
  else if(role==='normal'&&roll(snapshot,kill,0x464f5247)<.10)drops.push(FORGE_COMMON_MATERIALS[Math.floor(roll(snapshot,kill,0x464f5253)*5)])
  if(role==='boss')drops.push(main,main)
  else if(role==='elite'&&roll(snapshot,kill,0x414c434d)<.5)drops.push(main)
  else if(role==='normal'&&roll(snapshot,kill,0x414c4348)<.06) {
   const favored=((snapshot.floor-1)%3)*2,choice=roll(snapshot,kill,0x414c4353)
   let cumulative=0
   for(let i=0;i<6;i++){cumulative+=i===favored||i===favored+1?.25:.125;if(choice<cumulative){drops.push(COMMON_HERBS[i]);break}}
  }
 }
 return drops.concat(breakthroughDrops(snapshot,start))
}
export function materialSummary(ids) {
 const counts=new Map()
 for(const id of ids)counts.set(id,(counts.get(id)||0)+1)
 return Array.from(counts.entries()).map(([id,count])=>({id,count}))
}
// Permanent pity is applied by Campaign only to newly accepted kill-ledger rows.
// The independent slot keeps the existing herb/common-material streams unchanged.
export function rareForgeDrops(snapshot,start,pity) {
 const next={...pity},drops=[]
 if(!snapshot.loot||snapshot.training||snapshot.rewardIsolated||snapshot.floor<2||snapshot.floor>9)return {drops,pity:next}
 const tier=snapshot.floor<=3?'fa':snapshot.floor<=6?'bao':'ling'
 for(const kill of snapshot.killLedger.slice(start)){
  if(roles[kill.archetype]!=='boss')continue
  if(next[tier]===4||roll(snapshot,kill,0x52415245)<.25){drops.push('forge_core_'+tier);next[tier]=0}
  else next[tier]++
 }
 return {drops,pity:next}
}
