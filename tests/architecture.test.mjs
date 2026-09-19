import test from 'node:test'
import assert from 'node:assert/strict'
import { SimulationClock } from '../js/voxel/SimulationClock.js'
import { RunSession } from '../js/voxel/RunSession.js'
import { SpatialIndex } from '../js/voxel/SpatialIndex.js'
import { buildSceneChunks,frustumPlanes,boundsVisible } from '../js/voxel/SceneChunks.js'
import { MeshBuilder } from '../js/voxel/geometry.js'
import { cameraMatrix,normalize } from '../js/voxel/math.js'
import { VoxelWorld } from '../js/voxel/VoxelWorld.js'
import { ForagingState } from '../js/core/ForagingState.js'
import { StorageService } from '../js/core/StorageService.js'
import { ImageStore } from '../js/ui/ImageStore.js'
import { UiScheduler } from '../js/voxel/UiScheduler.js'

test('60, 30 and 10 FPS advance the same amount of simulation time',()=>{
  for(const frameMs of [1000/60,1000/30,100]){
    const clock=new SimulationClock();let elapsed=0,steps=0
    clock.advance(0,()=>{})
    for(let now=frameMs;now<=2000+1e-6;now+=frameMs)clock.advance(now,(_,ms)=>{elapsed+=ms;steps++})
    assert.ok(Math.abs(elapsed-2000)<1e-6);assert.equal(steps,120)
  }
})
test('severe stalls are bounded and pause never catches up background time',()=>{
  const clock=new SimulationClock();let elapsed=0
  const step=(_,ms)=>{elapsed+=ms}
  clock.advance(0,step);assert.equal(clock.advance(5000,step),15)
  assert.ok(Math.abs(elapsed-250)<1e-6);assert.equal(clock.discardedMs,4750)
  clock.reset();clock.advance(999999,step);assert.ok(Math.abs(elapsed-250)<1e-6)
  clock.advance(NaN,step);assert.equal(clock.last,null)
})
test('movement, wildlife and the challenge clock advance together through a 100ms frame',()=>{
  const state=new ForagingState();state.startScene('yn-pine');state.startHunt('timed')
  let movement=0,animals=0
  const game={state,active:true,world:{move:(p,x,z,dt)=>movement+=dt,wildlife:{update:(s,dt)=>{animals+=dt}}},
    player:{x:0,z:8},controls:{axes:()=>[0,0],wantsSprint:()=>false},dismissHint(){},save(){},_showResult(){this.active=false}}
  const session=new RunSession();session.advance(game,0);session.advance(game,100)
  assert.ok(Math.abs(movement-.1)<1e-8&&Math.abs(animals-.1)<1e-8)
  assert.ok(Math.abs(state.currentRun.elapsedMs-100)<1e-6)
  game.active=false;session.advance(game,200);session.advance(game,50000)
  game.active=true;session.advance(game,51000)
  assert.ok(Math.abs(state.currentRun.elapsedMs-100)<1e-6)
})
test('spatial queries preserve large boxes, negative cells and boundary crossings',()=>{
  const broad={min:[-3,-1,-3],max:[3,1,3]},remote={min:[8,0,8],max:[9,1,9]}
  const index=new SpatialIndex([broad,remote])
  assert.deepEqual(index.query(-2,-2,-2,-2),[broad])
  assert.deepEqual(index.query(3,3,3,3),[broad])
  assert.deepEqual(index.segment([-5,0,-5],[4,0,4]),[broad])
  assert.equal(index.query(20,20,21,21).length,0)
})
test('indexed world picking and walking match full-scene scans',()=>{
  const state=new ForagingState();state.startScene('jl-river')
  const world=new VoxelWorld(state.sceneData)
  const fast=world.occludersBetween.bind(world),all=()=>world.occluders
  for(const target of world.targets)for(let i=0;i<12;i++){
    const a=i*Math.PI/6,x=target.anchor.x+Math.sin(a)*2,z=target.anchor.z+Math.cos(a)*2
    const origin=[x,world.heightAt(x,z)+1.58,z]
    const direction=normalize([target.anchor.x-x,target.anchor.y+.12-origin[1],target.anchor.z-z])
    world.occludersBetween=fast;const indexed=world.pick(origin,direction)
    world.occludersBetween=all;assert.deepEqual(world.pick(origin,direction),indexed)
    const index=world.solidIndex,expected=world.canStand(x,z)
    world.solidIndex=null;assert.equal(world.canStand(x,z),expected);world.solidIndex=index
  }
})
test('chunking preserves every vertex and conservatively retains cell-crossing triangles',()=>{
  const mesh=new MeshBuilder()
  mesh.box(0,0,-5,3,3,3,'#ffffff');mesh.box(0,0,12,2,2,2,'#ffffff')
  mesh.surface([[[-12,0,-6],[12,0,-6],[0,3,-6]]],'#aaaaaa')
  const data=mesh.data(),chunks=buildSceneChunks(data,4)
  assert.equal(chunks.reduce((n,c)=>n+c.data.length,0),data.length)
  const planes=frustumPlanes(cameraMatrix({x:0,y:0,z:0,yaw:0,pitch:0},1))
  assert.ok(chunks.some(c=>!boundsVisible(c,planes)))
  for(const chunk of chunks)for(let i=0;i<chunk.data.length;i+=9)
    for(let axis=0;axis<3;axis++)assert.ok(chunk.data[i+axis]>=chunk.min[axis]&&chunk.data[i+axis]<=chunk.max[axis])
  const crossing=chunks.find(c=>c.min[0]<=-12&&c.max[0]>=12)
  assert.ok(boundsVisible(crossing,planes))
})
test('camera turns and lens changes retain every vertex inside the view',()=>{
  const state=new ForagingState();state.startScene('jl-river')
  const world=new VoxelWorld(state.sceneData),chunks=buildSceneChunks(world.vertices)
  for(const yaw of [0,1,2,3])for(const fov of [.58,Math.PI/3]){
    const m=cameraMatrix({...world.start,yaw},320/568,fov),planes=frustumPlanes(m)
    for(const chunk of chunks){
      if(boundsVisible(chunk,planes))continue
      for(let i=0;i<chunk.data.length;i+=9){
        const p=[chunk.data[i],chunk.data[i+1],chunk.data[i+2],1]
        const clip=[0,1,2,3].map(row=>p.reduce((sum,v,col)=>sum+v*m[col*4+row],0))
        assert.ok(clip[3]<0||clip.slice(0,3).some(v=>Math.abs(v)>clip[3]-1e-5))
      }
    }
  }
})
const storageFixture=()=>{
  const memory=new Map();let writes=0,fail=false
  const api={getStorageSync:k=>memory.get(k),setStorageSync(k,v){if(fail)throw Error('full');writes++;memory.set(k,v)},removeStorageSync:k=>memory.delete(k)}
  return {memory,api,get writes(){return writes},set fail(value){fail=value}}
}
test('legacy profiles load; repeated saves skip writes; corrupted primary recovers backup',()=>{
  const f=storageFixture();f.memory.set('save',{version:5,collection:{a:{identified:true}}})
  const storage=new StorageService(f.api,'save'),profile=storage.load()
  profile.count=1;assert.equal(storage.save(profile),true)
  const writes=f.writes;assert.equal(storage.save(profile),true);assert.equal(f.writes,writes)
  profile.count=2;storage.save(profile)
  f.memory.get('save').data='damaged'
  const restored=new StorageService(f.api,'save')
  assert.equal(restored.load().count,1);assert.equal(restored.recovered,true)
  assert.equal(restored.save({...profile,count:1}),true)
  assert.equal(new StorageService(f.api,'save').load().count,1)
})
test('failed saves retain a snapshot, retry with backoff, and clear removes backup too',()=>{
  const f=storageFixture(),storage=new StorageService(f.api,'save'),profile={count:1}
  f.fail=true;assert.equal(storage.save(profile),false);profile.count=100
  f.fail=false;assert.equal(storage.flushPending(0),false)
  assert.equal(storage.flushPending(Date.now()+4000),true)
  assert.equal(storage.load().count,1)
  assert.equal(storage.clear(),true);assert.equal(f.memory.size,0)
})
test('image LRU pins visible assets, evicts unused assets and notifies on decode',()=>{
  const created=[]
  const store=new ImageStore({createImage(){const image={width:10,height:10};created.push(image);return image}},null,{maxRecords:2,maxBytes:800})
  store.load('old');created[0].onload();store.load('keep');created[1].onload()
  assert.equal(store.revision,2)
  store.beginFrame();store.get('keep');store.get('new');created[2].onload();store.endFrame()
  assert.equal(store.records.has('old'),false);assert.equal(store.records.has('keep'),true)
  assert.equal(store.bytes,800);assert.equal(created[0].onload,null)
  store.clear();assert.equal(store.records.size,0)
})
test('UI remains idle until image, countdown, input or visible state changes',()=>{
  const state=new ForagingState(),scheduler=new UiScheduler()
  const game={state,screen:'exploration-home',images:{revision:0},ads:{},controls:{stick:null},uiDirty:false}
  assert.equal(scheduler.needsUpdate(game,0),true);assert.equal(scheduler.needsUpdate(game,1000),false)
  game.images.revision++;assert.equal(scheduler.needsUpdate(game,1000),true)
  game.pickupNotice={until:5000};assert.equal(scheduler.needsUpdate(game,1000),true)
  assert.equal(scheduler.needsUpdate(game,2000),false)
  assert.equal(scheduler.needsUpdate(game,4800),true)
  game.pickupNotice=null;assert.equal(scheduler.needsUpdate(game,5000),true)
})
