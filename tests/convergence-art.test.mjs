import test from 'node:test'
import assert from 'node:assert/strict'
import {convergencePoses} from '../js/xianxia/TowerConvergence.js'
const state=(rank=1)=>({time:1,player:{hp:1},effects:[],zones:[{
 id:'rain',kind:'sword_rain',formId:'evo_wanjian',formLevel:rank,parentLevel:10,
 x:160,y:0,dirX:1,dirY:0,nextAt:1.2,pulseIndex:0,ticks:rank===1?19:25,
}]})
for(const rank of [1,2])test(`rank ${rank}: swords are consumed once and sampling is read only`,()=>{
 const s=state(rank),count=rank===1?18:24
 for(let i=0;i<=count;i++){
  s.zones[0].pulseIndex=i;s.zones[0].nextAt=1.2+i*.1;s.time=1+i*.1
  const before=JSON.stringify(s),poses=convergencePoses(s)
  assert.equal(poses.length,(count-i)*4);assert.equal(JSON.stringify(s),before)
  assert.deepEqual(convergencePoses(s),poses)
  assert.ok(poses.every(p=>[p.x,p.y,p.angle,p.span,p.alpha].every(Number.isFinite)))
 }
})
test('pre-impact blade tip approaches the locked target at chest height',()=>{
 const s=state();s.time=1.2
 const p=convergencePoses(s)[0]
 assert.ok(Math.abs(p.x+Math.cos(p.angle)*p.span-160)<1e-6)
 assert.ok(Math.abs(p.y+Math.sin(p.angle)*p.span-52)<1e-6)
})
test('terminal respects clipped endpoint, fades once, and does not follow player',()=>{
 const s=state();s.zones=[]
 s.effects=[{id:'final',kind:'convergence',terminal:true,x:0,y:0,toX:100,toY:50,startedAt:1}]
 const a=convergencePoses(s)[0];s.player.x=900;s.time=1.1
 const b=convergencePoses(s)[0]
 assert.equal(a.x,b.x);assert.equal(a.y,b.y);assert.ok(b.alpha<a.alpha)
 assert.ok(Math.abs(b.x+Math.cos(b.angle)*b.span-100)<1e-6)
 s.time=1.25;assert.deepEqual(convergencePoses(s),[])
 s.time=1;s.player.hp=0;assert.deepEqual(convergencePoses(s),[])
})
