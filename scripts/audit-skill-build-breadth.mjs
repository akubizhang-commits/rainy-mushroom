// Read-only: focused vs spread builds at equal skill points (doc 84).
// Static dummies, mana unlimited, no crit/passives. Compares combined output with the sum of each skill alone,
// which exposes the shared single cast channel. Prints text; writes nothing.
const R=new URL('../js/xianxia/',import.meta.url).href
const {GROWTH_SKILLS}=await import(R+'TowerGrowth.js')
const {TowerCampaignStore,combatLoadout}=await import(R+'TowerCampaign.js')
const {TowerRun}=await import(R+'TowerRun.js')
const defs=Object.fromEntries(GROWTH_SKILLS.map(s=>[s.id,s]))
const fresh=()=>structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
const xpAt=n=>30*(n-1)+15*(n-1)**2
const layouts={
 single:()=>[{x:80,y:0}],
 cluster6:()=>[{x:80,y:0},{x:110,y:25},{x:110,y:-25},{x:140,y:0},{x:50,y:30},{x:50,y:-30}],
}
const cost=(id,r)=>defs[id].pointCosts.slice(0,r).reduce((a,b)=>a+b,0)
function run(build,layout,seconds=90){
 const s=fresh();s.xp=xpAt(30);s.skills={...build};s.skillsInitialized=true
 const loadout=combatLoadout(s),r=new TowerRun({attemptId:1,floor:1,seed:1,xp:s.xp,hp:100,loadout,training:true})
 r.state.player.x=0;r.state.player.y=0;r.state.player.mana=r.state.player.maxMana=1e9
 r.state.enemies=layouts[layout]().map((p,i)=>({id:'a'+i,hp:1e13,maxHp:1e13,x:p.x,y:p.y,radius:22,woundBudget:0,woundUntil:0,orbitNextAt:0,ai:{}}))
 for(let f=0;f<seconds*60;f++){r.state.time=f/60;const out=[];r._skills(out);r._projectiles([],out,r.state.player);r._zones([],out);for(const h of out)r._damageEnemy(h);r.state.effects=[]}
 return r.state.enemies.reduce((t,e)=>t+(1e13-e.hp),0)/seconds/r.state.player.attack
}
const builds={
 'focus-formation+wanjian+arc (42SP)':{sj_formation:10,sj_wanjian:10,sj_arc:10,sj_sancai:2},
 'focus-line+shadow (44SP)':{sj_line:10,sj_shadow:10,sj_arc:4},
 'focus-yujian+wanjian+arc (30SP)':{sj_yujian:10,sj_wanjian:10,sj_arc:10},
 'spread-all10@r3 (42SP)':{sj_yujian:3,sj_arc:3,sj_moon:3,sj_moon_triple:3,sj_cross:3,sj_wanjian:3,sj_line:3,sj_shadow:3,sj_sancai:3,sj_formation:3},
 'spread-all10@r4 (56SP)':{sj_yujian:4,sj_arc:4,sj_moon:4,sj_moon_triple:4,sj_cross:4,sj_wanjian:4,sj_line:4,sj_shadow:4,sj_sancai:4,sj_formation:4},
 'mid-5skills@r6':{sj_arc:6,sj_wanjian:6,sj_shadow:6,sj_formation:6,sj_sancai:6},
}
for(const [name,b] of Object.entries(builds)){
 const sp=Object.entries(b).reduce((t,[id,r])=>t+cost(id,r),0)
 const sumIndiv=(l)=>Object.entries(b).reduce((t,[id,r])=>t+run({[id]:r},l,40),0)
 console.log(name.padEnd(40),"SP",sp,"| single combined",run(b,'single').toFixed(2),"sum-of-solo",sumIndiv('single').toFixed(2),"| cluster6 combined",run(b,'cluster6').toFixed(2),"sum-of-solo",sumIndiv('cluster6').toFixed(2))
}
