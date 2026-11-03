// Legal point allocations and equipment fixtures, not a natural economy playthrough.
import assert from 'node:assert/strict'
import {writeFile,mkdir} from 'node:fs/promises'
import {performance} from 'node:perf_hooks'
import {TowerCampaignStore,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {growthSummary,rankCap,GROWTH_SKILLS,GROWTH_EVOLUTIONS} from '../js/xianxia/TowerGrowth.js'
import {FLOORS} from '../js/xianxia/TowerContent.js'
import {rollWeapon} from '../js/xianxia/TowerWeapons.js'
import {rollEquipment} from '../js/xianxia/TowerEquipment.js'
import {play} from './verify-tower-growth-balance.mjs'
const cases=[
 {floor:4,skills:{sj_arc:6,sj_yujian:3,vajra:2,sj_heart:1}},
 {floor:6,skills:{sj_arc:9,sj_yujian:3,vajra:3,sj_heart:2}},
 {floor:8,skills:{sj_arc:10,vajra:3,sj_bone:3,sj_heart:5},evolutionRanks:{evo_wanjian:1}},
]
const report={method:'Fixed affordable entry builds. Seed 41/97; movement-only webEscape bot. No invulnerability, damage/HP rewriting or extra SP. Purchased equipment/books are fixtures, not economy validation. Node tick timing excludes rendering.',cases:[]}
for(const row of cases)for(const seed of [41,97]){
 const s=structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
 Object.assign(s,{xp:FLOORS.slice(0,row.floor-1).reduce((n,f)=>n+f.cultivation_xp_budget,0),clearedFloor:row.floor-1,skills:row.skills,evolutionRanks:row.evolutionRanks??{}})
 s.evolutions=Object.keys(s.evolutionRanks);s.books=[...GROWTH_SKILLS,...GROWTH_EVOLUTIONS].filter(d=>d.special).map(d=>d.id)
 assert.ok(growthSummary(s).available>=0)
 for(const[id,rank]of Object.entries(s.skills))assert.ok(rank<=rankCap(id,s.xp))
 const tier=row.floor===8?'xuan':'huang',quality=row.floor===8?1:4
 const weapon=rollWeapon(tier,quality,()=>.5,'weapon-1'),armor=rollEquipment('armor',tier,quality,()=>.5,'armor-1')
 s.weapons[weapon.id]=weapon;s.loadouts[0].weaponId=weapon.id;s.equipment[armor.id]=armor;s.loadouts[0].armorId=armor.id
 const loadout=combatLoadout(s)
 const run=new TowerRun({attemptId:1,floor:row.floor,seed,xp:s.xp,hp:stats(s.xp,loadout).maxHp,loadout})
 const timings=[];const advance=run.advance.bind(run)
 run.advance=(dt)=>{const t=performance.now();const result=advance(dt);timings.push(performance.now()-t);return result}
 const start=performance.now();const result=play(run,{maxSeconds:900,strategy:'webEscape',pursue:true})
 assert.equal(validateTowerSnapshot(result.run.snapshot()),true)
 timings.sort((a,b)=>a-b)
 const item={floor:row.floor,seed,skills:s.skills,evolutionRanks:s.evolutionRanks,points:growthSummary(s),weaponTier:tier,weaponQuality:quality,
 outcome:result.run.state.phase,time:result.run.state.time,hp:result.run.state.player.hp,waves:result.run.state.clearedWaves.length,
 peakEnemies:result.metrics.peakEnemies,bossHp:result.run.state.enemies.filter(e=>e.role==='boss').map(e=>e.hp),
 tickP95Ms:timings[Math.floor(timings.length*.95)],tickP99Ms:timings[Math.floor(timings.length*.99)],wallSeconds:(performance.now()-start)/1000}
 report.cases.push(item);console.log(JSON.stringify(item))
}
await mkdir(new URL('../docs/xianxia/reports/balance-optimization-2026-10-30/',import.meta.url),{recursive:true})
await writeFile(new URL('../docs/xianxia/reports/balance-optimization-2026-10-30/combat.json',import.meta.url),JSON.stringify(report,null,2))
