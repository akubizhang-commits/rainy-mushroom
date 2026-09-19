import test from 'node:test'
import assert from 'node:assert/strict'
import { ForagingState } from '../js/core/ForagingState.js'
import { FORAGING_SCENES } from '../js/data/foragingScenes.js'
import { VoxelWorld } from '../js/voxel/VoxelWorld.js'
import { normalize } from '../js/voxel/math.js'
const collect=(s,id)=>{s.brushSpawn(id);return s.collectSpawn(id)}
const start=(id='yn-pine',mode='relaxed')=>{const s=new ForagingState();s.startScene(id);s.startHunt(mode);s.tickHunt(1000);return s}

test('all scenes have 25% surplus; all species including formerly restricted ones collect without identification',()=>{
  for(const scene of FORAGING_SCENES){
    const s=start(scene.id)
    assert.equal(scene.spawns.reduce((n,t)=>n+t.count,0)/s.goalTarget,1.25)
    for(const target of s.sceneData.spawns.slice(0,8)){
      const result=collect(s,target.id)
      assert.equal(result.added,true);assert.equal(s.getCollectionEntry(target.speciesId).identified,false)
      assert.equal(s.available(target.id),false)
    }
    assert.equal(s.lastResult.status,'success');assert.equal(s.lastResult.collectedMushroomCount,8)
    assert.equal(s.profile.successfulChallenges,1)
  }
})
test('animal grace, exclusive collection, surplus budget and timeout preserve truthful remaining items',()=>{
  const s=start('yn-pine','timed'),ids=s.sceneData.spawns.map(t=>t.id)
  assert.equal(s.eatSpawn(ids[0],'野猪'),false)
  s.tickHunt(31000)
  assert.equal(s.eatSpawn(ids[0],'野猪'),true)
  assert.equal(s.collectSpawn(ids[0]).added,false)
  assert.equal(s.eatSpawn(ids[1],'野猪'),true)
  assert.equal(s.eatSpawn(ids[2],'野猪'),false)
  assert.equal(s.remainingCount,8)
  for(const id of ids.slice(2))collect(s,id)
  assert.equal(s.lastResult.status,'success');assert.equal(s.lastResult.eatenCount,2)
  const timed=start('yn-pine','timed');timed.tickHunt(181000)
  assert.equal(timed.lastResult.status,'time-expired');assert.equal(timed.lastResult.eatenCount,0)
})
test('leaving the scene pauses grace and game timer; relaxed mode does not time out',()=>{
  const s=start();s.tickHunt(11000);s.pauseHunt();s.tickHunt(1000000)
  assert.equal(s.currentRun.elapsedMs,10000)
  s.tickHunt(2000000);assert.equal(s.currentRun.completed,false)
})
test('collection identification survives reload; 45 then 120 second species-only cooldown is capped',()=>{
  let s=start();s.collectSpawn(s.sceneData.spawns[0].id)
  const id=s.sceneData.spawns[0].speciesId;s.selectCollectionSpecies(id)
  assert.throws(()=>s.identifyCollection(id,1000),/三条/)
  for(let i=0;i<3;i++)s.studyCollection()
  const wrong=s.collectionCandidates.find(c=>c.id!==id).id
  assert.equal(s.identifyCollection(wrong,1000).cooldownMs,45000)
  assert.throws(()=>s.identifyCollection(id,1001),/等待才能重试/)
  s=new ForagingState(JSON.parse(JSON.stringify(s.profile)));s.selectCollectionSpecies(id)
  assert.equal(s.collectionLockRemaining(2000),44000)
  assert.equal(s.identifyCollection(wrong,46000).cooldownMs,120000)
  assert.equal(s.identifyCollection(wrong,166000).cooldownMs,120000)
  s.startScene('hl-mixed');s.startHunt('relaxed')
  assert.equal(s.collectSpawn(s.sceneData.spawns[0].id).added,true)
  s.selectCollectionSpecies(id)
  assert.equal(s.identifyCollection(id,286000).correct,true)
  assert.equal(s.collectionLockRemaining(286000),0)
})
test('old saves keep their identified collection and progress',()=>{
  const s=new ForagingState({version:2,completedScenes:{'yn-pine':true},collection:{'amanita-muscaria':{seen:true,identified:true,sampled:2,identificationAttempts:1}}})
  assert.equal(s.profile.collection['amanita-muscaria'].identified,true)
  assert.equal(s.profile.collection['amanita-muscaria'].identificationLockedUntil,0)
  assert.equal(s.profile.completedScenes['yn-pine'],true)
})
for(const scene of FORAGING_SCENES)test(`${scene.id}: ten targets have reachable, visible pickup positions`,()=>{
  const w=new VoxelWorld(scene),queue=[[0,8]],seen=new Set(['0,8']),reachable=[]
  assert.equal(w.canStand(w.start.x,w.start.z),true)
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];reachable.push([x,w.heightAt(x,z)+1.58,z])
    for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){
      const nx=x+dx,nz=z+dz,key=`${nx},${nz}`
      if(seen.has(key))continue
      seen.add(key)
      if(w.canStand(nx,nz))queue.push([nx,nz])
    }
  }
  assert.equal(w.targets.length,10)
  for(const target of w.targets){
    assert.ok(reachable.some(origin=>Math.hypot(origin[0]-target.anchor.x,origin[2]-target.anchor.z)<3.5&&target.boxes.some(box=>{
      const p=box.min.map((v,i)=>(v+box.max[i])/2)
      return w.pick(origin,normalize(p.map((v,i)=>v-origin[i])))?.id===target.id
    })),target.id)
  }
  assert.equal(w.wildlife.actors.length,2)
})
test('animal physically approaches a nearby fungus after grace and eats only after its feeding delay',()=>{
  const s=start(),w=new VoxelWorld(s.sceneData),a=w.wildlife.actors.find(a=>a.forager)
  const target=w.targets[0]
  a.x=target.anchor.x;a.z=target.anchor.z+1.5;a.y=w.heightAt(a.x,a.z);a.path=[];a.nextThinkAt=0
  const origin={x:a.x,z:a.z}
  for(let i=1;i<=299;i++){s.tickHunt(1000+i*100);w.wildlife.update(s,.1)}
  assert.equal(s.currentRun.eatenSpawnIds.length,0)
  for(let i=300;i<1400 && s.currentRun.eatenSpawnIds.length===0;i++){s.tickHunt(1000+i*100);w.wildlife.update(s,.1)}
  assert.ok(Math.hypot(a.x-origin.x,a.z-origin.z)>.1)
  assert.ok(s.currentRun.animalEvents.length>0)
  assert.ok(s.currentRun.animalEvents[0].at>=33500)
})

test('predators spawn once at 60 seconds, at a reachable safe distance in every scene',()=>{
  const kinds=new Set()
  for(const scene of FORAGING_SCENES){
    const s=start(scene.id,'timed'),w=new VoxelWorld(scene),player={...w.start}
    kinds.add(scene.predator.kind)
    s.tickHunt(60999);w.wildlife.update(s,0,player)
    assert.equal(w.wildlife.actors.filter(a=>a.predator).length,0)
    s.tickHunt(61000);w.wildlife.update(s,0,player)
    const predators=w.wildlife.actors.filter(a=>a.predator)
    assert.equal(predators.length,1,scene.id)
    assert.ok(Math.hypot(predators[0].x-player.x,predators[0].z-player.z)>7.5)
    assert.ok(w.wildlife._route(predators[0],player.x,player.z))
    assert.ok(s.currentRun.predatorNoticeUntil>s.currentRun.elapsedMs)
    w.wildlife.update(s,0,player)
    assert.equal(w.wildlife.actors.filter(a=>a.predator).length,1)
  }
  assert.deepEqual([...kinds].sort(),['bear','tiger','wolf'])
})

test('predator chases and contact fails exactly once, preserving collection and denying rewards',()=>{
  for(const mode of ['timed']){
    const s=start('yn-pine',mode),w=new VoxelWorld(s.sceneData),player={...w.start}
    s.collectSpawn(s.sceneData.spawns[0].id)
    s.tickHunt(61000);w.wildlife.update(s,0,player)
    const actor=w.wildlife.actors.find(a=>a.predator),origin={x:actor.x,z:actor.z}
    for(let i=1;i<=1200&&!s.currentRun.completed;i++){s.tickHunt(61000+i*50);w.wildlife.update(s,.05,player)}
    assert.ok(Math.hypot(actor.x-origin.x,actor.z-origin.z)>1)
    assert.equal(s.lastResult?.status,'predator-contact')
    assert.equal(s.lastResult.predatorName,'熊')
    assert.equal(s.lastResult.collectedMushroomCount,1)
    assert.equal(s.profile.collection[s.sceneData.spawns[0].speciesId].sampled,1)
    assert.equal(s.canClaimRainBadge(),false)
    assert.equal(s.predatorContact('熊'),null)
    assert.equal(s.profile.sceneAttempts['yn-pine'],1)
    assert.throws(()=>s.collectSpawn(s.sceneData.spawns[1].id),/没有进行中/)
    s.startScene('yn-pine');s.startHunt(mode)
    assert.equal(s.currentRun.predatorActive,false)
    assert.equal(new VoxelWorld(s.sceneData).wildlife.actors.some(a=>a.predator),false)
  }
})

test('paused time does not spawn predators, and completed runs cannot be attacked',()=>{
  const s=start(),w=new VoxelWorld(s.sceneData),player={...w.start}
  s.tickHunt(31000);s.pauseHunt();s.tickHunt(1000000);w.wildlife.update(s,0,player)
  assert.equal(s.currentRun.predatorActive,false)
  for(const spawn of s.sceneData.spawns.slice(0,8))collect(s,spawn.id)
  s.tickHunt(1100000);w.wildlife.update(s,1,player)
  assert.equal(s.lastResult.status,'success')
  assert.equal(s.predatorContact('狼'),null)
})

test('predator contact is blocked by solid terrain between actor and player',()=>{
  const s=start(),w=new VoxelWorld(s.sceneData)
  const actor={x:0,z:0},player={x:.5,z:0}
  w.canStand=()=>false
  assert.equal(w.wildlife._contact(actor,player),false)
  w.canStand=()=>true
  assert.equal(w.wildlife._contact(actor,player),true)
})

test('sighting-only legacy entries cannot identify until sampled; unlocked legacy entries remain unlocked',()=>{
 const id='amanita-muscaria'
 const s=new ForagingState({collection:{[id]:{seen:true,sampled:0,riskRecognized:true}}})
 s.selectCollectionSpecies(id)
 assert.throws(()=>s.studyCollection(),/先采集/)
 s.profile.collection[id].studiedClues=3
 assert.throws(()=>s.identifyCollection(id),/先采集/)
 assert.equal(s.profile.collection[id].identificationAttempts,0)
 s.profile.collection[id].sampled=1
 assert.equal(s.identifyCollection(id).correct,true)
 const loaded=new ForagingState(JSON.parse(JSON.stringify(s.profile)))
 assert.equal(loaded.profile.collection[id].identified,true)
 const legacy=new ForagingState({collection:{[id]:{seen:true,identified:true,sampled:0}}})
 legacy.selectCollectionSpecies(id)
 assert.equal(legacy.identifyCollection(id).alreadyIdentified,true)
})
