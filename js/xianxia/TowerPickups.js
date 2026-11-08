import { materialDrops, rareForgeDrops } from './TowerMaterialLoot.js'
import { CORE_RANK_VALUES } from './TowerLoot.js'

export const RESOURCE_PICKUP_RADIUS = 100
export const PICKUP_LANDING_SECONDS = .5
const FLIGHT_SPEED = 420
const terminal = s => ['won','lost','abandoned'].includes(s.phase)

// Receipt IDs are derived from the immutable kill identity, never animation IDs.
export function pickupRewards(s, start = 0) {
 if (!s.pickups || s.training || s.rewardIsolated) return []
 const rewards=[]
 let pity={...s.pickups.forgePity}
 for (let i=0;i<s.killLedger.length;i++) {
  const kill=s.killLedger[i],single={...s,killLedger:[kill]}
  const rare=rareForgeDrops(single,0,pity);pity=rare.pity
  if(i<start)continue
  if(kill.coreRank)rewards.push({id:`stone:${kill.id}`,kind:'core',rank:kill.coreRank,
   amount:CORE_RANK_VALUES[kill.coreRank],killId:kill.id})
  const counts=new Map()
  for(const id of [...materialDrops(single),...rare.drops])counts.set(id,(counts.get(id)||0)+1)
  for(const [itemId,amount] of counts)rewards.push({id:`material:${kill.id}:${itemId}`,
   kind:'material',itemId,amount,killId:kill.id})
 }
 return rewards
}

export function spawnPickups(run, origin) {
 const s=run.state,rewards=pickupRewards(s,s.killLedger.length-1)
 for(let i=0;i<rewards.length;i++){
  const r=rewards[i],angle=i*2.399963229728653
  const x=origin.x+(i?Math.cos(angle)*34:0),y=origin.y+(i?Math.sin(angle)*34:0)
  const stack=s.drops.find(d=>d.receipts&&!d.attracting&&d.kind===r.kind
   &&d.itemId===r.itemId&&d.rank===r.rank&&Math.hypot(d.originX-origin.x,d.originY-origin.y)<=24)
  if(stack){
   stack.receipts.push(r.id);stack.amount+=r.amount;stack.readyAt=s.time+PICKUP_LANDING_SECONDS
  }else s.drops.push({id:run._id('loot'),kind:r.kind,...(r.kind==='core'?{rank:r.rank}:{itemId:r.itemId}),
   killId:r.killId,receipts:[r.id],amount:r.amount,x,y,originX:origin.x,originY:origin.y,radius:r.kind==='core'?10+r.rank:14,
   bornAt:s.time,readyAt:s.time+PICKUP_LANDING_SECONDS,attracting:false})
 }
}

function collect(run,d,feedback){
 const s=run.state
 s.pickups.collected.push(...d.receipts)
 if(feedback)run._effect('resource_pickup',s.player.x,s.player.y,0,{
  lootKind:d.kind,itemId:d.itemId,rank:d.rank,amount:d.amount,expiresAt:s.time+.85,
 })
}
export function tickPickups(run,dt,bonus){
 const s=run.state
 if(!s.pickups||s.player.hp<=0)return
 s.drops=s.drops.filter(d=>{
  if(!d.receipts||s.time+1e-9<d.readyAt)return true
  const dx=s.player.x-d.x,dy=s.player.y-d.y,distance=Math.hypot(dx,dy)
  if(!d.attracting&&distance>RESOURCE_PICKUP_RADIUS*(1+bonus)+1e-9)return true
  d.attracting=true
  const travel=FLIGHT_SPEED*dt
  if(distance<=travel){collect(run,d,true);return false}
  d.x+=dx/distance*travel;d.y+=dy/distance*travel
  return true
 })
}
export function collectAllPickups(run){
 const s=run.state
 if(!s.pickups)return
 s.drops=s.drops.filter(d=>{if(!d.receipts)return true;collect(run,d,false);return false})
}
export function pendingCoreValue(s){
 return s.pickups?s.drops.reduce((sum,d)=>sum+(d.kind==='core'?d.amount:0),0):0
}
export function collectedMaterials(s,start=0){
 if(!s.pickups)return []
 const ids=new Set(s.pickups.collected.slice(start))
 return pickupRewards(s).filter(r=>r.kind==='material'&&ids.has(r.id))
  .flatMap(r=>Array(r.amount).fill(r.itemId))
}

export function validPickups(s){
 if(!s.pickups)return !s.drops.some(d=>d.receipts||d.kind==='material')
 const p=s.pickups
 if(p.version!==1||!s.loot||!p.forgePity||Object.keys(p.forgePity).sort().join(',')!=='bao,fa,ling'
  ||!Object.values(p.forgePity).every(v=>Number.isInteger(v)&&v>=0&&v<=4)
  ||!Array.isArray(p.collected)||p.collected.length>20000)return false
 const expected=new Map(pickupRewards(s).map(r=>[r.id,r])),seen=new Set(),dropIds=new Set()
 const take=id=>{if(!expected.has(id)||seen.has(id))return false;seen.add(id);return true}
 if(!p.collected.every(take))return false
 for(const d of s.drops){
  if(!['core','material'].includes(d.kind)){if(d.receipts)return false;continue}
  if(terminal(s)||!Array.isArray(d.receipts)||!d.receipts.length||dropIds.has(d.id)
   ||typeof d.id!=='string'||![d.x,d.y,d.originX,d.originY,d.radius,d.bornAt,d.readyAt,d.amount].every(Number.isFinite)
   ||d.radius<=0||d.bornAt<0||d.bornAt>s.time+1e-9
   ||d.readyAt<d.bornAt+PICKUP_LANDING_SECONDS-1e-9||d.readyAt>s.time+PICKUP_LANDING_SECONDS+1e-9
   ||typeof d.attracting!=='boolean'||d.attracting&&s.time+1e-9<d.readyAt)return false
  dropIds.add(d.id)
  let amount=0
  for(const id of d.receipts){
   if(!take(id))return false
   const r=expected.get(id)
   if(r.kind!==d.kind||r.itemId!==d.itemId||r.rank!==d.rank)return false
   // A merged stack retains the first receipt's origin kill.
   if(id===d.receipts[0]&&d.killId!==r.killId)return false
   amount+=r.amount
  }
  if(amount!==d.amount)return false
 }
 return seen.size===expected.size
}
export function validPickupProgress(previous,next){
 if(!!previous.pickups!==!!next.pickups)return false
 if(!previous.pickups)return true
 return JSON.stringify(previous.pickups.forgePity)===JSON.stringify(next.pickups.forgePity)
  &&previous.pickups.collected.every((id,i)=>next.pickups.collected[i]===id)
}
