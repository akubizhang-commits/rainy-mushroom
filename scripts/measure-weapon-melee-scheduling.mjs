import assert from 'node:assert/strict'
import fs from 'node:fs'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {WEAPONS,createFixedWeapon,createIronWeapon} from '../js/xianxia/TowerWeapons.js'
import {EQUIPMENT,createFixedEquipment,createBasicEquipment} from '../js/xianxia/TowerEquipment.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
// Controlled stationary-target laboratory, NOT a legal campaign or clear-rate
// claim. Skill release, travel, direct/periodic hits, focus and ticks are real.
const targets={fan:[null,1.05],fa:[null,1.15,1.32,1.52,1.75],bao:[null,1.45,1.67,1.92,2.2],ling:[null,1.85,2.13,2.45,2.8]}
const parents={evo_wanjian:'sj_yujian',evo_tiandi:'sj_line',evo_wuwo:'sj_wanjian',evo_sixiang:'sj_formation'}
const skills=[...Object.keys(parents),'sj_yujian','sj_shadow','sj_arc','sj_line','sj_cross','sj_wanjian','sj_formation']
function sample(tier,quality,skill,count=1){
 const parent=parents[skill]??skill
 const role=['sj_arc','sj_line','sj_cross'].includes(parent)?'qi':['sj_wanjian','sj_formation'].includes(parent)?'formation':'general'
 const wd=WEAPONS.find(d=>d.tier===tier&&d.quality===quality&&(quality===4?d.role==='graduate':tier==='fan'||d.role===role))
 const rd=EQUIPMENT.find(d=>d.category==='ring'&&d.tier===tier&&d.quality===quality&&(quality===4?d.role==='graduate':tier==='fan'||d.role==='burst'))
 const weapon=quality?createFixedWeapon(wd.id,'lab-weapon'):createIronWeapon(),ring=quality?createFixedEquipment(rd.id,'lab-ring'):createBasicEquipment('ring')
 const loadout={growthVersion:1,active:{[parent]:3},passive:{sj_heart:1,sj_bone:2},evolutions:parents[skill]?[skill]:[],evolutionLevels:parents[skill]?{[skill]:1}:{},tutorialWaves:0,weapon,weaponId:weapon.id,weaponQuality:weapon.quality,weaponRefine:0,ring,ringId:ring.id,weaponFocusCount:0}
 const run=new TowerRun({attemptId:1,floor:1,seed:977,xp:cultivationLevelXp(30),hp:100,loadout})
 // Obtain actual supported enemy records, then freeze geometry and health to
 // measure scheduling without kills, rewards, wave density or enemy AI drift.
 for(let i=0;i<120&&!run.state.enemies.length;i++)run.advance(1/60)
 assert.ok(run.state.enemies.length)
 const original=run.state.enemies[0]
 // Combined basic + skill actions: preserve actual melee target acquisition.
 run.state.enemies=Array.from({length:count},(_,i)=>({...structuredClone(original),id:`lab-${i}`,hp:1e12,maxHp:1e12,x:run.state.player.x+75+i*4,y:run.state.player.y+(i%3-1)*10}))
 run.state.pending=[];run.state.reserved=[]
 let damage=0,hits=0,direct=0,periodic=0
 const critRolls=new Map()
 const apply=run._damageEnemy.bind(run)
 run._damageEnemy=hit=>{
  const e=run.state.enemies.find(e=>e.id===hit.target);if(!e)return
  const before=e.hp
  // Stratify crit only: weapon attack rolls keep the seeded production RNG.
  // Mixing cast rolls into the crit sequence biases low-frequency skill samples.
  const random=run._random
  const critKey=`${hit.source}:${hit.target}`
  run._random=()=>{
   const roll=critRolls.get(critKey)??0;critRolls.set(critKey,roll+1)
   return ((roll*37)%100+.5)/100
  }
  try{apply(hit)}finally{run._random=random}
  damage+=before-e.hp;hits++;if(hit.direct)direct++;else periodic++
 }
 // Stratified deterministic crit draws, same rule in all samples. This is a
 // variance-reduced lab, not a replacement of the production damage formula.
 for(let tick=0;tick<10800;tick++){
  for(const e of run.state.enemies){e.ai.graceUntil=1e9;e.hp=1e12}
  run.state.player.hp=100
  run.advance(1/60)
 }
 assert.ok(hits>0,`${tier}/${quality}/${skill} has no actual hits`)
 return {damage,hits,direct,periodic,time:run.state.time}
}
const rows=[]
for(const count of [1,3,8])for(const skill of skills){
 const base=sample('fan',0,skill,count)
 for(const tier of ['fan','fa','bao','ling'])for(const q of tier==='fan'?[1]:[1,2,3,4]){
  const measured=sample(tier,q,skill,count),ratio=measured.damage/base.damage,target=targets[tier][q]
  rows.push({tier,quality:q,skill,count,target,ratio,relativeError:ratio/target-1,...measured})
 }
}
const report={seconds:180,level:30,note:'Combined basic and skill actions; stationary immortal melee targets; stratified crit per source/target, seeded attack ranges; diagnostic, not a passing skill-budget test or campaign clear-rate claim',rows,outliers:rows.filter(r=>Math.abs(r.relativeError)>.06),belowStarter:rows.filter(r=>r.ratio<1)}
fs.writeFileSync(process.argv[2]??'reports/weapon-actions-2026-11-01/melee-scheduling.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({samples:rows.length,outliers:report.outliers,belowStarter:report.belowStarter},null,2))
