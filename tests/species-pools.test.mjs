import test from 'node:test'
import assert from 'node:assert/strict'
import { ForagingState } from '../js/core/ForagingState.js'
import { FORAGING_SCENES } from '../js/data/foragingScenes.js'
import { EXPLORATION_SPECIES, getIdentificationClues, getIdentificationCandidates } from '../js/data/explorationData.js'
import { EXPANDED_SPECIES } from '../js/data/speciesExpansion.js'
import { poolForScene, drawSceneSpecies, speciesHabitat } from '../js/data/speciesPools.js'
import { VoxelWorld } from '../js/voxel/VoxelWorld.js'
import { normalize } from '../js/voxel/math.js'

const mastered={collection:Object.fromEntries(EXPLORATION_SPECIES.map(s=>[s.id,{seen:true,identified:true,sampled:1}]))}
test('researched species have complete sources, three clues, distractors and at least one suitable habitat',()=>{
 assert.equal(EXPANDED_SPECIES.length,28)
 for(const species of EXPLORATION_SPECIES){
  assert.ok(FORAGING_SCENES.some(scene=>poolForScene(scene).some(e=>e.speciesId===species.id)))
  assert.ok(getIdentificationClues(species.id).every(c=>c.text?.length>8))
  if(species.expanded)assert.equal(getIdentificationClues(species.id)[2].photoIndex,1,`${species.id}: structure clue must use the structure plate`)
  assert.equal(getIdentificationCandidates(species.id).length,3)
  assert.equal(new Set(getIdentificationCandidates(species.id).map(s=>s.id)).size,3)
  assert.match(species.sourceUrl,/^https:\/\//)
 }
 assert.ok(speciesHabitat(EXPANDED_SPECIES.find(s=>s.id==='fomitopsis-betulina')).host==='birch')
})
test('progression only adds eligible species and rerolls leave the current scene stable',()=>{
 for(const scene of FORAGING_SCENES){
  const state=new ForagingState();state.startScene(scene.id);state.startHunt()
  const original=state.sceneData.spawns.map(s=>s.speciesId)
  assert.ok(original.every(id=>poolForScene(scene).some(e=>e.speciesId===id&&e.unlockAt===0)))
  for(const species of EXPLORATION_SPECIES)state.profile.collection[species.id]={identified:true}
  assert.deepEqual(state.sceneData.spawns.map(s=>s.speciesId),original)
  const collected=new Set()
  for(let visit=1;visit<=100;visit++)for(const spawn of drawSceneSpecies(scene,mastered,visit))collected.add(spawn.speciesId)
  assert.equal(collected.size,poolForScene(scene).length)
 }
})
test('discovery counts are per-scene distinct collected species and survive reload',()=>{
 const state=new ForagingState();state.startScene('yn-pine');state.startHunt()
 const speciesId=state.sceneData.spawns[0].speciesId
 state.collectSpawn(state.sceneData.spawns[0].id)
 assert.equal(state.sceneSpeciesProgress('yn-pine').found,1)
 const duplicate=state.sceneData.spawns.find((s,i)=>i>0&&s.speciesId===speciesId)
 if(duplicate)state.collectSpawn(duplicate.id)
 assert.equal(state.sceneSpeciesProgress('yn-pine').found,1)
 const other=state.sceneData.spawns.find(s=>s.speciesId!==speciesId)
 state.currentRun.elapsedMs=30000;state.eatSpawn(other.id,'野猪')
 assert.equal(state.sceneSpeciesProgress('yn-pine').found,1)
 const loaded=new ForagingState(JSON.parse(JSON.stringify(state.profile)))
 assert.equal(loaded.sceneSpeciesProgress('yn-pine').found,1)
 assert.equal(loaded.sceneSpeciesProgress('ln-oak').found,0)
 assert.equal(loaded.profile.sceneVisits['yn-pine'],1)
 loaded.startScene('yn-pine');assert.equal(loaded.profile.sceneVisits['yn-pine'],2)
})
test('each repeated visit includes an eligible unseen species when one remains',()=>{
 for(const scene of FORAGING_SCENES){
  const pool=poolForScene(scene),last=pool.at(-1).speciesId
  const profile={...mastered,sceneDiscoveries:{[scene.id]:pool.slice(0,-1).map(e=>e.speciesId)}}
  for(let visit=2;visit<=20;visit++)assert.ok(drawSceneSpecies(scene,profile,visit).some(s=>s.speciesId===last))
 }
})
test('weighted unseen selection favors common species without excluding rare species',()=>{
 const scene=FORAGING_SCENES.find(s=>s.id==='yn-pine'),pool=poolForScene(scene),counts={}
 for(let visit=2;visit<2002;visit++){
  const id=drawSceneSpecies(scene,mastered,visit)[0].speciesId
  counts[id]=(counts[id]||0)+1
 }
 const common=pool.filter(s=>s.weight===60),rare=pool.filter(s=>s.weight===10)
 assert.ok(common.every(c=>counts[c.speciesId]>0)&&rare.every(c=>counts[c.speciesId]>0))
 assert.ok(common.reduce((n,c)=>n+counts[c.speciesId],0)/common.length>rare.reduce((n,c)=>n+counts[c.speciesId],0)/rare.length*3)
})
test('expanded wood fungi attach to wood and sampled layouts remain reachable',()=>{
 for(const scene of FORAGING_SCENES){
  const state=new ForagingState(mastered);state.startScene(scene.id)
  const w=new VoxelWorld(state.sceneData),queue=[[w.start.x,w.start.z]],seen=new Set([`${w.start.x},${w.start.z}`]),origins=[]
  assert.ok(w.canStand(w.start.x,w.start.z),scene.id)
  for(let i=0;i<queue.length;i++){
   const [x,z]=queue[i];origins.push([x,w.heightAt(x,z)+1.58,z])
   for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;if(!seen.has(key)){seen.add(key);if(w.canStand(nx,nz))queue.push([nx,nz])}}
  }
  for(const target of w.targets){
   const spawn=state.sceneData.spawns.find(s=>s.id===target.id)
   if(spawn.substrate==='wood')assert.ok(['log','trunk'].includes(target.anchor.support))
   assert.ok(origins.some(origin=>Math.hypot(origin[0]-target.anchor.x,origin[2]-target.anchor.z)<3.5&&target.boxes.some(box=>{const center=box.min.map((v,i)=>(v+box.max[i])/2);return w.pick(origin,normalize(center.map((v,i)=>v-origin[i])))?.id===target.id})),`${scene.id}: ${spawn.speciesId}`)
  }
 }
})

test('legacy completion without species provenance is marked incomplete, never fabricated',()=>{
 const profile={completedScenes:Object.fromEntries(FORAGING_SCENES.map(s=>[s.id,true])),...mastered}
 const state=new ForagingState(profile)
 for(const scene of FORAGING_SCENES){
  assert.equal(state.sceneSpeciesProgress(scene.id).found,0)
  assert.equal(state.sceneSpeciesProgress(scene.id).historyIncomplete,true)
 }
 const loaded=new ForagingState(JSON.parse(JSON.stringify(state.profile)))
 assert.equal(loaded.sceneSpeciesProgress('yn-pine').historyIncomplete,true)
 loaded.startScene('yn-alpine');loaded.startHunt('relaxed')
 loaded.collectSpawn(loaded.sceneData.spawns[0].id)
 assert.equal(loaded.sceneSpeciesProgress('yn-alpine').found,1)
 assert.equal(loaded.sceneSpeciesProgress('yn-alpine').historyIncomplete,true)
 for(const spawn of loaded.sceneData.spawns.slice(1,8)){loaded.brushSpawn(spawn.id);loaded.collectSpawn(spawn.id)}
 assert.equal(loaded.sceneSpeciesProgress('yn-alpine').historyIncomplete,false)
 assert.equal(new ForagingState(loaded.profile).sceneSpeciesProgress('yn-alpine').historyIncomplete,false)
 assert.equal(loaded.sceneSpeciesProgress('yn-pine').found,0)
 assert.equal(loaded.profile.completedScenes['yn-pine'],true)
})

test('every scene retains distinct collection progress after completion and reload',()=>{
 for(const scene of FORAGING_SCENES){
  const state=new ForagingState();state.startScene(scene.id);state.startHunt('relaxed')
  const collected=new Set()
  for(const spawn of state.sceneData.spawns){
   if(state.currentRun.completed)break
   state.brushSpawn(spawn.id)
   if(state.collectSpawn(spawn.id).added)collected.add(spawn.speciesId)
  }
  assert.equal(state.profile.completedScenes[scene.id],true)
  const loaded=new ForagingState(JSON.parse(JSON.stringify(state.profile)))
  assert.equal(loaded.sceneSpeciesProgress(scene.id).found,collected.size)
  assert.equal(loaded.sceneSpeciesProgress(scene.id).historyIncomplete,false)
 }
})
