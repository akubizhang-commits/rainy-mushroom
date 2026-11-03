import test from 'node:test'
import assert from 'node:assert/strict'
import { yujianHoverPose, turnYujian, newYujianState, yujianHeading, stepYujianFlight, yujianVisualPose } from '../js/xianxia/TowerYujian.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { TOWER_PILLARS } from '../js/xianxia/TowerObstacles.js'
import { insideHex } from '../js/xianxia/TowerArena.js'

test('fixed hover formation keeps its slots on their shoulder sides',()=>{
  let previous
  for(let i=0;i<=18*120;i++){
    const poses=Array.from({length:10},(_,k)=>yujianHoverPose(k,i/120,{x:0,y:0}))
    poses.forEach((p,k)=>{
      assert.equal(Math.sign(p.x),k%2?1:-1)
      assert.ok(Math.abs(p.x)>40)
      if(previous)assert.ok(Math.hypot(p.x-previous[k].x,p.y-previous[k].y)<1)
    })
    previous=poses
  }
})
test('rapid reverse retargets the actual angle and pause does not advance turning',()=>{
  const state=newYujianState({x:0,y:0,faceX:1},0)
  turnYujian(state,-1,1)
  const mid=yujianHeading(state,1.16)
  assert.ok(Math.abs(mid)>1)
  turnYujian(state,1,1.16)
  assert.equal(yujianHeading(state,1.16),mid)
  assert.equal(yujianHeading(state,1.16),mid)
  assert.ok(Math.abs(yujianHeading(state,1.49))<1e-8)
})
function make(rank=10){
  return new TowerRun({attemptId:1,floor:1,seed:7,xp:0,hp:100,training:true,
    loadout:{growthVersion:1,active:{sj_yujian:rank},passive:{},evolutions:[],evolutionLevels:{},
      tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
}
function volley(run,count,fill=true){
  if(fill)run.state.yujian.ready=run.state.loadout.active.sj_yujian
  const p=run.state.player
  run.state.enemies=Array.from({length:count},(_,i)=>({id:`probe-${i}`,x:p.x+200,y:p.y+(i-5)*10,hp:100000,radius:6}))
  const c={skill:'sj_yujian',level:10,dirX:1,dirY:0,pulseIndex:0,
    castContext:{loadout:structuredClone(run.state.loadout),xp:0}}
  run._releaseGrowthSkill(c,[])
}
test('ten targets use ten unique slots; an overlapping volley cannot create more swords',()=>{
  const run=make();volley(run,10)
  assert.equal(run.state.projectiles.length,10)
  assert.equal(new Set(run.state.projectiles.map(p=>p.yujianSlot)).size,10)
  volley(run,10,false)
  assert.equal(run.state.projectiles.length,10)
})
test('one target receives all stored swords with positive damage from their shoulder slots',()=>{
  const run=make();volley(run,1)
  const [shot]=run.state.projectiles
  assert.equal(run.state.projectiles.length,10)
  assert.ok(shot.damage>0)
  assert.ok(shot.x<run.state.player.x,'first sword launches from left shoulder')
  assert.equal(shot.launchFace,1)
})
test('flight first travels forward then curves, independently of the player turning',()=>{
  const shot={x:40,y:0,vx:680,vy:0,launchFace:1,flightAt:0,expiresAt:5,yujianSlot:0}
  const target={x:-100,y:100,hp:100}
  stepYujianFlight(shot,target,.05,1/60)
  assert.ok(shot.vx>0)
  for(let i=0;i<60;i++)stepYujianFlight(shot,target,.2+i/60,1/60)
  assert.ok(shot.vx<0)
})
test('moving swords converge on nearby, lateral and rear targets instead of orbiting',()=>{
  for(const [x,y] of [[100,100],[60,0],[-100,100],[32,50],[200,-180]]){
    const shot={x:32,y:0,vx:680,vy:0,launchFace:1,flightAt:0,yujianSlot:0}
    const target={x,y,hp:100};let hit=false
    for(let i=0;i<120;i++){
      stepYujianFlight(shot,target,i/60,1/60)
      shot.x+=shot.vx/60;shot.y+=shot.vy/60
      if(Math.hypot(shot.x-x,shot.y-y)<13){hit=true;break}
    }
    assert.ok(hit,`must reach ${x},${y} within two seconds`)
  }
})
test('gather aligns with launch direction without snapping at release',()=>{
  for(const face of [-1,1]){
    const shot={x:32*face,y:0,vx:680*face,vy:0,launchFace:face,flightAt:.32,gatherAt:0,hoverX:32*face,hoverY:46,hoverAngle:face<0?Math.PI:0}
    const a=yujianVisualPose(shot,.31999),b=yujianVisualPose(shot,.32)
    assert.ok(Math.abs(Math.atan2(Math.sin(a.angle-b.angle),Math.cos(a.angle-b.angle)))<.01)
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.01)
  }
})
test('expiry leaves one fading tail and releases its slot after the fade',()=>{
  const run=make(1);volley(run,1)
  const shot=run.state.projectiles[0];run.state.time=shot.expiresAt
  run._projectiles([],[],run.state.player)
  assert.equal(shot.dissolveAt,run.state.time)
  run.state.time+=.26;run._projectiles([],[],run.state.player)
  assert.equal(run.state.projectiles.length,0)
})
test('real new snapshots preserve turning state across pause and restore',()=>{
  const run=make(1)
  run.state.cooldowns.sj_yujian=999
  run.setInput(-1,0);run.advance(.1);run.pause()
  const snap=run.snapshot()
  assert.ok(validateTowerSnapshot(snap))
  const restored=TowerRun.restore(snap)
  assert.deepEqual(restored.state.yujian,snap.yujian)
  restored.advance(2)
  assert.deepEqual(restored.snapshot(),snap)
  restored.resume();run.resume()
  restored.advance(.2);run.advance(.2)
  assert.deepEqual(restored.snapshot(),run.snapshot())
})
test('impact fades the trail once, holds its slot and never applies a second hit',()=>{
  const run=make(1);volley(run,1)
  const s=run.state,shot=s.projectiles[0],enemy=s.enemies[0]
  shot.flightAt=0; shot.x=enemy.x-1;shot.y=enemy.y;shot.vx=680;shot.vy=0
  s.time=.2
  const hits=[]
  run._projectiles([],hits,s.player)
  assert.equal(hits.length,1)
  assert.equal(s.projectiles.length,1,'hit leaves a fading visual with its occupied slot')
  assert.equal(shot.dissolveAt,.2)
  run._projectiles([],hits,s.player)
  assert.equal(hits.length,1)
  s.time=.46;run._projectiles([],hits,s.player)
  assert.equal(s.projectiles.length,0)
})
test('missing targets dissolve without retargeting or dealing invisible damage',()=>{
  const run=make(1);volley(run,1)
  const s=run.state,shot=s.projectiles[0]
  s.time=shot.flightAt+.1;s.enemies=[]
  const hits=[];run._projectiles([],hits,s.player)
  assert.equal(hits.length,0);assert.equal(shot.dissolveAt,s.time)
})
test('swept flight stops at a pillar, even when the target is beyond it',()=>{
  const run=make(1);volley(run,1)
  const s=run.state,pillar=TOWER_PILLARS[0],shot=s.projectiles[0],target=s.enemies[0]
  s.arenaVersion=1;s.time=.2;shot.flightAt=.2
  Object.assign(shot,{x:pillar.x-83,y:pillar.y,vx:680,vy:0})
  Object.assign(target,{x:pillar.x+150,y:pillar.y})
  const hits=[];run._projectiles([],hits,s.player)
  assert.equal(hits.length,0);assert.equal(shot.dissolveAt,s.time)
  assert.ok(shot.x<pillar.x-70)
})
test('near-wall forward launch turns inward and reaches its target without crossing the hex',()=>{
  const run=make(1);volley(run,1)
  const s=run.state,shot=s.projectiles[0],target=s.enemies[0],hits=[]
  s.arenaVersion=1;s.time=.2
  Object.assign(shot,{x:970,y:0,vx:680,vy:0,flightAt:.2})
  Object.assign(target,{x:900,y:0})
  const damage=shot.damage,expiry=shot.expiresAt
  run._projectiles([],hits,s.player)
  assert.ok(insideHex(shot,shot.radius));assert.equal(shot.dissolveAt,null)
  assert.ok(shot.vx<0);assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy)-680)<1e-8)
  assert.equal(shot.damage,damage);assert.equal(shot.expiresAt,expiry)
  for(let i=1;i<=90&&!hits.length;i++){
    s.time=.2+i/60;run._projectiles([],hits,s.player)
    assert.ok(insideHex(shot,shot.radius))
  }
  assert.equal(hits.length,1);assert.equal(hits[0].damage,damage)
})
test('fractional velocities never count as a wall in open space',()=>{
  const run=make(1);volley(run,1)
  const s=run.state,shot=s.projectiles[0],target=s.enemies[0],hits=[]
  s.arenaVersion=0
  Object.assign(shot,{x:32,y:0,vx:680,vy:0,gatherAt:0,flightAt:0,expiresAt:3})
  Object.assign(target,{x:261.5396719429,y:151})
  for(let i=0;i<120&&!hits.length&&shot.dissolveAt===null;i++){
    s.time=i/60;run._projectiles([],hits,s.player)
  }
  assert.equal(hits.length,1,'must hit target instead of mistaking roundoff for a wall')
})
test('real in-flight snapshot restores identical continuation and rejects duplicate projectile identities',()=>{
  const run=make(10)
  for(let i=0;i<1800&&!run.state.projectiles.some(p=>p.yujianSlot!==undefined);i++)run.advance(1/60)
  assert.ok(run.state.projectiles.some(p=>p.yujianSlot!==undefined))
  assert.ok(validateTowerSnapshot(run.snapshot()))
  const corrupt=run.snapshot(),shot=corrupt.projectiles.find(p=>p.yujianSlot!==undefined)
  corrupt.projectiles.push({...shot})
  assert.equal(validateTowerSnapshot(corrupt),false)
  for(const patch of [{damage:1e15},{flightAt:shot.flightAt+1000},{dissolveAt:run.state.time+1000,expiresAt:run.state.time+1000.25}]){
    const altered=run.snapshot()
    Object.assign(altered.projectiles.find(p=>p.yujianSlot!==undefined),patch)
    assert.equal(validateTowerSnapshot(altered),false)
  }
  const restored=TowerRun.restore(run.snapshot())
  for(let i=0;i<60;i++){run.advance(1/60);restored.advance(1/60)}
  assert.deepEqual(restored.snapshot(),run.snapshot())
})
