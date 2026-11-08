// Paired deterministic probes, not population win-rate estimates.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'

const dir=process.argv[2]??'reports/monster-combat-balance-2026-11-05'
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))
const current=read('balance-complete.json'),baseline=read('balance-baseline.json')
const extra=read('balance-baseline-array211.json')
for(const report of [current,baseline,extra]){
  assert.equal(report.completed,true,'Incomplete run')
  assert.equal(report.freshness.unchanged,true,'Source changed during run')
}
assert.deepEqual(extra.hashes,baseline.hashes,'Supplemental baseline uses different sources')
const allowed=new Set(['TowerEnemyStats.js','TowerRun.js','TowerMonsterMechanics.js',
  'TowerFormationControl.js','TowerQingping.js','TowerCampaign.js','TowerSkillPresentation.js'])
const changedSources=Object.keys(current.hashes).filter(p=>current.hashes[p]!==baseline.hashes[p])
assert.ok(changedSources.length>0)
for(const p of changedSources)assert.ok(allowed.has(path.basename(p)),`Unrelated baseline difference: ${p}`)
const A=new Map(ARCHETYPES.map(a=>[a.id,a]))
const round=n=>Math.round(n*1000)/1000
const key=s=>`${s.floor}/${s.route}/${s.quality}/${s.seed}`
const fraction=s=>{
  const parts=Object.values(s.damageByFamily)
  const physical=parts.reduce((sum,p)=>sum+p.physical,0)
  const magic=parts.reduce((sum,p)=>sum+p.magic,0)
  return physical+magic ? round(physical/(physical+magic)) : null
}
const pairs=[baseline,extra].flatMap(origin=>origin.samples.map(old=>({origin,old}))).map(({origin,old})=>{
  const next=current.samples.find(s=>key(s)===key(old))
  assert.ok(next,`Unpaired baseline ${key(old)}`)
  const f=current.fixtures.find(f=>f.floor===next.floor&&f.route===next.route&&f.quality===next.quality)
  const b=origin.fixtures.find(f=>f.floor===old.floor&&f.route===old.route&&f.quality===old.quality)
  assert.equal(f.fixtureKey,b.fixtureKey,`Loadout/XP mismatch ${key(old)}`)
  const boss=s=>s.encounters.find(e=>e.role==='boss')
  const beforeBoss=boss(old),afterBoss=boss(next)
  const encounters=old.encounters.map(before=>{
    const after=next.encounters.find(e=>e.id===before.id&&e.archetype===before.archetype)
    const a=A.get(before.archetype)
    const bothKilled=!!before.success&&!!after?.success
    return {id:before.id,archetype:before.archetype,family:a?.species,rank:a?.rank,role:before.role,
      baselineKilled:before.success,currentKilled:after?.success??false,
      baselineSeconds:before.engagedSeconds,currentSeconds:after?.engagedSeconds??null,
      // Censored deaths/timeouts are deliberately not treated as successful kill times.
      ttkRatio:bothKilled&&before.engagedSeconds>0&&after.engagedSeconds!==null
        ?round(after.engagedSeconds/before.engagedSeconds):null}
  })
  return {key:key(old),floor:old.floor,route:old.route,seed:old.seed,
    baselineOutcome:old.outcome,currentOutcome:next.outcome,
    baselineSeconds:old.time,currentSeconds:next.time,
    clearTimeRatio:old.outcome==='won'&&next.outcome==='won'?round(next.time/old.time):null,
    baselineBossSeconds:beforeBoss?.success?beforeBoss.engagedSeconds:null,
    currentBossSeconds:afterBoss?.success?afterBoss.engagedSeconds:null,
    baselinePhysicalShare:fraction(old),currentPhysicalShare:fraction(next),encounters}
})
const samples=current.samples.map(s=>({floor:s.floor,route:s.route,seed:s.seed,
  outcome:s.outcome,seconds:s.time,wave:s.lastWave,resumedNodes:s.resumedNodes,
  physicalShare:fraction(s),boss:s.encounters.find(e=>e.role==='boss')??null}))
const result={method:'Fixed synthetic entry gear/books; real 60Hz full floors, same movement bot. Paired seed 101 plus targeted floor4/array/211 follow-up; other seed 211 runs are current-only repeats. No natural acquisition, human skill or statistical win-rate claim. Timing from first observed visible engagement; encounter schedules and behavior may diverge. Physical share is effective native-target hit damage, excluding temporary summons and including overkill truncation; not raw build coefficients.',
  changedSources,pairs,samples}
const output=path.join(dir,'comparison.json')
assert.ok(!fs.existsSync(output),'Refusing to overwrite comparison')
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n')
console.log('| 层 / 路线 / 种子 | 旧版 → 当前 | 总时长（秒） | Boss 击杀时间（秒） | 当前物理占比 |')
console.log('|---|---|---:|---:|---:|')
for(const p of pairs)console.log(`| ${p.floor} / ${p.route} / ${p.seed} | ${p.baselineOutcome} → ${p.currentOutcome} | ${p.baselineSeconds} → ${p.currentSeconds} | ${p.baselineBossSeconds??'未击杀'} → ${p.currentBossSeconds??'未击杀'} | ${round(p.currentPhysicalShare*100)}% |`)
