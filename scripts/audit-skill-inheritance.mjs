// Combat probe, not a player-success or full difficulty verdict.
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const output=resolve(process.argv[2]||'reports/skill-inheritance-2026-11-01')
const oldRoot=resolve(output,'before/js/xianxia'),newRoot=resolve('js/xianxia')
async function runtime(root){
 const load=name=>import(pathToFileURL(resolve(root, name+'.js')))
 const [campaign,run,growth,forms]=await Promise.all(['TowerCampaign','TowerRun','TowerGrowth','TowerSkillForms'].map(load))
 return {...campaign,...run,...growth,...forms}
}
const previous=await runtime(oldRoot),current=await runtime(newRoot)
function probe(rt,evo,baseRank,evoRank,distance){
 const s=structuredClone(new rt.TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
 Object.assign(s,{xp:10920,skillsInitialized:true,skills:{[evo.parent]:baseRank},
 evolutionRanks:{[evo.id]:evoRank},evolutions:[evo.id]})
 const run=new rt.TowerRun({attemptId:1,floor:1,seed:1,xp:s.xp,hp:100,loadout:rt.combatLoadout(s),training:true})
 Object.assign(run.state.player,{x:0,y:0})
 const enemy={id:'probe',hp:1e9,x:distance,y:0,radius:22,woundBudget:0,woundUntil:0,orbitNextAt:0};run.state.enemies=[enemy]
 let total=0
 for(let i=0;i<3600;i++){
  run.state.time=i/60;const out=[];run._skills(out);run._projectiles([],out,run.state.player);run._zones([],out)
  for(const hit of out){const hp=enemy.hp;run._damageEnemy(hit);total+=hp-enemy.hp}
  run.state.effects=[]
 }
 return total/60/run.state.player.attack
}
const rows=[]
for(const evo of current.GROWTH_EVOLUTIONS)for(const rank of [1,2])for(const distance of [80,200]){
 const old=probe(previous,evo,10,rank,distance)
 const samples=[1,5,10].map(base=>({base,dps:probe(current,evo,base,rank,distance)}))
 assert.ok(Math.abs(old-samples[2].dps)<1e-9,`${evo.id}: full-rank output changed`)
 if(samples[2].dps>0)assert.ok(samples[0].dps<samples[1].dps&&samples[1].dps<samples[2].dps,`${evo.id}: training must improve output`)
 assert.deepEqual(current.skillForm(evo.id,rank,1),previous.skillForm(evo.id,rank,10))
 rows.push({id:evo.id,rank,distance,previousDps:old,samples})
}
const costs=current.GROWTH_EVOLUTIONS.map(e=>{
 const base=current.GROWTH_SKILLS.find(s=>s.id===e.parent)
 return {id:e.id,base:base.pointCosts.reduce((a,b)=>a+b,0),increment:e.pointCosts,
  first:base.pointCosts.reduce((a,b)=>a+b,0)+e.pointCosts[0],full:base.pointCosts.reduce((a,b)=>a+b,0)+e.pointCosts.reduce((a,b)=>a+b,0)}
})
assert.equal(costs.reduce((s,c)=>s+c.first,0),104);assert.equal(costs.reduce((s,c)=>s+c.full,0),144)
mkdirSync(output,{recursive:true});writeFileSync(resolve(output,'combat-probe.json'),JSON.stringify({status:'passed',seconds:60,rows,costs},null,2)+'\n')
console.log(`PASS: ${rows.length} comparisons; full-rank damage and authored geometry unchanged, lower training reduces damage`)
