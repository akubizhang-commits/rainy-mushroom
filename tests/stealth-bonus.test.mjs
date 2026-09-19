import test from 'node:test'
import assert from 'node:assert/strict'
import { ForagingState } from '../js/core/ForagingState.js'
import { VoxelWorld } from '../js/voxel/VoxelWorld.js'
import { VoxelInput } from '../js/voxel/VoxelInput.js'
import { Wildlife } from '../js/voxel/Wildlife.js'

const start=(mode='relaxed')=>{const s=new ForagingState();s.startScene('yn-pine');s.startHunt(mode);s.tickHunt(0);return s}
const collect=(s,spawn)=>{s.brushSpawn(spawn.id);return s.collectSpawn(spawn.id)}
const complete=s=>{for(const spawn of s.sceneData.spawns.slice(0,8))collect(s,spawn)}
const flatWorld=scene=>({scene,targets:[],heightAt:()=>0,lineOfSight:()=>true,canStand:(x,z)=>Math.abs(x)<16&&Math.abs(z)<16})

test('crouching lowers the camera, slows travel, and overrides sprint',()=>{
  const world=flatWorld({}),move=VoxelWorld.prototype.move
  const walk={x:0,y:1.58,z:0,yaw:0},crouch={...walk,crouched:true,sprinting:true},run={...walk,sprinting:true}
  for(let i=0;i<20;i++){move.call(world,walk,0,1,.05);move.call(world,crouch,0,1,.05);move.call(world,run,0,1,.05)}
  assert.ok(Math.abs(crouch.y-.78)<.01)
  assert.ok(Math.abs(walk.y-1.58)<.01)
  assert.ok(Math.abs(crouch.z)<Math.abs(walk.z)&&Math.abs(walk.z)<Math.abs(run.z))
  assert.ok(crouch.speed<1.1&&run.speed>3.9)
  crouch.crouched=false;crouch.sprinting=false
  for(let i=0;i<20;i++)move.call(world,crouch,0,0,.05)
  assert.ok(Math.abs(crouch.y-1.58)<.01)
  assert.equal(crouch.speed,0)
})
test('blocked movement produces no running speed and crouching keeps collision checks',()=>{
  const world={...flatWorld({}),canStand:()=>false},player={x:0,y:1.58,z:0,yaw:0,sprinting:true}
  VoxelWorld.prototype.move.call(world,player,0,1,.05)
  assert.equal(player.speed,0);assert.equal(player.z,0)
  player.crouched=true
  VoxelWorld.prototype.move.call(world,player,1,0,.05)
  assert.equal(player.x,0)
})
test('joystick outer ring and Shift request sprint and reset clears them',()=>{
  const input=new VoxelInput({})
  input.stick={dx:.5,dy:0};assert.equal(input.wantsSprint(),false)
  input.stick={dx:0,dy:-1};assert.equal(input.wantsSprint(),true)
  input.reset();input.setKey('Shift',true);assert.equal(input.wantsSprint(),true)
  input.reset();assert.equal(input.wantsSprint(),false)
})
test('predator visual range changes with posture and speed while respecting occlusion',()=>{
  const world=flatWorld({animals:[]}),w=new Wildlife(world),actor={x:0,y:0,z:0,yaw:0}
  const player={x:0,y:1.58,z:8,speed:0}
  assert.equal(w._canSee(actor,player),true)
  assert.equal(w._canSee(actor,{...player,y:.78,crouched:true}),false)
  assert.equal(w._canSee(actor,{...player,z:12,speed:4}),true)
  assert.equal(w._canSee(actor,{...player,z:12,speed:0}),false)
  world.lineOfSight=()=>false
  assert.equal(w._canSee(actor,{...player,z:5,speed:4}),false)
})
test('fast approach makes an animal flee along a path; crouched observation does not',()=>{
  const state=start(),world=flatWorld({...state.sceneData,animals:[{kind:'deer',name:'鹿',x:0,z:0,forager:false}]}),w=new Wildlife(world)
  const actor=w.actors[0],player={x:0,y:.78,z:3,crouched:true,speed:1}
  state.tickHunt(1000);w._reactToPlayer(actor,state,player)
  assert.notEqual(actor.mode,'flee')
  state.tickHunt(1300);w._reactToPlayer(actor,state,{...player,y:1.58,crouched:false,speed:4})
  assert.equal(actor.mode,'flee');assert.ok(actor.path.length)
  assert.equal(actor.x,0);assert.equal(actor.z,0)
  const before=Math.hypot(actor.x-player.x,actor.z-player.z)
  w.update(state,.05,{...player,crouched:false,speed:4})
  assert.ok(Math.hypot(actor.x-player.x,actor.z-player.z)>before)
  assert.ok(Math.hypot(actor.x,actor.z)<=.111)
  state.tickHunt(7000);w.update(state,.05,{x:12,z:12,y:1.58,speed:0})
  assert.notEqual(actor.mode,'flee')
})
test('hidden players do not frighten animals and close crouching is not invulnerability',()=>{
  const state=start(),world=flatWorld({...state.sceneData,animals:[{kind:'deer',name:'鹿',x:0,z:0}]}),w=new Wildlife(world),actor=w.actors[0]
  world.lineOfSight=()=>false
  w._reactToPlayer(actor,state,{x:0,y:1.58,z:3,speed:4})
  assert.notEqual(actor.mode,'flee')
  world.lineOfSight=()=>true;state.tickHunt(300)
  w._reactToPlayer(actor,state,{x:0,y:.78,z:.8,speed:0,crouched:true})
  assert.equal(actor.mode,'flee')
})
test('foragers sniff before travelling and interruption cancels eating',()=>{
  const state=start(),world=flatWorld({...state.sceneData,animals:[{kind:'boar',name:'野猪',x:0,z:0,forager:true}]}),w=new Wildlife(world),actor=w.actors[0]
  world.targets=[{id:state.sceneData.spawns[0].id,anchor:{x:3,y:0,z:0,support:'ground'}}]
  state.tickHunt(30000)
  assert.equal(w._findFood(actor,state,30000,{x:0,y:1.58,z:6}),true)
  assert.equal(actor.mode,'sniff')
  w.update(state,.05);assert.equal(actor.moving,false);assert.equal(actor.grazing,true)
  state.tickHunt(31900);w.update(state,.05)
  assert.equal(actor.mode,'seek');assert.equal(actor.moving,true)
  actor.mode='eat';actor.eatingAt=28000
  w.update(state,.05,{x:actor.x,y:1.58,z:actor.z+3,speed:4})
  assert.equal(actor.mode,'flee')
  assert.equal(state.eatenMushroomCount,0)
})
test('continuing preserves the original run and saves extra collection without recounting completion',()=>{
  const state=start(),run=state.currentRun,scene=state.sceneData
  assert.equal(state.continueExploring(),false)
  complete(state)
  assert.equal(state.lastResult.status,'success')
  assert.equal(state.profile.sceneAttempts['yn-pine'],1)
  assert.equal(state.canContinueExploring,true)
  assert.equal(state.continueExploring(),true)
  assert.equal(state.currentRun,run);assert.equal(state.sceneData,scene)
  assert.equal(state.goalProgress,8);assert.equal(state.remainingCount,2)
  assert.equal(state.continueExploring(),false)
  const added=collect(state,scene.spawns[8])
  assert.equal(added.result,null);assert.equal(run.completed,false)
  assert.equal(state.lastResult.collectedMushroomCount,8)
  const result=state.finishScene()
  assert.equal(result.status,'success');assert.equal(result.collectedMushroomCount,9)
  assert.equal(result.bonusCollectedCount,1);assert.equal(result.bonusEndReason,'success')
  assert.equal(state.profile.sceneAttempts['yn-pine'],1)
  assert.equal(state.canContinueExploring,false)
  state.finishScene()
  assert.equal(state.profile.sceneAttempts['yn-pine'],1)
})
test('predator contact and timeout after continuing retain success and saved extra fungi',()=>{
  for(const reason of ['predator','timeout']){
    const state=start('timed');complete(state);state.continueExploring()
    collect(state,state.sceneData.spawns[8])
    const before=JSON.stringify(state.profile.collection)
    let result
    if(reason==='predator'){state.currentRun.predatorActive=true;result=state.predatorContact('熊')}
    else {state.tickHunt(1000);result=state.tickHunt(181000)}
    assert.equal(result.status,'success');assert.equal(result.bonusCollectedCount,1)
    assert.equal(result.bonusEndReason,reason==='predator'?'predator-contact':'time-expired')
    assert.equal(JSON.stringify(state.profile.collection),before)
    assert.equal(state.profile.sceneAttempts['yn-pine'],1)
    assert.equal(new ForagingState(state.profile).profile.completedScenes['yn-pine'],true)
    assert.equal(state.canContinueExploring,false)
  }
})
test('bonus exploration preserves elapsed time and can finish a remaining commission',()=>{
  const state=start('timed');state.tickHunt(60000);complete(state);state.continueExploring()
  state.tickHunt(999000)
  assert.equal(state.currentRun.elapsedMs,60000)
  state.tickHunt(1000000)
  assert.equal(state.currentRun.elapsedMs,61000)
  for(const route of state.currentRun.routes.slice(0,2))state.visitPosition(...route.points.at(-1))
  assert.equal(state.commission.completed,true)
  const result=state.finishScene()
  assert.equal(result.commission.completed,true)
  assert.equal(state.profile.observationRewards.routes,true)
  assert.equal(state.profile.sceneAttempts['yn-pine'],1)
})
test('failed runs cannot continue and the final extra fungus does not prematurely end observation',()=>{
  const failed=start('timed');failed.tickHunt(180000)
  assert.equal(failed.continueExploring(),false)
  const state=start();complete(state);state.continueExploring()
  for(const spawn of state.sceneData.spawns.slice(8))collect(state,spawn)
  assert.equal(state.remainingCount,0);assert.equal(state.currentRun.completed,false)
  assert.equal(state.finishScene().bonusCollectedCount,2)
})
