// Controlled equipment/operation comparisons; these injected fixtures are NOT acquisition runs.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {createFixedWeapon} from '../js/xianxia/TowerWeapons.js'
import {createFixedEquipment} from '../js/xianxia/TowerEquipment.js'
import {EQUIPMENT_ROSTER} from '../js/xianxia/TowerEquipmentRoster.js'
import {steerMechanics,sourceHashes} from './verify-monster-mechanics-balance.mjs'
const output=process.argv[2];assert.ok(output&&!fs.existsSync(output))
const fixtures=JSON.parse(fs.readFileSync('reports/flow-equal-budget-2026-11-02/controlled.json')).fixtures
const report={method:'Level 30 floor 9, same learned skills per route, seed 101. Gear selected by declared role, not optimized. Stationary stress test: no movement for the entire fight. Not a human win-rate estimate or natural acquisition.',sources:sourceHashes(),rows:[]}
for(const f of fixtures)for(const quality of [1,4])for(const operation of ['stationary']){
 const l=structuredClone(f.loadout),formation=['array','formation'].includes(f.route)
 const roles={weapon:quality===4?'master':formation?'formation':'qi',armor:quality===4?'graduate':'guard',ring:quality===4?'master':'cadence'}
 for(const category of ['weapon','armor','ring']){
  const d=EQUIPMENT_ROSTER.find(d=>d.category===category&&d.tier==='ling'&&d.quality===quality&&d.role===roles[category]);assert.ok(d)
  l[category]=(category==='weapon'?createFixedWeapon:createFixedEquipment)(d.id,'control-'+category);l[category+'Id']=l[category].id
 }
 l.weaponQuality=quality;l.weaponRefine=0
 const run=new TowerRun({attemptId:1,floor:9,seed:101,xp:f.xp,hp:stats(f.xp,l).maxHp,loadout:l,arenaVersion:1});let minHp=1,checks=0,next=30
 while(run.state.phase==='playing'&&run.state.time<1200){const p=run.state.player;run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315});if(false)steerMechanics(run);else run.setInput(0,0);run.advance(1/60);minHp=Math.min(minHp,p.hp/p.maxHp);if(run.state.time>=next){assert.ok(validateTowerSnapshot(run.snapshot()));checks++;next+=30}}
 const row={route:f.route,quality,operation,outcome:run.state.phase,seconds:run.state.time,minHp,hp:run.state.player.hp,maxHp:run.state.player.maxHp,healed:run.state.armorState.healedTotal,checks,gear:Object.fromEntries(['weapon','armor','ring'].map(k=>[k,l[k].definitionId]))};report.rows.push(row);fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(f.route,quality,operation,row.outcome,Math.round(row.seconds))
}
report.completed=true;fs.writeFileSync(output,JSON.stringify(report,null,2))
