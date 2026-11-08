// Read-only: ideal-probe power of every active skill/evolution (doc 84).
// Static high-HP dummies, 60 Hz real scheduler/projectiles/zones, attack-normalised, no crit/passives/mana limit.
// Layouts: single (1 dummy), cluster6 (6 packed), ring6 (6 around the player at 150). Prints JSON; writes nothing.
const R=new URL('../js/xianxia/',import.meta.url).href
const {GROWTH_SKILLS,GROWTH_EVOLUTIONS}=await import(R+'TowerGrowth.js')
const {TowerCampaignStore,combatLoadout}=await import(R+'TowerCampaign.js')
const {TowerRun}=await import(R+'TowerRun.js')
const defs=Object.fromEntries([...GROWTH_SKILLS,...GROWTH_EVOLUTIONS].map(s=>[s.id,s]))
const fresh=()=>structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
const xpAt=n=>30*(n-1)+15*(n-1)**2
const layouts={
 single:()=>[{x:80,y:0}],
 cluster6:()=>[{x:80,y:0},{x:110,y:25},{x:110,y:-25},{x:140,y:0},{x:50,y:30},{x:50,y:-30}],
 ring6:()=>Array.from({length:6},(_,i)=>({x:Math.cos(i*Math.PI/3)*150,y:Math.sin(i*Math.PI/3)*150})),
}
function probe(id,rank,layout,seconds=120){
 const d=defs[id],evo=d.kind==='evolution',s=fresh();s.xp=xpAt(30);s.skills={[evo?d.parent:id]:evo?10:rank};s.skillsInitialized=true
 if(evo){s.evolutionRanks={[id]:rank};s.evolutions=[id]}
 const loadout=combatLoadout(s),run=new TowerRun({attemptId:1,floor:1,seed:1,xp:s.xp,hp:100,loadout,training:true})
 run.state.player.x=0;run.state.player.y=0
 run.state.enemies=layouts[layout]().map((p,i)=>({id:'a'+i,hp:1e12,maxHp:1e12,x:p.x,y:p.y,radius:22,woundBudget:0,woundUntil:0,orbitNextAt:0}))
 let damage=0,hits=0
 for(let f=0;f<seconds*60;f++){
  run.state.time=f/60;const out=[]
  run._skills(out);run._projectiles([],out,run.state.player);run._zones([],out)
  for(const hit of out){run._damageEnemy(hit)}
  run.state.effects=[]
 }
 damage=run.state.enemies.reduce((t,e)=>t+(1e12-e.hp),0)
 return damage/seconds/run.state.player.attack
}
const ids=[...GROWTH_SKILLS.filter(s=>s.kind==='active').map(s=>s.id),...GROWTH_EVOLUTIONS.map(s=>s.id)]
const rows=[]
for(const id of ids)for(const rank of (defs[id].kind==='evolution'?[1,2]:[1,5,10])){
 rows.push({id,name:defs[id].name,rank,cd:defs[id].cooldown??'',single:+probe(id,rank,'single',60).toFixed(2),c6:+probe(id,rank,'cluster6',60).toFixed(2),ring:+probe(id,rank,'ring6',60).toFixed(2)})
}
console.log(JSON.stringify(rows))
