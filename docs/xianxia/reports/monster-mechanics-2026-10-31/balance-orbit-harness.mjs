// Fixed-fixture calibration, not a natural-progression or human playability claim.
// Runtime changes are forbidden here: movement/viewport are the only combat inputs.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { TowerRun, stats } from '../js/xianxia/TowerRun.js'
import { TowerCampaignStore, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { growthSummary, skillRequirement } from '../js/xianxia/TowerGrowth.js'
import { rollWeapon } from '../js/xianxia/TowerWeapons.js'
import { rollEquipment } from '../js/xianxia/TowerEquipment.js'
import { FLOORS, ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { cultivationAt } from '../js/xianxia/TowerProfile.js'
import { insideHex } from '../js/xianxia/TowerArena.js'
const A = Object.fromEntries(ARCHETYPES.map(a=>[a.id,a]))
const round = n=>Math.round(n*1000)/1000
const xpAt = n=>30*(n-1)+15*(n-1)**2
const rng = seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const routes = {
 qi: [['sj_arc',3],['sj_yujian',3],['vajra',2],['sj_arc',6],['sj_line',3],['sj_mark',2],['sj_arc',9],['sj_line',6],['sj_heart',3]],
 array: [['sj_wanjian',3],['sj_yujian',3],['vajra',2],['sj_wanjian',6],['sj_formation',3],['sj_gate',2],['sj_wanjian',9],['sj_formation',6],['sj_bone',3]],
 mixed: [['sj_arc',3],['sj_wanjian',3],['sj_yujian',3],['vajra',2],['sj_formation',3],['sj_line',3],['sj_arc',6],['sj_wanjian',6],['sj_heart',3]],
}
export function fixture(floor, route, quality=2) {
 const state=structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
 state.xp=xpAt(floor*3);state.clearedFloor=floor-1;state.skillsInitialized=true;state.tutorialWaves=3
 state.skills={sj_arc:1,sj_yujian:1,sj_wanjian:1};state.evolutionRanks={};state.books=[]
 let bookCost=0
 for(const [id,target] of routes[route])while((state.skills[id]||0)<target){
  const q=skillRequirement(state,id);if(!q.ok)break
  state.skills[id]=q.nextLevel;if(q.bookCost){state.books.push(id);bookCost+=q.bookCost}
 }
 assert.ok(growthSummary(state).available>=0)
 const tier=floor===1?'fan':floor<=3?'fa':floor<=6?'bao':'ling',random=rng(730+floor)
 const weapon=rollWeapon(tier,quality,random,'calibration-weapon'),armor=rollEquipment('armor',tier,quality,random,'calibration-armor'),ring=rollEquipment('ring',tier,quality,random,'calibration-ring')
 const loadout={...combatLoadout(state),weaponId:weapon.id,weapon,weaponQuality:quality,weaponRefine:0,weaponEquipped:true,armorId:armor.id,armor,ringId:ring.id,ring,weaponFocusCount:0}
 return {floor,route,quality,level:floor*3,tier,xp:state.xp,skills:state.skills,books:state.books,bookCost,points:growthSummary(state),loadout,stats:stats(state.xp,loadout)}
}
export function zoneDanger(z,q,pad=26) {
 if(z.shape==='safe-gates')return !z.safeZones.some(g=>Math.hypot(q.x-g.x,q.y-g.y)<=g.radius-pad)
 if(z.shape==='capsule'||z.shape==='line'){
  const ex=(z.toX??z.x)-z.x,ey=(z.toY??z.y)-z.y,t=Math.max(0,Math.min(1,((q.x-z.x)*ex+(q.y-z.y)*ey)/(ex*ex+ey*ey||1)))
  return Math.hypot(q.x-z.x-t*ex,q.y-z.y-t*ey)<(z.width||50)/2+pad
 }
 const d=Math.hypot(q.x-z.x,q.y-z.y)
 if(z.shape==='sector')return d<(z.radius||Math.hypot(z.toX-z.x,z.toY-z.y))+pad&&((q.x-z.x)*(z.faceX||0)+(q.y-z.y)*(z.faceY||0))/(d||1)>Math.cos(z.skillId?(z.angle||Math.PI)/2:(z.angle||90)*Math.PI/360)
 if(z.shape==='ring'){if(d+pad<(z.innerRadius||0)||d>(z.radius||0)+pad)return false;const angle=Math.atan2(q.y-z.y,q.x-z.x)-Math.atan2(z.faceY||0,z.faceX||1);return !z.skillId||Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<z.angle/2+.15}
 return d<(z.radius||60)+pad
}
export function steerMechanics(run) {
 const s=run.state,p=s.player,enemies=s.enemies.filter(e=>e.hp>0)
 const near=[...enemies].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))
 const objective=near.find(e=>e.mechanicObjective||e.mechanicKind||e.objectiveKind||e.temporary&&/core|crystal|egg|pillar|lock/.test(e.temporary.kind||''))
 const gate=(s.monsterMechanics?.zones||[]).find(z=>z.shape==='safe-gates')?.safeZones?.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]
 const target=gate||objective||near[0],preferred=gate?0:objective?45:(s.loadout.active.sj_wanjian>=3?90:150)
 let bx=0,by=0
 if(gate&&Math.hypot(gate.x-p.x,gate.y-p.y)<gate.radius-26){run.setInput(0,0);return}
 if(target){const d=Math.hypot(target.x-p.x,target.y-p.y)||1,radial=d>preferred?1:d<preferred*.7?-1:0;bx=(target.x-p.x)/d*radial-(target.y-p.y)/d*.3;by=(target.y-p.y)/d*radial+(target.x-p.x)/d*.3}
 const zones=[...s.zones.filter(z=>z.hostile),...(s.monsterMechanics?.zones||[])]
 let best=-Infinity,choice={x:0,y:0}
 for(let i=0;i<24;i++){
  const x=Math.cos(i*Math.PI/12),y=Math.sin(i*Math.PI/12);let score=x*bx+y*by
  for(const lead of [.2,.5,.9]){const q={x:p.x+x*p.moveSpeed*lead,y:p.y+y*p.moveSpeed*lead}
   if(!insideHex(q,22))score-=40
   for(const z of zones)if(zoneDanger(z,q))score-=10
   for(const b of s.projectiles)if(b.hostile&&Math.hypot(q.x-b.x-(b.vx||0)*lead,q.y-b.y-(b.vy||0)*lead)<(b.radius||8)+24)score-=8
   for(const e of near)if(Math.hypot(q.x-e.x,q.y-e.y)<e.radius+22)score-=2
  }
  if(score>best){best=score;choice={x,y}}
 }
 run.setInput(choice.x,choice.y)
}
export function playFixture(f,{seed=101,maxSeconds=1200,hpFraction=1}={}){
 const run=new TowerRun({attemptId:1,floor:f.floor,seed,hp:f.stats.maxHp*hpFraction,xp:f.xp,loadout:f.loadout,arenaVersion:1})
 assert.equal(run._playtestAssist,false)
 const records=new Map();let seen=new Set(),damage=0,distance=0,hits=0,playerDamage=0,bossWaveAt=null
 while(run.state.phase==='playing'&&run.state.time<maxSeconds){
  const s=run.state,p=s.player
  // Landscape 16:9, no artificial off-screen full-arena targeting.
  run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315})
  steerMechanics(run);const old={x:p.x,y:p.y};run.advance(1/60);distance+=Math.hypot(p.x-old.x,p.y-old.y)
  if(s.wave===20)bossWaveAt??=s.time
  for(const e of s.enemies)if(!records.has(e.id))records.set(e.id,{id:e.id,archetype:e.archetype,role:e.temporary?'temporary':A[e.archetype]?.role||'temporary',wave:s.wave,spawnAt:s.time,firstAttackableAt:null,firstDamageAt:null,playerLevelAtSpawn:cultivationAt(p.xp).level,playerXpAtSpawn:p.xp,playerHpAtSpawn:round(p.hp),skillsAtSpawn:structuredClone(s.loadout.active),maxHp:e.maxHp,lastHp:e.hp,lastSeen:s.time})
  for(const e of s.enemies){const r=records.get(e.id);if(Math.abs(e.x-p.x)<=560+e.radius&&Math.abs(e.y-p.y)<=315+e.radius&&Math.hypot(e.x-p.x,e.y-p.y)<=460+e.radius)r.firstAttackableAt??=s.time;if(e.hp<r.lastHp)r.firstDamageAt??=s.time;r.lastHp=e.hp;r.lastSeen=s.time}
  for(const k of s.killLedger){const r=records.get(k.id);if(r&&!r.deadAt)r.deadAt=s.time}
  const next=new Set();for(const fx of s.effects){next.add(fx.id);if(seen.has(fx.id))continue;if(fx.kind==='hit')damage+=fx.damage||0;if(fx.kind==='player_hit'){hits++;playerDamage+=fx.damage||0}}seen=next
 }
 const s=run.state,encounters=[...records.values()].filter(e=>e.role==='elite'||e.role==='boss').map(e=>({...e,spawnAt:round(e.spawnAt),deadAt:e.deadAt?round(e.deadAt):null,elapsed:round((e.deadAt||s.time)-e.spawnAt),engagedSeconds:e.firstAttackableAt===null?null:round((e.deadAt||s.time)-e.firstAttackableAt),firstDamageSeconds:e.firstDamageAt===null?null:round((e.deadAt||s.time)-e.firstDamageAt),success:!!e.deadAt}))
 return {floor:f.floor,route:f.route,quality:f.quality,seed,hpFraction,outcome:s.phase==='playing'?'timeout':s.phase,time:round(s.time),lastWave:s.wave,hp:round(s.player.hp),maxHp:round(s.player.maxHp),damage:round(damage),effectiveDps:round(damage/Math.max(1,s.time)),movementDistance:round(distance),playerHits:hits,playerDamage:round(playerDamage),bossWaveSeconds:bossWaveAt?round(s.time-bossWaveAt):null,encounters}
}
const percentile=(arr,p)=>{if(!arr.length)return null;const a=[...arr].sort((x,y)=>x-y),i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return round(a[lo]+(a[hi]-a[lo])*(i-lo))}
export function summarize(samples){return FLOORS.map(f=>{const rows=samples.filter(s=>s.floor===f.floor),boss=rows.flatMap(s=>s.encounters.filter(e=>e.role==='boss'&&e.success).map(e=>e.engagedSeconds??e.elapsed)),elite=rows.flatMap(s=>s.encounters.filter(e=>e.role==='elite'&&e.success).map(e=>e.engagedSeconds??e.elapsed));return {floor:f.floor,timing:'visible-within-460px engagement when observed, else legacy spawn timing',n:rows.length,wins:rows.filter(s=>s.outcome==='won').length,bossN:boss.length,bossInTarget:boss.filter(t=>t>=100&&t<=140).length,bossFailures:rows.flatMap(s=>s.encounters).filter(e=>e.role==='boss'&&!e.success).length,bossMin:percentile(boss,0),bossMax:percentile(boss,1),bossMedian:percentile(boss,.5),bossP10:percentile(boss,.1),bossP90:percentile(boss,.9),eliteN:elite.length,eliteInTarget:elite.filter(t=>t>=20&&t<=40).length,eliteMin:percentile(elite,0),eliteMax:percentile(elite,1),eliteMedian:percentile(elite,.5),layerMedian:percentile(rows.map(s=>s.time),.5)}})}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const opt=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=')[1]??fallback
 const label=opt('label','current'),seeds=opt('seeds','101,211,307,401').split(',').map(Number),qualities=opt('qualities','2').split(',').map(Number),floors=opt('floors','1,2,3,4,5,6,7,8,9').split(',').map(Number),samples=[],fixtures=[]
 const sourceFiles=readdirSync(new URL('../js/xianxia/',import.meta.url)).filter(n=>n.endsWith('.js')).map(n=>n.slice(0,-3)),hashes=Object.fromEntries(sourceFiles.map(n=>[n,createHash('sha256').update(readFileSync(new URL(`../js/xianxia/${n}.js`,import.meta.url))).digest('hex')]))
 for(const floor of floors)for(const route of Object.keys(routes))for(const quality of qualities){const f=fixture(floor,route,quality);fixtures.push(f);for(const seed of seeds){const s=playFixture(f,{seed,maxSeconds:Number(opt('max-seconds','1200')),hpFraction:Number(opt('hp-fraction','1'))});samples.push(s);console.error(`${floor}/${route}/q${quality}/${seed}: ${s.outcome} ${s.time}s wave${s.lastWave} boss=${s.encounters.find(e=>e.role==='boss')?.engagedSeconds??'-'} elite=${s.encounters.filter(e=>e.role==='elite').map(e=>e.engagedSeconds).join(',')}`)}}
 const report={method:'Fixed legal SP/stage fixtures; books/item acquisition NOT proven natural. Real TowerRun at 60Hz, normal damage and HP, movement-only deterministic bot, landscape viewport; includes failures. elapsed is first observed spawn to death (includes entry travel); engagedSeconds begins when visible within 460px; firstDamageSeconds begins observed HP decrease; playerLevelAtSpawn exposes in-layer progression, total layer time includes all waves. Equipment rolls fixed independently of combat seeds. No human or device-performance verdict.',hashes,seeds,fixtures,samples,summary:summarize(samples)}
 const dir=new URL('../docs/xianxia/reports/monster-mechanics-2026-10-31/',import.meta.url);mkdirSync(dir,{recursive:true});writeFileSync(new URL(`balance-${label}.json`,dir),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary,null,2))
}
