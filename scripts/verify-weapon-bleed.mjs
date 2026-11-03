import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {createFixedWeapon} from '../js/xianxia/TowerWeapons.js'
import {WEAPON_BLEED_IDS} from '../js/xianxia/TowerWeaponBleed.js'
import {steerMechanics,sourceHashes} from './verify-monster-mechanics-balance.mjs'
const fixtures=JSON.parse(readFileSync('reports/flow-equal-budget-2026-11-02/controlled.json')).fixtures
const rows=[]
for(const id of WEAPON_BLEED_IDS){
 const route=['eq_sword_caiyun','eq_sword_duanliu','eq_sword_zhuiri'].includes(id)?'qi':'pursuit'
 const f=structuredClone(fixtures.find(x=>x.route===route)),w=createFixedWeapon(id,id)
 Object.assign(f.loadout,{weapon:w,weaponId:w.id,weaponQuality:w.quality})
 const run=new TowerRun({attemptId:1,floor:9,seed:101,xp:f.xp,hp:stats(f.xp,f.loadout).maxHp,loadout:f.loadout,arenaVersion:1})
 let seen=new Set(),bleed=0,ticks=0,checks=0,nextCheck=5
 while(run.state.phase==='playing'&&run.state.time<1200){
  const s=run.state,p=s.player;run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315})
  steerMechanics(run);run.advance(1/60)
  const next=new Set();for(const e of s.effects){next.add(e.id);if(!seen.has(e.id)&&e.kind==='hit'&&e.source==='weapon_bleed'){bleed+=e.damage;ticks++;assert.ok(!e.critical)}}seen=next
  if(s.time>=nextCheck){assert.ok(validateTowerSnapshot(run.snapshot()),`${id} invalid snapshot ${s.time}`);checks++;nextCheck+=5}
 }
 const row={id,route,outcome:run.state.phase,time:run.state.time,bleed,ticks,snapshotChecks:checks};rows.push(row);console.log(row)
 assert.ok(ticks>0)
}
writeFileSync('reports/weapon-bleed-2026-11-03/runtime.json',JSON.stringify({method:'Six weapons, floor 9, level 30, seed 101, authored enemies, real AI; fixed fixtures, not a fresh-save growth study.',sources:sourceHashes(),rows},null,2))
