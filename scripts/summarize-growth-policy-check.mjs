import assert from 'node:assert/strict'
import fs from 'node:fs'
const root='reports/growth-policy-crit-docs-2026-11-02'
const seeds=[101,211]
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length%2?b[(b.length-1)/2]:(b[b.length/2-1]+b[b.length/2])/2}
const signature=r=>r.attempts.map(a=>({floor:a.floor,level:a.level,seconds:a.seconds,outcome:a.outcome,
  skills:a.skills,evolutions:a.evolutions,points:a.points}))
const raw=[]
for(const policy of ['legacy','split'])for(const seed of seeds){
  const path=`${root}/${policy}-${seed}.json`
  assert.ok(fs.existsSync(path),`NOT ASSESSED — NO DATA: ${path}`)
  const r=JSON.parse(fs.readFileSync(path))
  assert.equal(r.completed,true,path)
  assert.equal(r.sourceStable,true,path)
  assert.ok(!r.blocked&&!r.failure,`${path}: ${r.blocked??JSON.stringify(r.failure)}`)
  assert.equal(r.matureRunDone,true,path)
  assert.equal(r.clearedFloor,9)
  assert.equal(r.growthPolicy,policy)
  assert.equal(r.alchemyRoute,'mixed');assert.equal(r.drawMode,'early');assert.equal(r.reserveMode,'standard')
  assert.equal(r.final.researchPurchases,0)
  if(raw.length)assert.deepEqual(r.hashes,raw[0].hashes,'all samples must use identical source')
  if(policy==='legacy'){
    const previous=JSON.parse(fs.readFileSync(`reports/equipment-rebalance-2026-11-02/final-growth/pursuit-${seed}.json`))
    assert.deepEqual(signature(r),signature(previous),'legacy must reproduce prior natural baseline')
  }
  raw.push(r)
}
const rows=raw.map(r=>{
  const first=r.attempts.findIndex(a=>a.floor===9&&a.outcome==='won')
  const mature=r.attempts.find(a=>a.postClear&&a.level===30&&a.outcome==='won')
  assert.ok(first>=0&&mature)
  const bosses=mature.encounters.filter(e=>e.role==='boss'&&Number.isFinite(e.damageToDeathSeconds))
  assert.equal(bosses.length,1)
  if(r.growthPolicy==='split'){
    assert.equal(mature.skills.sj_arc,6)
    assert.equal(mature.skills.sj_cross,3)
    assert.equal(mature.skills.sj_yujian,10)
    assert.equal(mature.skills.sj_shadow,10)
    assert.equal(mature.evolutions.evo_wanjian,2)
    assert.equal(mature.points.spent,67)
    assert.equal(mature.points.available,1)
  }
  return {policy:r.growthPolicy,seed:r.seed,attempts:r.attempts.length,
    wins:r.attempts.filter(a=>a.outcome==='won').length,
    firstClearMinutes:r.attempts.slice(0,first+1).reduce((n,a)=>n+a.seconds,0)/60,
    matureLayerSeconds:mature.seconds,matureBossSeconds:bosses[0].damageToDeathSeconds,
    matureSkills:mature.skills,matureEvolutions:mature.evolutions,maturePoints:mature.points,
    matureEquipment:Object.fromEntries(['weapon','armor','ring'].map(slot=>[slot,mature.loadout[slot]?.definitionId])),
    milestones:r.realmMilestones,final:r.final,
    floors:r.attempts.map(a=>({floor:a.floor,postClear:a.postClear,level:a.level,exitLevel:a.exitLevel,
      seconds:a.seconds,outcome:a.outcome,skills:a.skills,evolutions:a.evolutions})),
    over140Bosses:r.attempts.flatMap(a=>a.encounters.filter(e=>e.role==='boss'&&e.damageToDeathSeconds>140)
      .map(e=>({floor:a.floor,seconds:e.damageToDeathSeconds})))}
})
const policies=['legacy','split'].map(policy=>{
  const selected=rows.filter(r=>r.policy===policy)
  return {policy,firstClearMinutes:median(selected.map(r=>r.firstClearMinutes)),
    matureLayerSeconds:median(selected.map(r=>r.matureLayerSeconds)),
    matureBossSeconds:median(selected.map(r=>r.matureBossSeconds)),
    attempts:selected.reduce((n,r)=>n+r.attempts,0),wins:selected.reduce((n,r)=>n+r.wins,0)}
})
const pairs=seeds.map(seed=>{
  const before=rows.find(r=>r.seed===seed&&r.policy==='legacy'),after=rows.find(r=>r.seed===seed&&r.policy==='split')
  const old=raw.find(r=>r.seed===seed&&r.growthPolicy==='legacy'),next=raw.find(r=>r.seed===seed&&r.growthPolicy==='split')
  const firstDifferent=signature(next).findIndex((a,i)=>JSON.stringify(a)!==JSON.stringify(signature(old)[i]))
  return {seed,firstDifferentAttempt:firstDifferent<0?null:firstDifferent+1,
    firstClearTimeRatio:after.firstClearMinutes/before.firstClearMinutes,
    matureLayerTimeRatio:after.matureLayerSeconds/before.matureLayerSeconds,
    matureBossTimeRatio:after.matureBossSeconds/before.matureBossSeconds,
    sameMatureEquipment:JSON.stringify(before.matureEquipment)===JSON.stringify(after.matureEquipment)}
})
const summary={method:'Four actual new saves; paired seeds and unchanged game source, finite resources, mixed alchemy, early draw, no research. Only late pursuit bot priorities differ.',
  completed:true,sourceStable:true,legacyReproducesPrevious:true,policies,pairs,rows,
  totalAttempts:rows.reduce((n,r)=>n+r.attempts,0),totalWins:rows.reduce((n,r)=>n+r.wins,0),
  limits:['Two seeds per policy are not a human success rate or an optimum proof.',
    'This profile targets the no-research 68-earned-point budget; other routes retain their original priorities.',
    '140 seconds is an attention line, not a formally approved failure threshold.',
    'Production skill coefficients and all equipment values are unchanged. Third item (evolution ROI investigation) is out of scope.',
    'Formal growth timing and cross-flow tolerance remain NOT ASSESSED — NO DATA.']}
fs.writeFileSync(`${root}/summary.json`,JSON.stringify(summary,null,2)+'\n')
fs.writeFileSync(`${root}/summary.csv`,'policy,seed,first_clear_minutes,mature_layer_seconds,mature_boss_seconds,attempts,wins\n'
  +rows.map(r=>[r.policy,r.seed,r.firstClearMinutes,r.matureLayerSeconds,r.matureBossSeconds,r.attempts,r.wins].join(',')).join('\n')+'\n')
console.log(JSON.stringify({policies,pairs,totalAttempts:summary.totalAttempts,totalWins:summary.totalWins},null,2))
