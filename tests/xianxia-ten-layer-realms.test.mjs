import test from 'node:test'
import assert from 'node:assert/strict'
import { cultivationAt, cultivationLevelXp, cultivationXpCap, TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'
import { growthStageAt, realmPoints, GROWTH_POINT_CAP, growthSummary, skillRequirement } from '../js/xianxia/TowerGrowth.js'
import { TowerCampaignStore,TOWER_CAMPAIGN_KEY,combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { TowerRun,validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { canUseEquipmentTier } from '../js/xianxia/TowerEquipmentTiers.js'
import { inventoryQuote } from '../js/xianxia/TowerInventory.js'
import { towerStorage } from '../js/xianxia/TowerPlaytest.js'
import { checksum } from '../js/xianxia/Checksum.js'
function fixture(patch={}){
 const records=new Map([['other-game','keep']]);let blocked=false
 const disk={getItem:k=>records.get(k)??null,setItem:(k,v)=>{if(blocked)throw Error('quota');records.set(k,v)}}
 let store=new TowerCampaignStore(disk,0);store.act({type:'sync'},0)
 const envelope=JSON.parse(disk.getItem(TOWER_CAMPAIGN_KEY));envelope.data=JSON.stringify({...store.state,...patch,pills:{...store.state.pills,...patch.pills}});envelope.checksum=checksum(envelope.data)
 disk.setItem(TOWER_CAMPAIGN_KEY,JSON.stringify(envelope));store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false)
 return {store,disk,block:value=>{blocked=value}}
}
test('all three realms have ten layers and only full tenth-layer XP is consummation',()=>{
 for(const [xp,realm,layer,phase] of [[1485,'炼气',10,'巅峰'],[1799,'炼气',10,'巅峰'],[1800,'炼气',10,'大圆满'],[1801,'筑基',1,'初期'],[5985,'筑基',10,'巅峰'],[6599,'筑基',10,'巅峰'],[6600,'筑基',10,'大圆满'],[6601,'金丹',1,'初期'],[10920,'金丹',7,'巅峰'],[13485,'金丹',10,'巅峰'],[14399,'金丹',10,'巅峰'],[14400,'金丹',10,'大圆满']]){
  const c=cultivationAt(xp);assert.equal(c.realm,realm,`${xp} realm`);assert.equal(c.layer,layer,`${xp} layer`);assert.equal(growthStageAt(xp).phase,phase,`${xp} phase`)
 }
 assert.equal(TOWER_XP_CAP,14400);assert.equal(cultivationAt(13485).capped,false);assert.equal(cultivationAt(14400).capped,true)
 assert.equal(cultivationLevelXp(21),6601)
})
test('level thresholds are increasing, natural XP cannot cross either manual barrier',()=>{
 for(let level=2;level<=30;level++)assert.ok(cultivationLevelXp(level)>cultivationLevelXp(level-1))
 for(const [xp,cap] of [[0,1800],[1800,1800],[1801,6600],[6600,6600],[6601,14400]])assert.equal(cultivationXpCap(xp),cap)
})
test('extra tenth layers retain skill point budget and realm gates',()=>{
 assert.equal(GROWTH_POINT_CAP,80)
 for(const [before,after] of [[1200,1485],[5400,5985],[12600,13485]])assert.equal(realmPoints(after),realmPoints(before))
 assert.equal(realmPoints(14400),48)
 const {store}=fixture({xp:6600})
 assert.equal(skillRequirement(store.state,'evo_wanjian').reason,'stage-locked')
 assert.equal(canUseEquipmentTier('ling',20),false);assert.equal(canUseEquipmentTier('ling',21),true)
})
test('unspecified breakthrough remains unavailable and cannot bypass either barrier',()=>{
 for(const xp of [1800,6599,6600,6601,14400]){
  const {store,disk}=fixture({xp}),before=store.state,raw=disk.getItem(TOWER_CAMPAIGN_KEY)
  assert.equal(store.act({type:'breakthrough'},0).ok,false)
  assert.equal(store.state,before);assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY),raw)
 }
})
test('cultivation pills stop at Foundation barrier and final cap without wasting a second pill',()=>{
 for(const [start,end,id] of [[6590,6600,'heqi'],[14390,14400,'zhenyuan']]){
  const {store}=fixture({xp:start,clearedFloor:3,pills:{huichun:3,[id]:2,zhuji:1}})
  assert.equal(store.act({type:'usePill',id,confirmed:true},0).gained,10);assert.equal(store.state.xp,end)
  assert.equal(store.act({type:'usePill',id},0).ok,false);assert.equal(store.state.pills[id],1)
  assert.equal(inventoryQuote(store.state,id,'use').ok,false)
  assert.equal(inventoryQuote(store.state,'zhuji','use').ok,false)
 }
})
test('real kill rewards stop at Foundation and final barriers and settle without duplicate rewards',()=>{
 for(const cap of [6600,14400]){
  const {store}=fixture({xp:cap-1});assert.equal(store.act({type:'startFloor',floor:1,seed:7},0).ok,true)
  const run=TowerRun.restore(store.state.activeRun.snapshot)
  for(let i=0;i<600&&run.state.killLedger.length<2;i++){
   for(const enemy of run.state.enemies){enemy.hp=1;enemy.x=run.state.player.x+60;enemy.y=run.state.player.y;enemy.ai.graceUntil=9999}
   run.advance(1/60)
  }
  assert.ok(run.state.killLedger.length>=2);assert.equal(run.state.player.xp,cap);assert.equal(run.state.earned.xp,1)
  assert.equal(validateTowerSnapshot(run.snapshot()),true);run.abandon()
  assert.equal(store.act({type:'finishFloor',snapshot:run.snapshot()},0).ok,true);const after=store.state
  assert.equal(store.act({type:'finishFloor',snapshot:run.snapshot()},0).ok,false);assert.equal(store.state,after)
 }
})

test('developer promotion across a capped battle receipt returns a safe failure',()=>{
 const {disk}=fixture({xp:6599});const store=new TowerCampaignStore(towerStorage(disk,true),0)
 store.act({type:'startFloor',floor:1,seed:7},0)
 const run=TowerRun.restore(store.state.activeRun.snapshot)
 for(let i=0;i<600&&run.state.killLedger.length<2;i++){
  for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=9999}
  run.advance(1/60)
 }
 run.pause();assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
 const before=store.state,raw=disk.getItem(TOWER_CAMPAIGN_KEY)
 assert.equal(store.act({type:'playtestNextStage'},0).reason,'in-tower')
 assert.equal(store.state,before);assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY),raw)
})
