import {regenerationAmount,regenerationFraction} from '../js/xianxia/TowerAttributeRules.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun,characterCombatAttributes,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {ARMORS,createFixedEquipment,createBasicEquipment,armorModifiers,equipmentDescription} from '../js/xianxia/TowerEquipment.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
function fixture(){
 const d=ARMORS.find(d=>d.tier==='ling'&&d.quality===4),armor=createFixedEquipment(d.id,'armor-1')
 const loadout={growthVersion:1,skillsInitialized:true,active:{},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon:createIronWeapon(),weaponId:'iron',weaponQuality:0,weaponRefine:0,weaponFocusCount:0,armor,armorId:armor.id}
 const run=new TowerRun({attemptId:1,floor:1,seed:41,xp:cultivationLevelXp(21),hp:10,training:true,loadout})
 run.setPlaytestAssist(true)
 return {run,armor,rate:regenerationAmount(run.state.player.maxHp,loadout)}
}
const advance=(run,seconds)=>{for(let i=0;i<seconds*60;i++)run.advance(1/60)}
test('all armor exposes one three-second recovery bonus and no triggered healing affixes',()=>{
 assert.equal(armorModifiers(createBasicEquipment('armor')).healthRegen,0)
 for(const d of ARMORS.filter(d=>d.quality)){
  const a=createFixedEquipment(d.id,'armor-1'),m=armorModifiers(a)
  assert.ok(m.healthRegen>0)
  assert.equal(a.affixes.filter(x=>x.type==='healthRegen').length,1)
  assert.ok(!a.affixes.some(x=>['healFraction','healDelay'].includes(x.type)))
  assert.match(equipmentDescription(a).join(' '),/气血回复 \+[\d.]+%\/3秒/)
  assert.doesNotMatch(equipmentDescription(a).join(' '),/回复冷却|每层回复|受伤.*秒后/)
 }
})
test('equipped regeneration heals only at three-second pulses without being hit and matches the sheet',()=>{
 const {run,rate}=fixture(),hp=run.state.player.hp
 assert.ok(rate>0);near(characterCombatAttributes(run.state.loadout).healthRegen,regenerationFraction(run.state.loadout))
 advance(run,2);near(run.state.player.hp-hp,0)
 advance(run,1);near(run.state.player.hp-hp,rate)
 advance(run,3);near(run.state.player.hp-hp,rate*2)
 near(run.state.armorState.healedTotal,rate*2)
 assert.ok(validateTowerSnapshot(run.snapshot()))
})
test('pause and restore neither grant extra healing nor lose accumulated regeneration',()=>{
 const {run}=fixture();advance(run,1);run.pause();const frozen=run.snapshot()
 run.advance(1);assert.deepEqual(run.snapshot(),frozen)
 const restored=TowerRun.restore(frozen);restored.setPlaytestAssist(true)
 run.resume();restored.resume();advance(run,2);advance(restored,2)
 assert.deepEqual(run.snapshot(),restored.snapshot())
})
test('regeneration cannot overfill, revive, or bank a full-health interval',()=>{
 const {run,rate}=fixture();run.state.player.hp=run.state.player.maxHp-rate/120
 advance(run,3);near(run.state.player.hp,run.state.player.maxHp)
 run.state.player.hp-=rate*2;const before=run.state.player.hp;advance(run,3);near(run.state.player.hp-before,rate)
 run.state.player.hp=0;run.advance(1/60);assert.equal(run.state.player.hp,0)
})
test('save validation rejects healing beyond elapsed time or negative healing totals',()=>{
 const {run,rate}=fixture();advance(run,1);const s=run.snapshot()
 s.armorState.healedTotal=rate*2;assert.equal(validateTowerSnapshot(s),false)
 s.armorState.healedTotal=-1;assert.equal(validateTowerSnapshot(s),false)
})

async function campaignFixture(){
 const {TowerCampaignStore,TOWER_CAMPAIGN_KEY}=await import('../js/xianxia/TowerCampaign.js')
 const {checksum}=await import('../js/xianxia/Checksum.js')
 const records=new Map(),disk={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)}
 const fresh=new TowerCampaignStore(disk,0);fresh.act({type:'sync'},0)
 const envelope=JSON.parse(records.get(TOWER_CAMPAIGN_KEY)),state=JSON.parse(envelope.data)
 state.hp=10;state.xp=cultivationLevelXp(21);state.equipmentSequence=1
 const d=ARMORS.find(d=>d.tier==='ling'&&d.quality===4)
 state.equipment['gear-1']=createFixedEquipment(d.id,'gear-1');state.loadouts[0].armorId='gear-1'
 const data=JSON.stringify(state);records.set(TOWER_CAMPAIGN_KEY,JSON.stringify({...envelope,data,checksum:checksum(data)}))
 const store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false)
 return {store,disk,records,TowerCampaignStore}
}
test('camp uses the same three-second pulses and cannot claim an interval twice',async()=>{
 const {store,disk,TowerCampaignStore}=await campaignFixture()
 const {campaignMaxHp}=await import('../js/xianxia/TowerCampaign.js')
 const before=store.state.hp,rate=regenerationAmount(campaignMaxHp(store.state),{armor:store.state.equipment['gear-1']})
 assert.equal(store.act({type:'sync'},2999).ok,true)
 near(store.state.hp,before)
 assert.equal(store.act({type:'sync'},3000).ok,true)
 near(store.state.hp-before,rate)
 const hp=store.state.hp;store.act({type:'sync'},3000);near(store.state.hp,hp)
 near(new TowerCampaignStore(disk,3000).state.hp,hp)
})
test('checkpoints preserve regeneration, reject rollback and duplicate settlement, and are atomic on save failure',async()=>{
 const {store,disk,records,TowerCampaignStore}=await campaignFixture()
 const entered=store.act({type:'startFloor',floor:1,seed:41},0);assert.equal(entered.ok,true)
 const run=TowerRun.restore(entered.snapshot);advance(run,3);run.pause()
 const s=run.snapshot();assert.ok(s.armorState.healedTotal>0)
 assert.equal(store.act({type:'checkpoint',snapshot:s},1000).ok,true)
 assert.equal(store.act({type:'checkpoint',snapshot:s},1000).ok,true)
 const loaded=new TowerCampaignStore(disk,3000);near(loaded.state.hp,s.player.hp)
 const before=new Map(records),bad=structuredClone(s);bad.armorState.healedTotal=0
 assert.equal(loaded.act({type:'checkpoint',snapshot:bad},1000).ok,false);assert.deepEqual(records,before)
 run.resume();advance(run,1);run.pause();const later=run.snapshot()
 const originalSet=disk.setItem;disk.setItem=()=>{throw Error('disk full')}
 const previous=loaded.state
 assert.equal(loaded.act({type:'checkpoint',snapshot:later},2000).ok,false)
 assert.equal(loaded.state,previous);assert.deepEqual(records,before);disk.setItem=originalSet
 assert.equal(loaded.act({type:'checkpoint',snapshot:later},2000).ok,true)
 run.abandon();assert.equal(loaded.act({type:'finishFloor',snapshot:run.snapshot()},2000).ok,true)
 assert.equal(loaded.act({type:'finishFloor',snapshot:run.snapshot()},2000).ok,false)
})
