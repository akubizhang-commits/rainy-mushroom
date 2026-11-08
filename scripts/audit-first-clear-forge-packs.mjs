// Read-only: chance of affording a 上品/极品 weapon right after a first clear, from the real drop rules
// (binomial model, one pass per floor, packs from the previous end-of-realm floor carried forward).
// Usage: node scripts/audit-first-clear-forge-packs.mjs '{"2":{"core_fa":1,...},...}'
const R=new URL('../js/xianxia/',import.meta.url).href
const {FLOORS,ARCHETYPES}=await import(R+'TowerContent.js')
const {FORGING_RECIPES}=await import(R+'TowerForging.js')
const role=Object.fromEntries(ARCHETYPES.map(a=>[a.id,a.role]))
const stat=FLOORS.map(f=>{let n=0,e=0,b=0;for(const w of f.waves)for(const g of w.enemy_groups){const c=g.count||1,r=role[g.archetype];if(r==='boss')b+=c;else if(r==='elite')e+=c;else n+=c}return {n,e,b}})
const rec=id=>Object.fromEntries(FORGING_RECIPES.find(r=>r.id===id).ingredients.map(i=>[i.id.replace('forge_',''),i.count]))
const PACK=JSON.parse(process.argv[2])
const mainOf=f=>f===1?'tiejing':f<=3?'hanjingsha':f<=6?'chitongjing':'zijingsui',coreOf=f=>f<=3?'core_fa':f<=6?'core_bao':'core_ling'
const binom=(n,p)=>{let k=0;for(let i=0;i<n;i++)if(Math.random()<p)k++;return k}
// check after floor `at`, counting floors `from..at` and packs on floors `packFrom..at`
for(const [name,tier,from,packFrom,at] of [['法器','fa',1,1,2],['宝器','bao',4,3,5],['灵器','ling',7,6,8],['灵器(第9层后)','ling',7,6,9]]){
 const q3=rec(`weapon:${tier}:q3`),q4=rec(`weapon:${tier}:q4`);let a=0,b=0,N=20000
 for(let t=0;t<N;t++){const inv={};const add=(k,v)=>inv[k]=(inv[k]||0)+v
  for(let f=packFrom;f<=at;f++)for(const [k,v] of Object.entries(PACK[f]||{}))add(k,v)
  for(let f=from;f<=at;f++){const s=stat[f-1];for(const c of ['xuantie','lingmu','lingyu'])add(c,binom(s.n,.02));add(mainOf(f),2*s.e+4*s.b);add('ninglingjing',s.b);if(Math.random()<.25)add(coreOf(f),1)}
  const ok=r=>Object.entries(r).every(([k,v])=>(inv[k]||0)>=v);if(ok(q3))a++;if(ok(q4))b++}
 console.log(name,'第'+at+'层首通后 上品',(a/N*100).toFixed(0)+'%','极品',(b/N*100).toFixed(0)+'%')}
