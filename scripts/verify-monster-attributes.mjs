import fs from 'node:fs'
import { ARCHETYPES, FLOORS } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { monsterHealthMultiplier, mitigateMonsterDamage, applyArmorBreak,
  MONSTER_ATTRIBUTE_PROFILES } from '../js/xianxia/TowerMonsterAttributes.js'

const output=process.argv[2]??'reports/monster-attributes-2026-11-05/balance.json'
const byId=new Map(ARCHETYPES.map(a=>[a.id,a])),rows=[]
for(const [index,floor] of FLOORS.entries()){
  for(const [waveIndex,wave] of floor.waves.entries()){
    for(const group of wave.enemy_groups){
      const a=byId.get(group.archetype),s=towerEnemyStats(a,index+1,waveIndex+1)
      const oldHp=s.hp/monsterHealthMultiplier(s)
      const physical=mitigateMonsterDamage(s,0,{physical:100,magic:0}).physical
      const magic=mitigateMonsterDamage(s,0,{physical:0,magic:100}).magic
      const base={...s},shredded={...s}
      applyArmorBreak(shredded,0,.2,3)
      const broken=mitigateMonsterDamage(shredded,0,{physical:100,magic:0}).physical
      const sensitivity=[.9,1.1].map(f=>{
        const e={...base,physicalDefense:base.physicalDefense*f,magicDefense:base.magicDefense*f}
        const hit=mitigateMonsterDamage(e,0,{physical:50,magic:50})
        return (s.hp/(hit.physical+hit.magic))/(oldHp/100)
      })
      rows.push({floor:index+1,wave:waveIndex+1,id:a.id,family:a.species,role:a.role,rank:a.rank,
        count:group.count,...s,previousHp:oldHp,
        physicalTtkRatio:s.hp/physical/(oldHp/100),
        magicTtkRatio:s.hp/magic/(oldHp/100),
        mixedTtkRatio:s.hp/((physical+magic)/2)/(oldHp/100),
        armorBreakPhysicalGain:broken/physical-1,defenseSensitivity:sensitivity})
    }
  }
}
const range=key=>[Math.min(...rows.map(r=>r[key])),Math.max(...rows.map(r=>r[key]))]
const summary={
  method:'Deterministic analytical 100 raw DPS comparison against pre-defense HP. Includes every authored native spawn, no AI or player survival claim. Scar vulnerability excluded from armor-break gain; no random rolls involved.',
  spawnCount:rows.reduce((n,r)=>n+r.count,0),authoredGroups:rows.length,
  physicalTtkRatio:range('physicalTtkRatio'),magicTtkRatio:range('magicTtkRatio'),
  mixedTtkRatio:range('mixedTtkRatio'),armorBreakPhysicalGain:range('armorBreakPhysicalGain'),
  defenseSensitivity:[Math.min(...rows.flatMap(r=>r.defenseSensitivity)),Math.max(...rows.flatMap(r=>r.defenseSensitivity))],
  familyProfiles:MONSTER_ATTRIBUTE_PROFILES,
}
if(rows.some(r=>Math.abs(r.mixedTtkRatio-1)>1e-10 ||r.physicalTtkRatio>1.25||r.magicTtkRatio>1.25))
  throw Error('Defense budget exceeded')
fs.mkdirSync(new URL('../reports/monster-attributes-2026-11-05/',import.meta.url),{recursive:true})
fs.writeFileSync(output,JSON.stringify({summary,rows},null,2)+'\n')
console.log(JSON.stringify(summary,null,2))
