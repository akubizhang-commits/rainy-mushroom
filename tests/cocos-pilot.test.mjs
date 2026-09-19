import test from 'node:test'
import assert from 'node:assert/strict'
import {PilotSession,PILOT_SAVE_KEY} from '../js/pilot/PilotSession.js'
function session(){const data=new Map();return {s:new PilotSession({getStorageSync:k=>data.get(k),setStorageSync:(k,v)=>data.set(k,v)}),data}}
test('pilot saves use an independent namespace and restores collections',()=>{
 const {s,data}=session();s.start();assert.equal(s.world.targets.length,10);assert.ok(data.has(PILOT_SAVE_KEY));assert.ok(!data.has('rainy-mushroom-exploration-v2'))
 const hit=s.world.targets[0];s.collect(hit);s.collect(hit);const id=s.state.sceneData.spawns.find(x=>x.id===hit.id).speciesId
 const restored=new PilotSession({getStorageSync:k=>data.get(k),setStorageSync:(k,v)=>data.set(k,v)})
 assert.equal(restored.state.getCollectionEntry(id).sampled,1)
})
test('pilot collection returns to pause and never advances exploration while browsing',()=>{
 const {s}=session();s.start();s.tick(0);s.tick(100);s.openCollection();const elapsed=s.state.currentRun.elapsedMs;s.tick(10000)
 assert.equal(s.state.currentRun.elapsedMs,elapsed);s.closeCollection();assert.equal(s.screen,'pause');s.resume();assert.ok(s.active)
 s.tick(20000);assert.equal(s.state.currentRun.elapsedMs,elapsed)
})
test('pilot collects each mushroom once and completes at the shared target',()=>{
 const {s}=session();s.start()
 for(const hit of s.world.targets){if(!s.active)break;s.collect(hit);s.collect(hit)}
 assert.equal(s.screen,'result');assert.equal(s.state.goalProgress,8);assert.equal(s.state.lastResult.status,'success');assert.equal(s.collect(s.world.targets[0]),false)
})
test('pilot world collision candidates and wildlife remain valid',()=>{
 const {s}=session();s.start()
 for(let x=-12;x<12;x+=3)for(let z=-12;z<12;z+=3){assert.equal(typeof s.world.canStand(x,z),'boolean');for(const box of s.world.solidsNear(x,z,1))assert.equal(box.min.length,3)}
 assert.ok(s.world.wildlife.actors.length);for(const a of s.world.wildlife.actors)assert.ok(s.world.wildlife.modelData[a.kind].body.length)
})
