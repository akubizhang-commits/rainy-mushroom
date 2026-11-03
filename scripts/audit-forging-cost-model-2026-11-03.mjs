// Reward-only Monte Carlo, not a natural-save or human-time simulation.
import fs from 'node:fs'
import {FORGING_RECIPES} from '../js/xianxia/TowerForging.js'
import {FLOORS,ARCHETYPES} from '../js/xianxia/TowerContent.js'
const out=process.argv[2];if(!out||fs.existsSync(out))throw Error('New output path required')
const common=['forge_xuantie','forge_lingmu','forge_yaopi','forge_lingsi','forge_lingyu']
let seed=104729;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296}
const percentile=(a,p)=>a[Math.min(a.length-1,Math.floor(a.length*p))]
const rows=[]
for(const [tier,floor,contribution] of [['fa',3,110],['bao',6,125],['ling',9,145]])for(const category of ['weapon','armor','ring']){
 const recipe=FORGING_RECIPES.find(r=>r.tier===tier&&r.category===category&&r.quality===4),f=FLOORS[floor-1]
 const counts=f.waves.flatMap(w=>w.enemy_groups).reduce((o,g)=>{const role=ARCHETYPES.find(a=>a.id===g.archetype).role;o[role]=(o[role]??0)+g.count;return o},{})
 const sample=[]
 for(let trial=0;trial<2000;trial++){
  const stock=Object.fromEntries(recipe.ingredients.map(r=>[r.id,0]));let pity=0,n=0
  while(n<100){n++;
   for(let i=0;i<counts.normal;i++)if(random()<.1){const id=common[Math.floor(random()*5)];stock[id]=(stock[id]??0)+1}
   for(const r of recipe.ingredients)if(!common.includes(r.id)&&!r.id.includes('core_'))stock[r.id]+=2*counts.elite+4*counts.boss
   if(pity===4||random()<.25){stock['forge_core_'+tier]++;pity=0}else pity++
   if(n*contribution>=recipe.contribution&&recipe.ingredients.every(r=>stock[r.id]>=r.count))break
  }
  sample.push(n)
 }
 sample.sort((a,b)=>a-b);rows.push({tier,floor,category,recipe,counts,contributionPerClear:contribution,meanClears:sample.reduce((a,b)=>a+b)/sample.length,p10Clears:percentile(sample,.1),medianClears:percentile(sample,.5),p90Clears:percentile(sample,.9)})
}
fs.writeFileSync(out,JSON.stringify({method:'2000 reward-only samples per tier/slot; zero material/contribution inventory, all kills collected, stable top floor of the tier, no concurrent spending, unlimited stone affordability assumed. Common drops 10% split equally, boss core 25% with fifth-boss pity. Measures material/contribution floor counts only; multiply by measured clear durations separately. Actual saved inventory and competing purchases can change cost.',seed:104729,rows},null,2));console.log(rows.map(r=>[r.tier,r.category,r.meanClears,r.medianClears,r.p90Clears]))
