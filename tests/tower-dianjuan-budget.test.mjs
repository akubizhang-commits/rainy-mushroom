import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {DIANJUAN_DRAW_COST,DIANJUAN_STARTER,FIRST_CLEAR_REWARDS,DIANJUAN_CAMPAIGN_TOTAL} from '../js/xianxia/TowerEconomy.js'

test('nine real floor ledgers yield three ten-pulls plus the starter ten-pull; repeats and failed saves cannot mint more',()=>{
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
 let store=new TowerCampaignStore(disk,0);assert.equal(store.state.contribution,1000);store.act({type:'sync'},0)
 // Only combat progression is accelerated. All currency comes from real reward ledgers.
 const env=JSON.parse(disk.raw),state=JSON.parse(env.data);state.xp=14400;env.data=JSON.stringify(state);env.checksum=checksum(env.data);disk.raw=JSON.stringify(env);store=new TowerCampaignStore(disk,0)
 assert.equal(store.act({type:'playtestResources'},0).ok,false)
 assert.equal(store.act({type:'claimDrawTrial'},0).reason,'trial-retired')
 assert.equal(FIRST_CLEAR_REWARDS.filter(r=>r.kind==='contribution').reduce((n,r)=>n+r.amount,0),DIANJUAN_CAMPAIGN_TOTAL)
 for(const floor of [1,2,3,4,5,6,7,8,9,9]){
  const start=store.act({type:'startFloor',floor,seed:7},0);assert.equal(start.ok,true,start.reason)
  const run=TowerRun.restore(start.snapshot);run.resume();run.advance(1/30)
  for(let frame=0;frame<100000&&['playing','paused'].includes(run.state.phase);frame++){
   run.resume();run.state.player.hp=run.state.player.maxHp
   for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=run.state.time+10}
   run.advance(1/30)
  }
  assert.equal(run.state.phase,'won');const snapshot=run.snapshot();assert.equal(validateTowerSnapshot(snapshot),true);assert.equal(snapshot.earned.contribution,0)
  const before=store.state,raw=disk.raw;disk.fail=true;assert.equal(store.act({type:'finishFloor',snapshot},0).reason,'save-failed');assert.equal(store.state,before);assert.equal(disk.raw,raw);disk.fail=false
  assert.equal(store.act({type:'finishFloor',snapshot},0).ok,true)
  assert.equal(store.state.contribution,DIANJUAN_STARTER+Math.floor(floor/3)*1000)
  const settled=disk.raw;assert.equal(store.act({type:'finishFloor',snapshot},0).ok,false);assert.equal(disk.raw,settled)
  store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false)
 }
 assert.equal(store.state.contribution,40*DIANJUAN_DRAW_COST)
 for(let i=1;i<=4;i++){const r=store.act({type:'drawMixed',tier:'fa',count:10,sequence:i,requestId:'budget-'+i},0);assert.equal(r.ok,true,r.reason);assert.equal(r.rewards.length,10);assert.equal(store.state.contribution,4000-i*1000)}
 assert.equal(store.act({type:'drawMixed',tier:'fa',count:1,sequence:5,requestId:'empty'},0).reason,'insufficient-dianjuan')
 assert.equal(new TowerCampaignStore(disk,0).state.contribution,0)
})

test('ordinary shop pills spend stones and cannot spend or create dianjuan',()=>{
 let raw;const disk={getItem:()=>raw||null,setItem:(_,v)=>{raw=v}}
 const store=new TowerCampaignStore(disk,0),before=store.state
 const r=store.act({type:'buyPill',id:'huichun',count:1},0)
 assert.equal(r.ok,true);assert.equal(store.state.spiritStones,before.spiritStones-r.cost);assert.equal(store.state.contribution,DIANJUAN_STARTER)
 assert.equal(new TowerCampaignStore(disk,0).state.contribution,DIANJUAN_STARTER)
})


test('new game automatically affords exactly one ten-pull, persisted without repeat grants',()=>{
 let raw=null,fail=false;const disk={getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('full');raw=v}}
 let store=new TowerCampaignStore(disk,0)
 assert.equal(store.state.contribution,1000)
 assert.equal(store.act({type:'sync'},0).ok,true)
 store=new TowerCampaignStore(disk,0)
 const action={type:'drawMixed',tier:'fa',count:10,sequence:1,requestId:'starter-ten'}
 const before=store.state,saved=raw;fail=true
 assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before);assert.equal(raw,saved)
 fail=false;const result=store.act(action,0)
 assert.equal(result.ok,true,result.reason);assert.equal(result.rewards.length,10);assert.equal(store.state.contribution,0)
 store=new TowerCampaignStore(disk,0);assert.equal(store.state.contribution,0)
 const consumed=raw,consumedState=structuredClone(store.state);assert.deepEqual(store.act(action,0).rewards,result.rewards);assert.equal(raw,consumed);assert.deepEqual(store.state,consumedState)
 assert.equal(store.act({type:'drawMixed',tier:'fa',count:1,sequence:2,requestId:'extra'},0).reason,'insufficient-dianjuan')
 assert.equal(store.act({type:'sync'},0).ok,true)
 assert.equal(new TowerCampaignStore(disk,0).state.contribution,0)
})
