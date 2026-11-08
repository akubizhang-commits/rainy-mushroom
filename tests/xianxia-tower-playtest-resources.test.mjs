import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY,PLAYTEST_STONE_CAP} from '../js/xianxia/TowerCampaign.js'
import {playtestStorage,TOWER_PLAYTEST_KEY,PLAYTEST_RESOURCE_ACTIONS} from '../js/xianxia/TowerPlaytest.js'
import {STONE_CAP,STONE_VALUES,splitSpiritStones,FIRST_CLEAR_REWARDS} from '../js/xianxia/TowerEconomy.js'
import {TOWER_RESOURCE_CAP,TOWER_XP_CAP,cultivationAt} from '../js/xianxia/TowerProfile.js'
import {growthSummary} from '../js/xianxia/TowerGrowth.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {checksum} from '../js/xianxia/Checksum.js'
const actions=[...STONE_VALUES.map((_,grade)=>({type:'playtestSpiritStones',grade})),{type:'playtestContribution'},{type:'playtestMaxLevel'}]
function setup(){
 const records=new Map(),storage={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)}
 const normal=new TowerCampaignStore(storage,0);assert.ok(normal.act({type:'sync'},0).ok)
 const normalRaw=storage.getItem(TOWER_CAMPAIGN_KEY),adapter=playtestStorage(storage,normalRaw)
 return {records,storage,adapter,normal,normalRaw,store:new TowerCampaignStore(adapter,0)}
}
function fixture(patch){
 const f=setup(),record=JSON.parse(f.storage.getItem(TOWER_PLAYTEST_KEY))
 record.data=JSON.stringify({...f.store.state,...patch});record.checksum=checksum(record.data)
 f.storage.setItem(TOWER_PLAYTEST_KEY,JSON.stringify(record));f.store=new TowerCampaignStore(f.adapter,0)
 assert.equal(f.store.error,'');return f
}
function denied(f,action,reason){
 const state=f.store.state,records=new Map(f.records)
 assert.deepEqual(f.store.act(action,0),{ok:false,reason});assert.strictEqual(f.store.state,state);assert.deepEqual(f.records,records)
}

test('four grade-specific additive grants are exact, normalized and isolated from normal cap',()=>{
 const f=fixture({spiritStones:STONE_CAP});let expected=f.store.state.spiritStones
 for(let grade=0;grade<4;grade++){
  const result=f.store.act({type:'playtestSpiritStones',grade},0)
  assert.equal(result.ok,true);assert.equal(result.added,999*STONE_VALUES[grade])
  expected+=result.added;assert.equal(f.store.state.spiritStones,expected)
  const split=splitSpiritStones(expected);assert.equal(split.reduce((s,n,i)=>s+n*STONE_VALUES[i],0),expected)
  assert.ok(split.slice(0,3).every(n=>n<100))
 }
 assert.equal(expected,STONE_CAP+1009090899);assert.ok(expected>STONE_CAP)
 assert.deepEqual(new TowerCampaignStore(f.adapter,0).state,f.store.state)
 assert.equal(f.storage.getItem(TOWER_CAMPAIGN_KEY),f.normalRaw)
 f.storage.setItem(TOWER_CAMPAIGN_KEY,f.storage.getItem(TOWER_PLAYTEST_KEY))
 assert.equal(new TowerCampaignStore(f.storage,0).error,'corrupt')
})

test('resource menu exposes one combined repeatable grant',()=>{
 assert.deepEqual(PLAYTEST_RESOURCE_ACTIONS,[{label:'+999灵石、点眷',action:{type:'playtestResources'}}])
 const f=setup(),before=f.store.state.spiritStones
 for(let i=1;i<=2;i++){
  assert.equal(f.store.act(PLAYTEST_RESOURCE_ACTIONS[0].action,0).ok,true)
  assert.equal(f.store.state.spiritStones,before+i*999000000)
 }
 assert.deepEqual(new TowerCampaignStore(f.adapter,0).state,f.store.state)
 assert.equal(f.storage.getItem(TOWER_CAMPAIGN_KEY),f.normalRaw)
 assert.ok(Object.isFrozen(PLAYTEST_RESOURCE_ACTIONS[0].action))
})

test('normal stores and late adapter permission changes reject every debug action',()=>{
 const f=setup();f.storage.allowPlaytestTools=true
 for(const action of actions){
  const before=f.normal.state,raw=f.storage.getItem(TOWER_CAMPAIGN_KEY)
  assert.deepEqual(f.normal.act({...action,allowPlaytestTools:true},0),{ok:false,reason:'playtest-only'})
  assert.strictEqual(f.normal.state,before);assert.equal(f.storage.getItem(TOWER_CAMPAIGN_KEY),raw)
 }
 for(const grade of [-1,4,.5,'3',NaN])denied(f,{type:'playtestSpiritStones',grade},'invalid-grade')
})

test('grants reject capacity overflow instead of truncating or rounding, contributions remain additive',()=>{
 for(let grade=0;grade<4;grade++){
  const added=999*STONE_VALUES[grade],f=fixture({spiritStones:PLAYTEST_STONE_CAP-added})
  assert.equal(f.store.act({type:'playtestSpiritStones',grade},0).ok,true)
  assert.equal(f.store.state.spiritStones,PLAYTEST_STONE_CAP)
  assert.equal(new TowerCampaignStore(f.adapter,0).error,'')
  denied(f,{type:'playtestSpiritStones',grade},'capacity')
 }
 const f=fixture({contribution:TOWER_RESOURCE_CAP-99999})
 assert.equal(f.store.act({type:'playtestContribution'},0).added,99999)
 assert.equal(f.store.state.contribution,TOWER_RESOURCE_CAP)
 denied(f,{type:'playtestContribution'},'capacity')
})

test('paused grants preserve snapshot and survive checkpoints/settlement without losing high balances',()=>{
 const f=setup();assert.ok(f.store.act({type:'playtestSpiritStones',grade:3},0).ok)
 assert.ok(f.store.act({type:'startFloor',floor:1,seed:123},0).ok)
 denied(f,{type:'playtestSpiritStones',grade:0},'pause-required')
 denied(f,{type:'playtestContribution'},'pause-required')
 denied(f,{type:'playtestMaxLevel'},'in-tower')
 const run=TowerRun.restore(f.store.state.activeRun.snapshot);run.advance(.2);run.pause()
 assert.ok(f.store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok)
 const before=structuredClone(f.store.state.activeRun)
 const money=f.store.state.spiritStones,contribution=f.store.state.contribution
 assert.ok(f.store.act({type:'playtestSpiritStones',grade:3},0).ok)
 assert.ok(f.store.act({type:'playtestContribution'},0).ok)
 assert.deepEqual(f.store.state.activeRun.snapshot,before.snapshot)
 assert.equal(f.store.state.activeRun.base.spiritStones,before.base.spiritStones+999000000)
 assert.equal(f.store.state.activeRun.base.contribution,before.base.contribution+99999)
 assert.ok(validateTowerSnapshot(f.store.state.activeRun.snapshot))
 denied(f,{type:'playtestMaxLevel'},'in-tower')
 assert.equal(new TowerCampaignStore(f.adapter,0).error,'')
 assert.ok(f.store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok)
 assert.equal(f.store.state.spiritStones,money+999000000)
 assert.equal(f.store.state.contribution,contribution+99999)
 run.abandon();assert.ok(f.store.act({type:'finishFloor',snapshot:run.snapshot()},0).ok)
 assert.equal(f.store.state.spiritStones,money+999000000)
 assert.equal(f.store.state.lastResult.earned.spiritStones,0,'debug grant is not battle loot')
 assert.equal(f.store.state.lastResult.earned.contribution,0)
 assert.equal(f.storage.getItem(TOWER_CAMPAIGN_KEY),f.normalRaw)
})

test('camp max level follows official XP/SP and camp health semantics, with no fake clear or research',()=>{
 const f=fixture({xp:50,hp:12.5,skills:{sj_arc:2}}),before=f.store.state
 const result=f.store.act({type:'playtestMaxLevel'},0)
 assert.equal(result.ok,true);assert.equal(f.store.state.xp,TOWER_XP_CAP)
 assert.equal(cultivationAt(f.store.state.xp).level,30)
 assert.equal(f.store.state.hp,before.hp)
 assert.deepEqual(f.store.state.skills,before.skills)
 assert.equal(f.store.state.clearedFloor,0);assert.equal(f.store.state.researchPurchases,0)
 assert.deepEqual(growthSummary(f.store.state),{total:35,spent:1,available:34,realm:35,firstClear:0,research:0,cap:35})
 const capped=structuredClone(f.store.state)
 assert.equal(f.store.act({type:'playtestMaxLevel'},0).gained,0)
 assert.deepEqual(f.store.state,capped)
 assert.deepEqual(new TowerCampaignStore(f.adapter,0).state,capped)
 const bonus=fixture({playtestSkillPoints:999})
 assert.ok(bonus.store.act({type:'playtestMaxLevel'},0).ok)
 assert.equal(bonus.store.state.playtestSkillPoints,999,'level action does not invent or rebase the separate SP tool')
})

for(const action of actions){
 test(`${action.type}/${action.grade??''} is atomic on storage failure and stale writes`,()=>{
  const f=setup(),stale=new TowerCampaignStore(f.adapter,0)
  assert.ok(f.store.act({type:'buyPill',id:'huichun',count:1},0).ok)
  const staleState=stale.state
  assert.deepEqual(stale.act(action,0),{ok:false,reason:'stale-save'})
  assert.strictEqual(stale.state,staleState)
  const set=f.storage.setItem;f.storage.setItem=()=>{throw Error('write failure')}
  denied(f,action,'save-failed');f.storage.setItem=set
  const get=f.storage.getItem;f.storage.getItem=()=>{throw Error('read failure')}
  denied(f,action,'save-failed');f.storage.getItem=get
  assert.ok(f.store.act(action,0).ok)
  assert.deepEqual(new TowerCampaignStore(f.adapter,0).state,f.store.state)
  assert.equal(f.storage.getItem(TOWER_CAMPAIGN_KEY),f.normalRaw)
 })
}

test('real first-clear rewards preserve elevated wallets and saturate safely at the trial cap',()=>{
 for(const initial of [999000000,PLAYTEST_STONE_CAP-1]){
  const f=fixture({spiritStones:initial})
  const start=f.store.act({type:'startFloor',floor:1,seed:123},0)
  assert.equal(start.ok,true)
  const run=TowerRun.restore(start.snapshot);run.setPlaytestAssist(true)
  // Resolve actual spawned enemies and the normal wave/clear ledger.
  for(let steps=0;steps<12000&&run.state.phase==='playing';steps++){
   for(const enemy of run.state.enemies)if(enemy.hp>0)run._damageEnemy({target:enemy.id,damage:enemy.hp,direct:false,scaled:true,source:'test'})
   run.advance(.1)
  }
  assert.equal(run.state.phase,'won');assert.ok(validateTowerSnapshot(run.snapshot()))
  const result=f.store.act({type:'finishFloor',snapshot:run.snapshot()},0)
  assert.equal(result.ok,true);assert.equal(result.firstClear,true)
  const credited=Math.min(run.state.earned.cores*10+(FIRST_CLEAR_REWARDS[0].kind==='spiritStones'?FIRST_CLEAR_REWARDS[0].amount:0),PLAYTEST_STONE_CAP-initial)
  assert.equal(f.store.state.spiritStones,initial+credited)
  assert.equal(result.earned.spiritStones,credited)
  assert.deepEqual(new TowerCampaignStore(f.adapter,0).state,f.store.state)
  assert.equal(f.storage.getItem(TOWER_CAMPAIGN_KEY),f.normalRaw)
 }
})
