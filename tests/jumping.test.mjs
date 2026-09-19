import test from 'node:test'
import assert from 'node:assert/strict'
import { movePlayer,jumpPlayer,canRise } from '../js/voxel/PlayerMotion.js'
import { animalModel } from '../js/voxel/Wildlife.js'
import { animalParts } from '../js/voxel/animalPose.js'

const world=(solids=[])=>({solids,heightAt:()=>0,isWater:()=>false})
const player=()=>({x:0,z:0,y:1.58,yaw:0})
const box=(min,max)=>({min,max})
const advance=(w,p,n,forward=0)=>{for(let i=0;i<n;i++)movePlayer(w,p,0,forward,.01)}

test('jump has one impulse, finite height and lands with no input',()=>{
  const w=world(),p=player()
  assert.equal(jumpPlayer(w,p),true)
  advance(w,p,20);assert.equal(jumpPlayer(w,p),false)
  advance(w,p,23);assert.ok(p.feetY>1&&p.feetY<1.15)
  advance(w,p,70);assert.equal(p.feetY,0);assert.equal(p.grounded,true)
  assert.equal(p.y,1.58);assert.equal(jumpPlayer(w,p),true)
})
test('walk blocks on a low log while jumping clears it',()=>{
  const w=world([box([-1,0,-1.4],[1,.55,-1])]),walk=player(),jump=player()
  advance(w,walk,100,1);assert.ok(walk.z>-.76)
  jumpPlayer(w,jump);advance(w,jump,110,1)
  assert.ok(jump.z<-2.5);assert.equal(jump.feetY,0)
})
test('jumping cannot penetrate a tall wall',()=>{
  const w=world([box([-1,0,-1.4],[1,4,-1])]),p=player()
  jumpPlayer(w,p);advance(w,p,110,1)
  assert.ok(p.z>-.76);assert.equal(p.feetY,0)
})
test('land on raised support and fall when walking off',()=>{
  const w=world([box([-1,0,-1.7],[1,.55,-.85])]),p=player()
  jumpPlayer(w,p);advance(w,p,40,1);advance(w,p,70)
  assert.equal(p.feetY,.55);assert.equal(p.grounded,true)
  advance(w,p,100,1);advance(w,p,100)
  assert.equal(p.feetY,0);assert.equal(p.grounded,true)
})
test('ceiling clips upward velocity and crouch cannot stand into it',()=>{
  const w=world([box([-2,1.9,-2],[2,2.2,2])]),p=player()
  jumpPlayer(w,p);advance(w,p,8)
  assert.ok(p.feetY<=.252);assert.ok(p.verticalSpeed<=0)
  advance(w,p,100);assert.equal(p.feetY,0)
  const low=world([box([-2,1,-2],[2,1.3,2])])
  p.crouched=true;assert.equal(canRise(low,p),false)
  jumpPlayer(low,p);advance(low,p,8);assert.ok(p.feetY<=.182)
})
test('jump preserves stream and map boundaries',()=>{
  for(const w of [ {...world(),isWater:(x,z)=>z<-.5},world() ]){
    const p=player();if(!w.isWater(0,-1))p.z=-15
    const limit=p.z===-15?-15.35:-.5
    jumpPlayer(w,p);advance(w,p,120,1)
    assert.ok(p.z>=limit);assert.equal(p.feetY,0)
  }
})
test('jump height is stable across frame rates and zero dt is inert',()=>{
  const w=world(),a=player(),b=player()
  jumpPlayer(w,a);jumpPlayer(w,b)
  for(let i=0;i<8;i++)movePlayer(w,a,0,1,.05)
  advance(w,b,40,1)
  assert.ok(Math.abs(a.feetY-b.feetY)<1e-9)
  const before={...a};movePlayer(w,a,0,0,0)
  assert.equal(a.feetY,before.feetY);assert.equal(a.verticalSpeed,before.verticalSpeed)
})
test('refined boar and yak have finite bounded geometry and independent feeding heads',()=>{
  for(const kind of ['boar','yak']){
    const model=animalModel(kind),parts=animalParts({kind,mode:'eat',phase:0,moving:false},model)
    for(const mesh of [model.body,model.head,model.leg]){
      assert.ok(mesh.length>0&&mesh.length/9<40000);assert.ok(mesh.every(Number.isFinite))
    }
    assert.equal(parts[0].pitch,0)
    assert.ok(parts.find(p=>p.key==='head').pitch>.3)
    assert.ok(model.headGeometry.length>0)
  }
})
