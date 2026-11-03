import {mkdirSync,writeFileSync,existsSync} from 'node:fs'
import {FLOORS} from '../js/xianxia/TowerContent.js'
import {materialDrops} from '../js/xianxia/TowerMaterialLoot.js'
import {FORGE_MATERIALS,FORGE_COMMON_MATERIALS,forgeMainMaterial} from '../js/xianxia/TowerForgeMaterials.js'
import {FORGING_RECIPES} from '../js/xianxia/TowerForging.js'
const result={seedsPerFloor:10000,method:'Deterministic authored floor kill ledgers; no wall-clock gameplay or combat simulation',floors:[],sources:['js/xianxia/TowerContent.js','js/xianxia/TowerMaterialLoot.js','js/xianxia/TowerForgeMaterials.js','js/xianxia/TowerForging.js','docs/superpowers/specs/2026-10-31-equipment-crafting-and-material-drops-design.md'].map(path=>({path,status:existsSync(path)?'FOUND':'ABSENT'}))}
for(const f of FLOORS){
 const killLedger=[];for(const wave of f.waves)for(const g of wave.enemy_groups)for(let i=0;i<g.count;i++)killLedger.push({id:`${wave.id}-${g.archetype}-${i}`,wave:wave.wave,archetype:g.archetype})
 const counts=Object.fromEntries(Object.keys(FORGE_MATERIALS).map(id=>[id,0])),complete=[]
 for(let seed=1;seed<=10000;seed++){
 const own={};for(const id of materialDrops({floor:f.floor,loot:{seed},killLedger})){if(FORGE_MATERIALS[id]){counts[id]++;own[id]=(own[id]||0)+1}}
 const tier=f.floor===1?'fan':f.floor<=3?'fa':f.floor<=6?'bao':'ling',r=FORGING_RECIPES.find(r=>r.category==='weapon'&&r.tier===tier&&r.quality===1)
 complete.push(Math.min(...r.ingredients.map(a=>Math.floor((own[a.id]||0)/a.count))))
 }
 complete.sort((a,b)=>a-b);const means=Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,v/10000]));
 result.floors.push({floor:f.floor,kills:killLedger.length,means,saleMean:Object.entries(means).reduce((sum,[id,n])=>sum+n*FORGE_MATERIALS[id].sellPrice,0),lowerWeaponCompleteP50:complete[4999],lowerWeaponCompleteP90:complete[8999]})
 console.log('floor',f.floor,'done')
}
const errors=[];for(const f of result.floors){if(f.means[forgeMainMaterial(f.floor)]!==14||f.means.forge_ninglingjing!==1)errors.push('guarantee '+f.floor);const n=FLOORS[f.floor-1].waves.reduce((s,w)=>s+w.normal_count,0);for(const id of FORGE_COMMON_MATERIALS)if(Math.abs(f.means[id]-n*.02)>n*.002)errors.push('distribution '+f.floor+id)}
result.errors=errors;result.minimumCraftContributionNet=Math.min(...FORGING_RECIPES.map(r=>r.contribution-[0,2,4,8][r.quality]));
result.status=errors.length?'failed':'passed';mkdirSync('reports/forging-2026-10-31',{recursive:true});writeFileSync('reports/forging-2026-10-31/balance.json',JSON.stringify(result,null,2)+'\n');if(errors.length)process.exitCode=1
