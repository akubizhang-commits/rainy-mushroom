import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {giftSkills,growthSummary,tutorialProgress} from '../js/xianxia/TowerGrowth.js'
const disk=()=>({raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('disk full');this.raw=v}})
test('new character has only rank-one arc; no milestone changes starter gifts',()=>{
 const store=new TowerCampaignStore(disk(),0)
 assert.deepEqual(store.state.skills,{sj_arc:1})
 assert.deepEqual(combatLoadout(store.state).active,{sj_arc:1})
 for(const counter of [0,1,2,3])assert.deepEqual(giftSkills(counter),{sj_arc:1})
 for(let floor=1;floor<=9;floor++)assert.equal(tutorialProgress(0,floor,[1,8,20]),0)
 assert.equal(growthSummary(store.state).available,0)
})
test('first two floor settlements are atomic and grant no retired first-clear skill points',()=>{
 const storage=disk(),store=new TowerCampaignStore(storage,0)
 for(const floor of [1,1,2]){
  const start=store.act({type:'startFloor',floor,seed:123},0)
  assert.equal(start.ok,true,start.reason)
  const run=TowerRun.restore(start.snapshot);run.setPlaytestAssist(true)
  for(let i=0;i<2400&&run.state.phase==='playing';i++){
   for (const enemy of run.state.enemies) if (enemy.hp > 0) run._damageEnemy({target:enemy.id,damage:1e9,direct:false,scaled:true,source:'fixture'})
   run.advance(.5)
   assert.deepEqual(run.state.loadout.active,{sj_arc:1})
  }
  assert.equal(run.state.phase,'won')
  assert.equal(validateTowerSnapshot(run.snapshot()),true)
  const before=store.state,raw=storage.raw
  storage.fail=true
  assert.equal(store.act({type:'finishFloor',snapshot:run.snapshot()},0).reason,'save-failed')
  assert.equal(store.state,before);assert.equal(storage.raw,raw)
  storage.fail=false
  assert.equal(store.act({type:'finishFloor',snapshot:run.snapshot()},0).ok,true)
  assert.deepEqual(store.state.skills,{sj_arc:1})
  assert.equal(growthSummary(store.state).firstClear,0)
  const after=store.state
  assert.equal(store.act({type:'finishFloor',snapshot:run.snapshot()},0).ok,false)
  assert.equal(store.state,after)
  assert.deepEqual(new TowerCampaignStore(storage,0).state,store.state)
 }
})
test('initialization converts only the initial arc and never grants another point',()=>{
 const store=new TowerCampaignStore(disk(),0)
 assert.equal(store.act({type:'respecSkills'},0).ok,true)
 assert.deepEqual(store.state.skills,{})
 assert.equal(growthSummary(store.state).available,1)
 assert.equal(store.act({type:'respecSkills'},0).ok,true)
 assert.equal(growthSummary(store.state).available,1)
 assert.equal(store.act({type:'learnSkill',id:'sj_yujian'},0).reason,'stage-locked')
 assert.equal(store.act({type:'learnSkill',id:'sj_wanjian'},0).reason,'stage-locked')
 assert.equal(store.act({type:'learnSkill',id:'sj_arc'},0).ok,true)
 assert.deepEqual(store.state.skills,{sj_arc:1})
})
