import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'
import { CAMP_PILLS } from '../js/xianxia/TowerProfile.js'
import { checksum } from '../js/xianxia/Checksum.js'
const fixture=(patch={})=>{const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error();this.raw=v}};const base=new TowerCampaignStore(disk,0);base.act({type:'sync'},0);const env=JSON.parse(disk.raw),data=JSON.stringify({...base.state,clearedFloor:1,...patch,pills:{...base.state.pills,...patch.pills}});disk.raw=JSON.stringify({...env,data,checksum:checksum(data)});const store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false);return{store,disk}}
test('14 pills and 24 unified materials',()=>{assert.equal(Object.values(CAMP_PILLS).filter(p=>!p.material).length,14);assert.equal(Object.values(CAMP_PILLS).filter(p=>p.material).length,24)})
test('craft transaction rejects insufficiency, saves atomically and deduplicates persisted request',()=>{const {store,disk}=fixture({pills:{huichuncao:20,linglu:20}});const action={type:'craftPill',sequence:1,id:'zhixue',count:2,requestId:'a'};const before=store.state;disk.fail=true;assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before);disk.fail=false;assert.equal(store.act(action,0).ok,true);assert.equal(store.state.pills.zhixue,2);assert.equal(store.state.pills.huichuncao,18);const reload=new TowerCampaignStore(disk,0);assert.equal(reload.act(action,0).ok,true);assert.equal(reload.state.pills.zhixue,2);assert.equal(reload.act({...action,requestId:'b',count:99,sequence:2},0).reason,'insufficient-materials')})
test('realm shares six uses and excess stock confirmation does not block better pill',()=>{const {store}=fixture({spiritStones:1000,pills:{yusuizhi:10,lingshenxu:20,linglu:20}});assert.equal(store.act({type:'buyPill',id:'peiyuan',count:6},0).ok,true);assert.equal(store.act({type:'craftPill',id:'ningqi',count:1,sequence:1,requestId:'advanced'},0).reason,'cultivation-stock-confirmation');assert.equal(store.act({type:'craftPill',id:'ningqi',count:1,sequence:1,requestId:'advanced',confirmed:true},0).ok,true);for(const id of ['ningqi','peiyuan','peiyuan','peiyuan','peiyuan','peiyuan'])assert.equal(store.act({type:'usePill',id},0).ok,true);assert.equal(store.state.cultivationPillUses['炼气'],6);assert.equal(store.act({type:'usePill',id:'peiyuan'},0).reason,'cultivation-allowance');assert.equal(store.act({type:'craftPill',id:'ningqi',count:1,sequence:2,requestId:'advanced-again',confirmed:true},0).reason,'cultivation-allowance')})
test('overflow requires confirmation, wrong realm and material reject without consuming',()=>{const {store}=fixture({xp:1780,pills:{ningqi:1,heqi:1,linglu:1}});assert.equal(store.act({type:'usePill',id:'heqi'},0).reason,'wrong-realm');assert.equal(store.act({type:'usePill',id:'linglu'},0).reason,'not-usable');const q=store.act({type:'usePill',id:'ningqi'},0);assert.equal(q.reason,'cultivation-overflow-confirmation');assert.equal(q.gained,20);assert.equal(q.wasted,70);assert.equal(store.state.pills.ningqi,1);assert.equal(store.act({type:'usePill',id:'ningqi',confirmed:true},0).gained,20);assert.equal(store.state.xp,1800)})
test('verified full-floor materials checkpoint atomically, overflow converts only once and final summary persists',async()=>{
 const {TowerRun}=await import('../js/xianxia/TowerRun.js')
 const {materialDrops,materialSummary}=await import('../js/xianxia/TowerMaterialLoot.js')
 const {TOWER_RESOURCE_CAP}=await import('../js/xianxia/TowerProfile.js')
 const {STONE_CAP}=await import('../js/xianxia/TowerEconomy.js')
 for(const fullStones of [false,true]) {
 const materials=Object.fromEntries(Object.entries(CAMP_PILLS).filter(([,p])=>p.material).map(([id])=>[id,TOWER_RESOURCE_CAP]))
 const {store,disk}=fixture({xp:1800,pills:materials,...(fullStones?{spiritStones:STONE_CAP}:{})})
 const started=store.act({type:'startFloor',floor:1,seed:7},0),run=TowerRun.restore(started.snapshot);run.setPlaytestAssist(true);run.resume()
 for(let tick=0;tick<80000&&run.state.phase==='playing';tick++){for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=99999}run.advance(1/60)}
 const snapshot=run.snapshot();assert.equal(snapshot.phase,'won')
 const drops=materialDrops(snapshot),sale=drops.reduce((sum,id)=>sum+CAMP_PILLS[id].sellPrice,0)
 assert.ok(sale>0)
 const before=store.state;disk.fail=true;assert.equal(store.act({type:'checkpoint',snapshot},0).reason,'save-failed');assert.equal(store.state,before);disk.fail=false
 assert.equal(store.act({type:'checkpoint',snapshot},0).ok,true)
 const once=store.state.spiritStones
 assert.equal(store.state.activeRun.materialOverflow.convertedStones,fullStones?0:sale)
 assert.equal(store.state.activeRun.materialOverflow.lostStones,fullStones?sale:0)
 assert.equal(store.act({type:'checkpoint',snapshot},0).ok,true);assert.equal(store.state.spiritStones,once)
 const reload=new TowerCampaignStore(disk,0);assert.equal(reload.readOnly,false)
 const result=reload.act({type:'finishFloor',snapshot},0);assert.equal(result.ok,true);assert.deepEqual(result.materials,materialSummary(drops));assert.equal(result.materialOverflow.convertedStones,fullStones?0:sale)
 assert.equal(new TowerCampaignStore(disk,0).readOnly,false)
 }
})
test('all recipes craft exact batches atomically including 99 furnaces and Boss ingredient use',async()=>{
 const {ALCHEMY_RECIPES,ALCHEMY_MATERIALS,alchemyQuote}=await import('../js/xianxia/TowerAlchemy.js')
 assert.equal(Object.keys(ALCHEMY_RECIPES).length,14)
 for(const [id,recipe] of Object.entries(ALCHEMY_RECIPES)) {
  const pill=CAMP_PILLS[id],xp=pill.realm==='金丹'?6601:pill.realm==='筑基'||pill.minXp===1801?1801:0
  const supplies=Object.fromEntries(Object.keys(ALCHEMY_MATERIALS).map(id=>[id,1000]))
  const {store}=fixture({xp,spiritStones:10000,pills:supplies})
  for(const count of [0,-1,1.5,100,Number.MAX_SAFE_INTEGER,Infinity,NaN,'1'])assert.equal(alchemyQuote(store.state,id,count,true).reason,'invalid-count')
  const quote=alchemyQuote(store.state,id,99,true);assert.equal(quote.ok,true,id)
  const before=store.state
  assert.equal(store.act({type:'craftPill',sequence:1,id,count:99,confirmed:true,requestId:id},0).ok,true,id)
  assert.equal(store.state.pills[id],before.pills[id]+99)
  assert.equal(store.state.spiritStones,before.spiritStones-recipe.spiritStoneCost*99)
  for(const ingredient of recipe.ingredients)assert.equal(store.state.pills[ingredient.id],1000-99*ingredient.count)
  assert.deepEqual(store.state.cultivationPillUses,before.cultivationPillUses)
 }
})
test('craft insufficient money, capacity, invalid request and stale window leave all balances unchanged',async()=>{
 const {TOWER_RESOURCE_CAP}=await import('../js/xianxia/TowerProfile.js')
 for(const [patch,extra,reason] of [
  [{spiritStones:0,pills:{huichuncao:1,linglu:1}},{},'insufficient'],
  [{pills:{zhixue:TOWER_RESOURCE_CAP,huichuncao:1,linglu:1}},{},'capacity'],
  [{pills:{huichuncao:1,linglu:1}},{requestId:''},'invalid-request-id'],
  [{pills:{huichuncao:1,linglu:1}},{id:'__proto__'},'unknown-recipe'],
 ]) {
  const {store,disk}=fixture(patch),before=store.state,raw=disk.raw
  assert.equal(store.act({type:'craftPill',sequence:1,id:'zhixue',count:1,requestId:'a',...extra},0).reason,reason)
  assert.equal(store.state,before);assert.equal(disk.raw,raw)
 }
 const {store,disk}=fixture({pills:{huichuncao:10,linglu:10}}),stale=new TowerCampaignStore(disk,0),action={type:'craftPill',sequence:1,id:'zhixue',count:1,requestId:'a'}
 assert.equal(store.act(action,0).ok,true)
 assert.equal(stale.act(action,0).reason,'stale-save')
 assert.equal(store.act({...action,count:2},0).reason,'request-conflict')
 assert.equal(store.state.pills.zhixue,1)
})
test('healing uses equipped effective HP, clamps, does not revive in tower or increase HP on cultivation',async()=>{
 const {campaignMaxHp}=await import('../js/xianxia/TowerCampaign.js')
 for(const id of ['zhixue','huichun','xuming']) {
  const {store}=fixture({xp:1801,hp:1,pills:{[id]:3,heqi:1}}),max=campaignMaxHp(store.state)
  assert.equal(store.act({type:'usePill',id},0).healed,max*CAMP_PILLS[id].healShare)
  const hp=store.state.hp
  assert.equal(store.act({type:'usePill',id:'heqi'},0).gained,100);assert.equal(store.state.hp,hp)
  assert.equal(store.act({type:'startFloor',floor:1,seed:7},0).ok,true)
  assert.equal(store.act({type:'usePill',id},0).reason,'in-tower')
  assert.equal(store.act({type:'craftPill',sequence:1,id,count:1,requestId:'tower'},0).reason,'in-tower')
 }
 const {store}=fixture({pills:{zhixue:1}})
 assert.equal(store.act({type:'usePill',id:'zhixue'},0).reason,'full-health');assert.equal(store.state.pills.zhixue,1)
})
test('partial inventory space, repeated checkpoints and reload match single settlement on withdrawal',async()=>{
 const {TowerRun}=await import('../js/xianxia/TowerRun.js')
 const {TOWER_RESOURCE_CAP}=await import('../js/xianxia/TowerProfile.js')
 const patch={xp:1800,pills:Object.fromEntries(Object.entries(CAMP_PILLS).filter(([,p])=>p.material).map(([id])=>[id,TOWER_RESOURCE_CAP-1]))}
 const one=fixture(patch),many=fixture(patch)
 const a=one.store.act({type:'startFloor',floor:1,seed:123},0)
 assert.equal(many.store.act({type:'startFloor',floor:1,seed:123},0).ok,true)
 const run=TowerRun.restore(a.snapshot)
 run.setPlaytestAssist(true);run.resume()
 for(let tick=0;tick<15000&&run.state.phase==='playing'&&run.state.wave<12;tick++) {
  for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=99999}
  run.advance(1/60)
  if(tick%50===0){assert.equal(many.store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true);many.store=new TowerCampaignStore(many.disk,0);assert.equal(many.store.readOnly,false)}
 }
 assert.ok(run.state.killLedger.length>0)
 run.abandon()
 const snapshot=run.snapshot(),r1=one.store.act({type:'finishFloor',snapshot},0),r2=many.store.act({type:'finishFloor',snapshot},0)
 assert.equal(r1.ok,true);assert.equal(r2.ok,true)
 assert.deepEqual(one.store.state.pills,many.store.state.pills)
 assert.deepEqual(r1.materials,r2.materials)
 assert.deepEqual(r1.materialOverflow,r2.materialOverflow)
 assert.equal(one.store.state.spiritStones,many.store.state.spiritStones)
 assert.ok(r1.materialOverflow.convertedStones>0)
})
test('craft sequence rejects evicted retries after 65 commits and failed save retries the same sequence',()=>{
 const {store,disk}=fixture({spiritStones:1000,pills:{huichuncao:100,linglu:100}})
 const first={type:'craftPill',sequence:1,id:'zhixue',count:1,requestId:'request-0'}
 for(let i=0;i<65;i++)assert.equal(store.act({...first,requestId:`request-${i}`,sequence:i+1},0).ok,true)
 const reload=new TowerCampaignStore(disk,0),before=reload.state,raw=disk.raw
 assert.equal(reload.act(first,0).reason,'stale-craft-sequence')
 assert.equal(reload.state,before);assert.equal(disk.raw,raw);assert.equal(reload.state.pills.zhixue,65)
 assert.equal(reload.state.craftSequence,65)
 assert.equal(reload.act({...first,requestId:'request-64',sequence:65},0).duplicate,true)
 const next={...first,requestId:'request-65',sequence:66}
 disk.fail=true;assert.equal(reload.act(next,0).reason,'save-failed');assert.equal(reload.state.craftSequence,65)
 disk.fail=false;assert.equal(reload.act(next,0).ok,true);assert.equal(reload.state.craftSequence,66)
 assert.equal(reload.act({...next,sequence:67},0).reason,'request-conflict')
 assert.equal(reload.act({...next,requestId:'gap',sequence:68},0).reason,'stale-craft-sequence')
})
test('craft high-water and receipt suffix are strictly validated and invalid action sequences do not mutate',()=>{
 for(const craftSequence of [undefined,null,-1,.5,'0',1,Number.MAX_SAFE_INTEGER+1]) {
  const f=fixture(),env=JSON.parse(f.disk.raw);env.data=JSON.stringify({...f.store.state,craftSequence});env.checksum=checksum(env.data);f.disk.raw=JSON.stringify(env)
  assert.equal(new TowerCampaignStore(f.disk,0).readOnly,true)
 }
 const {store,disk}=fixture({pills:{huichuncao:3,linglu:3}}),action={type:'craftPill',id:'zhixue',count:1,requestId:'a'}
 for(const sequence of [undefined,null,0,-1,.5,'1',2,Number.MAX_SAFE_INTEGER+1]) {
  const before=store.state,raw=disk.raw
  assert.equal(store.act({...action,sequence},0).reason,'stale-craft-sequence')
  assert.equal(store.state,before);assert.equal(disk.raw,raw)
 }
 assert.equal(store.act({...action,sequence:1},0).ok,true)
 const env=JSON.parse(disk.raw),bad={...store.state,craftSequence:0};env.data=JSON.stringify(bad);env.checksum=checksum(env.data);disk.raw=JSON.stringify(env)
 assert.equal(new TowerCampaignStore(disk,0).readOnly,true)
})
