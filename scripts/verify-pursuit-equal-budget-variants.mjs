import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {growthSummary,skillRequirement,GROWTH_SKILLS} from '../js/xianxia/TowerGrowth.js'
import {stats} from '../js/xianxia/TowerRun.js'
import {playFixture} from './verify-monster-mechanics-balance.mjs'
const root='reports/flow-equal-budget-2026-11-02'
const baseline=JSON.parse(fs.readFileSync(`${root}/controlled.json`))
const base=baseline.fixtures.find(f=>f.route==='pursuit')
const hashes=()=>Object.fromEntries(Object.keys(baseline.hashes).map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))
assert.deepEqual(hashes(),baseline.hashes)
const variant=process.argv[2]
assert.ok(['arc','split'].includes(variant))
const f=structuredClone(base)
f.route=`pursuit-${variant}`
f.loadout.active=variant==='arc'?{sj_yujian:10,sj_shadow:10,sj_arc:9}
  :{sj_yujian:10,sj_shadow:10,sj_arc:6,sj_cross:3}
f.skills={...f.loadout.passive,...f.loadout.active}
const state={xp:f.xp,clearedFloor:9,researchPurchases:0,skillsInitialized:true,skills:{},evolutionRanks:{},books:[]}
for(const [id,n] of [...Object.entries(f.skills),...Object.entries(f.evolutionRanks)])for(let i=0;i<n;i++){
  const q=skillRequirement(state,id)
  assert.ok(q.ok,`${id}/${i}: ${q.reason}`)
  state[id.startsWith('evo_')?'evolutionRanks':'skills'][id]=q.nextLevel
  if(q.bookCost)state.books.push(id)
}
f.points=growthSummary(state)
assert.deepEqual(f.points,base.points)
assert.deepEqual(f.loadout.passive,base.loadout.passive)
f.stats=stats(f.xp,f.loadout)
const report={method:'Pursuit allocation sensitivity; same base10/evolution2, same support ranks, same equipment, same 68 spent points including teaching point. Change only the 9-point secondary skill package.',
  fixture:f,hashes:baseline.hashes,scriptHash:createHash('sha256').update(fs.readFileSync('scripts/verify-pursuit-equal-budget-variants.mjs')).digest('hex'),rows:[]}
for(const seed of [101,211,307]){
  const result=playFixture(f,{seed,maxSeconds:1200})
  report.rows.push(result)
  console.log(JSON.stringify({route:f.route,seed,outcome:result.outcome,time:result.time,boss:result.encounters.filter(e=>e.role==='boss').map(e=>e.firstDamageSeconds)}))
}
assert.deepEqual(hashes(),baseline.hashes)
report.sourceStable=true
fs.writeFileSync(`${root}/encounters-pursuit-${variant}.json`,JSON.stringify(report,null,2)+'\n')
