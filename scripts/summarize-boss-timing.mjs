import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {cultivationAt} from '../js/xianxia/TowerProfile.js'

const dir=process.argv[2]??'reports/boss-pacing-2026-11-05'
const rows=[]
for(const route of ['qi','array','mixed']){
  const journey=JSON.parse(fs.readFileSync(path.join(dir,`${route}.json`)))
  const timing=JSON.parse(fs.readFileSync(path.join(dir,`${route}.json.timing.json`)))
  assert.ok(journey.completed&&journey.sourceStable&&timing.completed&&timing.sourceStable,`Incomplete or stale ${route}`)
  for(const boss of timing.bosses){
    const attempt=journey.attempts.find(a=>a.attempt===boss.attemptId&&a.floor===boss.floor)
    assert.ok(attempt,`Missing attempt ${boss.key}`)
    const encounter=attempt.encounters.find(e=>e.id===boss.id)
    assert.ok(encounter,`Missing encounter ${boss.key}`)
    assert.ok(Math.abs(Object.values(boss.geometry).reduce((a,b)=>a+b,0)-boss.seconds)<1e-6)
    if(boss.killed)assert.ok(Math.abs(boss.damage-boss.healing-boss.maxHp)<1e-4,`Damage accounting ${boss.key}`)
    const pct=n=>Math.round(n/boss.seconds*1000)/10
    rows.push({route,floor:boss.floor,attempt:boss.attemptId,postClear:attempt.postClear,
      outcome:attempt.outcome,bossKilled:boss.killed,
      level:cultivationAt(boss.entryXp).level,
      weapon:boss.entryLoadout.weapon?.definitionId,quality:boss.entryLoadout.weapon?.quality,
      spawnToEndSeconds:boss.seconds,visibleToDeathSeconds:encounter.visibleRangeToDeathSeconds,
      firstDamageToDeathSeconds:encounter.damageToDeathSeconds,
      mechanicZeroPct:pct(boss.geometry.mechanicZero),
      outsideEnvelopePct:pct(boss.geometry.outsideEnvelope),lineBlockedPct:pct(boss.geometry.lineBlocked),
      envelopeAndLineClearPct:pct(boss.geometry.withinEnvelopeLineClear),
      manaBlockedPct:pct(boss.manaBlockedSeconds),bodyBusyPct:pct(boss.bodyBusySeconds),
      armorPct:pct(boss.armorSeconds),vulnerablePct:pct(boss.vulnerableSeconds),
      longestHitGap:boss.longestHitGap,bossDamage:boss.damage,healing:boss.healing,
      offBossDamage:boss.offBossDamage,manaSpent:boss.manaSpent,pillUses:boss.pillUses,
      damageBySource:boss.damageBySource,manaBlockedBySkill:boss.manaBlockedBySkill})
  }
}
const output=path.join(dir,'timing-summary.json')
assert.ok(!fs.existsSync(output),'Refusing to overwrite summary')
fs.writeFileSync(output,JSON.stringify({method:'Natural Campaign observations; geometry and resource percentages are overlapping diagnostics, not additive causal fractions. Only first-clear attempts are shown in the console table; post-clear repeats remain in rows.',rows},null,2)+'\n')
console.log('| 路线 | 层 | Boss时长：可见→击杀 | 几何可达/视线畅通 | 缺蓝回退 | 机制减伤 |')
console.log('|---|---:|---:|---:|---:|---:|')
for(const r of rows.filter(r=>!r.postClear&&[4,7,9].includes(r.floor)))
  console.log(`| ${r.route} | ${r.floor} | ${r.bossKilled?r.visibleToDeathSeconds.toFixed(1):'未击杀'}秒 | ${r.envelopeAndLineClearPct}% | ${r.manaBlockedPct}% | ${r.armorPct}% |`)
