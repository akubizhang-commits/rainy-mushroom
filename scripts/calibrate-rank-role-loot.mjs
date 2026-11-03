import assert from 'node:assert/strict'
const CORE_RANK_VALUES=[0,1,6,24,30,36,42,48], PROPOSALS=128, WAVES=[]
const oldCredit=u=>u.role==='normal'?.05:(u.role==='elite'?[0,3,5,8,10,12,15,18]:[0,10,15,20,25,30,35,40])[u.rank]
function analyzeCoreDropModel(units, rule) {
  const width = rule.maxValue + 1, size = (rule.maxCount + 1) * width
  const forward = [new Float64Array(size)]
  forward[0][0] = 1
  for (const u of units) {
    const p = rule.chancesByRole[u.role][u.rank], d = CORE_RANK_VALUES[u.rank]
    const before = forward.at(-1), after = new Float64Array(size)
    for (let c = 0; c <= rule.maxCount; c++) for (let v = 0; v <= rule.maxValue; v++) {
      const i = c * width + v
      after[i] += before[i] * (1 - p)
      if (c < rule.maxCount && v + d <= rule.maxValue) after[i + width + d] += before[i] * p
    }
    forward.push(after)
  }
  let acceptance = 0, adjoint = new Float64Array(size)
  const counts = new Set(), values = new Set()
  for (let c = rule.minCount; c <= rule.maxCount; c++) for (let v = rule.minValue; v <= rule.maxValue; v++) {
    const i = c * width + v, mass = forward.at(-1)[i]
    acceptance += mass; adjoint[i] = 1
    if (mass > 0) { counts.add(c); values.add(v) }
  }
  assert.ok(acceptance > 0)
  const groups = new Map()
  for (let k = units.length - 1; k >= 0; k--) {
    const u = units[k], p = rule.chancesByRole[u.role][u.rank], d = CORE_RANK_VALUES[u.rank]
    const before = new Float64Array(size)
    let hits = 0
    for (let c = 0; c <= rule.maxCount; c++) for (let v = 0; v <= rule.maxValue; v++) {
      const i = c * width + v
      const include = c < rule.maxCount && v + d <= rule.maxValue ? p * adjoint[i + width + d] : 0
      before[i] = (1 - p) * adjoint[i] + include
      hits += forward[k][i] * include
    }
    const key = `${u.role}:rank${u.rank}`
    if (!groups.has(key)) groups.set(key, { name: key, role: u.role, rank: u.rank, entities: 0, hits: 0 })
    const group = groups.get(key)
    group.entities++; group.hits += hits / acceptance
    adjoint = before
  }
  const marginalRows = [...groups.values()].map(g => ({ ...g,
    effectiveChance: g.hits / g.entities,
    oldCreditChance: oldCredit(g) / CORE_RANK_VALUES[g.rank],
    effectiveValuePerEntity: g.hits / g.entities * CORE_RANK_VALUES[g.rank] }))
  const marginal = new Map(marginalRows.map(g => [g.name, g]))
  return {
    acceptanceProbability: acceptance,
    expectedProposals: (1 - (1 - acceptance) ** PROPOSALS) / acceptance,
    exhaustionProbability: (1 - acceptance) ** PROPOSALS,
    physicallyFeasibleCounts: [...counts].sort((a, b) => a - b),
    physicallyFeasibleValues: [...values].sort((a, b) => a - b),
    marginals: marginalRows,
    prefixes: WAVES.map(wave => {
      const subset = units.filter(u => u.wave <= wave)
      const old = subset.reduce((s, u) => s + oldCredit(u), 0)
      const value = subset.reduce((s, u) => s + marginal.get(`${u.role}:rank${u.rank}`).effectiveValuePerEntity, 0)
      return { wave, oldSteadyValue: old, conditionalMean: value, relativeChange: value / old - 1 }
    }),
  }
}

// Explicit approved quota input; runtime verification separately reads current content.
const normals=[{1:372},{1:300,2:110},{1:224,2:224},{2:486},{2:262,3:262},{3:450,4:112},{3:360,4:240},{3:256,4:350,5:32},{4:474,5:202}]
const elites=[{2:5},{2:3,3:2},{3:5},{3:3,4:2},{4:5},{4:3,5:2},{4:3,5:2},{4:3,5:2,6:1},{4:3,5:2,6:1}]
const bosses=[3,3,4,4,5,5,6,6,7], targets=[63,65,78,87,90,108,105,110,119]
const results=[]
for(let i=0;i<9;i++) {
 const units=Object.entries({normal:normals[i],elite:elites[i],boss:{[bosses[i]]:1}}).flatMap(([role,ranks])=>Object.entries(ranks).flatMap(([rank,n])=>Array.from({length:n},()=>({role,rank:+rank}))))
 const normalValue=units.filter(u=>u.role==='normal').length*.05
 const specialScale=(targets[i]-normalValue)/units.filter(u=>u.role!=='normal').reduce((s,u)=>s+oldCredit(u),0)
 const budget=u=>oldCredit(u)*(u.role==='normal'?1:specialScale)
 const count=units.reduce((s,u)=>s+budget(u)/CORE_RANK_VALUES[u.rank],0)
 const chancesByRole=Object.fromEntries(['normal','elite','boss'].map(role=>[role,Array(8).fill(0)]))
 for(const u of units) chancesByRole[u.role][u.rank]=budget(u)/CORE_RANK_VALUES[u.rank]
 const rule={minValue:Math.ceil(targets[i]*.9),maxValue:Math.floor(targets[i]*1.1),minCount:Math.max(1,Math.floor(count*.5)),maxCount:Math.max(3,Math.ceil(count*1.5)),chancesByRole}
 if(i===0){chancesByRole.normal[1]=.052983194626;chancesByRole.elite[2]=.874370124364;chancesByRole.boss[3]=.267608641521}
 let model
 for(let j=0;j<16;j++) {
  model=analyzeCoreDropModel(units,rule)
  if(j===15||i===0)break
  for(const g of model.marginals) {
   const target=budget(g)/CORE_RANK_VALUES[g.rank],p=chancesByRole[g.role][g.rank]
   const odds=p/(1-p)*Math.pow(target/g.effectiveChance,.7)
   chancesByRole[g.role][g.rank]=Math.min(.995,odds/(1+odds))
  }
 }
 results.push({floor:i+1,specialScale,expectedCount:count,rule,model})
}
console.log(JSON.stringify(results,null,2))
