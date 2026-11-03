import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {createFixedEquipment} from '../js/xianxia/TowerEquipment.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {steerMechanics} from '../scripts/verify-monster-mechanics-balance.mjs'
function fixture(){
 let raw=null,fail=false
 const disk={getItem:()=>raw,setItem:(_key,value)=>{if(fail)throw Error('disk failure');raw=value}}
 const fresh=new TowerCampaignStore(disk,0);assert.ok(fresh.act({type:'sync'},0).ok)
 const envelope=JSON.parse(raw),state=JSON.parse(envelope.data)
 state.xp=cultivationLevelXp(21);state.equipmentSequence=1
 state.equipment['gear-1']=createFixedEquipment('eq_armor_chengxiao','gear-1');state.loadouts[0].armorId='gear-1'
 state.hp=stats(state.xp,combatLoadout(state)).maxHp*.3
 const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)})
 const store=new TowerCampaignStore(disk,0),start=store.act({type:'startFloor',floor:1,seed:101},0)
 assert.ok(start.ok);const run=TowerRun.restore(start.snapshot)
 return {store,run,disk,raw:()=>raw,fail:value=>fail=value}
}
function advance(run,time){
 if(run.state.phase==='paused')run.resume()
 while(run.state.time<time){const p=run.state.player;run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315});steerMechanics(run);run.advance(1/60)}
 run.pause();assert.ok(validateTowerSnapshot(run.snapshot()))
}
test('actual enhanced recovery checkpoints and reloads with its original healing ledger',()=>{
 const {store,run,disk}=fixture();advance(run,6.1)
 assert.ok(run.state.armorState.healedTotal>run.state.player.maxHp*(1/60+.0025)*2)
 const result=store.act({type:'checkpoint',snapshot:run.snapshot()},6200);assert.ok(result.ok,JSON.stringify(result))
 const loaded=new TowerCampaignStore(disk,6200);assert.equal(loaded.readOnly,false)
 assert.deepEqual(loaded.state.activeRun.snapshot.armorState,run.state.armorState)
})
test('enhanced recovery cannot invent healing between pulses and failed writes remain retryable',()=>{
 const f=fixture();advance(f.run,6.1);assert.ok(f.store.act({type:'checkpoint',snapshot:f.run.snapshot()},6200).ok)
 advance(f.run,7.1)
 const forged=f.run.snapshot();forged.armorState.healedTotal+=.1
 assert.ok(validateTowerSnapshot(forged),'total bound alone cannot detect interval forgery')
 const previous=structuredClone(f.store.state)
 assert.equal(f.store.act({type:'checkpoint',snapshot:forged},7200).ok,false)
 assert.deepEqual(f.store.state,previous)
 advance(f.run,9.1);const saved=f.raw();f.fail(true)
 assert.equal(f.store.act({type:'checkpoint',snapshot:f.run.snapshot()},9200).ok,false)
 assert.equal(f.raw(),saved);assert.deepEqual(f.store.state,previous)
 f.fail(false);assert.ok(f.store.act({type:'checkpoint',snapshot:f.run.snapshot()},9200).ok)
 assert.deepEqual(new TowerCampaignStore(f.disk,9200).state.activeRun.snapshot.armorState,f.run.state.armorState)
})
test('a hit after enhanced recovery cannot invalidate healing earned before that hit',()=>{
 const {store,run}=fixture();advance(run,6.1)
 const healed=run.state.armorState.healedTotal
 run.resume();const original=run._projectiles
 run._projectiles=function(incoming,...args){original.call(this,incoming,...args);incoming.push({id:'recovery-test-hit',damage:10,damageType:'physical'})}
 run.advance(1/60);run._projectiles=original;run.pause()
 assert.ok(run.state.time-run.state.armorState.lastHitAt<4)
 assert.equal(run.state.armorState.healedTotal,healed)
 assert.ok(validateTowerSnapshot(run.snapshot()))
 const result=store.act({type:'checkpoint',snapshot:run.snapshot()},6300);assert.ok(result.ok,JSON.stringify(result))
})
