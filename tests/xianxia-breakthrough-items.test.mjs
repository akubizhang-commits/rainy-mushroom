import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'
import { CAMP_PILLS } from '../js/xianxia/TowerProfile.js'
import { STONE_CAP } from '../js/xianxia/TowerEconomy.js'
import { checksum } from '../js/xianxia/Checksum.js'
import { breakthroughDrops } from '../js/xianxia/TowerBreakthroughLoot.js'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'
function fixture(patch={}) {
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error();this.raw=v}}
 const base=new TowerCampaignStore(disk,0);base.act({type:'sync'},0)
 const env=JSON.parse(disk.raw),data=JSON.stringify({...base.state,...patch,pills:{...base.state.pills,...patch.pills}})
 disk.raw=JSON.stringify({...env,data,checksum:checksum(data)})
 const store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false);assert.equal(store.state.xp,patch.xp||0)
 return {store,disk}
}
for(const [id,item] of Object.entries(CAMP_PILLS).filter(([,i])=>i.successChance)) {
 test(`${id}: success and failure preserve HP; only correct full realm consumes`,()=>{
  const undo=(v,n,left)=>{let x=v;for(let i=0;i<32;i++)x=v^(left?x<<n:x>>>n);return x>>>0}
  for(const success of [true,false]){
   const output=success?1:0xffffffff,rng=undo(undo(undo(output,5,true),17,false),13,true)
   const {store}=fixture({xp:item.gate,breakthroughRng:rng,pills:{[id]:2}})
   const hp=store.state.hp,forge=store.state.rng
   assert.equal(store.act({type:'usePill',id},0).success,success)
   assert.equal(store.state.xp,item.gate+Number(success));assert.equal(store.state.hp,hp)
   assert.equal(store.state.rng,forge);assert.equal(store.state.pills[id],1)
  }
  const {store}=fixture({xp:item.gate-1,pills:{[id]:1}}),before=store.state
  assert.equal(store.act({type:'usePill',id},0).ok,false);assert.equal(store.state,before)
 })
}
test('shop prices and foundation purchase gate; materials cannot be purchased',()=>{
 const {store}=fixture({contribution:1000})
 assert.equal(store.act({type:'buyPill',id:'ningyuan',count:1},0).cost,120)
 assert.equal(store.act({type:'buyPill',id:'ningdan',count:1},0).reason,'realm-locked')
 assert.equal(store.act({type:'buyPill',id:'xiaoyue',count:1},0).reason,'drop-only')
 const next=fixture({xp:1801,contribution:1000}).store
 assert.equal(next.act({type:'buyPill',id:'ningdan',count:1},0).cost,120)
 assert.equal(next.act({type:'buyPill',id:'jiuzhuan',count:1},0).cost,220)
})
test('selling stock is atomic, persists, and rejects invalid counts and insufficient stock',()=>{
 const {store,disk}=fixture({pills:{xiaoyue:3,chilin:2}}),before=store.state
 const action={type:'sellMaterial',id:'xiaoyue',count:2}
 disk.fail=true;assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before)
 disk.fail=false;assert.equal(store.act(action,0).gained,160)
 assert.equal(store.state.pills.xiaoyue,1);assert.equal(store.state.spiritStones,before.spiritStones+160)
 assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
 for(const count of [0,-1,1.5,2])assert.equal(store.act({...action,count},0).ok,false)
 assert.equal(store.act({type:'sellMaterial',id:'chilin',count:2},0).gained,240)
 assert.equal(store.act({type:'sellMaterial',id:'zhuji',count:1},0).reason,'not-material')
})
test('material drop rolls are deterministic, independent, only actual Boss ledger entries and ~35%',()=>{
 const boss=ARCHETYPES.find(a=>a.role==='boss').id,normal=ARCHETYPES.find(a=>a.role==='normal').id
 for(const floor of [2,5]){
  let count=0
  for(let seed=0;seed<10000;seed++){
   const snapshot={floor,loot:{seed},killLedger:[{wave:20,archetype:boss}]}
   const drops=breakthroughDrops(snapshot);count+=drops.length
   assert.deepEqual(breakthroughDrops({...snapshot,rng:999,player:{xp:14400}}),drops)
   assert.deepEqual(breakthroughDrops(snapshot,1),[])
  }
  assert.ok(count>3300&&count<3700,count)
 }
 assert.deepEqual(breakthroughDrops({floor:2,loot:{seed:1},killLedger:[{wave:20,archetype:normal}]}),[])
 assert.deepEqual(breakthroughDrops({floor:3,loot:{seed:1},killLedger:[{wave:20,archetype:boss}]}),[])
})
test('actual Boss drop checkpoints, reload and final settlement award once; failed writes roll back',async()=>{
 const {TowerRun,validateTowerSnapshot}=await import('../js/xianxia/TowerRun.js')
 for(const [floor,id] of [[2,'xiaoyue'],[5,'chilin']]){
  const boss=ARCHETYPES.find(a=>a.role==='boss').id
  let seed=0;while(!breakthroughDrops({floor,loot:{seed:(seed ^ 0x9e3779b1) >>> 0},killLedger:[{wave:20,archetype:boss}]}).length)seed++
  const {store,disk}=fixture({xp:1800,clearedFloor:floor-1})
  const started=store.act({type:'startFloor',floor,seed},0);assert.equal(started.ok,true)
  const run=TowerRun.restore(started.snapshot);run.setPlaytestAssist(true);run.resume()
  for(let tick=0;tick<80000&&run.state.phase==='playing';tick++){
   for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=99999}
   run.advance(1/60)
  }
  const snapshot=run.snapshot();assert.equal(snapshot.phase,'won',`floor ${floor} wave ${snapshot.wave} kills ${snapshot.killLedger.length}`);assert.equal(validateTowerSnapshot(snapshot),true)
  assert.deepEqual(breakthroughDrops(snapshot),[id])
  const action={type:'checkpoint',snapshot},before=store.state
  disk.fail=true;assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before)
  disk.fail=false;assert.equal(store.act(action,0).ok,true);assert.equal(store.state.pills[id],1)
  assert.equal(store.act(action,0).ok,true);assert.equal(store.state.pills[id],1)
  const reload=new TowerCampaignStore(disk,0)
  assert.equal(reload.act({type:'sellMaterial',id,count:1},0).reason,'in-tower')
  const result=reload.act({type:'finishFloor',snapshot},0);assert.equal(result.ok,true);assert.deepEqual(result.materials.find(row=>row.id===id),{id,count:1});assert.ok(result.materials.some(row=>row.id===(floor<4?'yusuizhi':'zilinghua')&&row.count>=2))
  assert.equal(reload.state.pills[id],1)
  assert.equal(reload.act({type:'finishFloor',snapshot},0).ok,false)
  assert.equal(new TowerCampaignStore(disk,0).state.pills[id],1)
 }
})
test('approved success rates have exact boundaries and failed save preserves roll for all routes',()=>{
 const undo=(v,n,left)=>{let x=v;for(let i=0;i<32;i++)x=v^(left?x<<n:x>>>n);return x>>>0}
 for(const [id,chance] of Object.entries({zhuji:.55,ningyuan:.85,ningdan:.6,jiuzhuan:.85,xiaoyue:.75,chilin:.8})){
  assert.equal(CAMP_PILLS[id].successChance,chance)
  const boundary=Math.ceil(chance*0x100000000)
  for(const output of [boundary-1,boundary]){
   const rng=undo(undo(undo(output,5,true),17,false),13,true)
   const {store,disk}=fixture({xp:CAMP_PILLS[id].gate,breakthroughRng:rng,pills:{[id]:1}})
   const before=store.state,raw=disk.raw,action={type:'usePill',id}
   disk.fail=true;assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before);assert.equal(disk.raw,raw)
   disk.fail=false;assert.equal(store.act(action,0).success,output<boundary)
   assert.equal(store.state.breakthroughRng,output)
  }
 }
})
test('wallet capacity and stale windows cannot destroy or double sell materials',()=>{
 const capped=fixture({spiritStones:STONE_CAP,pills:{xiaoyue:1}}),before=capped.store.state
 assert.equal(capped.store.act({type:'sellMaterial',id:'xiaoyue',count:1},0).reason,'capacity')
 assert.equal(capped.store.state,before)
 const {store,disk}=fixture({pills:{xiaoyue:1}}),stale=new TowerCampaignStore(disk,0)
 const action={type:'sellMaterial',id:'xiaoyue',count:1}
 assert.equal(store.act(action,0).ok,true);assert.equal(stale.act(action,0).reason,'stale-save')
 assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
})
