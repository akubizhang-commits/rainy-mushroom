import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {createFixedWeapon,WEAPONS} from '../js/xianxia/TowerWeapons.js'
import {steerMechanics,sourceHashes} from './verify-monster-mechanics-balance.mjs'
const fixtures=JSON.parse(readFileSync('reports/flow-equal-budget-2026-11-02/controlled.json')).fixtures
const rows=[]
for(const f of fixtures)for(const id of ['eq_sword_taiheng','eq_sword_zhaoyuan']){
 const l=structuredClone(f.loadout),w=createFixedWeapon(id,id);Object.assign(l,{weapon:w,weaponId:w.id,weaponQuality:w.quality})
 const r=new TowerRun({attemptId:1,floor:9,seed:101,xp:f.xp,hp:stats(f.xp,l).maxHp,loadout:l,arenaVersion:1});let checkAt=5
 while(r.state.phase==='playing'&&r.state.time<1200){const p=r.state.player;r.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315});steerMechanics(r);r.advance(1/60);if(r.state.time>=checkAt){assert.ok(validateTowerSnapshot(r.snapshot()),`${id}/${f.route}/${r.state.time}`);checkAt+=5}}
 rows.push({weapon:id,route:f.route,time:r.state.time,outcome:r.state.phase});console.log(rows.at(-1))
}
writeFileSync('reports/weapon-skill-levels-2026-11-03/runtime.json',JSON.stringify({method:'Level 30 floor 9 seed 101 fixed learned builds; real AI. Not fresh-save progression or acquisition probability.',sources:sourceHashes(),rarity:WEAPONS.filter(w=>w.quality===4).map(d=>({id:d.id,skillAffixes:createFixedWeapon(d.id,d.id).affixes.filter(a=>a.type==='skillLevel')})),rows},null,2))
