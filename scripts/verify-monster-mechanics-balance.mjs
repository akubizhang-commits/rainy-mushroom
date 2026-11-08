// Fixed-fixture calibration, not a natural-progression or human playability claim.
// Runtime changes are forbidden here: movement/viewport and normal resume are the only inputs.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { resolve, join } from 'node:path'
import { TowerRun, stats } from '../js/xianxia/TowerRun.js'
import { TowerCampaignStore, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { growthSummary, skillRequirement } from '../js/xianxia/TowerGrowth.js'
import { rollWeapon } from '../js/xianxia/TowerWeapons.js'
import { rollEquipment } from '../js/xianxia/TowerEquipment.js'
import { FLOORS, ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { OPEN_EQUIPMENT_TIERS, canUseEquipmentTier } from '../js/xianxia/TowerEquipmentTiers.js'
import { cultivationAt } from '../js/xianxia/TowerProfile.js'
import { pillarSight, steerPillars, clearPillars, clipPillars, TOWER_PILLARS } from '../js/xianxia/TowerObstacles.js'
import { insideHex } from '../js/xianxia/TowerArena.js'
import { skillForm } from '../js/xianxia/TowerSkillForms.js'
import { swordQiReleaseOffset, swordQiTravelLimit } from '../js/xianxia/TowerSwordQi.js'
const A = Object.fromEntries(ARCHETYPES.map(a=>[a.id,a]))
const round = n=>Math.round(n*1000)/1000
const xpAt = n=>30*(n-1)+15*(n-1)**2
const rng = seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const routes = {
 qi: [['sj_arc',3],['sj_yujian',3],['vajra',2],['sj_arc',6],['sj_line',3],['sj_mark',2],['sj_arc',9],['sj_line',6],['sj_heart',3]],
 array: [['sj_wanjian',3],['sj_yujian',3],['vajra',2],['sj_wanjian',6],['sj_formation',3],['sj_gate',2],['sj_wanjian',9],['sj_formation',6],['sj_bone',3]],
 mixed: [['sj_arc',3],['sj_wanjian',3],['sj_yujian',3],['vajra',2],['sj_formation',3],['sj_line',3],['sj_arc',6],['sj_wanjian',6],['sj_heart',3]],
}
export function fixture(floor, route, quality=2, {mode='entry'}={}) {
 assert.ok(['entry','reference'].includes(mode), 'Unknown fixture mode')
 assert.ok(Number.isInteger(floor)&&floor>=1&&floor<=9&&routes[route], 'Invalid floor or route')
 const state=structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
 state.xp=mode==='reference'?xpAt(floor*3):FLOORS.slice(0,floor-1).reduce((sum,f)=>sum+f.cultivation_xp_budget,0)
 state.clearedFloor=floor-1
 if(mode==='reference'){
  state.skillsInitialized=true;state.tutorialWaves=3
  state.skills={sj_arc:1,sj_yujian:1,sj_wanjian:1}
 }
 let bookCost=0
 for(const [id,target] of routes[route])while((state.skills[id]||0)<target){
  const q=skillRequirement(state,id);if(!q.ok)break
  state.skills[id]=q.nextLevel;if(q.bookCost){state.books.push(id);bookCost+=q.bookCost}
 }
 assert.ok(growthSummary(state).available>=0)
 const level=cultivationAt(state.xp).level
 const tier=mode==='reference'?(floor===1?'fan':floor<=3?'fa':floor<=6?'bao':'ling'):OPEN_EQUIPMENT_TIERS.filter(t=>canUseEquipmentTier(t,level)).at(-1),random=rng(730+floor)
 let loadout=combatLoadout(state)
 const requestedQuality=quality
 if(mode==='entry'&&floor===1)quality=0
 else {
  // Fan has only one transitional quality; keep the requested quality in the report.
  if(tier==='fan')quality=1
  const weapon=rollWeapon(tier,quality,random,'calibration-weapon'),armor=rollEquipment('armor',tier,quality,random,'calibration-armor'),ring=rollEquipment('ring',tier,quality,random,'calibration-ring')
  loadout={...loadout,weaponId:weapon.id,weapon,weaponQuality:quality,weaponRefine:0,weaponEquipped:true,armorId:armor.id,armor,ringId:ring.id,ring,weaponFocusCount:0}
 }
 return {floor,route,quality,requestedQuality,mode,level,tier,xp:state.xp,skills:state.skills,books:state.books,bookCost,points:growthSummary(state),loadout,stats:stats(state.xp,loadout)}
}
export function zoneDanger(z,q,pad=26) {
 if(z.shape==='safe-gates')return !z.safeZones.some(g=>Math.hypot(q.x-g.x,q.y-g.y)<=g.radius-pad)
 const segmentDistance=(a,b)=>{
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1)))
  return Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy)
 }
 if(z.shape==='capsule'||z.shape==='line'){
  const radius=z.skillId?(z.radius??(z.width??50)/2):(z.width??50)/2
  return segmentDistance(z,{x:z.toX??z.x,y:z.toY??z.y})<=radius+pad
 }
 const d=Math.hypot(q.x-z.x,q.y-z.y),radius=z.radius??60
 if(z.shape==='sector'&&!z.skillId){
  // Same disk-vs-filled-sector geometry as TowerRun.inSector, including both radial edges.
  if(d<=pad)return true
  const half=(z.angle??90)*Math.PI/360,fx=z.faceX??1,fy=z.faceY??0
  if(((q.x-z.x)*fx+(q.y-z.y)*fy)/d>=Math.cos(half)&&d<=radius+pad)return true
  return [-half,half].some(a=>segmentDistance(z,{x:z.x+(fx*Math.cos(a)-fy*Math.sin(a))*radius,y:z.y+(fx*Math.sin(a)+fy*Math.cos(a))*radius})<=pad)
 }
 if(z.shape==='sector'||z.shape==='ring'){
  if(d>radius+pad||z.shape==='ring'&&d+pad<(z.innerRadius??0))return false
  const angle=Math.atan2(q.y-z.y,q.x-z.x)-Math.atan2(z.faceY??0,z.faceX??1)
  return Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<=(z.angle??Math.PI*2)/2+Math.asin(Math.min(1,pad/Math.max(pad,d)))
 }
 return d<=radius+pad
}
// Routes are bot-local, never part of the game snapshot or player attributes.
const gateRoutes=new WeakMap()
const escapeRoutes=new WeakMap()
const firingCosts=new WeakMap()
function gateSteering(run,zone) {
 const s=run.state,p=s.player,pad=(p.radius??18)+4
 const gates=zone.safeZones||[]
 if(gates.some(g=>Math.hypot(p.x-g.x,p.y-g.y)<g.radius-pad)){
  run.setInput(0,0);return true
 }
 const bodies=s.enemies.filter(e=>e.hp>0)
 const clear=(a,b)=>{
  if(!insideHex(b,pad)||!clearPillars(b,pad)||clipPillars(a,b.x-a.x,b.y-a.y,1,pad)<1-1e-8)return false
  const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy
  return bodies.every(e=>{
   const ax=a.x-e.x,ay=a.y-e.y,r=e.radius+pad
   const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(len||1)))
   // A body can move into the margin; still allow a route moving out of it.
   if(ax*ax+ay*ay<r*r)return ax*dx+ay*dy>=0
   return Math.hypot(ax+dx*t,ay+dy*t)>=r-1e-7
  })
 }
 let cached=gateRoutes.get(run)
 if(cached?.zone!==zone)cached=null
 if(cached){
  while(cached.points.length&&Math.hypot(p.x-cached.points[0].x,p.y-cached.points[0].y)<p.moveSpeed/60+1)cached.points.shift()
  if(!cached.points.length||!clear(p,cached.points[0]))cached=null
 }
 if(!cached){
  const nodes=[{x:p.x,y:p.y}],goals=new Set()
  for(const g of gates){
   for(let i=-1;i<12;i++){
    const radius=i<0?0:Math.max(0,g.radius-pad-3),angle=i*Math.PI/6
    const q={x:g.x+Math.cos(angle)*radius,y:g.y+Math.sin(angle)*radius}
    if(insideHex(q,pad)&&clearPillars(q,pad)&&bodies.every(e=>Math.hypot(q.x-e.x,q.y-e.y)>=e.radius+pad)){
     goals.add(nodes.length);nodes.push(q)
    }
   }
  }
  // Circumscribed rings permit segments around bodies and pillar footprints.
  const blockers=[...bodies,...TOWER_PILLARS].filter(e=>Math.hypot(e.x-p.x,e.y-p.y)<600)
  for(const e of blockers)for(let i=0;i<12;i++){
   const angle=i*Math.PI/6,radius=(e.radius+pad+2)/Math.cos(Math.PI/12)
   nodes.push({x:e.x+Math.cos(angle)*radius,y:e.y+Math.sin(angle)*radius})
  }
  const distance=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),done=new Set()
  distance[0]=0;let goal=-1
  for(let k=0;k<nodes.length;k++){
   let u=-1
   for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(u<0||distance[i]<distance[u]))u=i
   if(u<0||!Number.isFinite(distance[u]))break
   if(goals.has(u)){goal=u;break}
   done.add(u)
   for(let v=1;v<nodes.length;v++)if(!done.has(v)&&clear(nodes[u],nodes[v])){
    const d=distance[u]+Math.hypot(nodes[u].x-nodes[v].x,nodes[u].y-nodes[v].y)
    if(d<distance[v]){distance[v]=d;prev[v]=u}
   }
  }
  if(goal<0){gateRoutes.delete(run);return false}
  const points=[]
  for(let i=goal;i>0;i=prev[i])points.unshift(nodes[i])
  cached={zone,points};gateRoutes.set(run,cached)
 }
 const target=cached.points[0],dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy)
 run.setInput(dx/d,dy/d);return true
}
export function steerMechanics(run) {
 const s=run.state,p=s.player,enemies=s.enemies.filter(e=>e.hp>0)
 const gateZone=(s.monsterMechanics?.zones||[]).find(z=>z.shape==='safe-gates')
 if(gateZone){escapeRoutes.delete(run);if(gateSteering(run,gateZone))return}
 if(!gateZone)gateRoutes.delete(run)
 const near=[...enemies].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))
 const objective=near.find(e=>e.mechanicObjective||e.mechanicKind||e.objectiveKind||e.temporary&&/core|crystal|egg|pillar|lock/.test(e.temporary.kind||''))
 const gate=(s.monsterMechanics?.zones||[]).find(z=>z.shape==='safe-gates')?.safeZones?.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]
 // M15 sweeps from radius 35 to 200 during its active second. Reserve its
 // swept sector until expiry; a temporarily empty inner band is not a reason
 // to reverse course into the approaching wave. The authored gap stays open.
 const zones=[...s.zones.filter(z=>z.hostile),...(s.monsterMechanics?.zones||[])].map(z=>
  z.skillId==='M15'?{...z,radius:200,innerRadius:0}:z)
 // Keep an escape decision across frames. Re-scoring distant endpoints every
 // tick can alternate between opposite exits while never leaving the warning.
 const warnings=zones.filter(z=>z.skillId==='M06'||z.shape==='sector'&&!z.skillId)
 let escape=escapeRoutes.get(run)
 if(escape){
  const warning=warnings.find(z=>z.id===escape.id)
  if(!warning||s.time<escape.time){escapeRoutes.delete(run);escape=null}
  else{
   const moved=Math.hypot(p.x-escape.px,p.y-escape.py)
   escape.stalled=moved<.1?escape.stalled+Math.max(0,s.time-escape.time):0
   Object.assign(escape,{px:p.x,py:p.y,time:s.time})
   const danger=zoneDanger(warning,p)
   const heading=danger?escape:{x:0,y:0}
   const clear=[1/60,.1,.2].every(t=>{
    const q={x:p.x+heading.x*p.moveSpeed*t,y:p.y+heading.y*p.moveSpeed*t}
    return insideHex(q,22)&&clearPillars(q,22)
     &&!zones.some(z=>z.id!==escape.id&&zoneDanger(z,q))
   })
   const bulletThreat=s.projectiles.some(b=>{
    if(!b.hostile)return false
    const dx=p.x-b.x,dy=p.y-b.y
    const vx=heading.x*p.moveSpeed-(b.vx||0),vy=heading.y*p.moveSpeed-(b.vy||0)
    const t=Math.max(0,Math.min(.9,-(dx*vx+dy*vy)/(vx*vx+vy*vy||1)))
    return Math.hypot(dx+vx*t,dy+vy*t)<=(b.radius??8)+(p.radius??18)+6
   })
   if(clear&&!bulletThreat&&(!danger||escape.stalled<.15)){run.setInput(heading.x,heading.y);return}
   escapeRoutes.delete(run);escape=null
  }
 }
 // Observable, local healing only: no knowledge of future spawns or random rolls.
 const heal=p.hp<p.maxHp*.7?(s.drops||[]).filter(d=>d.kind==='heal'&&d.expiresAt>s.time&&Math.hypot(d.x-p.x,d.y-p.y)<=360&&pillarSight(p,d)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).find(d=>[.25,.5,.75,1].every(t=>{
  const q={x:p.x+(d.x-p.x)*t,y:p.y+(d.y-p.y)*t}
  return insideHex(q,22)&&clearPillars(q,22)&&!zones.some(z=>zoneDanger(z,q))&&!near.some(e=>Math.hypot(q.x-e.x,q.y-e.y)<e.radius+32)
 })):null
 const target=gate||heal||objective||near[0],preferred=gate||heal?0:objective?45:(s.loadout.active.sj_wanjian>=3?90:150)
 let bx=0,by=0
 if(gate&&Math.hypot(gate.x-p.x,gate.y-p.y)<gate.radius-26){run.setInput(0,0);return}
 if(target){const d=Math.hypot(target.x-p.x,target.y-p.y)||1,radial=d>preferred?1:d<preferred*.7?-1:0;bx=(target.x-p.x)/d*radial;by=(target.y-p.y)/d*radial}
 if(target&&!pillarSight(p,target)){const v=steerPillars(p,target,p.radius);bx=v.x;by=v.y}
 // A clear centre ray can still leave the wide crescent inside a wall or
 // pillar. Prefer a position with room to fire; keep close orbit builds on
 // their existing approach. Existing danger scoring remains active below.
 let fire=null
 if(target&&s.loadout.active.sj_arc>=4&&!(s.loadout.active.sj_wanjian>=3)&&!gate&&!heal&&!objective){
  fire=firingCosts.get(run)
  if(!fire||fire.until<s.time||fire.target!==target.id){
   const form=skillForm('sj_arc',s.loadout.active.sj_arc),offset=swordQiReleaseOffset(form)
   // Recheck local terrain at 5Hz, not all 25 headings on every 60Hz tick.
   fire={until:s.time+.2,target:target.id,cost:[]}
   for(let j=0;j<25;j++){
    const vx=j===24?0:Math.cos(j*Math.PI/12),vy=j===24?0:Math.sin(j*Math.PI/12)
    const q={x:p.x+vx*p.moveSpeed*.35,y:p.y+vy*p.moveSpeed*.35}
    if(!insideHex(q,22)||!clearPillars(q,22)
      ||clipPillars(p,q.x-p.x,q.y-p.y,1,22)<1-1e-8){fire.cost.push(40);continue}
    const d=Math.hypot(target.x-q.x,target.y-q.y)||1,dx=(target.x-q.x)/d,dy=(target.y-q.y)/d
    const origin={x:q.x+dx*offset,y:q.y+dy*offset}
    const needed=Math.max(0,d-offset-target.radius-form.bladeWidth/2)
    const range=swordQiTravelLimit(form.bladeKind,form.width,form.bladeWidth,
     origin,dx,dy,needed+1,s.arenaVersion)
    fire.cost.push(range>=needed&&range>0?0:3)
   }
   firingCosts.set(run,fire)
  }
 }
 let best=-Infinity,choice={x:0,y:0}
 for(let i=0;i<25;i++){
  const x=i===24?0:Math.cos(i*Math.PI/12),y=i===24?0:Math.sin(i*Math.PI/12);let score=x*bx+y*by-(i===24?0:.1)-(fire?.cost[i]??0)
  for(const lead of [.2,.5,.9]){const q={x:p.x+x*p.moveSpeed*lead,y:p.y+y*p.moveSpeed*lead}
   if(!insideHex(q,22)||!clearPillars(q,22))score-=40
   for(const z of zones)if(zoneDanger(z,q)){
    score-=10
    // Binary danger scores can make the bot orbit inside a circle. Prefer
    // progress toward its edge while retaining obstacle and projectile costs.
    if(z.shape==='circle'||z.skillId==='M15')score-=10*Math.max(0,1-Math.hypot(q.x-z.x,q.y-z.y)/((z.radius??60)+26))
   }
   for(const e of near)if(Math.hypot(q.x-e.x,q.y-e.y)<e.radius+22)score-=2
  }
  // Swept relative motion catches a bullet arriving between prediction samples
  // and prevents stopping as soon as it passes the first .2-second sample.
  for(const b of s.projectiles)if(b.hostile){
   const dx=p.x-b.x,dy=p.y-b.y,vx=x*p.moveSpeed-(b.vx||0),vy=y*p.moveSpeed-(b.vy||0)
   const t=Math.max(0,Math.min(.9,-(dx*vx+dy*vy)/(vx*vx+vy*vy||1)))
   const d=Math.hypot(dx+vx*t,dy+vy*t),radius=(b.radius??8)+(p.radius??18)+6
   if(d<=radius)score-=8+12*(1-d/radius)
  }
  if(score>best){best=score;choice={x,y}}
 }
 const warning=warnings.find(z=>z.id&&zoneDanger(z,p))
 if(warning&&Math.hypot(choice.x,choice.y)>.9)escapeRoutes.set(run,{
  id:warning.id,...choice,px:p.x,py:p.y,time:s.time,stalled:0,
 })
 run.setInput(choice.x,choice.y)
}
export function playFixture(f,{seed=101,maxSeconds=1200,hpFraction=1}={}){
 const run=new TowerRun({attemptId:1,floor:f.floor,seed,hp:f.stats.maxHp*hpFraction,xp:f.xp,loadout:f.loadout,arenaVersion:1})
 assert.equal(run._playtestAssist,false)
 const playerHitEvents=[]
 const records=new Map(),damageByFamily={};let seen=new Set(),damage=0,distance=0,hits=0,playerDamage=0,bossWaveAt=null,resumedNodes=0
 while(['playing','paused'].includes(run.state.phase)&&run.state.time<maxSeconds){
  // Fixed loadout policy: defer breakthrough and resume through the public API.
  // A safe-node pause is not a completed encounter or a loss.
  if(run.state.phase==='paused'){run.resume();resumedNodes++}
  const s=run.state,p=s.player
  // Landscape 16:9, no artificial off-screen full-arena targeting.
  run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315})
  steerMechanics(run);const old={x:p.x,y:p.y};run.advance(1/60);distance+=Math.hypot(p.x-old.x,p.y-old.y)
  if(s.wave===20)bossWaveAt??=s.time
  for(const e of s.enemies)if(!records.has(e.id))records.set(e.id,{id:e.id,archetype:e.archetype,role:e.temporary?'temporary':A[e.archetype]?.role||'temporary',wave:s.wave,spawnAt:s.time,firstAttackableAt:null,firstDamageAt:null,playerLevelAtSpawn:cultivationAt(p.xp).level,playerXpAtSpawn:p.xp,playerHpAtSpawn:round(p.hp),skillsAtSpawn:structuredClone(s.loadout.active),maxHp:e.maxHp,lastHp:e.hp,lastSeen:s.time})
  for(const e of s.enemies){const r=records.get(e.id);if(Math.abs(e.x-p.x)<=560+e.radius&&Math.abs(e.y-p.y)<=315+e.radius&&Math.hypot(e.x-p.x,e.y-p.y)<=460+e.radius)r.firstAttackableAt??=s.time;if(e.hp<r.lastHp)r.firstDamageAt??=s.time;r.lastHp=e.hp;r.lastSeen=s.time}
  for(const k of s.killLedger){const r=records.get(k.id);if(r&&!r.deadAt)r.deadAt=s.time}
  for(const fx of s.effects){
   if(fx.kind!=='hit'||seen.has(fx.id))continue
   const target=records.get(fx.targetId),archetype=A[target?.archetype]
   if(!target||!archetype||target.role==='temporary')continue
   const family=archetype.species
   const tally=damageByFamily[family]??={physical:0,magic:0,total:0}
   tally.physical+=fx.damageParts?.physical??0
   tally.magic+=fx.damageParts?.magic??0
   tally.total+=fx.damage??0
  }
  const next=new Set();for(const fx of s.effects){next.add(fx.id);if(seen.has(fx.id))continue;if(fx.kind==='hit')damage+=fx.damage||0;if(fx.kind==='player_hit'){hits++;playerDamage+=fx.damage||0;playerHitEvents.push({time:round(s.time),wave:s.wave,damage:round(fx.damage||0),hp:round(p.hp),position:{x:round(p.x),y:round(p.y)},source:fx.source??null,attackId:fx.attackId??null,attribution:fx.source?'runtime-effect':'unknown; nearby actors are context only',nearbyActors:s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<400).map(e=>({id:e.id,archetype:e.archetype,distance:round(Math.hypot(e.x-p.x,e.y-p.y)),attackMode:e.ai?.mode??null,attack:e.ai?.attack?structuredClone(e.ai.attack):null})),hostileZones:[...s.zones.filter(z=>z.hostile),...(s.monsterMechanics?.zones||[])].filter(z=>zoneDanger(z,p)).map(z=>({id:z.id,skillId:z.skillId,shape:z.shape}))})}}seen=next
 }
 const s=run.state,encounters=[...records.values()].filter(e=>e.role==='elite'||e.role==='boss').map(e=>({...e,spawnAt:round(e.spawnAt),deadAt:e.deadAt?round(e.deadAt):null,elapsed:round((e.deadAt||s.time)-e.spawnAt),engagedSeconds:e.firstAttackableAt===null?null:round((e.deadAt||s.time)-e.firstAttackableAt),firstDamageSeconds:e.firstDamageAt===null?null:round((e.deadAt||s.time)-e.firstDamageAt),success:!!e.deadAt}))
 return {floor:f.floor,route:f.route,quality:f.quality,mode:f.mode,entryLevel:f.level,entryXp:f.xp,entrySkills:f.skills,playerHitEvents,seed,hpFraction,outcome:['playing','paused'].includes(s.phase)?'timeout':s.phase,time:round(s.time),lastWave:s.wave,hp:round(s.player.hp),maxHp:round(s.player.maxHp),damage:round(damage),effectiveDps:round(damage/Math.max(1,s.time)),movementDistance:round(distance),playerHits:hits,playerDamage:round(playerDamage),bossWaveSeconds:bossWaveAt?round(s.time-bossWaveAt):null,resumedNodes,damageByFamily,encounters}
}
const percentile=(arr,p)=>{if(!arr.length)return null;const a=[...arr].sort((x,y)=>x-y),i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return round(a[lo]+(a[hi]-a[lo])*(i-lo))}
export function summarize(samples){return FLOORS.map(f=>{const rows=samples.filter(s=>s.floor===f.floor),boss=rows.flatMap(s=>s.encounters.filter(e=>e.role==='boss'&&e.success).map(e=>e.engagedSeconds??e.elapsed)),elite=rows.flatMap(s=>s.encounters.filter(e=>e.role==='elite'&&e.success).map(e=>e.engagedSeconds??e.elapsed));return {floor:f.floor,timing:'visible-within-460px engagement when observed, else legacy spawn timing',n:rows.length,wins:rows.filter(s=>s.outcome==='won').length,bossN:boss.length,bossInTarget:boss.filter(t=>t>=100&&t<=140).length,bossFailures:rows.flatMap(s=>s.encounters).filter(e=>e.role==='boss'&&!e.success).length,bossMin:percentile(boss,0),bossMax:percentile(boss,1),bossMedian:percentile(boss,.5),bossP10:percentile(boss,.1),bossP90:percentile(boss,.9),eliteN:elite.length,eliteInTarget:elite.filter(t=>t>=20&&t<=40).length,eliteMin:percentile(elite,0),eliteMax:percentile(elite,1),eliteMedian:percentile(elite,.5),layerMedian:percentile(rows.map(s=>s.time),.5)}})}
export function fixtureKey(f) {
 return createHash('sha256').update(JSON.stringify({floor:f.floor,xp:f.xp,loadout:f.loadout})).digest('hex')
}
export function sourceHashes() {
 const root=new URL('../',import.meta.url)
 const files=readdirSync(new URL('js/xianxia/',root)).filter(n=>n.endsWith('.js')).map(n=>`js/xianxia/${n}`)
 files.push('scripts/verify-monster-mechanics-balance.mjs')
 return Object.fromEntries(files.sort().map(n=>[n,createHash('sha256').update(readFileSync(new URL(n,root))).digest('hex')]))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const opt=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback
 const mode=opt('mode',process.argv.includes('--reference')?'reference':'entry')
 const label=opt('label','current'),seeds=opt('seeds','101,211,307,401').split(',').map(Number),qualities=opt('qualities','2').split(',').map(Number),floors=opt('floors','1,2,3,4,5,6,7,8,9').split(',').map(Number),selectedRoutes=opt('routes',Object.keys(routes).join(',')).split(','),samples=[],fixtures=[],duplicates=[]
 assert.ok(/^[a-zA-Z0-9_-]+$/.test(label),'Invalid report label')
 const startedAt=new Date().toISOString(),hashes=sourceHashes(),keys=new Map()
 const dir=resolve(opt('outdir',fileURLToPath(new URL(`../reports/balance-calibration-${startedAt.slice(0,10)}/${startedAt.replace(/[:.]/g,'-')}/`,import.meta.url))))
 mkdirSync(dir,{recursive:true})
 assert.ok(!existsSync(join(dir,`balance-${label}.json`))&&!existsSync(join(dir,`balance-${label}.partial.json`)), 'Report already exists; choose a new outdir or label')
 const report={method:'Fixed fixtures, NOT a natural journey: entry mode uses preceding-floor XP and a fresh arc1 start; later gear/books are synthetic and acquisition NOT proven. Reference mode preserves old end-level/three-skill fixtures. No in-battle skill purchases. Real TowerRun at 60Hz, normal HP/damage, movement-only deterministic bot, landscape viewport; failures retained. Local healing sought below 70% HP when the visible path is clear. Hit source unknown unless emitted by runtime; nearby actors/zones are context only. Equipment rolls independent of combat seed. Timing begins at observed spawn/visibility/HP decrease as labeled. No human/device-performance verdict.',mode,startedAt,hashes,seeds,fixtures,duplicates,samples}
 const checkpoint=(complete=false)=>{
  const endHashes=sourceHashes()
  const output={...report,completed:complete,updatedAt:new Date().toISOString(),freshness:{unchanged:JSON.stringify(hashes)===JSON.stringify(endHashes),endHashes},summary:summarize(samples)}
  writeFileSync(join(dir,`balance-${label}${complete?'':'.partial'}.json`),JSON.stringify(output,null,2))
  return output
 }
 checkpoint()
 for(const floor of floors)for(const route of selectedRoutes)for(const quality of qualities){
  const f=fixture(floor,route,quality,{mode}),key=fixtureKey(f)
  if(keys.has(key)){duplicates.push({floor,route,requestedQuality:quality,equivalentTo:keys.get(key),fixtureKey:key});continue}
  f.fixtureKey=key;keys.set(key,{floor,route,requestedQuality:quality});fixtures.push(f)
  for(const seed of seeds){
   const s=playFixture(f,{seed,maxSeconds:Number(opt('max-seconds','1200')),hpFraction:Number(opt('hp-fraction','1'))});samples.push(s);checkpoint()
   console.error(`${floor}/${route}/q${f.quality}/${seed}: ${s.outcome} ${s.time}s wave${s.lastWave} boss=${s.encounters.find(e=>e.role==='boss')?.engagedSeconds??'-'} elite=${s.encounters.filter(e=>e.role==='elite').map(e=>e.engagedSeconds).join(',')}`)
  }
 }
 checkpoint();const output=checkpoint(true);console.log(JSON.stringify(output.summary,null,2))
}
