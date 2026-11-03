// Shared mixed draw rules. Payments are not connected.
import {CAMP_PILLS,cultivationAt,cultivationXpCap,TOWER_RESOURCE_CAP} from './TowerProfile.js'
import {EQUIPMENT_ROSTER} from './TowerEquipmentRoster.js'
const herbIds=['huichuncao','bailuhua','huangjing','lingshenxu','ningluzhi','linglu']
const forgeIds=['forge_xuantie','forge_lingmu','forge_yaopi','forge_lingsi','forge_lingyu']
export const branches=Object.freeze([{id:'gear1',weight:.20},{id:'gear2',weight:.20},{id:'gear3',weight:.17},{id:'gear4',weight:.03},{id:'basic',weight:.15},{id:'advanced',weight:.15},{id:'materials',weight:.10}])
export function mixedDrawCandidates(state,tier,branch){
 const realm=cultivationAt(state.xp).realm,scale={炼气:1,筑基:2,金丹:3}[realm]
 const owned=id=>state.pills[id]||0
 const materialRows=(ids,count)=>ids.filter(id=>owned(id)+count<=TOWER_RESOURCE_CAP).map(id=>({kind:'material',id,count}))
 if(branch.startsWith('gear')){
  const quality=Number(branch.slice(4)),rows=EQUIPMENT_ROSTER.filter(d=>d.tier===tier&&d.quality===quality)
  return rows.map(d=>({kind:'gear',id:d.id,count:1,category:d.category,weight:1/3/rows.filter(x=>x.category===d.category).length}))
 }
 if(branch==='materials')return materialRows([...herbIds,...forgeIds],5*scale)
 const stockXp=Object.entries(CAMP_PILLS).filter(([,p])=>p.xp&&p.realm===realm).reduce((n,[id])=>n+owned(id),state.cultivationPillUses?.[realm]||0)
 const breakthroughStock=Object.entries(CAMP_PILLS).filter(([,p])=>p.successChance&&p.from===realm).reduce((n,[id])=>n+owned(id),0)
 const rows=Object.entries(CAMP_PILLS).filter(([id,p])=>{
  if(p.material||Boolean(p.purchasable)!==(branch==='basic')||state.xp<(p.minXp||0)||owned(id)>=TOWER_RESOURCE_CAP)return false
  if(p.xp)return branch==='advanced'&&p.realm===realm&&stockXp<6&&state.xp<cultivationXpCap(state.xp)
  if(p.successChance)return p.from===realm&&breakthroughStock<3
  if(p.healShare)return owned(id)<(p.purchasable?10:5)
  return false
 }).map(([id])=>({kind:'pill',id,count:1}))
 // A saturated medicine branch retains its probability, and becomes an explicit herb reward.
 return rows.length?rows:materialRows(herbIds,(branch==='basic'?3:8)*scale)
}
export function mixedDrawPreview(state,tier,dry=0){
 return branches.map(b=>{const rows=mixedDrawCandidates(state,tier,b.id),weight=dry===39?(b.id==='gear4'?1:0):b.weight;return {branch:b.id,weight,fallback:!b.id.startsWith('gear')&&b.id!=='materials'&&rows.every(r=>r.kind==='material'),rows:rows.map(r=>({...r,probability:weight*(b.id==='gear4'&&state.mixedDraw?.pools[tier]?.miss?(r.id===state.mixedDraw.pools[tier].targetId?1:0):(r.weight??1/rows.length))}))}})
}
export function pickBranch(u,dry){if(dry===39)return 'gear4';let p=0;for(const b of branches){p+=b.weight;if(u<p)return b.id}return branches.at(-1).id}
// Reject before spending if any currently possible branch has no room for its reward.
export function rewardSpaceAvailable(state,tier,dry=0){return mixedDrawPreview(state,tier,dry).every(b=>b.weight===0||b.rows.length>0)}
import {createFixedWeapon} from './TowerWeapons.js'
import {createFixedEquipment} from './TowerEquipment.js'
import {EQUIPMENT_CAPACITY} from './TowerCrafting.js'
const tiers=['fa','bao','ling'],categories=['weapon','armor','ring']
const definition=id=>EQUIPMENT_ROSTER.find(d=>d.id===id)
const integer=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max
const keys=(v,names)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k))
export function freshMixedDraw(seed){return {tickets:0,trialClaimed:false,rng:((seed>>>0)^0x4d495845)>>>0||1,sequence:0,receipts:[],pools:Object.fromEntries(tiers.map(t=>[t,{dry:0,targetId:null,miss:false}]))}}
export function mixedTierUnlocked(state,tier){return tiers.includes(tier)&&state.xp>=({fa:0,bao:1801,ling:6601}[tier])}
export function mixedTopItems(tier){return EQUIPMENT_ROSTER.filter(d=>d.tier===tier&&d.quality===4)}
export function validMixedDraw(m){
 if(!keys(m,['tickets','trialClaimed','rng','sequence','receipts','pools'])||!integer(m.tickets,TOWER_RESOURCE_CAP)||typeof m.trialClaimed!=='boolean'||!integer(m.rng,0xffffffff)||m.rng===0||!integer(m.sequence)||!keys(m.pools,tiers))return false
 if(!tiers.every(t=>{const p=m.pools[t];return keys(p,['dry','targetId','miss'])&&integer(p.dry,39)&&typeof p.miss==='boolean'&&(p.targetId===null?!p.miss:mixedTopItems(t).some(d=>d.id===p.targetId))}))return false
 if(!Array.isArray(m.receipts)||m.receipts.length!==Math.min(m.sequence,64)||new Set(m.receipts.map(r=>r?.requestId)).size!==m.receipts.length)return false
 return m.receipts.every((r,i)=>keys(r,['requestId','sequence','tier','count','rewards'])&&typeof r.requestId==='string'&&r.requestId.length>0&&r.requestId.length<=128&&r.sequence===m.sequence-m.receipts.length+i+1&&tiers.includes(r.tier)&&[1,10].includes(r.count)&&Array.isArray(r.rewards)&&r.rewards.length===r.count&&r.rewards.every(a=>{
  if(a?.kind==='gear'){const d=definition(a.id);return keys(a,['kind','id','count','instanceId'])&&a.count===1&&d?.tier===r.tier&&d.quality>0&&typeof a.instanceId==='string'&&new RegExp(d.category==='weapon'?'^weapon-[1-9]\\d*$':'^gear-[1-9]\\d*$').test(a.instanceId)}
  return keys(a,['kind','id','count'])&&['pill','material'].includes(a.kind)&&Object.hasOwn(CAMP_PILLS,a.id)&&Boolean(CAMP_PILLS[a.id].material)===(a.kind==='material')&&integer(a.count,24)&&a.count>0&&(a.kind!=='pill'||a.count===1)
 }))
}
function random(m){let x=m.rng;x^=x<<13;x^=x>>>17;x^=x<<5;m.rng=x>>>0;return m.rng/4294967296}
function weighted(rows,u){let total=0;for(const r of rows){total+=r.weight??1/rows.length;if(u<total)return r}return rows.at(-1)}
export function applyMixedDraw(state,action){
 const m=state.mixedDraw,fail=reason=>({ok:false,reason})
 if(state.activeRun)return fail('in-tower')
 if(action.type==='claimDrawTrial'){if(m.trialClaimed)return fail('already-claimed');if(m.tickets>TOWER_RESOURCE_CAP-10)return fail('capacity');m.tickets+=10;m.trialClaimed=true;return {ok:true,tickets:10}}
 if(!mixedTierUnlocked(state,action.tier))return fail(tiers.includes(action.tier)?'realm-locked':'unknown-tier')
 const pool=m.pools[action.tier]
 if(action.type==='setMixedWish'){
  if(action.targetId!==null&&!mixedTopItems(action.tier).some(d=>d.id===action.targetId))return fail('invalid-wish')
  if(pool.targetId!==action.targetId){pool.targetId=action.targetId;pool.miss=false}return {ok:true}
 }
 if(action.type!=='drawMixed')return fail('unknown-action')
 if(typeof action.requestId!=='string'||!action.requestId.length||action.requestId.length>128)return fail('invalid-request-id')
 const receipt=m.receipts.find(r=>r.requestId===action.requestId)
 if(receipt)return receipt.tier===action.tier&&receipt.count===action.count&&receipt.sequence===action.sequence?{ok:true,...receipt,duplicate:true}:fail('request-conflict')
 if(!integer(action.sequence)||action.sequence!==m.sequence+1||m.sequence===Number.MAX_SAFE_INTEGER)return fail('stale-draw-sequence')
 if(![1,10].includes(action.count))return fail('invalid-count')
 if(m.tickets<action.count)return fail('insufficient-tickets')
 if(Object.keys(state.weapons).length+Object.keys(state.equipment).length+action.count>EQUIPMENT_CAPACITY||state.weaponSequence>Number.MAX_SAFE_INTEGER-action.count||state.equipmentSequence>Number.MAX_SAFE_INTEGER-action.count||state.weaponSequence+state.equipmentSequence>Number.MAX_SAFE_INTEGER-action.count)return fail('capacity')
 const rewards=[]
 for(let i=0;i<action.count;i++){
  if(!rewardSpaceAvailable(state,action.tier,pool.dry))return fail('capacity')
  const branch=pickBranch(random(m),pool.dry),rows=mixedDrawCandidates(state,action.tier,branch)
  let row=weighted(rows,random(m))
  if(branch==='gear4'&&pool.targetId&&pool.miss)row=rows.find(r=>r.id===pool.targetId)
  if(branch==='gear4'){pool.dry=0;if(pool.targetId)pool.miss=row.id!==pool.targetId}else pool.dry++
  if(row.kind==='gear'){
   const weapon=row.category==='weapon',sequence=weapon?'weaponSequence':'equipmentSequence',id=`${weapon?'weapon':'gear'}-${++state[sequence]}`
   const item=weapon?createFixedWeapon(row.id,id):createFixedEquipment(row.id,id)
   state[weapon?'weapons':'equipment'][id]=item
   state.inventoryMeta??={};state.inventoryMeta[id]={order:state.weaponSequence+state.equipmentSequence,seen:false}
   if(weapon)state.weaponCounters[id]=0;else if(row.category==='ring')state.equipmentCounters[id]=0
   rewards.push({kind:'gear',id:row.id,count:1,instanceId:id})
  }else{state.pills[row.id]+=row.count;rewards.push({kind:row.kind,id:row.id,count:row.count})}
 }
 m.tickets-=action.count;m.sequence=action.sequence
 const result={requestId:action.requestId,sequence:action.sequence,tier:action.tier,count:action.count,rewards}
 m.receipts.push(result);if(m.receipts.length>64)m.receipts.shift()
 return {ok:true,...result}
}
