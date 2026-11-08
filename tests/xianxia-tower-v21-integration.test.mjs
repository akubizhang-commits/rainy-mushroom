import {monsterHealthMultiplier} from '../js/xianxia/TowerMonsterAttributes.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout, campaignMaxHp } from '../js/xianxia/TowerCampaign.js'
import { TowerRun, stats, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { rollEquipment } from '../js/xianxia/TowerEquipment.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { yujianGenerationInterval } from '../js/xianxia/TowerYujian.js'
import { skillCooldown } from '../js/xianxia/TowerSkillTiming.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { ARCHETYPES, FLOORS } from '../js/xianxia/TowerContent.js'
import { checksum } from '../js/xianxia/Checksum.js'
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
function fixture(){
 const disk={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v}}
 const initial=new TowerCampaignStore(disk,0);initial.act({type:'sync'},0)
 const state=structuredClone(initial.state);state.skills.sj_yujian=1;state.xp=10920;state.hp=50;state.clearedFloor=9
 const ring=rollEquipment('ring','ling',4,()=>.99,'gear-1'),armor=rollEquipment('armor','ling',4,()=>.99,'gear-2')
 Object.assign(state.equipment,{[ring.id]:ring,[armor.id]:armor});state.equipmentSequence=2
 state.equipmentCounters[ring.id]=0;state.loadouts[0].ringId=ring.id
 const record=JSON.parse(disk.raw),data=JSON.stringify(state);disk.raw=JSON.stringify({...record,data,checksum:checksum(data)})
 const store=new TowerCampaignStore(disk,0);assert.equal(store.error,'');return {store,disk,armor,ring}
}
test('cooldown ring changes production cadence while its primary stats also raise damage',()=>{
 const {store}=fixture(),loadout=combatLoadout(store.state)
 close(skillCooldown(1,loadout),.85)
 const interval=yujianGenerationInterval(loadout)
 const run=new TowerRun({attemptId:1,floor:1,xp:10920,hp:50,loadout,training:true})
 run.state.enemies=[{id:'target',hp:1e9,x:250,y:-60,radius:5,orbitNextAt:0}]
 close(run.state.yujian.nextAt,interval)
 run.state.time=interval-.001;run._skills([]);assert.equal(run.state.projectiles.length,0)
 run.state.time=interval;run._skills([])
 // Production occurs at the cadence boundary; casting may still have a windup.
 close(run.state.yujian.nextAt,interval*2)
 for(let i=1;i<=60;i++){run.state.time=interval+i/60;run._skills([])}
 assert.ok(run.state.projectiles.some(p=>p.source==='sj_yujian'))
 const before=skillPresentation(store.state,'sj_yujian');close(before.cooldown,interval)
 const unhurried=structuredClone(store.state);unhurried.loadouts[0].ringId='basic-ring'
 assert.ok(before.stats.find(r=>r.key==='roundDamage').value>skillPresentation(unhurried,'sj_yujian').stats.find(r=>r.key==='roundDamage').value)
 // Cooldown does not shorten already emitted multi-hit effects.
 for(const id of ['sj_wanjian','sj_formation'])
  close(skillPresentation(store.state,id).stats.find(r=>r.key==='hitInterval').value,
   skillPresentation(unhurried,id).stats.find(r=>r.key==='hitInterval').value)
 close(skillPresentation(store.state,'evo_tiandi').cooldown,skillPresentation(unhurried,'evo_tiandi').cooldown*.85)
 close(skillPresentation(store.state,'evo_wanjian').stats.find(r=>r.key==='rainCooldown').value,
  skillPresentation(unhurried,'evo_wanjian').stats.find(r=>r.key==='rainCooldown').value*.85)
})
test('armor HP joins medicine, camp restoration and snapshots; swapping cannot heal',()=>{
 const {store,disk,armor}=fixture(),base=100*1.08**24*1.35**2
 close(campaignMaxHp(store.state),base)
 assert.equal(store.act({type:'equipEquipment',id:armor.id,category:'armor'},0).ok,true)
 close(store.state.hp,50);close(campaignMaxHp(store.state),(base+520))
 assert.equal(store.act({type:'usePill',id:'huichun'},0).ok,true)
 close(store.state.hp,50+(base+520)*.5)
 store.act({type:'sync'},60000);const hp=store.state.hp
 close(hp,50+(base+520)*(.5+20*(1/60+.002)))
 const reload=new TowerCampaignStore(disk,60000);assert.equal(reload.error,'');close(reload.state.hp,hp)
 const result=reload.act({type:'startFloor',floor:1},60000);assert.equal(result.ok,true)
 assert.ok(validateTowerSnapshot(result.snapshot));close(result.snapshot.player.maxHp,(base+520))
 const run=TowerRun.restore(result.snapshot);run.advance(.5);assert.ok(validateTowerSnapshot(run.snapshot()))
})
test('floor stats are fixed by floor and family, carry into spawns and reject forged snapshots',()=>{
 const {store}=fixture(),loadout=combatLoadout(store.state),boar=ARCHETYPES.find(a=>a.id==='boar_normal')
 const target=towerEnemyStats(boar,1,1)
 close(target.hp,FLOORS[0].floor_stat_scale.normal_hp*1.15*monsterHealthMultiplier(target))
 const low=new TowerRun({attemptId:1,floor:1,xp:0,hp:50,loadout:{...loadout,ring:store.state.equipment['basic-ring'],ringId:'basic-ring'},training:true})
 const high=new TowerRun({attemptId:1,floor:1,xp:10920,hp:50,loadout,training:true})
 close(low._enemy({id:'test',archetype:boar.id,x:300,y:300}).maxHp,high._enemy({id:'test',archetype:boar.id,x:300,y:300}).maxHp)
 const normal=new TowerRun({attemptId:1,floor:1,xp:10920,hp:50,loadout})
 normal.advance(1);const snapshot=normal.snapshot();assert.ok(validateTowerSnapshot(snapshot))
 if(snapshot.enemies.length){snapshot.enemies[0].maxHp+=1;assert.equal(validateTowerSnapshot(snapshot),false)}
})
