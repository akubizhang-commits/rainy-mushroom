import assert from 'node:assert/strict'
import fs from 'node:fs'
const root='reports/flow-equal-budget-2026-11-02'
const read=name=>JSON.parse(fs.readFileSync(`${root}/${name}.json`))
const lab=read('controlled'),routes=['qi','lance','array','formation','pursuit','mixed']
assert.equal(lab.rows.length,204)
const runs=routes.map(route=>read(`encounters-${route}`))
for(const report of [lab,...runs]){
  assert.equal(report.sourceStable,true)
  assert.deepEqual(report.hashes,lab.hashes)
}
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length%2?b[(b.length-1)/2]:(b[b.length/2-1]+b[b.length/2])/2}
const labMedian=(route,mode,scenario)=>median(lab.rows.filter(r=>r.route===route&&r.mode===mode&&r.scenario===scenario).map(r=>r.dps))
const rows=routes.map(route=>{
  const f=lab.fixtures.find(f=>f.route===route),samples=runs.find(r=>r.rows[0].route===route).rows
  assert.equal(samples.length,3)
  for(const s of samples)assert.equal(s.encounters.filter(e=>e.role==='boss').length,1)
  const dps=Object.fromEntries(['near','far','moving','crowd'].map(s=>[s,labMedian(route,'equal-budget-rank-2',s)]))
  return {route,skills:f.skills,evolutionRanks:f.evolutionRanks,points:f.points,
    wins:samples.filter(s=>s.outcome==='won').length,n:samples.length,
    layerMedian:median(samples.map(s=>s.time)),
    bossFirstDamageMedian:median(samples.map(s=>s.encounters.find(e=>e.role==='boss').firstDamageSeconds)),
    bossEngagedMedian:median(samples.map(s=>s.encounters.find(e=>e.role==='boss').engagedSeconds)),
    // This is a difference of timings, not a measured normal-wave total.
    beforeBossDamageMedian:median(samples.map(s=>s.time-s.encounters.find(e=>e.role==='boss').firstDamageSeconds)),
    dps,movingRetention:dps.moving/dps.near,
    rankTwoOverOne:route==='mixed'?null:Object.fromEntries(Object.keys(dps).map(s=>[s,dps[s]/labMedian(route,'equal-budget-rank-1',s)])),
    normalizedOverOriginal:Object.fromEntries(Object.keys(dps).map(s=>[s,dps[s]/labMedian(route,'original-allocation-common-gear',s)]))}
})
const summary={method:lab.method,labCases:lab.rows.length,encounters:runs.flatMap(r=>r.rows).length,
  sourceStable:true,rows,limitations:[
    'No formal cross-flow tolerance, human timing or globally optimal allocation target exists.',
    'Near/far/moving/crowd are immortal synthetic targets with incoming attacks disabled; actual seeded damage, crits, scheduling, target caps and wounds run.',
    'Rank-one ablations keep the same base ranks and have 2 or 4 fewer spent points, rather than reallocating the saved points.',
    'Identical gear is controlled but favors qi; it is not each route’s best equipment.',
    'The full floor uses real enemy AI and movement-only route-adaptive bot. Not identical player trajectories or human performance.',
    'Original-allocation lab cases share the controlled gear; they are not a replay of the earlier natural campaign.',
    'Mixed intentionally has no evolution, and is a reference build rather than an equal-evolution pair.',
  ]}
summary.allocationSensitivity=['arc','split'].map(variant=>{
  const r=read(`encounters-pursuit-${variant}`)
  assert.ok(r.sourceStable)
  assert.deepEqual(r.hashes,lab.hashes)
  assert.deepEqual(r.fixture.points,lab.fixtures[0].points)
  assert.equal(r.rows.length,3)
  return {variant,skills:r.fixture.skills,points:r.fixture.points,
    wins:r.rows.filter(s=>s.outcome==='won').length,n:r.rows.length,
    layerMedian:median(r.rows.map(s=>s.time)),
    bossMedian:median(r.rows.map(s=>s.encounters.find(e=>e.role==='boss').firstDamageSeconds)),
    samples:r.rows.map(s=>({seed:s.seed,time:s.time,boss:s.encounters.find(e=>e.role==='boss').firstDamageSeconds}))}
})
summary.totalFullFloorCases=summary.encounters+summary.allocationSensitivity.reduce((n,r)=>n+r.n,0)
assert.equal(summary.totalFullFloorCases,24)
summary.pointAccounting='Initialized/refunded teaching-point convention: 69 total sources, 68 spent, 1 deliberately unspent for every normalized/variant build. Natural reports use the uninitialized free-arc convention (68 earned points); these labels must not be equated directly.'
const natural=JSON.parse(fs.readFileSync('reports/equipment-rebalance-2026-11-02/final-growth/array-101.json'))
summary.productionChangedSinceNatural=Object.entries(lab.hashes).filter(([p,h])=>p.startsWith('js/')&&natural.hashes[p]!==h).map(([p])=>p)
assert.deepEqual(summary.productionChangedSinceNatural,[])
fs.writeFileSync(`${root}/summary.json`,JSON.stringify(summary,null,2)+'\n')
fs.writeFileSync(`${root}/summary.csv`,[
  'route,spent,layer_seconds,boss_first_damage_seconds,near_dps,far_dps,moving_dps,crowd_dps,moving_retention,wins,n',
  ...rows.map(r=>[r.route,r.points.spent,r.layerMedian,r.bossFirstDamageMedian,...Object.values(r.dps),r.movingRetention,r.wins,r.n].join(','))
].join('\n')+'\n')
console.log(JSON.stringify(summary,null,2))
