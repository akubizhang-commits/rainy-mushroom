import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import test from 'node:test'
import assert from 'node:assert/strict'
import {fixture,zoneDanger,steerMechanics} from '../scripts/verify-monster-mechanics-balance.mjs'
import {FLOORS} from '../js/xianxia/TowerContent.js'
import {cultivationAt} from '../js/xianxia/TowerProfile.js'
import {TowerCampaignStore,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
test('all 81 fixed sword fixtures fit real level, SP, and item eligibility',()=>{
 for(let floor=1;floor<=9;floor++)for(const route of ['qi','array','mixed'])for(const quality of [1,2,4]){
  const f=fixture(floor,route,quality)
  assert.ok(f.points.spent<=f.points.total)
  const run=new TowerRun({attemptId:1,floor,seed:101,xp:f.xp,hp:f.stats.maxHp,loadout:f.loadout,arenaVersion:1})
  assert.equal(run._playtestAssist,false);assert.equal(run.state.player.hp,f.stats.maxHp)
 }
})
test('bot recognizes gate interiors and sector gaps in authored radian mechanics',()=>{
 const gates={shape:'safe-gates',safeZones:[{x:100,y:0,radius:55}]}
 assert.equal(zoneDanger(gates,{x:100,y:0}),false)
 assert.equal(zoneDanger(gates,{x:0,y:0}),true)
 const cone={shape:'sector',skillId:'M08',x:0,y:0,radius:200,faceX:1,faceY:0,angle:Math.PI/2}
 assert.equal(zoneDanger(cone,{x:100,y:0}),true)
 assert.equal(zoneDanger(cone,{x:-100,y:0}),false)
})
test('bot can hold a clear firing position and leaves it when a hostile zone appears',()=>{
 let input
 const run={state:{
  player:{x:0,y:0,radius:18,moveSpeed:200},
  enemies:[{x:140,y:0,hp:100,radius:18}],
  loadout:{active:{}},zones:[],projectiles:[],monsterMechanics:{zones:[]},
 },setInput(x,y){input={x,y}}}
 steerMechanics(run)
 assert.deepEqual(input,{x:0,y:0})
 run.state.monsterMechanics.zones.push({shape:'circle',x:0,y:0,radius:55})
 steerMechanics(run)
 assert.ok(Math.hypot(input.x,input.y)>.9)
})

test('default calibration begins at natural entry XP, with one effective fresh first-floor build',()=>{
 for(let floor=1;floor<=9;floor++){
  const f=fixture(floor,'qi',2)
  assert.equal(f.xp,FLOORS.slice(0,floor-1).reduce((sum,f)=>sum+f.cultivation_xp_budget,0))
  assert.equal(f.level,cultivationAt(f.xp).level)
 }
 const fresh=new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state
 for(const route of ['qi','array','mixed'])for(const quality of [1,2,4]){
  const f=fixture(1,route,quality)
  assert.deepEqual(f.skills,fresh.skills)
  assert.deepEqual(f.loadout,combatLoadout(fresh))
  assert.equal(f.quality,0)
 }
})
test('old end-level calibration requires an explicit reference mode',()=>{
 const f=fixture(2,'qi',2,{mode:'reference'})
 assert.equal(f.level,6)
 assert.equal(f.mode,'reference')
 assert.ok(f.skills.sj_wanjian>=1)
 assert.throws(()=>fixture(1,'qi',2,{mode:'bogus'}))
})
test('low-health bot approaches a reachable healing drop but avoids a hazardous route',()=>{
 let input
 const run={state:{player:{x:0,y:0,radius:18,moveSpeed:200,hp:40,maxHp:100},enemies:[],loadout:{active:{}},zones:[],projectiles:[],drops:[{id:'heal',kind:'heal',x:100,y:0,radius:8,amount:20,expiresAt:10}],time:0,monsterMechanics:{zones:[]}},setInput(x,y){input={x,y}}}
 steerMechanics(run)
 assert.ok(input.x>.9)
 run.state.zones=[{hostile:true,shape:'circle',x:70,y:0,radius:35}]
 steerMechanics(run)
 assert.ok(input.x<=0)
 run.state.zones=[];run.state.player.hp=90
 steerMechanics(run)
 assert.deepEqual(input,{x:0,y:0})
})

test('CLI de-duplicates equivalent first-floor fixtures and writes fresh partial/final evidence',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tower-calibration-'))
 try {
  execFileSync(process.execPath,['scripts/verify-monster-mechanics-balance.mjs','--floors=1','--routes=qi,array,mixed','--qualities=1,2','--seeds=101','--max-seconds=0.02',`--outdir=${dir}`],{stdio:'pipe'})
  const report=JSON.parse(readFileSync(join(dir,'balance-current.json')))
  assert.equal(report.mode,'entry')
  assert.equal(report.fixtures.length,1)
  assert.equal(report.samples.length,1)
  assert.equal(report.duplicates.length,5)
  assert.equal(report.freshness.unchanged,true)
  assert.ok(report.hashes['scripts/verify-monster-mechanics-balance.mjs'])
  assert.equal(report.samples[0].entryLevel,1)
  assert.ok(Array.isArray(report.samples[0].playerHitEvents))
  assert.equal(JSON.parse(readFileSync(join(dir,'balance-current.partial.json'))).samples.length,1)
  const before=readFileSync(join(dir,'balance-current.json'),'utf8')
  assert.throws(()=>execFileSync(process.execPath,['scripts/verify-monster-mechanics-balance.mjs','--floors=1','--seeds=101','--max-seconds=0.02',`--outdir=${dir}`],{stdio:'pipe'}))
  assert.equal(readFileSync(join(dir,'balance-current.json'),'utf8'),before)
 } finally {rmSync(dir,{recursive:true,force:true})}
})

test('danger includes the player disk along native sector edges and the apex',()=>{
 const zone={shape:'sector',x:0,y:0,radius:164,faceX:1,faceY:0,angle:170}
 const at=degrees=>({x:83*Math.cos(degrees*Math.PI/180),y:83*Math.sin(degrees*Math.PI/180)})
 assert.equal(zoneDanger(zone,at(90),18),true)
 assert.equal(zoneDanger(zone,at(110),18),false)
 assert.equal(zoneDanger(zone,{x:-10,y:0},18),true)
})
test('mechanic capsules use authored radius and disk expansion for ring gaps',()=>{
 assert.equal(zoneDanger({shape:'capsule',skillId:'M09',x:0,y:0,toX:200,toY:0,radius:70},{x:100,y:80},18),true)
 assert.equal(zoneDanger({shape:'capsule',skillId:'M09',x:0,y:0,toX:200,toY:0,radius:70},{x:100,y:89},18),false)
 const ring={shape:'ring',skillId:'M15',x:0,y:0,radius:100,innerRadius:40,angle:Math.PI,faceX:1,faceY:0}
 assert.equal(zoneDanger(ring,{x:-15,y:60},18),true)
 assert.equal(zoneDanger(ring,{x:-35,y:60},18),false)
})

test('bot avoids projectiles crossing between its old discrete prediction samples',()=>{
 let input
 const run={state:{player:{x:0,y:0,radius:18,moveSpeed:400,hp:100,maxHp:100},enemies:[],loadout:{active:{}},zones:[],projectiles:[{hostile:true,x:-50,y:-50,vx:400,vy:400,radius:8}],drops:[],monsterMechanics:{zones:[]}},setInput(x,y){input={x,y}}}
 steerMechanics(run)
 assert.ok(Math.hypot(input.x,input.y)>.9)
 const dx=50,dy=50,vx=input.x*400-400,vy=input.y*400-400
 const t=Math.max(0,Math.min(.9,-(dx*vx+dy*vy)/(vx*vx+vy*vy)))
 assert.ok(Math.hypot(dx+vx*t,dy+vy*t)>26,'chosen trajectory clears the real combined projectile and player radii')
})

test('bot escapes a circular warning before impact instead of orbiting its edge',()=>{
 for(const wave of [1,20]){
  let input
  const run={state:{wave,player:{x:0,y:60,radius:18,moveSpeed:237.6,hp:100,maxHp:100},
   enemies:[{x:0,y:0,hp:100,radius:42}],loadout:{active:{sj_wanjian:6}},
   zones:[{hostile:true,shape:'circle',x:0,y:0,radius:164}],projectiles:[],monsterMechanics:{zones:[]}},
   setInput(x,y){input={x,y}}}
  // A heavy hit has its real 1.2s windup; the player starts at body-contact range.
  for(let frame=0;frame<72;frame++){
   steerMechanics(run)
   run.state.player.x+=input.x*237.6/60
   run.state.player.y+=input.y*237.6/60
  }
  assert.ok(Math.hypot(run.state.player.x,run.state.player.y)>182,
   `wave ${wave}: the bot must leave the actual hit area before impact`)
 }
})

test('bot reaches a safe gate around a blocking boss without oscillating',()=>{
 for(const layout of [
  {player:{x:457.976,y:212.893},boss:{x:512.110,y:242.019},gates:[{x:557.976,y:212.893,radius:55},{x:507.976,y:299.495,radius:55}]},
  {player:{x:211.091,y:-412.174},boss:{x:295.633,y:-386.907},gates:[{x:311.091,y:-412.174,radius:55},{x:161.091,y:-325.572,radius:55}]},
 ]){
  let input
  const p={...layout.player,radius:18,moveSpeed:237.6,hp:100,maxHp:100}
  const boss={...layout.boss,radius:42,hp:100}
  const run={state:{time:0,player:p,enemies:[boss],loadout:{active:{}},zones:[],projectiles:[],monsterMechanics:{zones:[{id:'gate',shape:'safe-gates',safeZones:layout.gates}]}},setInput(x,y){input={x,y}}}
  for(let frame=0;frame<180;frame++){
   steerMechanics(run)
   const q={x:p.x+input.x*p.moveSpeed/60,y:p.y+input.y*p.moveSpeed/60}
   // Normal body collision blocks movement; this fixture never teleports through the boss.
   if(Math.hypot(q.x-boss.x,q.y-boss.y)>=60)Object.assign(p,q)
   run.state.time+=1/60
  }
  assert.ok(layout.gates.some(g=>Math.hypot(p.x-g.x,p.y-g.y)<g.radius-p.radius), 'enter a real safe area before the three-second blast')
  steerMechanics(run)
  assert.deepEqual(input,{x:0,y:0},'hold inside the safe gate')
 }
})

test('bot clears an expanding shockwave instead of oscillating and stepping back into it',()=>{
 for(const angle of [0,Math.PI/2,Math.PI]){
  let input
  const p={x:90*Math.cos(angle),y:90*Math.sin(angle),radius:18,moveSpeed:237.6,hp:100,maxHp:100}
  const z={id:'wave',skillId:'M15',shape:'ring',x:0,y:0,radius:200,innerRadius:0,faceX:Math.cos(angle),faceY:Math.sin(angle),angle:Math.PI*1.5,activatesAt:1.8,expiresAt:2.8,phase:'windup'}
  const run={state:{time:0,player:p,enemies:[{x:0,y:0,radius:42,hp:100}],loadout:{active:{sj_wanjian:6}},zones:[],projectiles:[],monsterMechanics:{zones:[z]}},setInput(x,y){input={x,y}}}
  for(let frame=0;frame<168;frame++){
   steerMechanics(run)
   p.x+=input.x*p.moveSpeed/60;p.y+=input.y*p.moveSpeed/60
   run.state.time=(frame+1)/60
   if(run.state.time>=1.8&&run.state.time<2.8){
    z.phase='active';z.radius=35+165*(run.state.time-1.8);z.innerRadius=Math.max(0,z.radius-45)
    assert.equal(zoneDanger(z,p,18),false,`must avoid actual wave at ${run.state.time}s, angle ${angle}`)
   }
  }
 }
})

// Historical snapshots retain their original art/equipment data on disk. Reuse
// their encounter geometry, but generate a fresh current-schema combat window:
// old affixes and missing mana/receipt fields must not be silently migrated here.
function currentEscapeWindow(record) {
 const old=record.snapshot,bossPose=old.enemies.find(e=>e.role==='boss')
 const mechanic=old.monsterMechanics.zones.length>0
 const loadout={growthVersion:1,skillsInitialized:true,active:{},passive:{sj_bone:4},
  evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}
 const run=new TowerRun({attemptId:44,floor:old.floor,seed:601,xp:14400,
  hp:cultivationAt(14400).maxHp,arenaVersion:1,loadout})
 // The native-sweep case deliberately isolates the native controller, as in
 // run-attacks.test.mjs. The charge case retains the real M06 controller.
 if(!mechanic)delete run.state.monsterMechanics
 run.setPlaytestAssist(true)
 for(let frame=0;frame<20000&&!run.state.enemies.some(e=>e.role==='boss');frame++){
  for(const e of run.state.enemies)run._damageEnemy({target:e.id,damage:1e9,direct:false,scaled:true,source:'encounter-setup'})
  run.advance(1/60)
 }
 const boss=run.state.enemies.find(e=>e.role==='boss')
 assert.ok(boss,'actual floor-nine Boss spawned after all required earlier kills')
 const quiet=()=>{
  for(const e of run.state.enemies)if(e!==boss)e.ai.graceUntil=999999
 }
 while(run.state.time<boss.ai.entryUntil){quiet();run.advance(1/60)}
 Object.assign(run.state.player,{x:old.player.x,y:old.player.y})
 Object.assign(boss,{x:bossPose.x,y:bossPose.y})
 boss.ai.graceUntil=mechanic?999999:0;boss.ai.readyAt=0
 for(let frame=0;frame<600;frame++){
  quiet();run.advance(1/60)
  if(mechanic?run.state.monsterMechanics.zones.some(z=>z.skillId==='M06'):boss.ai.attack?.kind==='sweep')break
 }
 const zone=mechanic?run.state.monsterMechanics.zones.find(z=>z.skillId==='M06'):
  run.state.zones.find(z=>z.ownerId===boss.id&&z.kind==='enemy_windup')
 assert.ok(zone,'real controller emitted the expected warning')
 assert.equal(zone.shape,mechanic?'capsule':'sector')
 assert.ok(zoneDanger(zone,run.state.player,run.state.player.radius),'starting pose is actually threatened')
 const snapshot=run.snapshot()
 assert.ok(validateTowerSnapshot(snapshot),'current items, stats, mana and all reward receipts remain valid')
 return snapshot
}

test('bot leaves recorded sweep and charge geometry in fresh valid combat windows',()=>{
 const windows=JSON.parse(readFileSync(new URL('./fixtures/tower-bot-escape.json',import.meta.url),'utf8'))
 for(const f of windows){
  const snapshot=currentEscapeWindow(f)
  const run=TowerRun.restore(snapshot),stationary=TowerRun.restore(snapshot),end=run.state.time+f.duration
  let movingHits=0,stationaryHits=0
  for(const [actor,count] of [[run,()=>movingHits++],[stationary,()=>stationaryHits++]]){
   const effect=actor._effect.bind(actor)
   actor._effect=(kind,x,y,radius,extra)=>{if(kind==='player_hit')count();return effect(kind,x,y,radius,extra)}
  }
  while(run.state.phase==='playing'&&run.state.time<end){
   const p=run.state.player;run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315})
   steerMechanics(run);run.advance(1/60);stationary.advance(1/60)
  }
  assert.equal(movingHits,0,f.name)
  assert.ok(stationaryHits>0,`${f.name}: stationary control must receive the actual warned hit`)
  assert.ok(validateTowerSnapshot(run.snapshot()))
 }
})
