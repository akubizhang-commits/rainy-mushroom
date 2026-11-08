// Controlled damage-delivery comparisons, not clear-rate or player-skill claims.
// Equal trained point budgets and identical equipment/seeds at each comparison.
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {TowerRun,stats} from '../js/xianxia/TowerRun.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {GROWTH_SKILLS,spentPoints} from '../js/xianxia/TowerGrowth.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'

const scenarios=[
 {id:'single-stationary',count:1,moving:false},
 {id:'dense-six',count:6,moving:false},
 {id:'mobile-single',count:1,moving:true},
]
const builds=[
 {id:'sancai',level:11,skills:{sj_sancai:3}},
 {id:'shadow',level:11,skills:{sj_shadow:3}},
 {id:'orbit-sancai',level:11,skills:{sj_wanjian:4,sj_sancai:3}},
 {id:'orbit-shadow',level:11,skills:{sj_wanjian:4,sj_shadow:3}},
 {id:'liangyi-sancai',level:17,skills:{sj_formation:3,sj_sancai:3}},
 {id:'liangyi-shadow',level:17,skills:{sj_formation:3,sj_shadow:3}},
]
function sample(build,scenario,seed){
 const weapon=createIronWeapon(),xp=cultivationLevelXp(build.level)
 for(const [id,rank] of Object.entries(build.skills)){
  const d=GROWTH_SKILLS.find(d=>d.id===id)
  assert.ok(build.level>=d.rankRequirements[rank-1].characterLevel,`${id} rank gate`)
 }
 const loadout={growthVersion:1,skillsInitialized:true,active:build.skills,passive:{},
  evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon,weaponId:weapon.id,
  weaponQuality:0,weaponRefine:0,weaponFocusCount:0}
 const run=new TowerRun({attemptId:1,floor:4,seed,hp:stats(xp,loadout).maxHp,xp,training:true,loadout})
 const s=run.state,p=s.player,template=s.pending[0]
 s.enemies=Array.from({length:scenario.count},(_,i)=>{
  const e=run._enemy({...template,id:`sancai-budget-${i}`,x:p.x+105+i*7,y:p.y+(i%2)*18})
  e.hp=e.maxHp=1e9;e.moveSpeed=0;e.ai.readyAt=e.ai.graceUntil=e.ai.entryUntil=1e9
  return e
 })
 s.pending=[];s.reserved=[];s.wavePlanned=scenario.count
 const damageBySource={},pulses={sancai:0,shadow:0,formation:0},seen=new Set()
 let measured=0
 const original=run._damageEnemy
 run._damageEnemy=function(hit){
  const e=s.enemies.find(e=>e.id===hit.target),before=e.hp
  original.call(this,hit)
  if(s.time>=8){const delta=before-e.hp;measured+=delta;damageBySource[hit.source]=(damageBySource[hit.source]||0)+delta}
 }
 for(let frame=0;frame<48*60;frame++){
  if(scenario.moving){
   const e=s.enemies[0],a=frame/60*.9
   e.x=p.x+Math.cos(a)*150;e.y=p.y+Math.sin(a)*150
  }
  run.advance(1/60)
  for(const e of s.effects)if(e.kind in pulses&&!seen.has(e.id)){
   seen.add(e.id);pulses[e.kind]++
  }
  assert.equal(s.phase,'playing')
 }
 return {seed,dps:measured/40,damageBySource,manaSpent:s.manaState.spent,pulses}
}
const rows=[]
for(const build of builds)for(const scenario of scenarios){
 const samples=[101,211,307].map(seed=>sample(build,scenario,seed))
 rows.push({build:build.id,level:build.level,skills:build.skills,
  points:spentPoints({skillsInitialized:true,skills:build.skills}),
  scenario:scenario.id,dps:samples.reduce((s,x)=>s+x.dps,0)/samples.length,samples})
}
writeFileSync('reports/sancai-2026-11-04/balance.json',JSON.stringify({
 method:'Actual TowerRun 60Hz; starter weapon, no armor/ring; 48s less 8s warmup; immortal stationary/externally moved targets. Includes basic attack. Not natural acquisition, TTK, enemy combat pressure or player clear rate.',
 rows},null,2)+'\n')
console.table(rows.map(({build,scenario,points,dps})=>({build,scenario,points,dps:Math.round(dps*100)/100})))
