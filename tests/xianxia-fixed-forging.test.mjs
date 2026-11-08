import test from 'node:test'
import assert from 'node:assert/strict'
import * as forging from '../js/xianxia/TowerForging.js'
import * as loot from '../js/xianxia/TowerMaterialLoot.js'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {FORGE_MATERIALS} from '../js/xianxia/TowerForgeMaterials.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
function fixture(patch={}){
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('disk full');this.raw=v}}
 const initial=new TowerCampaignStore(disk,0);initial.act({type:'sync'},0)
 const envelope=JSON.parse(disk.raw),data=JSON.stringify({...initial.state,xp:225,spiritStones:100000,contribution:100000,...patch,pills:{...initial.state.pills,...Object.fromEntries(Object.keys(FORGE_MATERIALS).map(id=>[id,10000])),...patch.pills}})
 disk.raw=JSON.stringify({...envelope,data,checksum:checksum(data)})
 return {store:new TowerCampaignStore(disk,0),disk}
}
test('quality pools include all 85 identities exactly once including the second shop weapon',()=>{
 assert.equal(forging.FORGING_RECIPES.length,40)
 const ids=forging.FORGING_RECIPES.flatMap(r=>r.definitionIds)
 assert.equal(ids.length,85);assert.equal(new Set(ids).size,85)
 assert.equal(forging.forgingRecipe('weapon:fan:q2').source,'shopOnly')
 assert.equal(forging.forgingRecipe('weapon:fan:q3'),null)
 assert.equal(forging.forgingRecipe('weapon:fa:q4').definitionIds.length,2)
})
test('every forge uses the base pool even after repeated misses',()=>{
 for(const r of forging.FORGING_RECIPES){
  for(let i=0;i<6;i++)assert.equal(forging.rollForgedGear(r.id,'repeat-'+i,0,{targetId:r.definitionIds.at(-1),misses:2}).item.definitionId,r.definitionIds[0])
  r.definitionIds.forEach((id,i)=>assert.equal(forging.rollForgedGear(r.id,'sample',(i+.5)/r.definitionIds.length).item.definitionId,id))
 }
 assert.throws(()=>forging.rollForgedGear('weapon:fa:q1','bad',1),RangeError)
})
test('transaction batch is atomic, reproducible on retry, deduplicated and persists random state',()=>{
 const {store,disk}=fixture(),r=forging.forgingRecipe('weapon:fa:q1'),targetId=r.definitionIds.at(-1)
 const action={type:'craftGear',id:r.id,count:3,sequence:1,requestId:'batch'},before=store.state
 disk.fail=true;assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before)
 disk.fail=false;const result=store.act(action,0);assert.equal(result.ok,true)
 assert.equal(result.ids.length,3)
 assert.equal(store.state.pills.forge_xuantie,before.pills.forge_xuantie-6)
 const after=store.state
 assert.equal(store.act(action,0).duplicate,true);assert.deepEqual(store.state,after)
 const reload=new TowerCampaignStore(disk,0)
 assert.equal(reload.readOnly,false);assert.equal(reload.state.forgeRng,store.state.forgeRng)
 assert.equal(reload.act(action,0).duplicate,true)
 assert.equal(reload.act({...action,count:1},0).reason,'request-conflict')
})
test('only fan can be bought; old draw actions cannot bypass material cost',()=>{
 const {store}=fixture()
 for(const type of ['drawForge','drawWeapon','drawEquipment']){
  const before=store.state
  assert.equal(store.act({type,category:'weapon',tier:'fa',count:1},0).ok,false)
  assert.equal(store.state,before)
 }
 assert.equal(store.act({type:'buyGear',id:'weapon:fa:q4',count:1,sequence:1,requestId:'top'},0).reason,'invalid-source')
 assert.equal(store.act({type:'buyGear',id:'weapon:fan:q1',count:1,sequence:1,requestId:'fan'},0).ok,true)
})
test('forging cost ladder and dismantle cannot generate contribution',()=>{
 for(const tier of ['fa','bao','ling'])for(const category of ['weapon','armor','ring']){
  const rows=[1,2,3,4].map(q=>forging.forgingRecipe(`${category}:${tier}:q${q}`))
  assert.ok(rows.every(r=>r.contribution===0));assert.ok(rows.every((r,i)=>!i||r.spiritStones>rows[i-1].spiritStones))
  assert.equal(rows[3].ingredients.find(x=>x.id===`forge_core_${tier}`).count,tier==='ling'?2:1)
 }
 for(const r of forging.FORGING_RECIPES)assert.equal(r.contribution,0)
})
test('rare boss pity is tier-specific, fifth kill guarantees and training never progresses',()=>{
 assert.equal(typeof loot.rareForgeDrops,'function')
 const snapshot={floor:2,loot:{seed:76},killLedger:[{id:'boss',wave:20,archetype:'boar_boss'}]}
 const pity={fa:4,bao:2,ling:0}
 const result=loot.rareForgeDrops(snapshot,0,pity)
 assert.deepEqual(result.drops,['forge_core_fa']);assert.deepEqual(result.pity,{fa:0,bao:2,ling:0})
 assert.deepEqual(pity,{fa:4,bao:2,ling:0})
 assert.deepEqual(loot.rareForgeDrops(snapshot,1,pity),{drops:[],pity})
 assert.deepEqual(loot.rareForgeDrops({...snapshot,training:true},0,pity),{drops:[],pity})
 assert.deepEqual(loot.rareForgeDrops({...snapshot,floor:1},0,pity),{drops:[],pity})
})
test('rare material checkpoint partition does not change outcomes or counts',()=>{
 const snapshot={floor:7,loot:{seed:9},killLedger:Array.from({length:20},(_,i)=>({id:'boss-'+i,wave:i+1,archetype:'boar_boss'}))}
 const initial={fa:0,bao:0,ling:0},whole=loot.rareForgeDrops(snapshot,0,initial)
 const part=loot.rareForgeDrops({...snapshot,killLedger:snapshot.killLedger.slice(0,7)},0,initial)
 const rest=loot.rareForgeDrops(snapshot,7,part.pity)
 assert.deepEqual([...part.drops,...rest.drops],whole.drops);assert.deepEqual(rest.pity,whole.pity)
 assert.ok(whole.drops.length>=4)
})
test('Boss rare reward survives checkpoint reload and settlement without duplicate grant',()=>{
 // Accelerated enemy fixture exercises transaction plumbing, not difficulty.
 const {store,disk}=fixture({clearedFloor:1,forgeBossPity:{fa:4,bao:0,ling:0}})
 assert.equal(store.act({type:'startFloor',floor:2,seed:91},0).ok,true)
 const run=TowerRun.restore(store.state.activeRun.snapshot);run.resume()
 for(let i=0;i<100000&&run.state.phase==='playing';i++){
  run.state.player.hp=run.state.player.maxHp
  for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=run.state.time+10}
  run.advance(1/30)
 }
 assert.equal(run.state.phase,'won');const snapshot=run.snapshot()
 assert.equal(validateTowerSnapshot(snapshot),true)
 const action={type:'checkpoint',snapshot},before=store.state,amount=before.pills.forge_core_fa
 disk.fail=true;assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before)
 disk.fail=false;assert.equal(store.act(action,0).ok,true)
 assert.equal(store.state.pills.forge_core_fa,amount+1);assert.equal(store.state.forgeBossPity.fa,0)
 const reload=new TowerCampaignStore(disk,0);assert.equal(reload.readOnly,false)
 assert.equal(reload.act(action,0).ok,true);assert.equal(reload.state.pills.forge_core_fa,amount+1)
 assert.equal(reload.act({type:'finishFloor',snapshot},0).ok,true)
 assert.equal(reload.state.pills.forge_core_fa,amount+2,'one boss drop plus one first-clear reward')
 assert.deepEqual(reload.state.lastResult.materials.find(r=>r.id==='forge_core_fa'),{id:'forge_core_fa',count:2})
 assert.equal(reload.act({type:'finishFloor',snapshot},0).reason,'wrong-attempt')
})
test('removed wish action is rejected without changing state or disk',()=>{
 const {store,disk}=fixture(),before=store.state,raw=disk.raw
 assert.equal('forgeWishes' in before,false)
 assert.equal(store.act({type:'setForgeWish',id:'weapon:fa:q1',targetId:'eq_sword_guiyan'},0).reason,'unknown-action')
 assert.equal(store.state,before);assert.equal(disk.raw,raw)
})

test('only top quality uses 70/30 weights, with exact sampling boundaries',()=>{
 for(const r of forging.FORGING_RECIPES){
  if(r.quality===4){
   assert.deepEqual(r.weights,[7,3])
   assert.equal(forging.rollForgedGear(r.id,'below',.7-Number.EPSILON).item.definitionId,r.definitionIds[0])
   assert.equal(forging.rollForgedGear(r.id,'boundary',.7).item.definitionId,r.definitionIds[1])
   const counts=new Map(r.definitionIds.map(id=>[id,0]))
   for(let i=0;i<1000;i++){const id=forging.rollForgedGear(r.id,'sample',(i+.5)/1000).item.definitionId;counts.set(id,counts.get(id)+1)}
   assert.deepEqual([...counts.values()],[700,300])
  }else{
   assert.deepEqual(r.weights,r.definitionIds.map(()=>1))
   r.definitionIds.forEach((id,i)=>assert.equal(forging.rollForgedGear(r.id,'sample',(i+.5)/r.definitionIds.length).item.definitionId,id))
  }
 }
})
test('fa supreme fee is entirely stones and uses the approved stage-accessible ingredients',()=>{
 for(const category of ['weapon','armor','ring']){
  const r=forging.forgingRecipe(`${category}:fa:q4`)
  assert.equal(r.contribution,0);assert.equal(r.spiritStones,1200)
  assert.deepEqual(r.ingredients.slice(0,3).map(x=>x.count),[32,16,16])
  assert.equal(r.ingredients.find(x=>x.id==='forge_hanjingsha').count,28)
  assert.equal(r.ingredients.find(x=>x.id==='forge_core_fa').count,1)
 }
})
