import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {TowerRun,stats} from '../js/xianxia/TowerRun.js'
import {WEAPONS,createFixedWeapon} from '../js/xianxia/TowerWeapons.js'
import {EQUIPMENT,createFixedEquipment} from '../js/xianxia/TowerEquipment.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {GROWTH_SKILLS,rankCap,growthSummary} from '../js/xianxia/TowerGrowth.js'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {currentCampaignSchema} from './helpers/tower-schema.mjs'
import {assertCurrentCampaign} from './helpers/tower-current-state.mjs'
// Approved integer-budget §8: all three slots, normal mana and basic attacks,
// 180s at 60Hz, discard the first30s, mean of three seeds. Not a win-rate test.
const targets={fan:[null,1.30],fa:[null,1.80,2.20,2.70,3.30],bao:[null,2.10,2.70,3.30,4.00],ling:[null,2.60,3.30,4.10,5.00]}
const levels={fan:1,fa:4,bao:11,ling:21}
// Keep every authored standard case. Current gate conflicts must remain visible,
// not be silently removed, trained illegally or replaced with a different build.
const standard={
 1:{qi:{sj_arc:1},array:{sj_wanjian:1}},
 4:{qi:{sj_arc:3},pursuit:{sj_yujian:1},array:{sj_wanjian:3},mixed:{sj_arc:1,sj_wanjian:1}},
 11:{qi:{sj_arc:6,sj_line:1},pursuit:{sj_yujian:3,sj_shadow:1},array:{sj_wanjian:6,sj_formation:1},mixed:{sj_arc:3,sj_wanjian:3,sj_formation:1}},
 21:{qi:{sj_arc:9,sj_line:4},pursuit:{sj_yujian:3,sj_shadow:4},array:{sj_wanjian:9,sj_formation:4},mixed:{sj_arc:6,sj_wanjian:6,sj_shadow:3}},
}
const roster=[...WEAPONS,...EQUIPMENT]
const starter=roster.filter(d=>d.quality===0)
function validateFixture(level,active){
 const state=structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
 Object.assign(state,{xp:cultivationLevelXp(level),skillsInitialized:true,skills:{...active},
  books:GROWTH_SKILLS.filter(d=>d.special&&active[d.id]).map(d=>d.id)})
 const errors=[]
 for(const [id,n] of Object.entries(active)){
  const d=GROWTH_SKILLS.find(d=>d.id===id)
  if(level<d.learnLevel||n>rankCap(id,state.xp,state.clearedFloor))errors.push(`${id} rank${n}: learnLevel${d.learnLevel}, current rank cap${rankCap(id,state.xp,state.clearedFloor)}`)
 }
 if(growthSummary(state).available<0)errors.push('overspent natural skill points')
 if(errors.length)return errors
 const data=JSON.stringify(state),raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
 assertCurrentCampaign(new TowerCampaignStore({getItem:()=>raw,setItem(){throw Error('fixture must not migrate')}},0),state)
 return []
}
function definitions(tier,q,route){
 const caster=['array','mixed'].includes(route)
 return ['weapon','armor','ring'].map(category=>{
  const role=tier==='fan'?'transition':q===4?(caster?'master':'graduate'):
   category==='weapon'?(route==='qi'?'qi':route==='array'?'formation':'general'):category==='armor'?(caster?'recovery':'guard'):(caster?'cadence':'burst')
  const d=roster.find(d=>d.category===category&&d.tier===tier&&d.quality===q&&d.role===role)
  assert.ok(d,`${tier}/${q}/${category}/${role}`);return d
 })
}
function sample(defs,level,active,seed){
 const items=Object.fromEntries(defs.map(d=>[d.category,d.category==='weapon'?createFixedWeapon(d.id,d.quality?d.id:'iron'):createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`)]))
 const loadout={growthVersion:1,skillsInitialized:true,active:{...active},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,
  ...items,weaponQuality:items.weapon.quality,weaponRefine:0,weaponFocusCount:0,
  ...Object.fromEntries(Object.entries(items).map(([k,v])=>[`${k}Id`,v.id]))}
 const xp=cultivationLevelXp(level),sheet=stats(xp,loadout)
 const run=new TowerRun({attemptId:1,floor:9,seed,xp,hp:sheet.maxHp,training:true,loadout})
 for(const id of Object.keys(active))run.state.cooldowns[id]=1e9
 for(let i=0;i<600&&!run.state.enemies.length;i++)run.advance(1/60)
 const template=run.state.enemies[0];assert.ok(template)
 run.state.enemies=[{...structuredClone(template),id:'controlled-target',hp:1e12,maxHp:1e12,radius:24,
  mechanic:undefined,speed:0,ai:{...structuredClone(template.ai),graceUntil:1e9}}]
 run.state.pending=[];run.state.reserved=[];run.state.projectiles=[];run.state.zones=[]
 for(const id of Object.keys(active))run.state.cooldowns[id]=0
 const start=run.state.time;let damage=0,hits=0
 const original=run._damageEnemy
 run._damageEnemy=function(hit){
  const e=this.state.enemies.find(e=>e.id===hit.target),before=e?.hp??0,result=original.call(this,hit)
  if(this.state.time>=start+30&&e){damage+=Math.max(0,before-e.hp);hits++}
  return result
 }
 for(let i=0;i<10800;i++){
  const e=run.state.enemies[0],p=run.state.player
  e.x=p.x+100;e.y=p.y;e.ai.graceUntil=1e9
  run.advance(1/60)
  assert.equal(run.state.phase,'playing');assert.equal(run.state.enemies.length,1)
 }
 assert.ok(hits>0);assert.ok(damage>0)
 return {dps:damage/150,hits,manaSpent:run.state.manaState.spent}
}
test('current orbit gates reject pre17 training and cap rank6 at21 without changing the authored budget scenarios',()=>{
 const orbit=GROWTH_SKILLS.find(d=>d.id==='sj_wanjian')
 assert.equal(orbit.learnLevel,17)
 assert.equal(rankCap('sj_wanjian',cultivationLevelXp(16),0),0)
 assert.equal(rankCap('sj_wanjian',cultivationLevelXp(17),0),3)
 assert.equal(rankCap('sj_wanjian',cultivationLevelXp(21),0),6)
 assert.deepEqual(validateFixture(17,{sj_wanjian:3}),[])
 assert.deepEqual(validateFixture(21,{sj_wanjian:6}),[])
})
test('all50 authored three-slot standard cases are legal and satisfy their approved180s DPS target within10percent',t=>{
 const rows=[],failures=[]
 for(const tier of ['fan','fa','bao','ling']){
  const level=levels[tier]
  for(const [route,active] of Object.entries(standard[level])){
   const errors=validateFixture(level,active),baselines=new Map()
   if(!errors.length)for(const seed of [101,211,307])baselines.set(seed,sample(starter,level,active,seed))
   for(let quality=1;quality<=(tier==='fan'?1:4);quality++){
    const common={tier,quality,route,level,active,target:targets[tier][quality],ids:definitions(tier,quality,route).map(d=>d.id)}
    if(errors.length){const row={...common,status:'invalid-authored-fixture',errors};rows.push(row);failures.push(row);continue}
    const samples=[101,211,307].map(seed=>{const measured=sample(definitions(tier,quality,route),level,active,seed),base=baselines.get(seed);return {seed,...measured,baselineDps:base.dps,ratio:measured.dps/base.dps}})
    const ratio=samples.reduce((n,s)=>n+s.ratio,0)/samples.length,relativeError=ratio/common.target-1
    const row={...common,status:Math.abs(relativeError)<=.10?'passed':'outside-target',ratio,relativeError,samples}
    rows.push(row);if(row.status!=='passed')failures.push(row)
   }
  }
 }
 assert.equal(rows.length,50)
 const report={method:'180s real60Hz simulation, 30s warmup, normal three-slot equipment/basic attacks/mana, seeds101/211/307',rows}
 if(process.env.EQUIPMENT_SCHEDULING_REPORT)fs.writeFileSync(process.env.EQUIPMENT_SCHEDULING_REPORT,JSON.stringify(report,null,2)+'\n')
 t.diagnostic(JSON.stringify({cases:rows.length,valid:rows.filter(r=>r.status!=='invalid-authored-fixture').length,failures}))
 assert.deepEqual(failures,[],'Authored fixture conflicts and genuine target misses require design review; no tolerance or production tuning was changed.')
})
