import test from 'node:test'
import assert from 'node:assert/strict'
import {stepYujianFlight,avoidYujianBoundary,validYujianShot} from '../js/xianxia/TowerYujian.js'
import {clipHexRay} from '../js/xianxia/TowerArena.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
test('after avoidance, the next safe early-launch frame continues tracking instead of reversing',()=>{
 const shot={x:878.7,y:70.2,vx:680,vy:0,flightAt:0,yujianSlot:2,launchFace:1};const target={x:740,y:0,hp:100};
 assert.equal(avoidYujianBoundary(shot,target,1/60,(x,y,l)=>clipHexRay(shot,x,y,l,7)),true)
 shot.x+=shot.vx/60;shot.y+=shot.vy/60
 const before={...shot};stepYujianFlight(shot,target,.11666666666667,1/60)
 assert.ok(shot.vx<0,'must not restore the outward +680 launch velocity')
 assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy)-680)<1e-8,'launch speed stays 680')
 assert.equal(shot.flightAt,before.flightAt);assert.equal(shot.launchAvoided,true)
})
test('avoidance marker round-trips through a real in-flight save and rejects malformed values',()=>{
 const run=new TowerRun({attemptId:1,floor:1,seed:7,xp:0,hp:100,training:true,loadout:{growthVersion:1,active:{sj_yujian:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 for(let i=0;i<1800&&!run.state.projectiles.some(p=>p.yujianSlot!==undefined);i++)run.advance(1/60)
 const shot=run.state.projectiles.find(p=>p.yujianSlot!==undefined);assert.ok(shot);shot.launchAvoided=true
 run.pause();const snap=run.snapshot();assert.ok(validateTowerSnapshot(snap));const restored=TowerRun.restore(snap)
 assert.equal(restored.state.projectiles.find(p=>p.id===shot.id).launchAvoided,true);restored.advance(.5);assert.deepEqual(restored.snapshot(),snap)
 const bad={...shot,launchAvoided:'true'};assert.equal(validYujianShot(bad),false)
 run.resume();restored.resume();for(let i=0;i<60;i++){run.advance(1/60);restored.advance(1/60)}assert.deepEqual(restored.snapshot(),run.snapshot())
})
