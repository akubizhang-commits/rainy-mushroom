// Controlled fixtures, not natural acquisition or a search for optimal builds.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {FIXED_EQUIPMENT} from '../js/xianxia/TowerEquipmentFixed.js'
import {createHash} from 'node:crypto'
import {TowerRun, stats} from '../js/xianxia/TowerRun.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {GROWTH_SKILLS, growthSummary, skillRequirement} from '../js/xianxia/TowerGrowth.js'
import {playFixture} from './verify-monster-mechanics-balance.mjs'

const out='reports/survival-pressure-2026-11-04/boss'
const sourcePaths=[...fs.readdirSync('js/xianxia').filter(f=>f.endsWith('.js')).map(f=>`js/xianxia/${f}`),
  'scripts/verify-survival-boss-ceiling.mjs','scripts/verify-monster-mechanics-balance.mjs']
const hashes=()=>Object.fromEntries(sourcePaths.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))
const startHashes=hashes()
const natural=route=>JSON.parse(gunzipSync(fs.readFileSync(`reports/growth-check-2026-11-04/${route==='qi'?'qi':'array'}.json.gz`))).attempts.at(-1)
const equipment=natural('array').loadout
equipment.weapon={...equipment.weapon,definitionId:'eq_sword_jinghong',affixes:structuredClone(FIXED_EQUIPMENT.eq_sword_jinghong.affixes)}
const common={vajra:2,sj_bone:4,sj_heart:4,sj_mark:4,sj_spirit:3}
const active={
  qi:{sj_arc:10,sj_line:10,sj_yujian:9},
  lance:{sj_arc:10,sj_line:10,sj_yujian:9},
  array:{sj_arc:1,sj_wanjian:10,sj_formation:10,sj_yujian:4},
  formation:{sj_arc:1,sj_wanjian:10,sj_formation:10,sj_yujian:4},
  pursuit:{sj_cross:9,sj_shadow:10,sj_yujian:10},
  mixed:{sj_arc:10,sj_wanjian:10,sj_formation:10,sj_yujian:3},
}
const evolution={qi:'evo_wanjian',lance:'evo_tiandi',array:'evo_wuwo',formation:'evo_sixiang',pursuit:'evo_wanjian'}
const xp=cultivationLevelXp(30)
function make(route,{original=false,rank=2}={}){
  const previous=natural(route)
  const skills=original?previous.skills:{...common,...active[route]}
  const evo=original?previous.evolutions:evolution[route]?{[evolution[route]]:rank}:{}
  // Quote every individual purchase to verify rank, prerequisite and SP legality.
  const state={xp,clearedFloor:9,researchPurchases:0,skillsInitialized:true,skills:{},evolutionRanks:{},books:[]}
  const ordered=[...Object.entries(skills).filter(([id])=>GROWTH_SKILLS.find(d=>d.id===id).kind==='passive'),
    ...Object.entries(skills).filter(([id])=>GROWTH_SKILLS.find(d=>d.id===id).kind==='active')]
  for(const [id,n] of [...ordered,...Object.entries(evo)])for(let i=0;i<n;i++){
    const quote=skillRequirement(state,id)
    assert.ok(quote.ok,`${route}/${id}/${i}: ${quote.reason}`)
    const field=id.startsWith('evo_')?'evolutionRanks':'skills'
    state[field][id]=quote.nextLevel
    if(quote.bookCost)state.books.push(id)
  }
  const points=growthSummary(state)
  if(!original&&rank===2)assert.equal(points.spent,64)
  const loadout={...structuredClone(equipment),
    active:Object.fromEntries(Object.entries(skills).filter(([id])=>GROWTH_SKILLS.find(d=>d.id===id).kind==='active')),
    passive:Object.fromEntries(Object.entries(skills).filter(([id])=>GROWTH_SKILLS.find(d=>d.id===id).kind==='passive')),
    evolutions:Object.keys(evo),evolutionLevels:evo}
  return {floor:9,route,quality:2,mode:original?'original-allocation-common-gear':`equal-budget-rank-${rank}`,
    level:30,xp,skills,points,evolutionRanks:evo,loadout,stats:stats(xp,loadout)}
}
function controlled(f,scenario,seed){
  const run=new TowerRun({attemptId:1,floor:9,seed,xp,hp:f.stats.maxHp,loadout:f.loadout,training:true})
  // Delay attacks while waiting for the first authored actor.
  for(const id of Object.keys(run.state.cooldowns))run.state.cooldowns[id]=1e6
  for(let i=0;i<600&&!run.state.enemies.length;i++)run.advance(1/60)
  const template=run.state.enemies[0]
  assert.ok(template)
  const count=scenario==='crowd'?8:1
  run.state.enemies=Array.from({length:count},(_,i)=>({...structuredClone(template),id:`fixture-${i}`,
    hp:1e10,maxHp:1e10,orbitNextAt:0}))
  run.state.pending=[];run.state.reserved=[];run.state.projectiles=[];run.state.zones=[]
  run.state.actions.basic=null
  for(const id of Object.keys(run.state.cooldowns))run.state.cooldowns[id]=0
  const damageBySource={},damageByTarget={}
  const formationPulses={emitted:0,hit:0}
  const zonePulse=run._growthZonePulse.bind(run)
  run._growthZonePulse=(zone,outgoing,onCast)=>{
    const before=outgoing.length
    const result=zonePulse(zone,outgoing,onCast)
    if(['sj_formation','evo_sixiang'].includes(zone.formId)){
      formationPulses.emitted++
      if(outgoing.slice(before).some(hit=>hit.target===run.state.enemies[0].id))formationPulses.hit++
    }
    return result
  }
  const effect=run._effect.bind(run)
  run._effect=(kind,x,y,radius,extra)=>{
    if(kind==='hit'&&extra?.damage>0)damageBySource[extra.source??'unknown']=(damageBySource[extra.source??'unknown']??0)+extra.damage
    return effect(kind,x,y,radius,extra)
  }
  const seconds=120
  for(let frame=0;frame<seconds*60;frame++){
    const t=frame/60,p=run.state.player
    run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315})
    for(const [i,e] of run.state.enemies.entries()){
      e.ai.graceUntil=1e9
      // Moving fixture crosses the local orbit and fixed fields. It is not Boss AI.
      const radius=scenario==='moving'?200+110*Math.sin(t*.7):scenario==='far'?300:60
      const angle=scenario==='crowd'?i*Math.PI/4:scenario==='moving'?t*.8:0
      e.x=p.x+radius*Math.cos(angle);e.y=p.y+radius*Math.sin(angle)
    }
    const before=run.state.enemies.map(e=>e.hp)
    run.advance(1/60)
    assert.equal(run.state.phase,'playing')
    assert.equal(run.state.enemies.length,count)
    run.state.enemies.forEach((e,i)=>{damageByTarget[e.id]=(damageByTarget[e.id]??0)+before[i]-e.hp})
  }
  const damage=Object.values(damageByTarget).reduce((a,b)=>a+b,0)
  assert.ok(damage>0)
  const observed=Object.values(damageBySource).reduce((a,b)=>a+b,0)
  assert.ok(Math.abs(damage-observed)<1,`damage observer drift: ${damage-observed}`)
  if(scenario==='near'&&formationPulses.emitted)assert.equal(formationPulses.hit,formationPulses.emitted,'stationary target receives every emitted formation pulse')
  return {route:f.route,mode:f.mode,scenario,seed,seconds,dps:damage/seconds,formationPulses,damageBySource,damageByTarget}
}
fs.mkdirSync(out,{recursive:true})
const mode=process.argv[2]??'controlled'
const fixtures=['qi','array','formation'].map(route=>make(route))

assert.deepEqual(fixtures[1].loadout.active,fixtures[2].loadout.active)
const report={mode,method:'Level 30; identical three items, neutral Jinghong sword and passive ranks; exactly 64 SP for normalized rank-2 builds. Mixed has no evolution. Legal quotes, synthetic ownership, no acquisition claim.',
  fixtures,hashes:startHashes,rows:[]}
const save=()=>{
  report.sourceStable=JSON.stringify(startHashes)===JSON.stringify(hashes())
  assert.ok(report.sourceStable)
  fs.writeFileSync(`${out}/${mode}.json`,JSON.stringify(report,null,2)+'\n')
}
if(mode==='controlled'){
  const variants=fixtures
  for(const f of variants)for(const scenario of ['near','moving'])for(const seed of [101,211,307]){
    report.rows.push(controlled(f,scenario,seed));save()
    console.log(`${f.route} ${f.mode} ${scenario} ${seed}: ${report.rows.at(-1).dps.toFixed(1)} DPS`)
  }
}else if(mode==='encounters'){
  const selected=process.argv[3]
  if(selected)report.fixtures=fixtures.filter(f=>f.route===selected)
  for(const f of report.fixtures)for(const seed of [101,211,307]){
    const result=playFixture(f,{seed,maxSeconds:1200})
    report.rows.push(result)
    console.log(JSON.stringify({route:f.route,seed,outcome:result.outcome,time:result.time,
      boss:result.encounters.filter(e=>e.role==='boss').map(e=>e.firstDamageSeconds)}))
  }
}else throw Error(`Unknown mode ${mode}`)
if(mode==='encounters'&&process.argv[3]){
  report.sourceStable=JSON.stringify(startHashes)===JSON.stringify(hashes())
  assert.ok(report.sourceStable)
  fs.writeFileSync(`${out}/encounters-${process.argv[3]}.json`,JSON.stringify(report,null,2)+'\n')
}else save()
