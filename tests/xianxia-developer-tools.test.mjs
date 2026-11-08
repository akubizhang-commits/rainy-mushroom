import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY,PLAYTEST_STONE_CAP,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {towerStorage} from '../js/xianxia/TowerPlaytest.js'
import {cultivationAt,TOWER_RESOURCE_CAP} from '../js/xianxia/TowerProfile.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {checksum} from '../js/xianxia/Checksum.js'
function fixture(patch={}) {
 const records=new Map(),disk={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)}
 const adapter=towerStorage(disk);let store=new TowerCampaignStore(adapter,0)
 store.act({type:'sync'},0)
 const envelope=JSON.parse(disk.getItem(TOWER_CAMPAIGN_KEY))
 envelope.data=JSON.stringify({...store.state,...patch});envelope.checksum=checksum(envelope.data)
 disk.setItem(TOWER_CAMPAIGN_KEY,JSON.stringify(envelope));store=new TowerCampaignStore(adapter,0)
 assert.equal(store.error,'')
 return {disk,adapter,store}
}
test('combined developer supplies add both resources in one repeatable save',()=>{
 const {store,adapter}=fixture(),before=store.state
 for(let i=1;i<=2;i++){
  assert.equal(store.act({type:'playtestResources'},0).ok,true)
  assert.equal(store.state.spiritStones,before.spiritStones+i*999000000)
  assert.equal(store.state.contribution,before.contribution+i*999)
 }
 assert.deepEqual(new TowerCampaignStore(adapter,0).state,store.state)
})
test('combined grants reject either resource cap without partial credits',()=>{
 for(const patch of [{spiritStones:PLAYTEST_STONE_CAP},{contribution:TOWER_RESOURCE_CAP}]){
  const {store,disk}=fixture(patch),before=store.state,raw=disk.getItem(TOWER_CAMPAIGN_KEY)
  assert.equal(store.act({type:'playtestResources'},0).reason,'capacity')
  assert.strictEqual(store.state,before);assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY),raw)
 }
})
test('each stage press advances exactly one level through all realms',()=>{
 const {store,adapter}=fixture({hp:31})
 for(let level=2;level<=30;level++){
  const result=store.act({type:'playtestNextStage'},0)
  assert.equal(result.ok,true);assert.equal(cultivationAt(store.state.xp).level,level)
  assert.equal(store.state.hp,31);assert.equal(store.state.playtestSkillPoints,undefined)
  assert.equal(store.state.clearedFloor,0)
  assert.deepEqual(new TowerCampaignStore(adapter,0).state,store.state)
 }
 const before=store.state
 assert.equal(store.act({type:'playtestNextStage'},0).reason,'cultivation-capped')
 assert.strictEqual(store.state,before)
})
test('developer actions remain atomic on write failure',()=>{
 for(const type of ['playtestResources','playtestNextStage']){
  const {store,disk}=fixture(),before=store.state,raw=disk.getItem(TOWER_CAMPAIGN_KEY)
  disk.setItem=()=>{throw Error('quota')}
  assert.equal(store.act({type},0).reason,'save-failed')
  assert.strictEqual(store.state,before);assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY),raw)
 }
})
test('paused stage and supply changes survive resume and settlement without becoming loot',()=>{
 const {store,adapter}=fixture()
 store.act({type:'startFloor',floor:1,seed:123},0)
 assert.equal(store.act({type:'playtestNextStage'},0).reason,'pause-required')
 let run=TowerRun.restore(store.state.activeRun.snapshot);run.advance(1);run.pause()
 assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
 const rewards=structuredClone(run.state.earned),before=store.state
 assert.equal(store.act({type:'playtestNextStage'},0).ok,true)
 assert.equal(store.act({type:'playtestResources'},0).ok,true)
 assert.ok(validateTowerSnapshot(store.state.activeRun.snapshot))
 assert.deepEqual(store.state.activeRun.snapshot.earned,rewards)
 assert.deepEqual(new TowerCampaignStore(adapter,0).state,store.state)
 run=TowerRun.restore(store.state.activeRun.snapshot);run.resume();run.advance(.1);run.abandon()
 assert.equal(store.act({type:'finishFloor',snapshot:run.snapshot()},0).ok,true)
 assert.equal(cultivationAt(store.state.xp).level,2)
 assert.equal(store.state.contribution,before.contribution+999)
 assert.equal(store.state.spiritStones,before.spiritStones+999000000)
})


test('stage rebase preserves equipped armor recovery clock and rejects stale writes',async()=>{
 const {rollEquipment}=await import('../js/xianxia/TowerEquipment.js')
 const {store}=fixture(),state=structuredClone(store.state)
 const armor=rollEquipment('armor','fan',1,()=>.5,'test-armor')
 state.equipment[armor.id]=armor;state.loadouts[0].armorId=armor.id
 const run=new TowerRun({attemptId:1,floor:1,seed:123,hp:50,xp:0,loadout:combatLoadout(state)})
 run.advance(1)
 const beforeArmor=structuredClone(run.state.armorState),beforeTick=run.state.ticks
 run.pause();assert.ok(validateTowerSnapshot(run.snapshot()))
 const hp=run.state.player.hp
 run.setDeveloperCultivation(225)
 assert.equal(run.state.player.hp,hp)
 assert.deepEqual(run.state.armorState,beforeArmor);assert.equal(run.state.ticks,beforeTick)
 assert.ok(validateTowerSnapshot(run.snapshot()))
 for(const type of ['playtestResources','playtestNextStage']){
  const f=fixture(),stale=new TowerCampaignStore(f.adapter,0),before=stale.state
  assert.ok(f.store.act({type:'playtestResources'},0).ok)
  assert.equal(stale.act({type},0).reason,'stale-save');assert.strictEqual(stale.state,before)
 }
})

test('additive skill grant adds 999 each time, persists and rejects overflow atomically',()=>{
 const {store,adapter,disk}=fixture()
 const initial=store.state.xp
 for(let i=1;i<=10;i++){
  assert.equal(store.act({type:'playtestAddSkillPoints'},0).ok,true)
  assert.equal(store.state.playtestSkillPoints,999*i)
 }
 assert.equal(store.state.xp,initial)
 assert.deepEqual(new TowerCampaignStore(adapter,0).state,store.state)
 const before=store.state,raw=disk.getItem(TOWER_CAMPAIGN_KEY)
 assert.equal(store.act({type:'playtestAddSkillPoints'},0).reason,'capacity')
 assert.strictEqual(store.state,before);assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY),raw)
})

test('additive skill grant preserves state on failed or stale writes',()=>{
 for(const stale of [false,true]){
  const {store,adapter,disk}=fixture(),before=store.state
  if(stale)new TowerCampaignStore(adapter,0).act({type:'playtestResources'},0)
  else disk.setItem=()=>{throw Error('quota')}
  assert.equal(store.act({type:'playtestAddSkillPoints'},0).reason,stale?'stale-save':'save-failed')
  assert.strictEqual(store.state,before)
 }
})

test('promotion from partial progress advances to the next level start',()=>{
 const {store}=fixture({xp:60})
 assert.equal(store.act({type:'playtestNextStage'},0).ok,true)
 assert.equal(store.state.xp,120)
 assert.equal(cultivationAt(store.state.xp).level,3)
})
