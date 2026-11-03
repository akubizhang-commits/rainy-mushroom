import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {skillForm} from '../js/xianxia/TowerSkillForms.js'
import {shadowPreviewLine,shadowHitFeedback,shadowBodyReactions} from '../js/xianxia/TowerShadow.js'
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`)
const make=()=>new TowerRun({attemptId:41,floor:1,seed:312,xp:0,hp:100,
 loadout:{growthVersion:1,active:{sj_arc:1},passive:{},evolutions:[],evolutionLevels:{},
  tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})

for(const arenaVersion of [0,1])for(const [x,y] of [[100,20],[33,270],[880,0],[-310,-220]]){
 test(`shadow anticipation matches actual clipped pulse endpoints at ${x},${y}, arena ${arenaVersion}`,()=>{
  const run=make()
  run.state.arenaVersion=arenaVersion
  const form=skillForm('sj_shadow',10)
  const z={...form,x,y,kind:'shadow',formId:'sj_shadow',formLevel:10,dirX:.8,dirY:.6,
   pulseIndex:0,damage:4,direct:true}
  for(let i=0;i<4;i++){
   const expected=shadowPreviewLine(z,i,arenaVersion),outgoing=[]
   run._growthZonePulse(z,outgoing)
   const actual=run.state.effects.at(-1)
   for(const key of ['x','y','toX','toY'])close(actual[key],expected[key])
   assert.equal(actual.source,'sj_shadow');assert.equal(actual.pulseIndex,i+1)
  }
 })
}
test('settled shadow damage exposes target identity for the short hit flash',()=>{
 const run=make()
 const e=run._enemy({...run.state.pending[0],id:'shadow-target',x:100,y:20})
 run.state.enemies=[e]
 run._damageEnemy({target:e.id,damage:1,direct:true,source:'shadow'})
 const hit=run.state.effects.at(-1)
 assert.equal(hit.kind,'hit');assert.equal(hit.targetId,e.id);assert.equal(hit.targetRadius,e.radius)
 assert.ok(hit.damage>0)
})

test('real shadow pulses carry their own direction and ordinal through settled damage',()=>{
 const run=make(),form=skillForm('sj_shadow',10)
 const e=run._enemy({...run.state.pending[0],id:'target',x:100,y:20})
 e.hp=e.maxHp=10000;run.state.enemies=[e]
 const original=[e.x,e.y,e.radius]
 const z={...form,x:100,y:20,kind:'shadow',formId:'sj_shadow',formLevel:10,dirX:1,dirY:0,
  pulseIndex:0,damage:4,direct:true}
 for(let i=0;i<4;i++){
  const outgoing=[];run._growthZonePulse(z,outgoing)
  assert.equal(outgoing.length,1);run._damageEnemy(outgoing[0])
  const hit=run.state.effects.at(-1),pose=shadowHitFeedback(hit,run.state.time)
  assert.equal(hit.shadowImpact.pulseIndex,i+1);assert.equal(hit.shadowImpact.pulseCount,4)
  close(pose.dx,Math.cos([0,Math.PI/2,Math.PI/4,-Math.PI/4][i]))
  close(pose.dy,Math.sin([0,Math.PI/2,Math.PI/4,-Math.PI/4][i]))
  assert.equal(pose.strength,i===3?1.4:1)
  assert.deepEqual([e.x,e.y,e.radius],original,'feedback never moves simulated enemies')
  assert.notEqual(hit.shadowImpact,outgoing[0].shadowImpact,'event owns a copied presentation record')
 }
})

const hit={kind:'hit',source:'shadow',targetId:'a',x:50,y:20,damage:3,startedAt:10,
 shadowImpact:{dirX:0,dirY:1,pulseIndex:2,pulseCount:2}}
test('shadow reaction is finite, bounded, deterministic and confined to positive current hits',()=>{
 const frozen=structuredClone(hit)
 const pose=shadowHitFeedback(hit,10.025)
 assert.ok(pose.y>4&&pose.y<=6.3);assert.equal(pose.x,0)
 assert.ok(pose.scaleY<1&&pose.scaleX>1)
 assert.deepEqual(shadowHitFeedback(hit,10.025),pose);assert.deepEqual(hit,frozen)
 for(const candidate of [{...hit,damage:0},{...hit,damage:Infinity},{...hit,hostile:true},
  {...hit,source:'evo_wuwo'},{...hit,kind:'shadow'},{...hit,x:NaN},
  {...hit,shadowImpact:{...hit.shadowImpact,dirX:Infinity}},
  {...hit,shadowImpact:{...hit.shadowImpact,pulseIndex:3}}]){
  assert.equal(shadowHitFeedback(candidate,10.02),null)
 }
 for(const t of [9.99,10.181,Infinity,NaN])assert.equal(shadowHitFeedback(hit,t),null)
})
test('multiple hits never accumulate body offsets and expired effects restore the base pose',()=>{
 const normal={...hit,shadowImpact:{...hit.shadowImpact,pulseIndex:1}}
 const poses=shadowBodyReactions([hit,normal,hit],10.025)
 assert.equal(poses.size,1);assert.deepEqual(poses.get('a'),shadowHitFeedback(hit,10.025))
 assert.equal(shadowBodyReactions([hit],10.181).size,0)
 assert.equal(shadowBodyReactions([{...hit,damage:0}],10.025).size,0)
})
