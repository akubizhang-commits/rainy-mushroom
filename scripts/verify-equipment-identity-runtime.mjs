import fs from 'node:fs'
import assert from 'node:assert/strict'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {createFixedWeapon} from '../js/xianxia/TowerWeapons.js'
import {createFixedEquipment} from '../js/xianxia/TowerEquipment.js'
import {steerMechanics,sourceHashes} from './verify-monster-mechanics-balance.mjs'
const fixtures=JSON.parse(fs.readFileSync('reports/flow-equal-budget-2026-11-02/controlled.json')).fixtures
const rows=[]
for(const [i,f] of fixtures.entries()){
 const l=structuredClone(f.loadout),weaponIds=['eq_sword_chengming','eq_sword_zhaoyuan','eq_sword_kunwu','eq_sword_dingyue','eq_sword_taiheng','eq_sword_taiheng']
 l.weapon=createFixedWeapon(weaponIds[i],'runtime-weapon');l.armor=createFixedEquipment(i%2?'eq_armor_chengxiao':'eq_armor_wugou','runtime-armor');l.ring=createFixedEquipment(i%2?'eq_ring_dingwei':'eq_ring_weiming','runtime-ring');for(const k of ['weapon','armor','ring'])l[k+'Id']=l[k].id;l.weaponQuality=l.weapon.quality;l.weaponRefine=0
 const r=new TowerRun({attemptId:1,floor:9,seed:101,xp:f.xp,hp:stats(f.xp,l).maxHp,loadout:l,arenaVersion:1});let checks=0,next=5,shields=0,lastReady=0
 while(r.state.phase==='playing'&&r.state.time<1200){const p=r.state.player;r.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315});steerMechanics(r);r.advance(1/60);if((r.state.armorState.shieldReadyAt??0)>lastReady){shields++;lastReady=r.state.armorState.shieldReadyAt}if(r.state.time>=next){assert.ok(validateTowerSnapshot(r.snapshot()),f.route+' '+r.state.time);checks++;next+=5}}
 const row={route:f.route,weapon:l.weapon.definitionId,armor:l.armor.definitionId,ring:l.ring.definitionId,outcome:r.state.phase,time:r.state.time,snapshotChecks:checks,shieldTriggers:shields,healed:r.state.armorState.healedTotal};rows.push(row);console.log(row)
}
fs.writeFileSync('reports/equipment-identity-implementation-2026-11-03/runtime.json',JSON.stringify({method:'Six fixed level-30 builds, floor 9 seed 101, actual AI with new gear; not natural acquisition/progression.',sources:sourceHashes(),rows},null,2))
