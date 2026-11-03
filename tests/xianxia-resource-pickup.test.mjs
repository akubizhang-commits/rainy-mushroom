import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { spawnPickups, tickPickups, validPickups, pickupRewards, pendingCoreValue, collectedMaterials, collectAllPickups } from '../js/xianxia/TowerPickups.js'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'
import { legacyRewardToStones } from '../js/xianxia/TowerEconomy.js'
import { GROWTH_SKILLS } from '../js/xianxia/TowerGrowth.js'

const loadout={active:{sj_wanjian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}
const make=()=>new TowerRun({attemptId:1,floor:1,seed:123,hp:100,xp:0,loadout})
function firstDrop(){
 const run=make();run.setPlaytestAssist(true)
 for(let i=0;i<80000&&!run.state.drops.some(d=>d.kind==='core');i++){
  for(const e of run.state.enemies){e.x=run.state.player.x+60;e.y=run.state.player.y}
  run.advance(1/60)
 }
 assert.ok(run.state.drops.some(d=>d.kind==='core'))
 return run
}
test('new runs keep conserved pickup receipts and enforce landing delay before attraction',()=>{
 const run=firstDrop(),s=run.state,d=s.drops.find(d=>d.kind==='core')
 assert.equal(s.pickups?.version,1)
 s.player.x=d.x;s.player.y=d.y
 run._drops()
 assert.ok(s.drops.includes(d),'cannot vanish in the kill frame')
 s.time=d.readyAt-0.001;run._drops();assert.ok(s.drops.includes(d))
 s.time=d.readyAt;run._drops();assert.equal(s.drops.includes(d),false)
 assert.ok(s.pickups.collected.length>0)
})
test('distant drops have no timeout; flight is gradual and exact radius is 100',()=>{
 const run=firstDrop(),s=run.state,d=s.drops.find(d=>d.kind==='core')
 s.time+=60;s.player.x=d.x-100.001;s.player.y=d.y
 run._drops();assert.ok(s.drops.includes(d));assert.equal(d.attracting,false)
 s.player.x=d.x-100;const before=d.x;run._drops()
 assert.ok(d.x<before&&d.x>s.player.x);assert.equal(d.attracting,true)
 for(let i=0;i<60;i++)run._drops()
 assert.ok(!s.drops.includes(d))
})
test('save/load conserves ground receipts, rejects duplication and departure collects all',()=>{
 const run=firstDrop();run.pause()
 const saved=run.snapshot();assert.ok(saved.pickups)
 assert.ok(validateTowerSnapshot(saved))
 const resumed=TowerRun.restore(saved);resumed.advance(60)
 assert.deepEqual(resumed.snapshot(),saved)
 for(const mutate of [
  s=>s.drops.push(structuredClone(s.drops.find(d=>d.kind==='core'))),
  s=>s.drops.splice(s.drops.findIndex(d=>d.kind==='core'),1),
  s=>s.pickups.collected.push('forged'),
  s=>s.drops.find(d=>d.kind==='core').amount++,
 ]){
  const corrupt=structuredClone(saved);mutate(corrupt);assert.equal(validateTowerSnapshot(corrupt),false)
 }
 resumed.abandon()
 assert.equal(resumed.state.drops.filter(d=>d.receipts).length,0)
 assert.ok(resumed.state.pickups.collected.length>0)
 assert.ok(validateTowerSnapshot(resumed.snapshot()))
 assert.deepEqual(resumed.state.earned,saved.earned)
})

function dropFixture(){
 const state={time:0,floor:2,phase:'playing',loot:{seed:7},player:{x:0,y:0,hp:100},
  pickups:{version:1,forgePity:{fa:4,bao:0,ling:0},collected:[]},killLedger:[],drops:[],effects:[]}
 let id=0
 return {state,_id:()=>`test-${++id}`,_effect:(kind,x,y,radius,extra)=>state.effects.push({kind,x,y,radius,...extra})}
}
test('Ning Shen levels use 120/135/150 center distances; flight stays latched outside radius',()=>{
 const bonuses=GROWTH_SKILLS.find(s=>s.id==='sj_spirit').pickup_bonus
 for(const [i,bonus] of bonuses.entries()){
  const run=dropFixture(),s=run.state
  s.killLedger.push({id:'one',wave:1,archetype:'boar_normal',coreRank:1});spawnPickups(run,{x:0,y:0})
  const d=s.drops.find(d=>d.kind==='core'),radius=[120,135,150][i];s.time=1;s.player.x=-radius-.01
  tickPickups(run,1/60,bonus);assert.equal(d.attracting,false)
  s.player.x=-radius;tickPickups(run,1/60,bonus);assert.equal(d.attracting,true)
  const x=d.x;s.player.x=-500;tickPickups(run,1/60,bonus);assert.ok(d.x<x)
 }
})
test('same nearby type merges quantities and rare Boss pity produces a real material drop',()=>{
 const run=dropFixture(),s=run.state
 for(const id of ['a','b']){
  s.killLedger.push({id,wave:1,archetype:'boar_elite',coreRank:1});spawnPickups(run,{x:0,y:0})
 }
 const stone=s.drops.filter(d=>d.kind==='core')
 assert.equal(stone.length,1);assert.equal(stone[0].receipts.length,2)
 assert.ok(s.drops.some(d=>d.kind==='material'&&d.amount>=4))
 s.killLedger.push({id:'boss',wave:20,archetype:'boar_boss',coreRank:1})
 spawnPickups(run,{x:200,y:0})
 assert.ok(s.drops.some(d=>d.itemId==='forge_core_fa'))
 assert.ok(validPickups(s));assert.equal(collectedMaterials(s).length,0)
 const total=pickupRewards(s).filter(r=>r.kind==='material').reduce((n,r)=>n+r.amount,0)
 s.player.hp=0;s.phase='lost';collectAllPickups(run)
 assert.equal(collectedMaterials(s).length,total);assert.ok(validPickups(s));assert.equal(pendingCoreValue(s),0)
})
test('Campaign credits arrivals once, restores pending drops, and failed writes remain atomic',()=>{
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
 let store=new TowerCampaignStore(disk,0)
 const result=store.act({type:'startFloor',floor:1,seed:123},0);assert.ok(result.ok,result.reason)
 const run=TowerRun.restore(result.snapshot),base=store.state.spiritStones,basePills={...store.state.pills}
 run.setPlaytestAssist(true)
 for(let i=0;i<80000&&!(run.state.drops.some(d=>d.kind==='core')&&run.state.drops.some(d=>d.kind==='material'));i++){
  for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=run.state.time+10}
  run.advance(1/60)
 }
 assert.ok(run.state.drops.some(d=>d.kind==='material'))
 const snapshot=run.snapshot(),action={type:'checkpoint',snapshot}
 assert.ok(validateTowerSnapshot(snapshot))
 const before=store.state,raw=disk.raw;disk.fail=true
 assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before);assert.equal(disk.raw,raw)
 disk.fail=false;assert.ok(store.act(action,0).ok)
 assert.equal(store.state.spiritStones,base+legacyRewardToStones(snapshot.earned.cores-pendingCoreValue(snapshot)))
 const awarded=JSON.stringify(store.state.pills);assert.ok(store.act(action,0).ok);assert.equal(JSON.stringify(store.state.pills),awarded)
 store=new TowerCampaignStore(disk,0);assert.deepEqual(store.state.activeRun.snapshot,snapshot)
 const resumed=TowerRun.restore(store.state.activeRun.snapshot);resumed.abandon()
 const finish={type:'finishFloor',snapshot:resumed.snapshot()}
 assert.ok(store.act(finish,0).ok)
 assert.equal(store.state.spiritStones,base+legacyRewardToStones(snapshot.earned.cores))
 const totals={}
 for(const r of pickupRewards(snapshot).filter(r=>r.kind==='material'))totals[r.itemId]=(totals[r.itemId]||0)+r.amount
 for(const [id,total] of Object.entries(totals))assert.equal(store.state.pills[id],basePills[id]+total)
 const after=store.state;assert.equal(store.act(finish,0).ok,false);assert.equal(store.state,after)
})

test('same-origin material stacks even when a core drop changes the visual scatter order',()=>{
 const run=dropFixture(),s=run.state
 let itemId
 for(const [id,coreRank] of [['a',0],['b',1]]){
  s.killLedger.push({id,wave:1,archetype:'boar_elite',coreRank});spawnPickups(run,{x:0,y:0})
  itemId??=s.drops.find(d=>d.kind==='material').itemId
 }
 const main=s.drops.filter(d=>d.itemId===itemId)
 assert.equal(main.length,1);assert.equal(main[0].amount,4)
})

test('real lost-phase transition sweeps pending rewards even with zero HP',()=>{
 const run=firstDrop(),total=pickupRewards(run.state).length
 run.state.player.hp=0;run.advance(1/60)
 assert.equal(run.state.phase,'lost')
 assert.equal(run.state.pickups.collected.length,total)
 assert.equal(run.state.drops.filter(d=>d.receipts).length,0)
 assert.ok(validateTowerSnapshot(run.snapshot()))
})
