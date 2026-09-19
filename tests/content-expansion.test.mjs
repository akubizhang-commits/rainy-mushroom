import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { ForagingState } from '../js/core/ForagingState.js'
import { FORAGING_REGIONS,FORAGING_SCENES } from '../js/data/foragingScenes.js'
import { ForagingApplication } from '../js/voxel/ForagingApplication.js'
import { installForagingScreens } from '../js/voxel/ForagingScreens.js'
import { EXPLORATION_SPECIES } from '../js/data/explorationData.js'

const extras=FORAGING_SCENES.filter(s=>s.feature)
test('expanded scenes have packaged previews, distinct landscape settings and preserve old progress',()=>{
 assert.equal(FORAGING_SCENES.length,12);assert.equal(EXPLORATION_SPECIES.length,41)
 assert.equal(new Set(extras.map(s=>s.feature)).size,4)
 const old=new ForagingState({version:5,completedScenes:{'yn-pine':true},successfulChallenges:1,
  sceneDiscoveries:{'yn-pine':['thelephora-ganbajun']},collection:{'thelephora-ganbajun':{seen:true,sampled:2,identified:true}},rainBadgeScenes:{'yn-pine':true}})
 for(const region of FORAGING_REGIONS){assert.equal(region.sceneIds.length,3);assert.equal(new Set(region.sceneIds).size,3)}
 assert.equal(old.profile.successfulChallenges,1);assert.equal(old.sceneSpeciesProgress('yn-pine').found,1)
 for(const scene of extras){
  assert.equal(old.profile.completedScenes[scene.id],undefined)
  assert.ok(fs.statSync(`assets/scene-previews/${scene.id}.jpg`).size>5000)
  old.startScene(scene.id);old.startHunt('relaxed')
  for(const spawn of old.sceneData.spawns.slice(0,8)){old.brushSpawn(spawn.id);old.collectSpawn(spawn.id)}
  assert.equal(old.lastResult.status,'success');assert.equal(old.claimRainBadge(scene.id),true)
 }
 const restored=new ForagingState(JSON.parse(JSON.stringify(old.profile)))
 for(const scene of extras){assert.equal(restored.profile.completedScenes[scene.id],true);assert.equal(restored.profile.rainBadgeScenes[scene.id],true);assert.ok(restored.sceneSpeciesProgress(scene.id).found>0)}
 assert.equal(restored.profile.collection['thelephora-ganbajun'].identified,true)
})

test('scene pagination exposes every scene without offscreen controls and returns to the selected page',()=>{
 for(const [width,height] of [[320,568],[375,812],[430,932]]){
  const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),measureText:t=>({width:String(t).length*8})},{get:(o,k)=>k in o?o[k]:()=>{}})
  const app=new ForagingApplication({width,height,getContext:()=>ctx},36,{onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){},getStorageSync(){return null},createImage(){return {}}})
  installForagingScreens(app.renderer,app)
  const render=()=>app.renderer.render({screen:app.screen,state:app.state},0)
  for(const region of FORAGING_REGIONS){
   app.handleAction(`region:${region.id}`);render()
   assert.equal(app.scenePage,0);assert.equal(new Set(app.renderer.hitAreas.filter(a=>a.action.startsWith('scene:')).map(a=>a.action)).size,2)
   app.handleAction('scenePage:next');render()
   const action=`scene:${region.sceneIds[2]}`
   assert.ok(app.renderer.hitAreas.some(a=>a.action===action))
   assert.ok(app.renderer.hitAreas.every(a=>a.y>=0&&a.y+a.h<=height))
   app.handleAction(action);app.handleAction('nav:scenes');render()
   assert.equal(app.scenePage,1);assert.ok(app.renderer.hitAreas.some(a=>a.action===action))
  }
 }
})
