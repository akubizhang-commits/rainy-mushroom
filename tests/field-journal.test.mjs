import test from 'node:test'
import assert from 'node:assert/strict'
import { ForagingState } from '../js/core/ForagingState.js'
import { FORAGING_SCENES } from '../js/data/foragingScenes.js'
import { findingNotes, eligibleCommissions, routesForScene } from '../js/data/fieldJournal.js'
import { VoxelWorld } from '../js/voxel/VoxelWorld.js'
import { ExplorationRenderer } from '../js/ui/ExplorationRenderer.js'
import { EXPLORATION_SCREEN } from '../js/core/ExplorationState.js'
import { EXPLORATION_SPECIES } from '../js/data/explorationData.js'
import { installForagingScreens } from '../js/voxel/ForagingScreens.js'

const start=(id='yn-pine')=>{const s=new ForagingState();s.startScene(id);s.startHunt('relaxed');return s}
const collect=(s,spawn)=>{s.brushSpawn(spawn.id);return s.collectSpawn(spawn.id)}

test('finding notes unlock only after identification and survive saving old profiles',()=>{
  const s=start(),spawn=s.sceneData.spawns[0]
  collect(s,spawn)
  assert.equal(findingNotes(s.profile).length,0)
  s.selectCollectionSpecies(spawn.speciesId)
  for(let i=0;i<3;i++)s.studyCollection()
  const wrong=s.collectionCandidates.find(c=>c.id!==spawn.speciesId)
  s.identifyCollection(wrong.id,100)
  assert.equal(findingNotes(s.profile).length,0)
  s.identifyCollection(spawn.speciesId,45100)
  const restored=new ForagingState(JSON.parse(JSON.stringify(s.profile)))
  assert.equal(findingNotes(restored.profile)[0].speciesId,spawn.speciesId)
  assert.ok(findingNotes(restored.profile)[0].text.length>15)
  assert.equal(findingNotes(restored.profile,'alpine').length,0)
})
test('commissions are generated only for available opportunities',()=>{
  assert.deepEqual(eligibleCommissions({spawns:[{substrate:'soil'}]}),['routes'])
  assert.deepEqual(eligibleCommissions({spawns:[{substrate:'soil',brushable:true},{substrate:'wood'}]}),['routes','substrates','brush'])
  for(const scene of FORAGING_SCENES){
    const s=start(scene.id)
    assert.ok(s.currentRun.commissionOptions.includes(s.commission.id))
    assert.equal(s.commission.completed,false)
    assert.equal(s.goalProgress,0)
  }
})
test('route visits are distinct, require an active hunt, and reward once',()=>{
  const s=new ForagingState();s.startScene('yn-pine')
  const [a,b]=s.currentRun.routes,point=a.points.at(-1)
  assert.equal(s.visitPosition(...point),false)
  s.startHunt('relaxed')
  assert.equal(s.chooseRoute('invalid'),false)
  assert.equal(s.chooseRoute(a.id),true)
  assert.equal(s.visitPosition(...point),true)
  assert.equal(s.visitPosition(...point),false)
  assert.equal(s.commission.progress,1)
  assert.equal(s.visitPosition(...b.points.at(-1)),true)
  assert.equal(s.commission.completed,true)
  assert.equal(s.profile.observationRewards.routes,true)
  assert.equal(s.changeCommission(),false)
  assert.equal(s.goalProgress,0)
  const restored=new ForagingState(JSON.parse(JSON.stringify(s.profile)))
  assert.equal(restored.profile.observationRewards.routes,true)
  s.finishScene()
  assert.equal(s.visitPosition(...s.currentRun.routes[2].points.at(-1)),false)
  assert.equal(s.lastResult.commission.completed,true)
})
test('skipping a commission does not block collection or award a reward',()=>{
  const s=start()
  s.changeCommission(true)
  for(const route of s.currentRun.routes)s.visitPosition(...route.points.at(-1))
  assert.equal(s.commission.completed,false)
  assert.deepEqual(s.profile.observationRewards,{})
  for(const spawn of s.sceneData.spawns.slice(0,8))collect(s,spawn)
  assert.equal(s.lastResult.status,'success')
  assert.equal(s.lastResult.commission.skipped,true)
})
test('brush commission requires collection, not just revealing or animal consumption',()=>{
  const s=start()
  for(let i=0;i<3&&s.commission.id!=='brush';i++)s.changeCommission()
  assert.equal(s.commission.id,'brush')
  const spawn=s.sceneData.spawns.find(s=>s.brushable)
  s.brushSpawn(spawn.id)
  assert.equal(s.commission.progress,0)
  s.currentRun.elapsedMs=30000
  assert.equal(s.eatSpawn(spawn.id,'测试动物'),true)
  assert.equal(s.commission.completed,false)
  const another=s.sceneData.spawns.find(t=>t.substrate!=='wood'&&t.id!==spawn.id)
  assert.ok(another)
  another.brushable=true
  collect(s,another)
  assert.equal(s.commission.completed,true)
  assert.equal(s.profile.observationRewards.brush,true)
})
test('substrate commission distinguishes wood from ground and switching keeps real observations',()=>{
  const s=start('jl-river')
  const wood=s.sceneData.spawns.find(t=>t.substrate==='wood')
  const ground=s.sceneData.spawns.find(t=>t.substrate!=='wood')
  assert.ok(wood&&ground)
  collect(s,wood);collect(s,ground)
  assert.equal(s.commission.completed,false)
  s.changeCommission()
  assert.equal(s.commission.id,'substrates')
  assert.equal(s.commission.completed,true)
  assert.equal(s.goalProgress,2)
  const dirty=new ForagingState({...s.profile,observationRewards:{substrates:true,routes:'yes',unknown:true}})
  assert.deepEqual(dirty.profile.observationRewards,{substrates:true})
})
test('all scene routes stay fixed across visits and their landmarks are reachable',()=>{
  for(const scene of FORAGING_SCENES){
    const state=start(scene.id)
    for(let visit=1;visit<=3;visit++){
      if(visit>1)state.startScene(scene.id)
      const world=new VoxelWorld(state.sceneData)
      assert.deepEqual(world.routes,routesForScene(scene))
      for(const route of world.routes){
        const [x,z]=route.points.at(-1)
        assert.equal(world.isWater(x,z),false,`${scene.id}: ${route.name} water`)
        assert.ok(world.wildlife._route(world.start,x,z),`${scene.id} visit ${visit}: ${route.name} blocked`)
      }
    }
  }
})
test('journal tabs and all finding notes fit small and large phone layouts',()=>{
  const state=start()
  for(const species of EXPLORATION_SPECIES)state.profile.collection[species.id]={identified:true,seen:true}
  for(const [width,height] of [[320,568],[375,812],[430,932]]){
    const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),measureText(text){
      const size=Number.parseFloat(String(this.font).match(/[\d.]+(?=px)/)?.[0]||'10')
      return {width:Array.from(text).reduce((sum,char)=>sum+(/[^\u0000-\u00ff]/.test(char)?size:size*.58),0)}
    }},{get:(target,key)=>key in target?target[key]:()=>{}})
    const r=new ExplorationRenderer({width,height,getContext:()=>ctx},36,{get:()=>({status:'loading'})})
    const game={state,journalTab:'routes',journalReturn:EXPLORATION_SCREEN.EXPLORE}
    installForagingScreens(r,game)
    const check=()=>{
      r.render({screen:EXPLORATION_SCREEN.FIELD_JOURNAL,state},100)
      assert.deepEqual(r.truncatedTexts,[],`${width} ${game.journalTab} ${game.notePage}`)
      for(const text of r.textDraws)assert.ok(text.y>=0&&text.y<=r.logicalHeight,`${text.text}: vertical overflow`)
      for(const area of r.hitAreas)assert.ok(area.x>=0&&area.y>=0&&area.x+area.w<=width+.1&&area.y+area.h<=height+.1,`${area.action}: hit overflow`)
    }
    for(const tab of ['routes','commission']){game.journalTab=tab;check()}
    game.journalTab='notes'
    for(let i=0;i<33;i++){game.notePage=i;check()}
  }
})
