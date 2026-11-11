import test from 'node:test'
import assert from 'node:assert/strict'
import {sancaiMotion} from '../js/xianxia/TowerSancaiMotion.js'
import {sancaiContains} from '../js/xianxia/TowerSancai.js'

// Catches wall-clock/random motion, escaped sword-qi and wrong landing order.
test('triad motion changes with simulation time and freezes for the same snapshot',()=>{
 const a=sancaiMotion(150,.63,1),b=sancaiMotion(150,.83,1)
 assert.notDeepEqual(a.flows,b.flows)
 assert.deepEqual(a,sancaiMotion(150,.63,1))
 assert.ok(a.flows.length>0)
})
test('water then fire then wood land on the corresponding fixed eyes',()=>{
 const a=sancaiMotion(150,1.4,2)
 assert.equal(a.swords[0].tone,'water')
 assert.equal(a.swords[0].x,0)
 assert.ok(a.swords[1].x>0)
 assert.equal(a.swords[1].tone,'fire')
 assert.equal(a.swords[1].landed,true)
 assert.equal(a.swords[2].tone,'wood')
 assert.ok(a.swords[2].x<0)
 assert.equal(a.swords[2].landed,false)
})
test('all three sword-qi bursts stay inside the damage triangle at every rank radius',()=>{
 for(const radius of [150,165,180]){
  const counts=[0,0,0]
  for(let tick=0;tick<180;tick++){
   const age=tick/60,pulses=age<.35?0:age<1.35?1:age<2.35?2:3
   const state=sancaiMotion(radius,age,pulses)
   for(const blade of state.blades){
    counts[blade.wave]++
    for(const p of blade.points)assert.ok(sancaiContains({radius},p))
   }
  }
  assert.ok(counts.every(n=>n>0))
 }
})
test('reduced motion removes travelling effects and expiration clears every effect',()=>{
 const low=sancaiMotion(150,2.5,3,true)
 assert.deepEqual(low.flows,[])
 assert.deepEqual(low.blades,[])
 assert.ok(low.swords.every(s=>s.landed))
 assert.equal(low.breath,1)
 for(const age of [-.01,6,7]){
  const state=sancaiMotion(150,age,3)
  assert.equal(state.visible,false)
  assert.deepEqual(state.swords,[])
  assert.deepEqual(state.blades,[])
  assert.deepEqual(state.flows,[])
 }
 assert.deepEqual(sancaiMotion(150,.6,0).blades,[])
})
