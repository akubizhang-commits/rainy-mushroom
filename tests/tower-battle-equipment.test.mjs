import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {inventoryQuote} from '../js/xianxia/TowerInventory.js'
const disk=()=>({raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}})
function fixture(){const storage=disk(),store=new TowerCampaignStore(storage,0);store.act({type:'startFloor',floor:1,seed:77},0);const run=TowerRun.restore(store.state.activeRun.snapshot);run.advance(2);run.pause();assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true);return {storage,store}}
test('paused inventory equips and unequips all slots atomically, retaining battle progress and cooldowns',()=>{
 const {storage,store}=fixture()
 for(const [slot,id] of [['weapon','iron'],['armor','basic-armor'],['ring','basic-ring']]){
  for(const op of ['unequip','equip']){
   const before=store.state.activeRun.snapshot,quote=inventoryQuote(store.state,id,op)
   assert.equal(quote.ok,true,quote.reason)
   const result=store.act(quote.action,0);assert.equal(result.ok,true,result.reason)
   const after=store.state.activeRun.snapshot
   assert.equal(validateTowerSnapshot(after),true);assert.equal(after.phase,'paused')
   for(const key of ['time','ticks','rng','earned','killLedger','enemies','cooldowns','drops'])assert.deepEqual(after[key],before[key],key)
   assert.equal(after.player.hp,Math.min(before.player.hp,after.player.maxHp));assert.equal(after.player.mana,Math.min(before.player.mana,after.player.maxMana))
   assert.equal(store.state.loadouts[0][slot+'Id'],op==='equip'?id:'')
   assert.deepEqual(after.loadout,combatLoadout(store.state))
   const restored=new TowerCampaignStore(storage,0);assert.equal(restored.readOnly,false)
   const run=TowerRun.restore(after);run.resume();run.advance(.2);run.pause()
   assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
  }
 }
})
test('failed save leaves equipment and live snapshot unchanged; retry and settlement succeed',()=>{
 const {storage,store}=fixture(),before=store.state,raw=storage.raw
 const action={type:'setLoadout',index:0,loadout:{...before.loadouts[0],weaponId:''}}
 storage.fail=true;assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before);assert.equal(storage.raw,raw)
 storage.fail=false;assert.equal(store.act(action,0).ok,true)
 const run=TowerRun.restore(store.state.activeRun.snapshot);run.abandon();assert.equal(store.act({type:'finishFloor',snapshot:run.snapshot()},0).ok,true)
 assert.equal(new TowerCampaignStore(storage,0).readOnly,false)
})
test('running snapshots reject equipment changes and unrelated inventory actions remain blocked',()=>{
 const {store}=fixture(),run=TowerRun.restore(store.state.activeRun.snapshot);run.resume();assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
 assert.equal(store.act({type:'equipEquipment',category:'armor',id:'basic-armor'},0).reason,'pause-required')
 assert.equal(inventoryQuote(store.state,'iron','unequip').ok,false)
 assert.equal(store.act({type:'sellMaterial',id:'huichuncao',count:1},0).reason,'in-tower')
})

import {WEAPONS,createFixedWeapon} from '../js/xianxia/TowerWeapons.js'
import {EQUIPMENT,createFixedEquipment} from '../js/xianxia/TowerEquipment.js'
import {TOWER_XP_CAP} from '../js/xianxia/TowerProfile.js'
import {checksum} from '../js/xianxia/Checksum.js'
test('every equipment definition can be swapped during a developed run and survives checkpoint/reload',()=>{
 const storage=disk();storage.allowPlaytestTools=true;let store=new TowerCampaignStore(storage,0);store.act({type:'sync'},0)
 const env=JSON.parse(storage.raw),state=JSON.parse(env.data)
 state.xp=TOWER_XP_CAP;state.skills={sj_arc:1,sj_yujian:1};state.playtestSkillPoints=999
 const items=[]
 for(const d of WEAPONS.filter(d=>d.quality)){const id='weapon-'+(state.weaponSequence+1);state.weapons[id]=createFixedWeapon(d.id,id);state.weaponCounters[id]=0;state.weaponSequence++;items.push(['weapon',id])}
 for(const d of EQUIPMENT.filter(d=>d.quality)){const id='gear-'+(state.equipmentSequence+1);state.equipment[id]=createFixedEquipment(d.id,id);if(d.category==='ring')state.equipmentCounters[id]=0;state.equipmentSequence++;items.push([d.category,id])}
 env.data=JSON.stringify(state);env.checksum=checksum(env.data);storage.raw=JSON.stringify(env)
 store=new TowerCampaignStore(storage,0);assert.equal(store.readOnly,false,store.error)
 assert.equal(store.act({type:'startFloor',floor:1,seed:91},0).ok,true)
 let run=TowerRun.restore(store.state.activeRun.snapshot);run.advance(3);run.pause();assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
 for(const [category,id] of [...items,...items].reverse()){
  const action=category==='weapon'?{type:'setLoadout',index:0,loadout:{...store.state.loadouts[0],weaponId:id}}:{type:'equipEquipment',category,id}
  const before=store.state.activeRun.snapshot,result=store.act(action,0);assert.equal(result.ok,true,id+': '+result.reason)
  let s=store.state.activeRun.snapshot;if(before.loadout.ringId)assert.equal(store.state.equipmentCounters[before.loadout.ringId],before.weaponState.focusCount);assert.ok(s.player.hp<=before.player.hp);assert.ok(s.player.mana<=before.player.mana)
  assert.deepEqual(s.cooldowns,before.cooldowns)
  run=TowerRun.restore(s);run.resume();run.advance(.05);run.pause();assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true,id)
  assert.equal(new TowerCampaignStore(storage,0).readOnly,false,id)
 }
})
