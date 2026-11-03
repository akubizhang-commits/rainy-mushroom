import test from 'node:test'
import assert from 'node:assert/strict'
import {GROWTH_SKILLS,GROWTH_EVOLUTIONS,GROWTH_POINT_CAP,GROWTH_RESEARCH,realmPoints,growthSummary,skillRequirement} from '../js/xianxia/TowerGrowth.js'
import {FIRST_CLEAR_REWARDS} from '../js/xianxia/TowerEconomy.js'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js'
import {cultivationLevelXp,TOWER_XP_CAP,ZHUJI_FULL_XP} from '../js/xianxia/TowerProfile.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {skillPresentation} from '../js/xianxia/TowerSkillPresentation.js'
const xp=cultivationLevelXp
function fixture(patch={}){
 const data=new Map([['other-game','untouched']]);let blocked=false
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(blocked)throw Error('disk full');data.set(k,v)}}
 let store=new TowerCampaignStore(storage,0);assert.equal(store.act({type:'sync'},0).ok,true)
 const envelope=JSON.parse(data.get(TOWER_CAMPAIGN_KEY));const state={...structuredClone(store.state),...patch}
 envelope.data=JSON.stringify(state);envelope.checksum=checksum(envelope.data);data.set(TOWER_CAMPAIGN_KEY,JSON.stringify(envelope))
 store=new TowerCampaignStore(storage,0);assert.deepEqual(store.state,state)
 return {store,storage,data,block:v=>{blocked=v}}
}
test('every skill charges and refunds its fixed price through max rank and reload',()=>{
 const prices={sj_arc:1,sj_wanjian:1,sj_yujian:1,sj_cross:1,sj_spirit:1,sj_heart:1,vajra:1,
  sj_line:2,sj_shadow:2,sj_formation:2,sj_mark:2,sj_bone:1,sj_gate:1,sj_flight:1,
  evo_wanjian:2,evo_wuwo:4,evo_tiandi:2,evo_sixiang:4}
 for(const d of [...GROWTH_SKILLS,...GROWTH_EVOLUTIONS]){
  const price=prices[d.id];assert.ok(price,d.id)
  const skills={sj_spirit:3,...(d.parent?{[d.parent]:1}:{})};delete skills[d.id]
  const books=GROWTH_SKILLS.filter(row=>skills[row.id]&&row.special).map(row=>row.id)
  const f=fixture({xp:TOWER_XP_CAP,clearedFloor:9,spiritStones:20000,researchPurchases:3,skillsInitialized:true,skills,books})
  const start=growthSummary(f.store.state).available
  for(let rank=1;rank<=d.maxLevel;rank++){
   assert.equal(skillRequirement(f.store.state,d.id).cost,price,`${d.id} rank ${rank}`)
   assert.ok(skillPresentation(f.store.state,d.id).requirementLines.includes(`功法点 ${price}`))
   const before=structuredClone(f.store.state),raw=f.data.get(TOWER_CAMPAIGN_KEY)
   f.block(true);assert.equal(f.store.act({type:'learnSkill',id:d.id},0).reason,'save-failed')
   assert.deepEqual(f.store.state,before);assert.equal(f.data.get(TOWER_CAMPAIGN_KEY),raw);f.block(false)
   assert.equal(f.store.act({type:'learnSkill',id:d.id},0).ok,true)
   f.store=new TowerCampaignStore(f.storage,0)
   assert.equal(growthSummary(f.store.state).available,start-rank*price)
  }
  assert.equal(f.store.act({type:'learnSkill',id:d.id},0).reason,'max-level')
  for(let rank=d.maxLevel;rank>0;rank--){
   assert.equal(f.store.act({type:'decreaseSkill',id:d.id},0).ok,true)
   f.store=new TowerCampaignStore(f.storage,0)
   assert.equal(growthSummary(f.store.state).available,start-(rank-1)*price)
  }
  assert.equal(f.data.get('other-game'),'untouched')
 }
})
test('breakthrough points are granted at the boundary and sources total 68 free plus 12 purchased',()=>{
 for(const [level,points] of [[1,0],[9,8],[10,8],[11,17],[19,25],[20,25],[21,40],[29,48],[30,48]])assert.equal(realmPoints(xp(level)),points)
 assert.equal(realmPoints(xp(11)-1),8);assert.equal(realmPoints(xp(21)-1),25)
 assert.deepEqual(FIRST_CLEAR_REWARDS.map(r=>r.kind==='skillPoints'?r.amount:0),[4,0,0,7,0,0,9,0,0])
 const s={xp:TOWER_XP_CAP,clearedFloor:9,researchPurchases:0,skills:{sj_arc:1},evolutionRanks:{}}
 assert.equal(growthSummary(s).total,68)
 assert.deepEqual(GROWTH_RESEARCH.map(r=>[r.learnClear,r.cost,r.points]),[[3,800,4],[6,1600,4],[9,2400,4]])
 assert.equal(growthSummary({...s,researchPurchases:3}).total,80)
 assert.equal(growthSummary({...s,researchPurchases:3,skillsInitialized:true,skills:{}}).total,81)
 assert.equal(GROWTH_POINT_CAP,80)
})
test('research is atomic, limited, charged once, and survives reload',()=>{
 const f=fixture({xp:TOWER_XP_CAP,clearedFloor:9,spiritStones:4800})
 for(const [i,cost] of [800,1600,2400].entries()){
  const before=f.store.state,total=growthSummary(before).total,raw=f.data.get(TOWER_CAMPAIGN_KEY)
  f.block(true);assert.equal(f.store.act({type:'researchPoint'},0).ok,false);assert.deepEqual(f.store.state,before);assert.equal(f.data.get(TOWER_CAMPAIGN_KEY),raw)
  f.block(false);assert.equal(f.store.act({type:'researchPoint'},0).ok,true)
  assert.equal(f.store.state.spiritStones,before.spiritStones-cost);assert.equal(f.store.state.researchPurchases,i+1)
  assert.equal(growthSummary(f.store.state).total,total+4)
  f.store=new TowerCampaignStore(f.storage,0);assert.equal(growthSummary(f.store.state).total,total+4)
 }
 assert.equal(f.store.state.spiritStones,0);assert.equal(f.store.act({type:'researchPoint'},0).reason,'max-research')
 assert.equal(f.data.get('other-game'),'untouched')
})
test('each floor has exactly one reward and three-floor budgets stay unchanged',()=>{
 assert.deepEqual(FIRST_CLEAR_REWARDS.map(r=>r.kind),
  ['skillPoints','spiritStones','contribution','skillPoints','spiritStones','contribution','skillPoints','spiritStones','contribution'])
 for(const r of FIRST_CLEAR_REWARDS)assert.equal(Object.hasOwn(r,'skillPoints'),false)
 const previousPoints=[1,1,2,2,2,3,3,3,3]
 let oldPoints=0,newPoints=0
 for(let i=0;i<9;i++){
  oldPoints+=previousPoints[i]
  const reward=FIRST_CLEAR_REWARDS[i]
  newPoints+=reward.kind==='skillPoints'?reward.amount:0
  assert.ok(newPoints>=oldPoints,`floor ${i+1} must not delay skill training`)
  if(i%3===2)assert.equal(newPoints,oldPoints)
 }
 assert.equal(FIRST_CLEAR_REWARDS.filter(r=>r.kind==='spiritStones').reduce((n,r)=>n+r.amount,0),800)
 assert.equal(FIRST_CLEAR_REWARDS.filter(r=>r.kind==='contribution').reduce((n,r)=>n+r.amount,0),3000)
})
test('locked and unaffordable research does not grant points or spend money',()=>{
 for(const [patch,reason] of [[{clearedFloor:2,spiritStones:9999},'floor-locked'],[{clearedFloor:3,spiritStones:799},'insufficient']]){
  const f=fixture(patch),before=structuredClone(f.store.state)
  assert.equal(f.store.act({type:'researchPoint'},0).reason,reason);assert.deepEqual(f.store.state,before)
 }
})
test('all four ultimates charge both ranks and refund exactly the actual investment',()=>{
 for(const [id,costs] of Object.entries({evo_wanjian:[2,2],evo_wuwo:[4,4],evo_tiandi:[2,2],evo_sixiang:[4,4]})){
  const f=fixture({xp:TOWER_XP_CAP,clearedFloor:9,spiritStones:10000,researchPurchases:3})
  const parent=GROWTH_EVOLUTIONS.find(row=>row.id===id).parent
  assert.equal(f.store.act({type:'learnSkill',id:parent},0).ok,true)
  const start=growthSummary(f.store.state).available,stones=f.store.state.spiritStones
  for(let i=0;i<2;i++){
   assert.equal(skillRequirement(f.store.state,id).cost,costs[i]);assert.equal(f.store.act({type:'learnSkill',id},0).ok,true)
   assert.equal(growthSummary(f.store.state).available,start-costs.slice(0,i+1).reduce((a,b)=>a+b,0))
  }
  assert.equal(f.store.state.spiritStones,stones-2400)
  assert.equal(f.store.act({type:'decreaseSkill',id},0).ok,true);assert.equal(growthSummary(f.store.state).available,start-costs[0])
  assert.equal(f.store.act({type:'decreaseSkill',id},0).ok,true);assert.equal(growthSummary(f.store.state).available,start)
  assert.equal(f.store.act({type:'learnSkill',id},0).ok,true);assert.equal(f.store.state.spiritStones,stones-2400,'owned manual is not purchased twice')
  assert.equal(f.store.act({type:'respecSkills'},0).ok,true);assert.equal(growthSummary(f.store.state).available,81)
  assert.equal(f.store.act({type:'respecSkills'},0).ok,true);assert.equal(growthSummary(f.store.state).available,81)
 }
})
test('old cheap-rank saves reset only this mode, with retryable storage failure',()=>{
 const f=fixture();const old=JSON.parse(f.data.get(TOWER_CAMPAIGN_KEY));old.schema=19
 f.data.set(TOWER_CAMPAIGN_KEY,JSON.stringify(old));f.block(true)
 const failed=new TowerCampaignStore(f.storage,0);assert.equal(failed.readOnly,true);assert.equal(f.data.get(TOWER_CAMPAIGN_KEY),JSON.stringify(old))
 f.block(false);const reset=new TowerCampaignStore(f.storage,0)
 assert.equal(reset.readOnly,false);assert.equal(reset.migrationReport.reset,true);assert.equal(reset.migrationReport.fromSchema,19)
 assert.equal(f.data.get('other-game'),'untouched');assert.equal(growthSummary(reset.state).available,0)
})

for(const [beforeXp,grant] of [[cultivationLevelXp(12)-1,1]])test(`battle level-up ${beforeXp} credits ${grant} points once across save/reload/settlement`,async()=>{
 const {TowerRun}=await import('../js/xianxia/TowerRun.js')
 const f=fixture({xp:beforeXp}),before=growthSummary(f.store.state).total
 const start=f.store.act({type:'startFloor',floor:1,seed:101},0);assert.equal(start.ok,true)
 const run=TowerRun.restore(start.snapshot)
 for(let i=0;i<300&&!run.state.enemies.length;i++)run.advance(1/60)
 const enemy=run.state.enemies[0];assert.ok(enemy)
 run._damageEnemy({target:enemy.id,damage:enemy.hp,direct:false,scaled:true,source:'fixture'})
 run.advance(1/60);run.pause();const snapshot=run.snapshot()
 f.block(true);assert.equal(f.store.act({type:'checkpoint',snapshot},0).ok,false);assert.equal(growthSummary(f.store.state).total,before)
 f.block(false);assert.equal(f.store.act({type:'checkpoint',snapshot},0).ok,true)
 assert.equal(growthSummary(f.store.state).total,before+grant)
 assert.equal(f.store.act({type:'checkpoint',snapshot},0).ok,true)
 f.store=new TowerCampaignStore(f.storage,0);assert.equal(growthSummary(f.store.state).total,before+grant)
 const restored=TowerRun.restore(f.store.state.activeRun.snapshot);restored.abandon()
 assert.equal(f.store.act({type:'finishFloor',snapshot:restored.snapshot()},0).ok,true)
 assert.equal(growthSummary(f.store.state).total,before+grant)
})

test('successful paid Zhuji breakthrough grants nine points once and failed rolls grant none',()=>{
 const f=fixture({xp:ZHUJI_FULL_XP,contribution:6000}),before=growthSummary(f.store.state).total
 let success=false
 for(let i=0;i<100&&!success;i++){
  assert.equal(f.store.act({type:'buyPill',id:'zhuji',count:1},0).ok,true)
  const use=f.store.act({type:'usePill',id:'zhuji'},0);assert.equal(use.ok,true);success=use.success
  assert.equal(growthSummary(f.store.state).total,before+(success?9:0))
 }
 assert.equal(success,true)
 f.store=new TowerCampaignStore(f.storage,0);assert.equal(growthSummary(f.store.state).total,before+9)
 assert.equal(f.store.act({type:'sync'},0).ok,true);assert.equal(growthSummary(f.store.state).total,before+9)
})
