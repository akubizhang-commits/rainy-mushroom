import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { cultivationAt, CAMP_PILLS } from '../js/xianxia/TowerProfile.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { checksum } from '../js/xianxia/Checksum.js'
import { growthStageAt, skillRequirement } from '../js/xianxia/TowerGrowth.js'
import { canUseEquipmentTier } from '../js/xianxia/TowerEquipmentTiers.js'
import { inventoryQuote } from '../js/xianxia/TowerInventory.js'
function fixture(patch={}) {
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){assert.equal(k,TOWER_CAMPAIGN_KEY);if(this.fail)throw Error('disk');this.raw=v}}
 const base=new TowerCampaignStore(disk,0);base.act({type:'sync'},0)
 const envelope=JSON.parse(disk.raw),data=JSON.stringify({...base.state,...patch,pills:{...base.state.pills,...patch.pills}})
 disk.raw=JSON.stringify({...envelope,data,checksum:checksum(data)})
 const store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false)
 return {disk,store}
}
const use={type:'usePill',id:'zhuji'}
test('ten Qi layers include a full XP barrier before Foundation; gates stay locked',()=>{
 assert.equal(cultivationAt(1485).level,10)
 assert.equal(cultivationAt(1800).realm,'炼气')
 assert.equal(cultivationAt(1800).breakthroughReady,true)
 assert.equal(cultivationAt(1801).realm,'筑基')
 assert.equal(cultivationAt(1801).level,11)
 assert.equal(growthStageAt(1800).realm,'炼气')
 assert.equal(growthStageAt(1801).phase,'初期')
 assert.equal(canUseEquipmentTier('bao',10),false)
 assert.equal(canUseEquipmentTier('bao',11),true)
 const {store}=fixture({xp:1800,pills:{huichun:3,peiyuan:1,zhuji:1}})
 assert.equal(skillRequirement(store.state,'sj_line').reason,'stage-locked')
 assert.equal(inventoryQuote(store.state,'peiyuan','use').ok,false)
})
test('Zhuji costs 60 spirit stones; failed save rolls back purchase',()=>{
 const {disk,store}=fixture();assert.equal(CAMP_PILLS.zhuji.price,60)
 disk.fail=true;assert.equal(store.act({type:'buyPill',id:'zhuji',count:1},0).reason,'save-failed')
 disk.fail=false;assert.equal(store.act({type:'buyPill',id:'zhuji',count:2},0).ok,true)
 assert.equal(store.state.spiritStones,380);assert.equal(store.state.contribution,1000);assert.equal(store.state.pills.zhuji,2)
})
test('premature, already promoted, and absent pills do not consume or roll',()=>{
 for(const [xp,stock,reason] of [[1799,1,'breakthrough-not-ready'],[1801,1,'already-zhuji'],[1800,0,'no-pill']]){
  const {disk,store}=fixture({xp,pills:{huichun:3,peiyuan:0,zhuji:stock}})
  const state=store.state,raw=disk.raw
  assert.equal(store.act(use,0).reason,reason);assert.equal(store.state,state);assert.equal(disk.raw,raw)
 }
})
test('failed attempt consumes one pill and persists RNG, keeping full XP through reload',()=>{
 const {disk,store}=fixture({xp:1800,breakthroughRng:10000,pills:{huichun:3,peiyuan:0,zhuji:2}})
 const r=store.act(use,0);assert.equal(r.ok,true);assert.equal(r.success,false)
 assert.equal(store.state.xp,1800);assert.equal(store.state.pills.zhuji,1)
 const reload=new TowerCampaignStore(disk,0);assert.deepEqual(reload.state,store.state)
 assert.notEqual(reload.state.breakthroughRng,10000)
})
test('success persists only once; failed write cannot consume a pill or reroll outcome',()=>{
 const {disk,store}=fixture({xp:1800,breakthroughRng:1,pills:{huichun:3,peiyuan:0,zhuji:2}})
 const before=store.state,raw=disk.raw
 disk.fail=true;assert.equal(store.act(use,0).reason,'save-failed')
 assert.equal(store.state,before);assert.equal(disk.raw,raw)
 disk.fail=false;const r=store.act(use,0)
 assert.equal(r.success,true);assert.equal(store.state.xp,1801);assert.equal(store.state.pills.zhuji,1)
 assert.equal(new TowerCampaignStore(disk,0).state.xp,1801)
 assert.equal(store.act(use,0).reason,'already-zhuji')
})
test('cultivation pills clamp at full Qi and cannot bypass it',()=>{
 const {store}=fixture({xp:1790,clearedFloor:2,pills:{huichun:3,peiyuan:2,zhuji:0}})
 assert.equal(store.act({type:'usePill',id:'peiyuan'},0).reason,'cultivation-overflow-confirmation')
 assert.equal(store.state.xp,1790)
 assert.equal(store.act({type:'usePill',id:'peiyuan',confirmed:true},0).gained,10)
 assert.equal(store.state.xp,1800)
 assert.equal(store.act({type:'usePill',id:'peiyuan'},0).reason,'breakthrough-required')
 assert.equal(store.state.pills.peiyuan,1)
})
test('actual combat caps kill XP and snapshot receipts at Qi barrier, including reload',()=>{
 const {store}=fixture({xp:1799})
 const run=new TowerRun({attemptId:1,floor:1,seed:7,xp:1799,hp:100,loadout:combatLoadout(store.state)})
 for(let i=0;i<600&&run.state.killLedger.length<2;i++){
  for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=9999}
  run.advance(1/60)
 }
 assert.ok(run.state.killLedger.length>=2)
 assert.equal(run.state.player.xp,1800);assert.equal(run.state.earned.xp,1)
 assert.equal(validateTowerSnapshot(run.snapshot()),true)
 assert.equal(TowerRun.restore(run.snapshot()).state.player.xp,1800)
})

test('final cap equals final level threshold; there is no invisible XP or pill consumption',async()=>{
 const {TOWER_XP_CAP,cultivationLevelXp}=await import('../js/xianxia/TowerProfile.js')
 assert.equal(cultivationAt(TOWER_XP_CAP).capped,true)
 assert.equal(cultivationAt(TOWER_XP_CAP-1).capped,false)
 assert.equal(cultivationAt(TOWER_XP_CAP).level,30)
 const {store}=fixture({xp:TOWER_XP_CAP,clearedFloor:9,pills:{huichun:3,zhenyuan:1,zhuji:1}})
 assert.equal(store.act({type:'usePill',id:'zhenyuan'},0).reason,'cultivation-capped')
 assert.equal(inventoryQuote(store.state,'zhenyuan','use').ok,false)
 assert.equal(store.state.pills.zhenyuan,1)
})
test('55 percent boundary is exact and breakthrough rolls do not change forge RNG',()=>{
 const undo=(value,shift,left)=>{let x=value;for(let i=0;i<32;i++)x=value^(left?x<<shift:x>>>shift);return x>>>0}
 const seedFor=output=>undo(undo(undo(output,5,true),17,false),13,true)
 for(const [output,success] of [[2362232012,true],[2362232013,false]]){
  const {store}=fixture({xp:1800,breakthroughRng:seedFor(output),pills:{huichun:3,peiyuan:0,zhuji:1}})
  const rng=store.state.rng
  assert.equal(store.act(use,0).success,success)
  assert.equal(store.state.breakthroughRng,output);assert.equal(store.state.rng,rng)
 }
})
test('battle checkpoint commits capped XP once, rollback and reload cannot replay rewards',()=>{
 const {disk,store}=fixture({xp:1799,pills:{huichun:3,peiyuan:0,zhuji:1}})
 const started=store.act({type:'startFloor',floor:1,seed:7},0)
 assert.equal(started.ok,true)
 assert.equal(store.act(use,0).reason,'in-tower')
 const run=TowerRun.restore(started.snapshot)
 for(let i=0;i<600&&run.state.killLedger.length<2;i++){
  for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=9999}
  run.advance(1/60)
 }
 const snapshot=run.snapshot(),action={type:'checkpoint',snapshot}
 assert.equal(snapshot.player.xp,1800)
 const before=store.state,raw=disk.raw;disk.fail=true
 assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before);assert.equal(disk.raw,raw)
 disk.fail=false;assert.equal(store.act(action,0).ok,true)
 const saved=store.state;assert.equal(saved.xp,1800)
 assert.equal(store.act(action,0).ok,true);assert.deepEqual(store.state,saved)
 assert.deepEqual(new TowerCampaignStore(disk,0).state,saved)
 const forged=structuredClone(snapshot);forged.player.xp=1801;forged.earned.xp=2
 assert.equal(validateTowerSnapshot(forged),false)
})
test('stale windows cannot consume the same breakthrough pill twice',()=>{
 const {disk,store}=fixture({xp:1800,breakthroughRng:10000,pills:{huichun:3,peiyuan:0,zhuji:1}})
 const stale=new TowerCampaignStore(disk,0)
 assert.equal(store.act(use,0).ok,true)
 assert.equal(stale.act(use,0).reason,'stale-save')
 assert.equal(new TowerCampaignStore(disk,0).state.pills.zhuji,0)
})
