// Formation transition A/B audit. Run this same script in each frozen version.
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import * as W from '../js/xianxia/TowerWeapons.js'
import * as G from '../js/xianxia/TowerEquipment.js'
import * as C from '../js/xianxia/TowerRun.js'
import * as P from '../js/xianxia/TowerProfile.js'
import * as Growth from '../js/xianxia/TowerGrowth.js'
import {EQUIPMENT_ROSTER as roster} from '../js/xianxia/TowerEquipmentRoster.js'
const output=process.argv.find(a=>a.startsWith('--output=')).slice(9)
const selectedLabels=process.argv.find(a=>a.startsWith('--labels='))?.slice(9).split(',')
let evolutionUnderTest=null
const make=d=>d.category==='weapon'?W.createFixedWeapon(d.id,d.quality?d.id:'iron'):G.createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`)
function loadout(defs,active,passive={}){
 const items=Object.fromEntries(defs.map(d=>[d.category,make(d)]))
 return {growthVersion:1,skillsInitialized:true,active,passive,evolutions:evolutionUnderTest?[evolutionUnderTest.id]:[],evolutionLevels:evolutionUnderTest?{[evolutionUnderTest.id]:evolutionUnderTest.rank}:{},tutorialWaves:0,
  ...items,weaponQuality:items.weapon.quality,weaponRefine:0,weaponFocusCount:0,
  ...Object.fromEntries(Object.entries(items).map(([k,v])=>[`${k}Id`,v.id]))}
}
function sample(defs,level,active,seed,seconds=180,count=1,passive={}){
 for(const [id,rank] of Object.entries({...active,...passive})){
  const d=Growth.GROWTH_SKILLS.find(d=>d.id===id)
  assert.ok(level>=d.learnLevel&&level>=d.rankRequirements[rank-1].characterLevel,`${id}/${rank}/${level}`)
  for(const [p,n] of Object.entries(d.rankRequirements[rank-1].prerequisites??{}))
   assert.ok((passive[p]??active[p]??0)>=n,`${id} requires ${p} ${n}`)
 }
 const xp=P.cultivationLevelXp(level),l=loadout(defs,active,passive),stats=C.stats(xp,l)
 const spent=Growth.spentPoints({skillsInitialized:true,skills:{...active,...passive}})
 assert.ok(spent<=Growth.realmPoints(xp)+1,`Fixture overspends naturally available points: ${spent}`)
 const run=new C.TowerRun({attemptId:1,floor:9,seed,xp,hp:stats.maxHp,training:true,loadout:l})
 for(const id of Object.keys(l.active))run.state.cooldowns[id]=1e9
 for(let i=0;i<600&&!run.state.enemies.length;i++)run.advance(1/60)
 const template=run.state.enemies[0];assert.ok(template)
 run.state.enemies=Array.from({length:count},(_,i)=>({...structuredClone(template),id:`controlled-${i}`,hp:1e12,maxHp:1e12,radius:24,
  mechanic:undefined,speed:0,ai:{...structuredClone(template.ai),graceUntil:1e9}}))
 run.state.pending=[];run.state.reserved=[];run.state.projectiles=[];run.state.zones=[]
 for(const id of Object.keys(l.active))run.state.cooldowns[id]=0
 const start=run.state.time,warmup=seconds===180?30:Math.min(10,seconds/3)
 let damage=0,hits=0,damageBySource={},manaMin=stats.maxMana
 const original=run._damageEnemy
 run._damageEnemy=function(hit){
  const e=this.state.enemies.find(e=>e.id===hit.target),before=e?.hp??0
  const value=original.call(this,hit)
  if(this.state.time>=start+warmup&&e){
   const delta=Math.max(0,before-e.hp),source=hit.impact?.skill??hit.source??'unknown'
   damage+=delta;hits++;damageBySource[source]=(damageBySource[source]??0)+delta
  }
  return value
 }
 for(let i=0;i<seconds*60;i++){
  const p=run.state.player
  run.state.enemies.forEach((e,j)=>{
   e.x=p.x+100+(count===5?j*45:(j%5)*8);e.y=p.y+(count===5?(j%2?1:-1)*j*45:Math.floor(j/5)*8)
   e.ai.graceUntil=1e9
  })
  run.advance(1/60);manaMin=Math.min(manaMin,p.mana)
  assert.equal(run.state.phase,'playing');assert.equal(run.state.enemies.length,count)
 }
 return {dps:damage/(seconds-warmup),damage,hits,damageBySource,manaMin,manaSpent:run.state.manaState.spent,stats}
}


const baseline=roster.filter(d=>d.quality===0)
const rows=[]
function record(kind,label,defs,level,active,evolution=null){
 if(selectedLabels&&!selectedLabels.includes(label))return
 evolutionUnderTest=evolution
 const samples=[101,211,307].map(seed=>sample(defs,level,active,seed))
 rows.push({kind,label,level,active,evolution,ids:defs.map(d=>d.id),dps:samples.reduce((s,x)=>s+x.dps,0)/samples.length,samples})
}
for(const rank of [1,6,7,8,9,10])record('skill',`liangyi-${rank}`,baseline,30,{sj_formation:rank})
for(const er of [1,2])for(const rank of [6,10])record('skill',`sixiang-${er}-parent-${rank}`,baseline,30,{sj_formation:rank},{id:'evo_sixiang',rank:er})
const overcap=baseline.map(d=>d.category==='weapon'?roster.find(w=>w.id==='eq_sword_taiheng'):d)
record('skill','liangyi-equipment11',overcap,30,{sj_formation:10})
record('skill','sixiang-equipment11',overcap,30,{sj_formation:10},{id:'evo_sixiang',rank:1})
// Actual high-rank array budget around floor eight: level 23, Liangyi10 + orbit6.
for(const context of ['starter','old-top']){
 const held=baseline.map(b=>context==='starter'?b:roster.find(d=>d.category===b.category&&d.tier==='bao'&&d.quality===4&&d.role==='master'))
 for(const w of roster.filter(d=>d.category==='weapon'&&(d.tier==='bao'&&d.quality===4||d.tier==='ling'&&[1,2,3].includes(d.quality))))
  record('weapon',`${context}:${w.id}`,held.map(d=>d.category==='weapon'?w:d),23,{sj_formation:10,sj_wanjian:6})
}
writeFileSync(output,JSON.stringify({complete:true,method:'Actual 60Hz stationary immortal target, normal mana/CD, legal ranks, 180s minus30s warmup, three seeds; not natural ownership or clear rate.',rows},null,2)+'\n')
console.log(`Complete ${rows.length} cases / ${rows.length*3} combat samples`)
