import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {CAMP_PILLS} from '../js/xianxia/TowerProfile.js'
import {MANA_COSTS} from '../js/xianxia/TowerCharacterStats.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`)
function fixture(){const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('disk');this.raw=v}};const store=new TowerCampaignStore(disk,0);store.act({type:'sync'},0);return {store,disk}}
function start(store){const r=store.act({type:'startFloor',floor:1,seed:42},0);assert.equal(r.ok,true);const run=TowerRun.restore(r.snapshot);run.resume();return run}
test('all active costs are intentional integers with differentiated tiers',()=>{assert.ok(new Set(Object.values(MANA_COSTS)).size>=7);for(const cost of Object.values(MANA_COSTS))assert.ok(Number.isInteger(cost)&&cost>=2)})
test('spirit pill is cheap, purchasable and craftable; replay and failed save do not duplicate stock',()=>{const {store,disk}=fixture();assert.equal(CAMP_PILLS.huiling.price,5);const stock=store.state.pills.huiling;assert.equal(store.act({type:'buyPill',id:'huiling',count:2},0).ok,true);assert.equal(store.state.pills.huiling,stock+2);const before=store.state;disk.fail=true;assert.equal(store.act({type:'buyPill',id:'huiling',count:1},0).reason,'save-failed');assert.equal(store.state,before);disk.fail=false;assert.equal(new TowerCampaignStore(disk,0).state.pills.huiling,stock+2)})
test('combat regeneration is slow; only after three peaceful seconds does it accelerate',()=>{const {store}=fixture(),r=start(store),s=r.state;s.player.mana=0;s.base.mana=0;s.spiritState.initialPills=0;r._spawn=()=>{};s.enemies=[];s.pending=[];s.reserved=[];for(let i=0;i<180;i++)r._tick(null);near(s.player.mana,s.player.maxMana*.03*3);r._tick(null);near(s.player.mana,s.player.maxMana*.03*3+s.player.maxMana*.10/60)})
test('zero spirit consumes exactly one pill; immediate plus timed recovery, pause, and restore are deterministic',()=>{const {store}=fixture(),r=start(store),s=r.state;s.player.mana=0;s.base.mana=0;r.advance(1/60);assert.equal(s.spiritState.uses.length,1);near(s.spiritState.uses[0].restored,40);assert.ok(s.player.mana>=40);r.pause();const frozen=r.snapshot();r.advance(30);assert.deepEqual(r.snapshot(),frozen);assert.ok(validateTowerSnapshot(frozen));const a=TowerRun.restore(frozen),b=TowerRun.restore(frozen);a.resume();b.resume();for(let i=0;i<30;i++){a.advance(1/60);b.advance(1/60)}assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(a.state.spiritState.uses.length,1);assert.ok(a.state.spiritState.pillRecovered>40)})
test('leaving a dungeon always fills spirit and persists it',()=>{const {store,disk}=fixture(),r=start(store);for(let i=0;i<100;i++)r.advance(1/60);r.abandon();const out=store.act({type:'finishFloor',snapshot:r.snapshot()},0);assert.equal(out.ok,true);assert.equal(store.state.mana,r.state.player.maxMana);assert.equal(new TowerCampaignStore(disk,0).state.mana,r.state.player.maxMana)})

test('medicine restores exactly 40 immediately plus 40 over ten seconds; no stacking or waste at full',async()=>{
 const {freshSpiritState,tickSpirit,trySpiritPill}=await import('../js/xianxia/TowerSpirit.js')
 const s={ticks:0,time:0,player:{hp:100,mana:0,maxMana:1000,manaRegen:0},manaState:{spent:0,recovered:0},spiritState:freshSpiritState(3),enemies:[],projectiles:[],zones:[]}
 assert.equal(trySpiritPill(s),true);near(s.player.mana,40)
 for(let i=1;i<=600;i++){s.ticks=i;s.time=i/60;tickSpirit(s)}
 near(s.player.mana,80);near(s.spiritState.pillRecovered,80)
 for(let i=601;i<=719;i++){s.ticks=i;s.time=i/60;tickSpirit(s)}
 near(s.player.mana,80);assert.equal(trySpiritPill(s,100),false)
 s.ticks=720;assert.equal(trySpiritPill(s,100),true);assert.equal(s.spiritState.uses.length,2)
 s.ticks=1440;s.player.mana=1000;assert.equal(trySpiritPill(s),false)
 s.player.hp=0;s.player.mana=0;assert.equal(trySpiritPill(s),false)
})
test('auto potion consumption saves atomically, reload and repeated checkpoint cannot refund or double spend',async()=>{
 const {checksum}=await import('../js/xianxia/Checksum.js')
 const {store:base,disk}=fixture();const envelope=JSON.parse(disk.raw),data=JSON.stringify({...base.state,mana:0});disk.raw=JSON.stringify({...envelope,data,checksum:checksum(data)})
 const store=new TowerCampaignStore(disk,0),r=start(store);r.advance(1/60);r.pause();const snapshot=r.snapshot(),before=store.state,raw=disk.raw
 assert.equal(snapshot.spiritState.uses.length,1)
 disk.fail=true;assert.equal(store.act({type:'checkpoint',snapshot},0).reason,'save-failed');assert.equal(store.state,before);assert.equal(disk.raw,raw)
 disk.fail=false;assert.equal(store.act({type:'checkpoint',snapshot},0).ok,true);assert.equal(store.state.pills.huiling,2)
 assert.equal(store.act({type:'checkpoint',snapshot},0).ok,true);assert.equal(store.state.pills.huiling,2)
 const reload=new TowerCampaignStore(disk,0);assert.equal(reload.readOnly,false);assert.equal(reload.state.pills.huiling,2)
 const resumed=TowerRun.restore(reload.state.activeRun.snapshot);resumed.resume();resumed.advance(1/60);assert.equal(resumed.state.spiritState.uses.length,1)
 for(const mutate of [s=>s.spiritState.initialPills++,s=>s.spiritState.uses=[],s=>s.spiritState.uses.push({...s.spiritState.uses[0]}),s=>s.spiritState.pillRecovered+=100,s=>s.spiritState.lastCombatTick=s.ticks+1]){
  const bad=structuredClone(snapshot);mutate(bad);assert.equal(store.act({type:'checkpoint',snapshot:bad},0).ok,false);assert.equal(store.state.pills.huiling,2)
 }
 resumed.abandon();assert.equal(reload.act({type:'finishFloor',snapshot:resumed.snapshot()},0).ok,true);assert.equal(reload.state.pills.huiling,2);assert.equal(reload.state.mana,100)
 assert.equal(reload.act({type:'finishFloor',snapshot:resumed.snapshot()},0).ok,false)
})
test('enemy presence restarts disengagement delay and potion time survives equipment rebasing',async()=>{
 const {freshSpiritState,tickSpirit}=await import('../js/xianxia/TowerSpirit.js')
 const s={ticks:0,time:0,player:{hp:100,mana:0,maxMana:100,manaRegen:3},manaState:{spent:0,recovered:0},spiritState:freshSpiritState(0),enemies:[{hp:1}],projectiles:[],zones:[]}
 for(let i=1;i<=60;i++){s.ticks=i;tickSpirit(s)}near(s.player.mana,3)
 s.enemies=[];for(let i=61;i<=240;i++){s.ticks=i;tickSpirit(s)}near(s.player.mana,12)
 s.ticks=241;tickSpirit(s);near(s.player.mana,12+10/60)
 s.enemies=[{hp:1}];s.ticks=242;tickSpirit(s);near(s.player.mana,12+10/60+3/60)
 const {store}=fixture(),r=start(store);r.state.player.mana=0;r.state.base.mana=0;r.advance(1/60);r.pause();const spirit=structuredClone(r.state.spiritState)
 r.setEquipmentLoadout(r.state.loadout);assert.deepEqual(r.state.spiritState,spirit);assert.ok(validateTowerSnapshot(r.snapshot()))
})
test('pill encyclopedia and inventory describe spirit instead of undefined cultivation',async()=>{
 const {libraryDetails,libraryEntries}=await import('../js/xianxia/TowerLibrary.js')
 const {inventoryEntries,inventoryDescription,inventoryQuote}=await import('../js/xianxia/TowerInventory.js')
 const {store}=fixture(),entry=libraryEntries('pills').find(e=>e.id==='pill_huiling')
 assert.equal(entry.category,'恢复灵力');assert.equal(entry.icon,'tower-stones/pill_huiling')
 const detail=JSON.stringify(libraryDetails('pill_huiling'));assert.match(detail,/自动服用/);assert.match(detail,/3%/);assert.match(detail,/10%/);assert.doesNotMatch(detail,/undefined|修为丹共享/)
 const row=inventoryEntries(store.state).find(e=>e.id==='huiling');assert.match(inventoryDescription(store.state,row).join(''),/自动服用/)
 assert.equal(inventoryQuote(store.state,'huiling','use').ok,false)
})
