import test from 'node:test'
import assert from 'node:assert/strict'
import { ForagingState } from '../js/core/ForagingState.js'
import { FORAGING_SCENES } from '../js/data/foragingScenes.js'
import { VoxelWorld } from '../js/voxel/VoxelWorld.js'
import { Wildlife } from '../js/voxel/Wildlife.js'
import { VoxelInput } from '../js/voxel/VoxelInput.js'
import { EXPLORATION_SPECIES } from '../js/data/explorationData.js'
import { normalize } from '../js/voxel/math.js'
const start=(mode='timed',id='yn-pine',profile)=>{const s=new ForagingState(profile);s.startScene(id);s.startHunt(mode);s.tickHunt(0);return s}
const collect=(s,id)=>{s.brushSpawn(id);return s.collectSpawn(id)}

test('relaxed mode has no lethal predators, no timeout, and at most one animal-consumed fungus',()=>{
 for(const scene of FORAGING_SCENES){
  const s=start('relaxed',scene.id),w=new VoxelWorld(s.sceneData)
  s.tickHunt(1000000);w.wildlife.update(s,.05,w.start)
  assert.equal(s.currentRun.completed,false)
  assert.equal(s.currentRun.predatorWarned,false)
  assert.equal(s.currentRun.predatorActive,false)
  assert.equal(s.predatorContact('熊'),null)
  const [a,b]=s.sceneData.spawns
  assert.equal(s.eatSpawn(a.id,'动物'),true)
  assert.equal(s.eatSpawn(b.id,'动物'),false)
 }
})
test('challenge warning starts at 50 seconds and leaving the scene pauses it',()=>{
 const s=start();s.tickHunt(49999);assert.equal(s.currentRun.predatorWarned,false)
 s.tickHunt(50000);assert.equal(s.currentRun.predatorWarned,true)
 assert.match(s.currentRun.predatorMessage,/足迹/)
 s.pauseHunt();s.tickHunt(600000);assert.equal(s.currentRun.elapsedMs,50000)
})
test('predators investigate last seen position and give up after six seconds without sight',()=>{
 const s=start(),world={scene:s.sceneData,targets:[],heightAt:()=>0,canStand:(x,z)=>Math.abs(x)<16&&Math.abs(z)<16,lineOfSight:()=>true}
 const wildlife=new Wildlife(world),player={x:0,y:1.58,z:0}
 s.tickHunt(60000);wildlife.update(s,0,player)
 const predator=wildlife.actors.find(a=>a.predator)
 assert.equal(predator.mode,'alert')
 s.tickHunt(61500);wildlife.update(s,.05,player)
 assert.equal(predator.mode,'chase')
 const lastKnown={...predator.lastKnown}
 world.lineOfSight=()=>false;player.x=4
 s.tickHunt(61750);wildlife.update(s,.05,player)
 assert.equal(predator.mode,'search');assert.deepEqual(predator.lastKnown,lastKnown)
 s.tickHunt(67500);wildlife.update(s,.05,player)
 assert.equal(predator.mode,'patrol');assert.equal(predator.lastKnown,null)
 assert.equal(s.currentRun.escapes,1)
 assert.equal(s.currentRun.completed,false)
})
test('predator perception rejects targets behind cover, out of range, or behind its field of view',()=>{
 const s=start(),world={scene:s.sceneData,targets:[],heightAt:()=>0,canStand:()=>true,lineOfSight:()=>true},wildlife=new Wildlife(world)
 const actor={x:0,y:0,z:0,yaw:0}
 assert.equal(wildlife._canSee(actor,{x:0,y:1.5,z:8}),true)
 assert.equal(wildlife._canSee(actor,{x:0,y:1.5,z:-8}),false)
 assert.equal(wildlife._canSee(actor,{x:0,y:1.5,z:12}),false)
 world.lineOfSight=()=>false
 assert.equal(wildlife._canSee(actor,{x:0,y:1.5,z:8}),false)
})
test('covered fungi require brushing, and brushing never grants collection progress',()=>{
 const s=start(),spawn=s.sceneData.spawns.find(s=>s.brushable)
 assert.ok(spawn)
 assert.equal(s.collectSpawn(spawn.id).needsBrushing,true)
 assert.equal(s.goalProgress,0)
 assert.equal(s.brushSpawn(spawn.id),true)
 assert.equal(s.brushSpawn(spawn.id),false)
 assert.equal(s.goalProgress,0)
 assert.equal(s.collectSpawn(spawn.id).added,true)
 assert.equal(s.goalProgress,1)
 assert.equal(s.brushSpawn(spawn.id),false)
})
test('cover is the selectable object before brushing; a revealed fungus uses its own geometry',()=>{
 const s=start(),w=new VoxelWorld(s.sceneData),cover=w.covers[0]
 const entity=w.targets.find(t=>t.id===cover.id),origin=[entity.anchor.x,entity.anchor.y+2,entity.anchor.z]
 assert.equal(w.pick(origin,[0,-1,0],[],4.8,[])?.covered,true)
 assert.equal(w.pick(origin,[0,-1,0],[],4.8,[cover.id])?.covered,false)
 assert.equal(w.pick(origin,[0,-1,0],[cover.id],4.8,[]),null)
})
test('animal body geometry blocks collection rays rather than allowing clicks through it',()=>{
 const s=start(),w=new VoxelWorld(s.sceneData),a=w.wildlife.actors[0]
 a.x=0;a.z=0;a.y=0;a.yaw=0
 assert.equal(w.wildlife.blocksRay([0,.65,-3],[0,0,1],6),true)
 assert.equal(w.wildlife.blocksRay([2,.65,-3],[0,0,1],6),false)
})
test('each expedition varies positions and lighting but preserves the base terrain and spawn count',()=>{
 const s=start(),first=s.sceneData,w1=new VoxelWorld(first)
 s.startScene(first.id);const second=s.sceneData,w2=new VoxelWorld(second)
 assert.equal(second.spawns.length,10)
 assert.notDeepEqual(first.spawns.map(s=>s.position),second.spawns.map(s=>s.position))
 assert.notDeepEqual(first.animals,second.animals)
 assert.notEqual(first.weather.name,second.weather.name)
 for(const [x,z] of [[0,8],[3,3],[-5,-3]])assert.equal(w1.heightAt(x,z),w2.heightAt(x,z))
 assert.deepEqual(w1.start,w2.start)
})
test('wrong identification persists comparison hints and caps old long cooldowns without clearing collection',()=>{
 const s=start();collect(s,s.sceneData.spawns[0].id);const id=s.sceneData.spawns[0].speciesId
 s.selectCollectionSpecies(id);for(let i=0;i<3;i++)s.studyCollection()
 const wrong=s.collectionCandidates.find(c=>c.id!==id).id
 assert.equal(s.identifyCollection(wrong,1000).cooldownMs,45000)
 assert.ok(s.correctionHint.actual.length>10);assert.ok(s.correctionHint.chosen.length>10)
 const restored=new ForagingState(JSON.parse(JSON.stringify(s.profile)));restored.selectCollectionSpecies(id)
 assert.deepEqual(restored.correctionHint,s.correctionHint)
 assert.equal(restored.identifyCollection(wrong,46000).cooldownMs,120000)
 restored.identifyCollection(id,166000);assert.equal(restored.correctionHint,null)
 const old=JSON.parse(JSON.stringify(s.profile));old.version=4;old.collection[id].identificationLockedUntil=Date.now()+600000
 const migrated=new ForagingState(old)
 assert.ok(migrated.collectionLockRemaining(Date.now(),id)<=120000)
 assert.equal(migrated.profile.collection[id].sampled,1)
})
test('results distinguish first discovery from new scene records and award badges only once',()=>{
 const s=start('relaxed','yn-alpine')
 for(const spawn of s.sceneData.spawns.slice(0,8))collect(s,spawn.id)
 const distinct=new Set(s.sceneData.spawns.slice(0,8).map(spawn=>spawn.speciesId)).size
 assert.equal(s.lastResult.newSpeciesIds.length,distinct)
 assert.equal(s.lastResult.newSceneSpeciesIds.length,distinct)
 assert.equal(s.lastResult.discoveriesBefore,0)
 assert.equal(s.lastResult.discoveriesAfter,distinct)
 assert.equal(s.lastResult.badges.length,2)
 const profile=JSON.parse(JSON.stringify(s.profile)),next=start('relaxed','yn-alpine',profile)
 for(const spawn of next.sceneData.spawns.slice(0,8))collect(next,spawn.id)
 assert.equal(next.lastResult.newSpeciesIds.length,0)
 assert.equal(next.lastResult.newSceneSpeciesIds.length,0)
 assert.equal(next.lastResult.badges.length,0)
 assert.equal(Object.keys(next.profile.discoveryBadges).length,2)
})
test('failed expeditions retain truthful new discovery summaries',()=>{
 const s=start();collect(s,s.sceneData.spawns[0].id)
 s.currentRun.predatorActive=true;s.predatorContact('熊')
 assert.equal(s.lastResult.status,'predator-contact')
 assert.equal(s.lastResult.newSpeciesIds.length,1)
 assert.equal(s.lastResult.discoveriesAfter,1)
 assert.equal(s.lastResult.badges[0],'初识菌林')
})
test('joystick dead zone prevents drift without blocking keyboard input',()=>{
 const input=new VoxelInput({})
 input.stick={dx:.04,dy:.02};assert.deepEqual(input.axes().map(x=>x||0),[0,0])
 input.setKey('w',true);assert.deepEqual(input.axes().map(x=>x||0),[0,1])
 input.stick={dx:.7,dy:.1};assert.equal(input.axes()[0],.7)
})
