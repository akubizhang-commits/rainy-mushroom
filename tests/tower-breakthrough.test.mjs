import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY } from '../js/xianxia/TowerCampaign.js'
import { checksum } from '../js/xianxia/Checksum.js'
import { currentCampaignSchema } from './helpers/tower-schema.mjs'
const copy=x=>JSON.parse(JSON.stringify(x))
function fixture(xp=1800,rng=1){
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('disk');this.raw=v}}
 const fresh=new TowerCampaignStore(disk,0), state=copy(fresh.state)
 state.xp=xp;state.breakthroughRng=rng;state.pills.zhuji=5;state.pills.ningdan=5
 const data=JSON.stringify(state);disk.raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
 const store=new TowerCampaignStore(disk,0)
 assert.equal(store.readOnly,false)
 const result=store.act({type:'startFloor',floor:1,seed:7},0);assert.equal(result.ok,true,result.reason)
 return {disk,store,run:TowerRun.restore(result.snapshot)}
}
function clearUntilPause(run){
 for(let n=0;n<100000&&run.state.phase==='playing';n++){
  run.state.player.hp=run.state.player.maxHp
  for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+50;e.y=run.state.player.y;e.ai.graceUntil=run.state.time+10}
  run.advance(1/30)
 }
 assert.equal(validateTowerSnapshot(run.snapshot()),true)
}
function attempt(store,id='zhuji',sequence=1){return store.act({type:'breakthrough',attemptId:store.state.activeRun.id,sequence,id},0)}
test('full cultivation opens a safe entry node without advancing or spawning',()=>{
 const {run}=fixture();assert.equal(run.state.phase,'paused');assert.equal(run.state.breakthrough.safe,true)
 assert.equal(run.state.ticks,0);assert.equal(run.state.enemies.length,0)
 run.resume();run.advance(1/30);run.pause();assert.equal(run.state.breakthrough.safe,false)
})
test('mid-wave cap pauses at cleared wave once; ignoring does not repeatedly interrupt',()=>{
 const {run}=fixture(1799);clearUntilPause(run)
 assert.equal(run.state.phase,'paused');assert.equal(run.state.player.xp,1800)
 assert.ok(run.state.wave>1);assert.equal(run.state.breakthrough.safe,true)
 const wave=run.state.wave;run.resume();clearUntilPause(run)
 assert.equal(run.state.phase,'won');assert.ok(run.state.wave>wave)
})
test('successful breakthrough preserves wave, rewards, timers and survives reload; duplicate cannot spend',()=>{
 const {store,disk}=fixture();const before=copy(store.state.activeRun.snapshot)
 const result=attempt(store);assert.equal(result.ok,true,result.reason);assert.equal(result.success,true)
 assert.equal(store.state.xp,1801);assert.equal(store.state.pills.zhuji,4)
 assert.equal(result.snapshot.player.hp,result.snapshot.player.maxHp)
 for(const key of ['wave','ticks','earned','killLedger','cooldowns','rng','weaponState','armorState'])assert.deepEqual(result.snapshot[key],before[key],key)
 assert.equal(validateTowerSnapshot(result.snapshot),true)
 const raw=disk.raw;attempt(store);assert.equal(disk.raw,raw)
 assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
 const run=TowerRun.restore(result.snapshot);run.resume();clearUntilPause(run)
 assert.equal(run.state.phase,'won');assert.ok(run.state.player.xp>1801)
 const finished=store.act({type:'finishFloor',snapshot:run.snapshot()},0);assert.equal(finished.ok,true,finished.reason)
 assert.equal(finished.earned.xp,run.state.earned.xp);assert.equal(finished.promotionXp,1)
 assert.equal(store.act({type:'finishFloor',snapshot:run.snapshot()},0).ok,false)
})
test('failed breakthrough consumes one item but never heals; failed storage consumes nothing',()=>{
 const {store,disk}=fixture(1800,123456789);const hp=store.state.hp
 const saved=disk.raw;disk.fail=true;assert.equal(attempt(store).reason,'save-failed');assert.equal(disk.raw,saved);assert.equal(store.state.pills.zhuji,5)
 disk.fail=false;const r=attempt(store);assert.equal(r.ok,true,r.reason);assert.equal(r.success,false)
 assert.equal(store.state.xp,1800);assert.equal(store.state.hp,hp);assert.equal(store.state.pills.zhuji,4)
 assert.equal(attempt(store,'zhuji',2).ok,true)
})
test('ordinary paused combat rejects breakthrough and checkpoints cannot forge success',()=>{
 const {store,run}=fixture();run.resume();run.advance(1/30);run.pause()
 assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
 assert.equal(attempt(store).reason,'safe-node-required')
 const fake=run.snapshot();fake.breakthrough.events.push({gate:1800,cursor:0,rawXp:0,wave:1,ticks:0,sequence:1})
 assert.equal(store.act({type:'checkpoint',snapshot:fake},0).ok,false)
})

test('second realm can break through and learn without resetting reward history',()=>{
 const {store}=fixture(6600);const r=attempt(store,'ningdan');assert.equal(r.ok,true,r.reason);assert.equal(r.success,true)
 assert.equal(store.state.xp,6601);assert.equal(validateTowerSnapshot(r.snapshot),true)
 const run=TowerRun.restore(r.snapshot);run.resume();clearUntilPause(run)
 assert.equal(store.act({type:'finishFloor',snapshot:run.snapshot()},0).ok,true)
})
test('no items keeps a usable safe node and another host cannot overwrite a success',()=>{
 const {store,disk}=fixture();const stale=new TowerCampaignStore(disk,0)
 assert.equal(attempt(store).ok,true);assert.equal(attempt(stale).reason,'stale-save')
 assert.equal(new TowerCampaignStore(disk,0).state.xp,1801)
 const {store:other}=fixture();assert.equal(attempt(other,'ningyuan').reason,'no-pill')
 assert.equal(other.state.activeRun.snapshot.breakthrough.safe,true)
})
test('requesting a later safe node does not interrupt the current wave',()=>{
 const {run}=fixture();run.resume();run.advance(1/30);run.requestBreakthrough();assert.equal(run.state.phase,'playing')
 clearUntilPause(run);assert.equal(run.state.phase,'paused');assert.equal(run.state.wave,2)
})

test('a combat checkpoint cannot rewind the current wave into a forged safe node',()=>{
 const {store,run}=fixture();const entry=run.snapshot()
 run.resume();run.advance(1/60);run.pause()
 assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
 const forged=run.snapshot();forged.pending=entry.pending;forged.enemies=[];forged.reserved=[]
 forged.waveStartedAt=forged.time;forged.breakthrough.safe=true
 assert.equal(store.act({type:'checkpoint',snapshot:forged},0).ok,false)
 assert.equal(attempt(store).reason,'safe-node-required')
})
