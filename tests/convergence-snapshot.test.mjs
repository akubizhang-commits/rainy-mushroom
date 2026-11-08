import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {currentCampaignSchema} from './helpers/tower-schema.mjs'
// Build current-schema combat state; the historical recorded fixture predates
// current attributes, equipment and spirit state and remains archived unchanged.
const terminal=()=>{
 const base=new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state
 const state={...base,xp:14400,skills:{sj_arc:1,sj_yujian:10},books:['evo_wanjian'],evolutions:['evo_wanjian'],evolutionRanks:{evo_wanjian:2}}
 const run=new TowerRun({attemptId:1,floor:1,seed:123,xp:14400,hp:100,loadout:combatLoadout(state)})
 run.setPlaytestAssist(true)
 // Clear preceding waves via real damage settlement, then let the scheduler
 // release rain at the last wave before settling its final enemy.
 for(let i=0;i<30000&&run.state.phase==='playing';i++){
  const rain=run.state.zones.some(z=>z.formId==='evo_wanjian')
  if(run.state.wave<20||rain) for(const e of run.state.enemies.filter(e=>e.hp>0))
   run._damageEnemy({target:e.id,damage:1e9,scaled:true,direct:false,source:'fixture'})
  run.advance(1/60)
 }
 assert.equal(run.state.phase,'won')
 return run.snapshot()
}

test('current rank2 convergence victory restores with its remaining rain pulse',()=>{
 const s=terminal();assert.equal(s.phase,'won');assert.equal(s.zones[0].pulseCount,25)
 assert.equal(validateTowerSnapshot(s),true)
 assert.deepEqual(TowerRun.restore(s).snapshot(),s)
 for(const count of [24,26,1000000]){
  const bad=structuredClone(s);bad.zones[0].pulseCount=count;bad.zones[0].hits=count
  bad.zones[0].ticks=count-bad.zones[0].pulseIndex
  assert.equal(validateTowerSnapshot(bad),false,'forged rain length rejected')
 }
})

test('rank2 rain checkpoints atomically, reloads and settles only once',()=>{
 let raw=null,blocked=false
 const disk={getItem:()=>raw,setItem:(_key,value)=>{if(blocked)throw Error('disk full');raw=value}}
 const fresh=new TowerCampaignStore(disk,0)
 const state={...structuredClone(fresh.state),xp:14400,clearedFloor:9,
  skills:{sj_arc:1,sj_yujian:10},books:['evo_wanjian'],evolutions:['evo_wanjian'],evolutionRanks:{evo_wanjian:2}}
 const data=JSON.stringify(state);raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
 let store=new TowerCampaignStore(disk,0)
 assert.equal(store.state.xp,14400)
 const start=store.act({type:'startFloor',floor:1,seed:123},0);assert.equal(start.ok,true)
 const run=TowerRun.restore(start.snapshot)
 for(let i=0;i<3600&&!run.state.zones.some(z=>z.formId==='evo_wanjian');i++)run.advance(1/60)
 assert.ok(run.state.zones.some(z=>z.formId==='evo_wanjian'),'real scheduler releases rain')
 run.pause();const saved=run.snapshot();assert.equal(validateTowerSnapshot(saved),true)
 const before=raw;blocked=true
 assert.equal(store.act({type:'checkpoint',snapshot:saved},0).reason,'save-failed');assert.equal(raw,before)
 blocked=false;assert.equal(store.act({type:'checkpoint',snapshot:saved},0).ok,true)
 store=new TowerCampaignStore(disk,0);assert.deepEqual(store.state.activeRun.snapshot,saved)
 const restored=TowerRun.restore(saved);restored.advance(1);assert.deepEqual(restored.snapshot(),saved)
 restored.abandon();const end=restored.snapshot();assert.ok(end.zones.some(z=>z.formId==='evo_wanjian'))
 assert.equal(store.act({type:'finishFloor',snapshot:end},0).ok,true)
 const settled=raw;assert.equal(store.act({type:'finishFloor',snapshot:end},0).ok,false);assert.equal(raw,settled)
 assert.equal(new TowerCampaignStore(disk,0).state.activeRun,null)
})
