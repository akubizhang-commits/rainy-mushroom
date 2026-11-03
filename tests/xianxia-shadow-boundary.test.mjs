import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {insideHex, HEX_VERTICES, HEX_CENTER} from '../js/xianxia/TowerArena.js'

function pulse(center, angle, rank=3, index=2, enemies=[{id:'target',...center,radius:42,hp:100}]) {
  const run=Object.create(TowerRun.prototype)
  run.state={arenaVersion:1,time:1,player:{...HEX_CENTER},enemies}
  let effect
  run._effect=(kind,x,y,radius,extra)=>{effect={kind,x,y,radius,...extra};return effect}
  const hits=[]
  run._growthZonePulse({id:'probe',kind:'shadow',formId:'sj_shadow',formLevel:rank,parentLevel:rank,
    ...center,dirX:Math.cos(angle),dirY:Math.sin(angle),pulseIndex:index-1,damage:100,direct:true},hits,()=>{})
  return {hits,effect}
}

test('stationary floor-five boss retains second slash when its endpoint lies outside hex',()=>{
  const center={x:33,y:-1091.6264535102089},angle=Math.atan2(15.8600234259193,88.59153264804314)-Math.PI/2
  assert.ok(insideHex(center,42))
  const {hits,effect}=pulse(center,angle)
  assert.equal(hits.length,1)
  assert.equal(hits[0].damage,100,'geometry does not change damage')
  assert.ok(insideHex(effect,15));assert.ok(insideHex({x:effect.toX,y:effect.toY},15))
})

for(const [i,v] of HEX_VERTICES.entries())test(`all slash directions retain legal target near corner ${i}`,()=>{
  const distance=Math.hypot(v.x-HEX_CENTER.x,v.y-HEX_CENTER.y)
  const center={x:v.x+(HEX_CENTER.x-v.x)*65/distance,y:v.y+(HEX_CENTER.y-v.y)*65/distance}
  assert.ok(insideHex(center,42))
  for(let direction=0;direction<8;direction++)for(let index=1;index<=4;index++){
    const {hits,effect}=pulse(center,direction*Math.PI/4,10,index)
    assert.equal(hits.length,1,`direction ${direction} slash ${index}`)
    assert.ok(insideHex(effect,15));assert.ok(insideHex({x:effect.toX,y:effect.toY},15))
  }
})

test('central slash keeps its full span, target limit and per-target damage',()=>{
  const center={x:33,y:-60},targets=Array.from({length:4},(_,i)=>({id:`target-${i}`,x:30+i,y:-60,hp:100,radius:3}))
  const {hits,effect}=pulse(center,0,3,1,targets)
  assert.equal(hits.length,3);assert.ok(hits.every(h=>h.damage===100));assert.ok(Math.abs(effect.reach-180)<1e-6)
})

test('shadow still stops at a pillar, including a cast centered inside stone',()=>{
  const center={x:33,y:310}
  const targets=[{id:'near',x:33,y:215,radius:5,hp:100},{id:'far',x:33,y:405,radius:5,hp:100}]
  const {hits}=pulse(center,Math.PI/2,10,1,targets)
  assert.deepEqual(hits.map(h=>h.target),['near'])
})

test('target moving beyond the finite slash is not granted a hit',()=>{
  const {hits}=pulse(HEX_CENTER,0,3,1,[{id:'escaped',x:HEX_CENTER.x,y:HEX_CENTER.y+100,radius:5,hp:100}])
  assert.equal(hits.length,0)
})

import {clipHexSegment} from '../js/xianxia/TowerArena.js'
test('finite segment clips two external endpoints symmetrically without mutating inputs',()=>{
  const start={x:-2000,y:-60},end={x:2000,y:-60},copy=structuredClone({start,end})
  const forward=clipHexSegment(start,end,15),reverse=clipHexSegment(end,start,15)
  assert.ok(Math.abs(forward.start.x-(-897))<1e-7)
  assert.ok(Math.abs(forward.end.x-963)<1e-7)
  assert.ok(Math.abs(forward.start.x-reverse.end.x)<1e-7)
  assert.ok(Math.abs(forward.end.x-reverse.start.x)<1e-7)
  assert.deepEqual({start,end},copy)
})
test('finite segment rejects disjoint lines and retains legal point segments',()=>{
  assert.equal(clipHexSegment({x:-2000,y:2000},{x:2000,y:2000},15),null)
  assert.equal(clipHexSegment({x:2000,y:0},{x:2000,y:0},15),null)
  assert.deepEqual(clipHexSegment(HEX_CENTER,HEX_CENTER,15),{start:HEX_CENTER,end:HEX_CENTER})
  for(const radius of [-1,Infinity,NaN])assert.throws(()=>clipHexSegment(HEX_CENTER,HEX_CENTER,radius),RangeError)
})

import {shadowPreviewLine} from '../js/xianxia/TowerShadow.js'
test('near-wall anticipation matches the retained damaging segment',()=>{
  const center={x:33,y:-1091.6264535102089},angle=Math.atan2(15.8600234259193,88.59153264804314)-Math.PI/2
  const {effect}=pulse(center,angle)
  const preview=shadowPreviewLine({...center,radius:90,width:30,dirX:Math.cos(angle),dirY:Math.sin(angle)},1,1)
  for(const key of ['x','y','toX','toY'])assert.ok(Math.abs(preview[key]-effect[key])<1e-6,`${key}: preview must match damage`)
})
