import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {TowerRun,stats} from '../js/xianxia/TowerRun.js'
import {WEAPONS,createFixedWeapon} from '../js/xianxia/TowerWeapons.js'
import {EQUIPMENT,createFixedEquipment} from '../js/xianxia/TowerEquipment.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {GROWTH_SKILLS,rankCap} from '../js/xianxia/TowerGrowth.js'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {standardCases,trainFixture,trainingCampaign,openFixtureCampaign} from './helpers/equipment-standard-fixtures.mjs'
// Approved integer-budget §8: all three slots, normal mana and basic attacks,
// 180s at 60Hz, discard the first30s, mean of three seeds. Not a win-rate test.
const roster=[...WEAPONS,...EQUIPMENT]
const starter=roster.filter(d=>d.quality===0)
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
function rejectWithoutWriting(fixture,id,reason){
 const {store}=fixture,before=store.state,raw=fixture.raw,writes=fixture.writes
 assert.equal(store.act({type:'learnSkill',id},0).reason,reason)
 assert.equal(store.state,before)
 assert.equal(fixture.raw,raw)
 assert.equal(fixture.writes,writes)
}
function rejectCurrentSnapshot(state){
 const fixture=openFixtureCampaign(state)
 assert.equal(fixture.store.readOnly,true)
 assert.equal(fixture.store.error,'corrupt')
 assert.equal(fixture.store.migrationReport,null)
 assert.equal(fixture.writes,0,'invalid current snapshots cannot be repaired or migrated')
 return fixture
}

test('Campaign rejects pre17 orbit learning and training beyond rank3 at17 or rank6 at21',()=>{
 const orbit=GROWTH_SKILLS.find(d=>d.id==='sj_wanjian')
 assert.equal(orbit.learnLevel,17)
 for(const [level,cap,reason] of [[1,0,'stage-locked'],[4,0,'stage-locked'],[11,0,'stage-locked'],[16,0,'stage-locked'],[17,3,'realm-locked'],[21,6,'realm-locked']]){
  assert.equal(rankCap('sj_wanjian',cultivationLevelXp(level),0),cap)
  const {fixture}=trainFixture(level,cap?{sj_wanjian:cap}:{})
  rejectWithoutWriting(fixture,'sj_wanjian',reason)
 }
})
test('Campaign rejects all21 original illegal fixtures instead of accepting or resetting them',()=>{
 let invalid=0
 for(const row of standardCases().filter(row=>row.changed)){
  const {store}=trainingCampaign(row.level)
  const state={...structuredClone(store.state),skills:{...row.requestedActive},
   books:GROWTH_SKILLS.filter(d=>d.special&&row.requestedActive[d.id]).map(d=>d.id)}
  rejectCurrentSnapshot(state)
  assert.throws(()=>trainFixture(row.level,row.requestedActive),/stage-locked|realm-locked/)
  invalid++
 }
 assert.equal(invalid,21)
})
test('Campaign rejects natural-point overspending despite legal individual ranks',()=>{
 for(const [level,active,extra] of [[1,{sj_arc:1},'sj_arc'],[4,{sj_arc:3,sj_yujian:1},'sj_yujian']]){
  const {fixture,training}=trainFixture(level,active)
  assert.equal(training.available,0)
  rejectWithoutWriting(fixture,extra,'insufficient-points')
  const illegal={...active,[extra]:active[extra]+1}
  rejectCurrentSnapshot({...structuredClone(fixture.store.state),skills:illegal})
  assert.throws(()=>trainFixture(level,illegal),/insufficient-points/)
 }
})
test('Campaign enforces evolution parent prerequisites before the normal book purchase',()=>{
 const fixture=trainingCampaign(21,2400)
 rejectWithoutWriting(fixture,'evo_wanjian','parent-required')
 assert.equal(fixture.store.act({type:'learnSkill',id:'sj_yujian'},0).ok,true)
 const result=fixture.store.act({type:'learnSkill',id:'evo_wanjian'},0)
 assert.equal(result.ok,true)
 assert.equal(result.bookCost,2400)
 assert.equal(fixture.store.state.evolutionRanks.evo_wanjian,1)
 assert.equal(new TowerCampaignStore(fixture.disk,0).readOnly,false)
})
test('all50 rebuilt fixtures learn and reload legally with29 unchanged and explicit missing-route coverage',()=>{
 const rows=standardCases(),counts={},natural={1:1,4:4,11:18,21:41}
 assert.equal(rows.length,50)
 assert.equal(rows.filter(row=>row.changed).length,21)
 assert.equal(rows.filter(row=>!row.changed).length,29)
 for(const row of rows){
  const {training}=trainFixture(row.level,row.active)
  assert.equal(training.pointBudget,natural[row.level])
  counts[row.coverage.kind]=(counts[row.coverage.kind]??0)+1
  if(!row.changed)assert.deepEqual(row.active,row.requestedActive)
 }
 assert.deepEqual(counts,{complete:29,'preparatory-basic':5,'preparatory-qi':4,'partial-formation':4,'partial-mixed':4,'capped-array':4})
 assert.equal(rows.filter(row=>row.coverage.missingOrbitRoute).length,17)
})
test('all50 legal three-slot cases measure150 samples and satisfy their approved180s DPS target within10percent',t=>{
 // Validate independently of the legality test: an illegal case fails explicitly
 // before measurement. No filtering, skip, or invalid-row continue is permitted.
 const fixtures=standardCases().map(row=>({...row,training:trainFixture(row.level,row.active).training}))
 const rows=[],failures=[],baselines=new Map()
 for(const fixture of fixtures){
  const {tier,quality,route,level,active}=fixture,key=`${level}/${route}`
  if(!baselines.has(key))baselines.set(key,new Map([101,211,307].map(seed=>[seed,sample(starter,level,active,seed)])))
  const defs=definitions(tier,quality,route),common={...fixture,ids:defs.map(d=>d.id)}
  const samples=[101,211,307].map(seed=>{const measured=sample(defs,level,active,seed),base=baselines.get(key).get(seed);return {seed,...measured,baselineDps:base.dps,ratio:measured.dps/base.dps}})
  const ratio=samples.reduce((n,s)=>n+s.ratio,0)/samples.length,relativeError=ratio/common.target-1
  const row={...common,status:Math.abs(relativeError)<=.10?'passed':'outside-target',ratio,relativeError,samples}
  rows.push(row);if(row.status!=='passed')failures.push(row)
 }
 assert.equal(rows.length,50)
 assert.equal(rows.reduce((n,row)=>n+row.samples.length,0),150)
 const baselineRows=Array.from(baselines,([fixture,samples])=>({fixture,samples:Array.from(samples,([seed,result])=>({seed,...result}))}))
 const counts={cases:rows.length,samples:rows.reduce((n,row)=>n+row.samples.length,0),baselineSamples:baselineRows.reduce((n,row)=>n+row.samples.length,0),
  unchanged:rows.filter(row=>!row.changed).length,rebuilt:rows.filter(row=>row.changed).length,
  missingOrbitRoute:rows.filter(row=>row.coverage.missingOrbitRoute).length,cappedOrbitRank:rows.filter(row=>row.coverage.kind==='capped-array').length,
  passed:rows.length-failures.length,outsideTarget:failures.length}
 const report={method:'180s real60Hz simulation, 30s warmup, normal three-slot equipment/basic attacks/mana, seeds101/211/307',
  policy:'Frozen minimal pruning/capping before DPS; no free-point reassignment; original29 unchanged; targets and tolerance unchanged.',counts,baselines:baselineRows,rows}
 if(process.env.EQUIPMENT_SCHEDULING_REPORT)fs.writeFileSync(process.env.EQUIPMENT_SCHEDULING_REPORT,JSON.stringify(report,null,2)+'\n')
 t.diagnostic(JSON.stringify({counts,failures}))
 assert.deepEqual(failures,[],'Genuine target misses require design review; legal preparation does not waive the original targets or10percent tolerance.')
})
