import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {FORGING_RECIPES,rollForgedGear} from '../js/xianxia/TowerForging.js'
import {FORGE_MATERIALS} from '../js/xianxia/TowerForgeMaterials.js'
import {materialDrops,rareForgeDrops} from '../js/xianxia/TowerMaterialLoot.js'
import {FLOORS} from '../js/xianxia/TowerContent.js'
const out=new URL('../reports/forging-top-weighted/',import.meta.url)
const sources=['js/xianxia/TowerEquipmentRoster.js','js/xianxia/TowerWeapons.js','js/xianxia/TowerEquipment.js','js/xianxia/TowerForging.js','js/xianxia/TowerForgeMaterials.js','js/xianxia/TowerMaterialLoot.js','js/xianxia/TowerCampaign.js']
const report={method:'Actual production drop and random forging functions; authored kill ledgers, seeded statistical sampling. Not a natural playthrough or wall-clock acquisition estimate.',
 sources:sources.map(path=>({path,sha256:createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex')})),
 recipes:FORGING_RECIPES.map(r=>({id:r.id,identities:r.definitionIds.length,spiritStones:r.spiritStones,contribution:r.contribution,ingredients:r.ingredients,weights:r.weights})),floors:[],rare:[],errors:[]}
const check=(ok,message)=>{if(!ok)report.errors.push(message)}
for(const f of FLOORS){
 const ledger=f.waves.flatMap(w=>w.enemy_groups.flatMap(g=>Array.from({length:g.count},(_,i)=>({id:`${w.id}-${g.archetype}-${i}`,wave:w.wave,archetype:g.archetype}))))
 const counts=Object.fromEntries(Object.keys(FORGE_MATERIALS).map(id=>[id,0])),samples=1000
 for(let seed=1;seed<=samples;seed++)for(const id of materialDrops({floor:f.floor,loot:{seed},killLedger:ledger}))if(id in counts)counts[id]++
 const means=Object.fromEntries(Object.entries(counts).map(([k,n])=>[k,n/samples]))
 report.floors.push({floor:f.floor,kills:ledger.length,samples,means})
 check(means.forge_ninglingjing===1,`Boss common guarantee floor ${f.floor}`)
 const normal=f.waves.reduce((n,w)=>n+w.normal_count,0)
 for(const id of ['xuantie','lingmu','lingyu','yaopi','lingsi'])check(Math.abs(means['forge_'+id]-normal*.02)<normal*.003,`Common material distribution ${f.floor}/${id}`)
}
let stream=0x1f03599
function rng(){stream^=stream<<13;stream^=stream>>>17;stream^=stream<<5;return (stream>>>0)/0x100000000}
for(const[tier,floor]of [['fa',2],['bao',4],['ling',7]]){
 const pool=FORGING_RECIPES.find(r=>r.id===`weapon:${tier}:q4`),samples=10000,any=[],target=[]
 for(let sample=0;sample<samples;sample++){
  let bossKills=0,crafts=0,pity={fa:0,bao:0,ling:0},targetId=pool.definitionIds[1]
  while(true){
   let cores=0
   while(cores<2){
    const snap={floor,loot:{seed:Math.floor(rng()*0x100000000)},killLedger:[{id:`boss-${bossKills}`,wave:20,archetype:'boar_boss'}]}
    const r=rareForgeDrops(snap,0,pity);pity=r.pity;cores+=r.drops.length;bossKills++
   }
   if(crafts===0)any.push(bossKills)
   const r=rollForgedGear(pool.id,'sample',rng());crafts++
   if(r.item.definitionId===targetId)break
  }
  target.push(bossKills)
 }
 const stats=a=>{a.sort((x,y)=>x-y);return {mean:a.reduce((s,n)=>s+n,0)/a.length,p50:a[Math.floor(a.length*.5)],p90:a[Math.floor(a.length*.9)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)}}
 const row={tier,samples,anyGraduateBossKills:stats(any),chosenMasterBossKills:stats(target),excludes:'all ordinary materials, currencies and time; single weapon slot only'}
 report.rare.push(row)
 check(Math.abs(row.anyGraduateBossKills.mean-6.1015625)<.15,`rare mean ${tier}`)
 check(Math.abs(row.chosenMasterBossKills.mean-(6.1015625/.3))<.6,`target mean ${tier}`)
 check(row.anyGraduateBossKills.max<=10,`hard rare bounds ${tier}`)
}
for(const r of FORGING_RECIPES){
 check(r.contribution-Math.floor(r.contribution*.2)>[0,2,4,8,16][r.quality],`dismantle profit ${r.id}`)
 check(r.ingredients.length<=5,`too many materials ${r.id}`)
}
for(const id of Object.keys(FORGE_MATERIALS).filter(id=>id!=='forge_tiejing'))check(FORGING_RECIPES.some(r=>r.ingredients.some(i=>i.id===id)),`unused material ${id}`)
report.status=report.errors.length?'FAILED':'PASSED'
report.notAssessed=['natural tier residence time','ordinary material inventory sharing across three slots','human combat difficulty and long-fight recovery','whole-journey minutes to graduation']
mkdirSync(out,{recursive:true});writeFileSync(new URL('economy.json',out),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({status:report.status,rare:report.rare,errors:report.errors},null,2))
assert.equal(report.errors.length,0)
