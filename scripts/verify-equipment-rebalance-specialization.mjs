import assert from 'node:assert/strict'
import fs from 'node:fs'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {WEAPONS,createFixedWeapon} from '../js/xianxia/TowerWeapons.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
const parents={evo_tiandi:'sj_line',evo_wuwo:'sj_wanjian',evo_sixiang:'sj_formation'}
function sample(tier,role,skill,level,moving){
 const parent=parents[skill]??skill,d=WEAPONS.find(d=>d.tier===tier&&d.quality===3&&d.role===role)
 const weapon=createFixedWeapon(d.id,'lab'),loadout={growthVersion:1,skillsInitialized:true,active:{[parent]:7},passive:{sj_spirit:3,sj_bone:4},evolutions:parents[skill]?[skill]:[],evolutionLevels:parents[skill]?{[skill]:1}:{},tutorialWaves:0,weapon,weaponId:'lab',weaponQuality:3,weaponRefine:0,weaponFocusCount:0}
 const r=new TowerRun({attemptId:1,floor:1,seed:977,xp:cultivationLevelXp(level),hp:100,loadout,training:true,mana:0})
 for(let i=0;i<120&&!r.state.enemies.length;i++)r.advance(1/60)
 const e=r.state.enemies[0];assert.ok(e)
 r.state.enemies=[e];r.state.pending=[];r.state.reserved=[];e.hp=e.maxHp=1e10
 // Isolate power damage; keep real action scheduling, missiles and periodic hits.
 r._basicTarget=()=>null;r._random=()=>.5
 let physical=0,magic=0,hits=0
 const effect=r._effect.bind(r)
 r._effect=(kind,x,y,radius,extra)=>{
  if(kind==='hit'&&extra?.damageParts){physical+=extra.damageParts.physical;magic+=extra.damageParts.magic;hits++}
  return effect(kind,x,y,radius,extra)
 }
 for(let i=0;i<3600;i++){
  e.ai.graceUntil=1e9;e.hp=1e10;e.x=r.state.player.x+65+(moving?25*Math.sin(i/90):0);e.y=r.state.player.y+(moving?20*Math.cos(i/90):0)
  r.state.player.hp=100;r.advance(1/60)
 }
 return {damage:physical+magic,physical,magic,hits}
}
const rows=[]
for(const tier of ['fa','bao','ling'])for(const level of [equipmentTier(tier).minLevel,30])for(const moving of [false,true])for(const skill of ['sj_arc','sj_line','evo_tiandi','sj_formation','evo_sixiang','evo_wuwo']){
 const qi=sample(tier,'qi',skill,level,moving),formation=sample(tier,'formation',skill,level,moving)
 const isArray=['sj_formation','evo_sixiang','evo_wuwo'].includes(skill),good=isArray?formation:qi,bad=isArray?qi:formation,gain=good.damage/bad.damage-1
 assert.ok(qi.hits&&formation.hits)
 assert.ok(gain>=.049&&gain<=.101,`${tier}/${level}/${skill}/${moving}: ${gain}`)
 if(!isArray){assert.equal(qi.magic,0);assert.equal(formation.magic,0)}else{assert.ok(qi.magic>0&&qi.physical>0&&formation.magic>0&&formation.physical>0)}
 rows.push({tier,level,moving,skill,gain,qi,formation})
}
fs.writeFileSync('reports/equipment-rebalance-2026-11-02/specialization-runtime.json',JSON.stringify({seconds:60,note:'Controlled stationary and moving targets; no basic attacks; fixed RNG to isolate specialization; not natural clear-rate data',min:Math.min(...rows.map(r=>r.gain)),max:Math.max(...rows.map(r=>r.gain)),rows},null,2))
console.log(`Passed ${rows.length} paired 60-second runtime cases`)
