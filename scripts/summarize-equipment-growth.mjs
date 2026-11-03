import assert from 'node:assert/strict'
import fs from 'node:fs'
const dir='reports/equipment-rebalance-2026-11-02/final-growth'
const routes=['qi','array','mixed','lance','formation','pursuit']
const median=values=>{const a=[...values].sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2}
const boss=a=>a.encounters.filter(e=>e.role==='boss'&&e.damageToDeathSeconds!==null&&e.damageToDeathSeconds!==undefined)
const samples=routes.flatMap(route=>[101,211].map(seed=>{
 const file=`${dir}/${route}-${seed}.json`
 assert.ok(fs.existsSync(file),`NOT ASSESSED — NO DATA: ${file}`)
 const r=JSON.parse(fs.readFileSync(file))
 assert.equal(r.completed,true,`Incomplete sample: ${file}`)
 assert.equal(r.sourceStable,true,`Source changed during sample: ${file}`)
 assert.ok(!r.failure,JSON.stringify(r.failure))
 const first=r.attempts.findIndex(a=>a.floor===9&&a.outcome==='won')
 const mature=r.attempts.find(a=>a.postClear&&a.level>=30&&a.outcome==='won')
 return {route,seed,sourceStable:r.sourceStable,attempts:r.attempts.length,clearedFloor:r.clearedFloor,
  firstClearSeconds:first>=0?r.attempts.slice(0,first+1).reduce((n,a)=>n+a.seconds,0):null,
  matureBossSeconds:mature?boss(mature).map(e=>e.damageToDeathSeconds):null,
  matureLevel:mature?.level??null,matureSkills:mature?.skills??null,
  outcomes:Object.fromEntries(['won','dead','abandoned'].map(out=>[out,r.attempts.filter(a=>a.outcome===out).length])),
  minHpFraction:Math.min(...r.attempts.map(a=>a.observation.minHpFraction)),
  milestones:r.realmMilestones,final:r.final,
  floors:r.attempts.filter(a=>!a.postClear).map(a=>({floor:a.floor,level:a.level,exitLevel:a.exitLevel,
   seconds:a.seconds,outcome:a.outcome,bossSeconds:boss(a).map(e=>e.damageToDeathSeconds),
   equipment:Object.fromEntries(['weapon','armor','ring'].map(slot=>[slot,a.loadout[slot]?.definitionId])),
   bossDamage:a.observation.damage.boss??{}})),
  slowEncounters:r.attempts.flatMap(a=>boss(a).filter(e=>e.damageToDeathSeconds>140).map(e=>({floor:a.floor,postClear:a.postClear,level:a.level,seconds:e.damageToDeathSeconds})))}
}))
const summary=routes.map(route=>{
 const rows=samples.filter(r=>r.route===route)
 assert.ok(rows.every(r=>r.firstClearSeconds!==null&&r.matureBossSeconds?.length),`${route}: did not complete progression`)
 return {route,firstClearMinutes:rows.map(r=>r.firstClearSeconds/60),
  medianClearMinutes:median(rows.map(r=>r.firstClearSeconds/60)),
  matureBossSeconds:rows.flatMap(r=>r.matureBossSeconds),
  medianMatureBossSeconds:median(rows.flatMap(r=>r.matureBossSeconds)),
  attempts:rows.reduce((n,r)=>n+r.attempts,0),wins:rows.reduce((n,r)=>n+r.outcomes.won,0),
  slowEncounters:rows.reduce((n,r)=>n+r.slowEncounters.length,0)}
})
const floorMedians=routes.flatMap(route=>Array.from({length:9},(_,i)=>{
 const rows=samples.filter(r=>r.route===route).flatMap(r=>r.floors.filter(a=>a.floor===i+1))
 return {route,floor:i+1,seconds:median(rows.map(a=>a.seconds)),bossSeconds:median(rows.flatMap(a=>a.bossSeconds))}
}))
const report={method:'12 deterministic new-save routes, finite resources, movement bot; not human pass-rate evidence.',
 sampleCount:samples.length,totalAttempts:samples.reduce((n,r)=>n+r.attempts,0),
 totalWins:samples.reduce((n,r)=>n+r.outcomes.won,0),allMature:samples.every(r=>r.matureLevel===30),
 maximumMedianClearSpread:Math.max(...summary.map(r=>r.medianClearMinutes))/Math.min(...summary.map(r=>r.medianClearMinutes))-1,
 maximumMedianMatureBossSpread:Math.max(...summary.map(r=>r.medianMatureBossSeconds))/Math.min(...summary.map(r=>r.medianMatureBossSeconds))-1,
 slowEncounters:samples.reduce((n,r)=>n+r.slowEncounters.length,0),summary,floorMedians,samples,
 limits:['No formally approved clear-time or inter-build tolerance; those target verdicts remain NOT ASSESSED — NO DATA.',
 '140 seconds is an attention line inherited from earlier reports, not a failure condition.',
 'Alchemy/draw/research policy differs from earlier no-pill/no-draw growth reports; no causal before/after clear-time comparison.']}
fs.writeFileSync(`${dir}/summary.json`,JSON.stringify(report,null,2)+'\n')
fs.writeFileSync(`${dir}/summary.csv`,'route,seed,first_clear_minutes,mature_boss_seconds,attempts,wins\n'+samples.map(r=>[r.route,r.seed,r.firstClearSeconds/60,r.matureBossSeconds.join(';'),r.attempts,r.outcomes.won].join(',')).join('\n')+'\n')
console.log(JSON.stringify({sampleCount:report.sampleCount,totalAttempts:report.totalAttempts,totalWins:report.totalWins,
 allMature:report.allMature,clearSpread:report.maximumMedianClearSpread,matureSpread:report.maximumMedianMatureBossSpread,
 slowEncounters:report.slowEncounters,summary},null,2))
