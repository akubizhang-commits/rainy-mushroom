import test from 'node:test'
import assert from 'node:assert/strict'
import { ForagingState } from '../js/core/ForagingState.js'
import { VoxelGame } from '../js/voxel/VoxelGame.js'
import { SPECIES_BY_ID } from '../js/data/explorationData.js'
import { makePickupNotice,drawPickupNotice } from '../js/voxel/PickupNotice.js'

function fixture(){
  const state=new ForagingState();state.startScene('jl-river');state.startHunt('relaxed')
  const loads=[],game={state,images:{load:p=>loads.push(p)},platformApi:{},save(){},
    _showResult(result){this.result=result}}
  const collect=spawn=>{state.brushSpawn(spawn.id);VoxelGame.prototype._openFungus.call(game,spawn.id)}
  return {state,game,loads,collect}
}
test('unknown collection does not reveal a name or load a specimen photo',()=>{
  const {state,game,loads,collect}=fixture()
  collect(state.sceneData.spawns[0])
  assert.equal(game.pickupNotice.name,'未知菌物')
  assert.equal(game.pickupNotice.photo,null);assert.deepEqual(loads,[])
  assert.equal(game.pickupNotice.isNew,true);assert.equal(game.feedback,'')
})
test('identified collection uses its matching image, count and real-photo label',()=>{
  const {state,game,loads,collect}=fixture(),spawn=state.sceneData.spawns[0]
  Object.assign(state._entry(spawn.speciesId),{identified:true,seen:true,sampled:1})
  collect(spawn)
  const species=SPECIES_BY_ID[spawn.speciesId]
  assert.equal(game.pickupNotice.name,species.name)
  assert.equal(game.pickupNotice.count,spawn.count)
  assert.equal(game.pickupNotice.photo,species.photos[0])
  assert.equal(game.pickupNotice.imageLabel,'实拍')
  assert.deepEqual(loads,[species.photos[0]])
})
test('brushing and repeated collection never create a false pickup',()=>{
  const {state,game,collect}=fixture()
  state.startScene('yn-pine');state.startHunt('relaxed')
  const spawn=state.sceneData.spawns.find(s=>s.brushable)
  VoxelGame.prototype._openFungus.call(game,spawn.id)
  assert.equal(game.pickupNotice,undefined);assert.equal(state.goalProgress,0)
  collect(spawn);const notice=game.pickupNotice
  collect(spawn);assert.equal(game.pickupNotice,notice);assert.equal(state.goalProgress,1)
})
test('rapid pickup replaces the card; final pickup survives immediate success',()=>{
  const {state,game,collect}=fixture()
  collect(state.sceneData.spawns[0]);const first=game.pickupNotice
  collect(state.sceneData.spawns[1]);assert.notEqual(game.pickupNotice,first)
  for(const spawn of state.sceneData.spawns.slice(2,8))collect(spawn)
  assert.equal(game.result.status,'success');assert.equal(game.pickupNotice.progress,8)
  assert.ok(game.pickupNotice.until>Date.now())
})
test('expanded catalogue photographs are labelled as real photos; notice expires after four seconds',()=>{
  const species=Object.values(SPECIES_BY_ID).find(s=>s.expanded)
  const state={sceneData:{spawns:[{id:'x',speciesId:species.id}]},getCollectionEntry:()=>({identified:true}),goalProgress:1,goalTarget:8,currentRun:{}}
  const notice=makePickupNotice(state,'x',{added:true,count:1,isNew:false},1000)
  assert.equal(notice.imageLabel,'实拍');assert.equal(notice.until,5000)
  assert.equal(drawPickupNotice({},notice,5000),false)
  assert.equal(makePickupNotice(state,'x',{added:false},1000),null)
})
test('image failure still shows the collection name and never blocks rendering',()=>{
  const {state,collect,game}=fixture(),spawn=state.sceneData.spawns[0]
  Object.assign(state._entry(spawn.speciesId),{identified:true,seen:true,sampled:1});collect(spawn)
  const texts=[],r={ctx:{save(){},restore(){}},logicalHeight:666,top:48,
    imageStore:{get:()=>({status:'error'})},_panel(){},_unknownFungus(){},
    _photo(){throw Error('broken image must not be drawn')},
    _label(t){texts.push(t)},_wrappedText(t){texts.push(t)}}
  assert.equal(drawPickupNotice(r,game.pickupNotice),true)
  assert.ok(texts.includes(game.pickupNotice.name));assert.ok(texts.includes('暂无图片'))
})
