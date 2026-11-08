// Gate-change controlled combat audit. Natural acquisition is measured separately.
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import * as W from '../js/xianxia/TowerWeapons.js'
import * as G from '../js/xianxia/TowerEquipment.js'
import * as C from '../js/xianxia/TowerRun.js'
import * as P from '../js/xianxia/TowerProfile.js'
import * as Growth from '../js/xianxia/TowerGrowth.js'
import {EQUIPMENT_ROSTER as roster} from '../js/xianxia/TowerEquipmentRoster.js'
const output=process.argv.find(a=>a.startsWith('--output=')).slice(9)
const context=process.argv.find(a=>a.startsWith('--context='))?.slice(10)??'starter'
const categoryFilter=process.argv.find(a=>a.startsWith('--category='))?.slice(11)??'all'
const identityFilter=process.argv.find(a=>a.startsWith('--ids='))?.slice(6).split(',')
assert.ok(['starter','old-top'].includes(context))
const make=d=>d.category==='weapon'?W.createFixedWeapon(d.id,d.quality?d.id:'iron'):G.createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`)
function loadout(defs,active,passive={}){
 const items=Object.fromEntries(defs.map(d=>[d.category,make(d)]))
 return {growthVersion:1,skillsInitialized:true,active,passive,evolutions:[],evolutionLevels:{},tutorialWaves:0,
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
const report={context,method:'Controlled 60Hz TowerRun, legal trained skills and point budget, same other slots; stationary immortal target, normal mana/CD; 180s discard30s, seeds101/211/307. NOT natural ownership or human pass rates.',rows:[],ehp:[]}
const fixtures={11:{qi:{sj_arc:6,sj_line:1},pursuit:{sj_yujian:6,sj_shadow:1},array:{sj_formation:1}},21:{qi:{sj_arc:9,sj_line:4},pursuit:{sj_yujian:9,sj_shadow:4},array:{sj_formation:6,sj_wanjian:3}}}
for(const [oldTier,newTier,level] of [['fa','bao',11],['bao','ling',21]]){
 for(const [route,active] of Object.entries(fixtures[level])){
  const held=baseline.map(b=>context==='starter'?b:roster.find(d=>d.category===b.category&&d.tier===oldTier&&d.quality===4&&d.role===(route==='array'?'master':'graduate')))
  for(const category of ['weapon','ring'].filter(c=>categoryFilter==='all'||categoryFilter===c)){
   const candidates=roster.filter(d=>d.category===category&&(!identityFilter||identityFilter.includes(d.id))&&(d.tier===oldTier&&d.quality===4||d.tier===newTier&&d.quality>0))
   for(const d of candidates){
    const defs=held.map(b=>b.category===category?d:b)
    const samples=[101,211,307].map(seed=>sample(defs,level,active,seed))
    report.rows.push({oldTier,newTier,level,route,category,id:d.id,name:d.name,tier:d.tier,quality:d.quality,active,held:defs.map(d=>d.id),dps:samples.reduce((s,r)=>s+r.dps,0)/3,samples})
   }
   writeFileSync(output,JSON.stringify(report,null,2));console.log(level,route,category,report.rows.length)
  }
 }
 for(const d of roster.filter(d=>d.category==='armor'&&(d.tier===oldTier&&d.quality===4||d.tier===newTier&&d.quality>0))){
  const defs=baseline.map(b=>b.category==='armor'?d:b),l=loadout(defs,{}),s=C.stats(P.cultivationLevelXp(level),l),a=G.armorModifiers(l.armor)
  report.ehp.push({level,id:d.id,name:d.name,tier:d.tier,quality:d.quality,hp:s.maxHp,physical:s.maxHp/(1-a.physicalReduction),magic:s.maxHp/(1-a.magicReduction)})
 }
}
report.complete=true;writeFileSync(output,JSON.stringify(report,null,2))
