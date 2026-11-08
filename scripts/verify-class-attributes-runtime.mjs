// Compare only class-attribute changes; --before points to a snapshot with the
// same skills/equipment but the previous class/stat/timing/run modules.
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
const before=process.argv.find(s=>s.startsWith('--before='))?.slice(9)
assert.ok(before,'--before snapshot directory is required')
const {TowerRun:OldRun}=await import(pathToFileURL(resolve(before,'js/xianxia/TowerRun.js')))
function sample(Run,id,level,moving){
 const rank=level<11?1:level<21?6:10
 const r=new Run({attemptId:1,floor:1,seed:71,hp:80,xp:cultivationLevelXp(level),training:true,
  loadout:{growthVersion:1,skillsInitialized:true,active:{[id]:rank},passive:{},evolutions:[],
   evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 for(let i=0;i<120&&!r.state.enemies.length;i++)r.advance(1/60)
 const e=r.state.enemies[0];assert.ok(e);r.state.enemies=[e];r.state.pending=[];r.state.reserved=[]
 e.hp=e.maxHp=1e10;r._random=()=>.99
 let physical=0,magic=0,hits=0
 const effect=r._effect.bind(r)
 r._effect=(kind,x,y,radius,extra)=>{
  if(kind==='hit'&&extra?.damageParts){physical+=extra.damageParts.physical;magic+=extra.damageParts.magic;hits++}
  return effect(kind,x,y,radius,extra)
 }
 for(let i=0;i<1800;i++){
  e.ai.graceUntil=1e9;e.x=r.state.player.x+80+(moving?20*Math.sin(i/90):0)
  e.y=r.state.player.y+(moving?20*Math.cos(i/90):0);r.state.player.hp=80;r.advance(1/60)
 }
 return {physical,magic,total:physical+magic,hits,hp:r.state.player.maxHp,manaRegen:r.state.player.manaRegen}
}
const rows=[]
for(const level of [1,11,21,30])for(const id of ['sj_arc','sj_formation'])for(const moving of [false,true]){
 const old=sample(OldRun,id,level,moving),current=sample(TowerRun,id,level,moving)
 assert.ok(old.hits&&current.hits)
 assert.ok(Math.abs(old.hp-current.hp)<1e-7);assert.equal(old.manaRegen,current.manaRegen)
 const ratio=current.total/old.total
 assert.ok(Math.abs(ratio-(id==='sj_arc'?1.1:1))<1e-7,JSON.stringify({id,level,moving,ratio}))
 rows.push({id,level,moving,old,current,ratio})
}
const tracked=['TowerGrowth.js','TowerCombatSkills.js','TowerClassProfiles.js','TowerCharacterStats.js','TowerRun.js','TowerSkillTiming.js']
const hashes=Object.fromEntries(tracked.map(f=>[f,createHash('sha256').update(readFileSync(resolve('js/xianxia',f))).digest('hex')]))
const beforeHashes=Object.fromEntries(tracked.map(f=>[f,createHash('sha256').update(readFileSync(resolve(before,'js/xianxia',f))).digest('hex')]))
for(const file of ['TowerGrowth.js','TowerCombatSkills.js'])assert.equal(hashes[file],beforeHashes[file],`${file} must match for paired evidence`)
mkdirSync('reports/class-attributes-2026-11-04',{recursive:true})
writeFileSync('reports/class-attributes-2026-11-04/runtime.json',JSON.stringify({
 method:'16 paired 30-second real-scheduler runs, identical skills and equipment, no basic weapon, stationary/moving durable targets. Not natural clear-rate evidence.',
 beforeHashes,hashes,rows},null,2)+'\n')
console.log(`Verified ${rows.length} paired class-attribute runtime cases`)
