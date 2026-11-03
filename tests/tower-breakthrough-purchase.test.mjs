import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {CAMP_PILLS} from '../js/xianxia/TowerProfile.js'
import {STONE_CAP} from '../js/xianxia/TowerEconomy.js'
import {checksum} from '../js/xianxia/Checksum.js'
function fixture({xp=1800,spiritStones=300,rng=1,stock=0}={}){
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
 let store=new TowerCampaignStore(disk,0);store.act({type:'sync'},0)
 const env=JSON.parse(disk.raw),state=JSON.parse(env.data);Object.assign(state,{xp,spiritStones,breakthroughRng:rng});state.pills.zhuji=stock
 env.data=JSON.stringify(state);env.checksum=checksum(env.data);disk.raw=JSON.stringify(env);store=new TowerCampaignStore(disk,0)
 assert.equal(store.readOnly,false);assert.equal(store.act({type:'startFloor',floor:1,seed:7},0).ok,true)
 const attempt=(extra={})=>store.act({type:'breakthrough',attemptId:store.state.activeRun.id,sequence:store.state.activeRun.snapshot.breakthrough.sequence+1,id:xp===1800?'zhuji':'ningdan',buyIfMissing:true,...extra},0)
 return {disk,store,attempt}
}
for(const xp of [1800,6600])test(`shop pill purchase and success at ${xp} is atomic and reloadable`,()=>{
 const {store,disk,attempt}=fixture({xp}),before=store.state,price=CAMP_PILLS[xp===1800?'zhuji':'ningdan'].price
 const r=attempt();assert.equal(r.ok,true,r.reason);assert.equal(r.success,true);assert.equal(r.purchased,true);assert.equal(r.cost,price)
 assert.equal(store.state.spiritStones,before.spiritStones-price);assert.equal(store.state.pills[r.id],0)
 assert.equal(store.state.activeRun.spentSpiritStones,price)
 assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
 const raw=disk.raw;assert.equal(attempt({sequence:1}).ok,false);assert.equal(disk.raw,raw)
 const run=TowerRun.restore(r.snapshot);run.resume();run.advance(.1);run.pause();assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
 assert.equal(store.state.spiritStones,before.spiritStones-price);run.abandon();{const finish=store.act({type:'finishFloor',snapshot:run.snapshot()},0);assert.equal(finish.ok,true,finish.reason)}
 assert.equal(store.state.spiritStones,before.spiritStones-price)
})
test('failure consumes purchased pill once; save failure has no debit, item or RNG mutation',()=>{
 const {store,disk,attempt}=fixture({rng:123456789}),before=store.state,raw=disk.raw;disk.fail=true
 assert.equal(attempt().reason,'save-failed');assert.equal(store.state,before);assert.equal(disk.raw,raw)
 disk.fail=false;const r=attempt();assert.equal(r.ok,true);assert.equal(r.success,false);assert.equal(store.state.spiritStones,240);assert.equal(store.state.xp,1800)
 assert.equal(store.state.hp,before.hp);assert.equal(attempt({sequence:1}).ok,false);assert.equal(store.state.spiritStones,240)
})
test('held pill is consumed without purchase; insufficient balance, wrong gate and non-shop items are rejected',()=>{
 const held=fixture({stock:2});assert.equal(held.attempt().ok,true);assert.equal(held.store.state.spiritStones,300);assert.equal(held.store.state.pills.zhuji,1)
 for(const [options,extra] of [[{spiritStones:59},{}],[{}, {id:'ningyuan'}],[{}, {id:'xiaoyue'}],[{}, {id:'ningdan'}],[{}, {id:'peiyuan'}]]){
  const {store,disk,attempt}=fixture(options),raw=disk.raw,before=store.state
  assert.equal(attempt(extra).ok,false);assert.equal(store.state,before);assert.equal(disk.raw,raw)
 }
 const f=fixture();assert.equal(f.attempt({buyIfMissing:false}).reason,'no-pill')
})
test('purchase after capped battle income does not resurrect discarded spiritStones on checkpoint',()=>{
 const {store,attempt}=fixture({spiritStones:STONE_CAP,rng:123456789})
 const run=TowerRun.restore(store.state.activeRun.snapshot);run.resume();run.requestBreakthrough()
 for(let i=0;i<20000&&run.state.phase==='playing';i++){
  run.state.player.hp=run.state.player.maxHp
  for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+40;e.y=run.state.player.y;e.ai.graceUntil=run.state.time+10}
  run.advance(1/30)
 }
 assert.equal(run.state.phase,'paused');assert.ok(run.state.earned.cores>0)
 assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
 const r=attempt();assert.equal(r.ok,true,r.reason);assert.equal(store.state.spiritStones,STONE_CAP-60)
 assert.equal(store.act({type:'checkpoint',snapshot:r.snapshot},0).ok,true);assert.equal(store.state.spiritStones,STONE_CAP-60)
})
