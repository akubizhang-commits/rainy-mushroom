import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {TowerRun,stats} from '../js/xianxia/TowerRun.js'
import {GROWTH_SKILLS,GROWTH_EVOLUTIONS,spentPoints} from '../js/xianxia/TowerGrowth.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
import {MANA_COSTS} from '../js/xianxia/TowerCharacterStats.js'
const builds=[
 {id:'early-pair',level:4,active:{sj_yujian:2,sj_arc:2}},
 {id:'mid-four',level:15,active:{sj_yujian:4,sj_arc:4,sj_wanjian:4,sj_sancai:3}},
 {id:'late-six',level:30,active:{sj_yujian:8,sj_arc:6,sj_moon:4,sj_shadow:5,sj_sancai:4,sj_formation:5}},
 ...GROWTH_SKILLS.filter(s=>s.kind==='active').flatMap(s=>[1,s.maxLevel].map(rank=>({id:s.id+'-rank'+rank,level:30,active:{[s.id]:rank}}))),
 ...GROWTH_EVOLUTIONS.map(e=>({id:e.id,level:30,active:{[e.parent]:10},evolution:e.id})),
]
function sample(build,pills,seed){
 const weapon=createIronWeapon(),xp=cultivationLevelXp(build.level)
 const loadout={growthVersion:1,skillsInitialized:true,active:build.active,passive:{},evolutions:build.evolution?[build.evolution]:[],evolutionLevels:build.evolution?{[build.evolution]:2}:{},tutorialWaves:0,weapon,weaponId:weapon.id,weaponQuality:0,weaponRefine:0,weaponFocusCount:0}
 const run=new TowerRun({attemptId:1,floor:1,seed,xp,hp:stats(xp,loadout).maxHp,training:true,loadout,spiritPills:pills})
 const s=run.state,p=s.player,template=s.pending[0]
 if(process.env.REGEN_SCALE)p.manaRegen*=Number(process.env.REGEN_SCALE)
 s.enemies=Array.from({length:3},(_,i)=>{const e=run._enemy({...template,id:`spirit-target-${i}`,x:p.x+95+i*10,y:p.y+i*10});e.hp=e.maxHp=1e12;e.moveSpeed=0;e.ai.readyAt=e.ai.graceUntil=e.ai.entryUntil=1e9;return e})
 s.pending=[];s.reserved=[];s.wavePlanned=3
 let minimum=p.mana,firstWait=null,waitFrames=0,basics=0,damage=0,casts={}
 const damageEnemy=run._damageEnemy
 run._damageEnemy=function(hit){damage+=hit.damage||0;return damageEnemy.call(this,hit)}
 const growth=run._growthSkills
 run._growthSkills=function(...args){const result=growth.apply(this,args);const eligible=Object.keys(s.actions.waiting);if(eligible.length&&!s.actions.current&&eligible.some(id=>p.mana<MANA_COSTS[id])){waitFrames++;firstWait??=s.time}return result}
 for(let frame=0;frame<120*60;frame++){
  run.advance(1/60,cast=>{if(cast.skill==='basic_attack')basics++;else casts[cast.skill]=(casts[cast.skill]||0)+1})
  minimum=Math.min(minimum,p.mana);assert.equal(s.phase,'playing')
 }
 return {seed,minimum:+minimum.toFixed(2),end:+p.mana.toFixed(2),spent:+s.manaState.spent.toFixed(2),firstPill:s.spiritState.uses[0]?.tick/60||null,pills:s.spiritState.uses.length,firstWait,waitSeconds:+(waitFrames/60).toFixed(2),basics,casts,damage}
}
const rows=[]
for(const build of (process.env.REGEN_SCALE?builds.slice(0,3):builds))for(const pills of [0,3])rows.push({...build,startingPills:pills,points:spentPoints({skillsInitialized:true,skills:build.active}),samples:[101,211,307].map(seed=>sample(build,pills,seed))})
writeFileSync(`reports/spirit-balance-2026-11-05/balance${process.env.REGEN_SCALE?'-probe-'+process.env.REGEN_SCALE:''}.json`,JSON.stringify({method:'120s actual 60Hz TowerRun against 3 stationary immortal targets at melee range, starter weapon, no armor/ring/passives, seeds 101/211/307. Controlled resource pressure; not natural dungeon clear rate, TTK or economic acquisition telemetry. Cast callback counts may include visual pulses, spent is the authoritative cost ledger. Wait is a conservative queued-skill insufficient-resource indicator.',costs:MANA_COSTS,rows},null,2)+'\n')
console.table(rows.map(r=>({build:r.id,pills:r.startingPills,min:r.samples[0].minimum,spent:r.samples[0].spent,used:r.samples[0].pills,firstPill:r.samples[0].firstPill,wait:r.samples[0].waitSeconds})))
