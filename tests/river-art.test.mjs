import test from 'node:test'
import assert from 'node:assert/strict'
import { MeshBuilder } from '../js/voxel/geometry.js'
import { makeMushroom } from '../js/voxel/mushrooms.js'
import { animalModel,Wildlife } from '../js/voxel/Wildlife.js'
import { animalParts,animalMatrix } from '../js/voxel/animalPose.js'
import { shadowPatch } from '../js/voxel/RiverArt.js'
import { SPECIES_BY_ID } from '../js/data/explorationData.js'
import { ForagingState } from '../js/core/ForagingState.js'
import { VoxelWorld } from '../js/voxel/VoxelWorld.js'
import { rayGeometry } from '../js/voxel/math.js'

test('smooth body normals are finite, unit length and aligned with the ellipsoid',()=>{
  const mesh=new MeshBuilder()
  mesh.smoothEllipsoid(1,2,3,.2,.3,.6,'#947455')
  for(let i=0;i<mesh.vertices.length;i+=9){
    const p=mesh.vertices.slice(i,i+3),n=mesh.vertices.slice(i+3,i+6)
    assert.ok(p.every(Number.isFinite)&&n.every(Number.isFinite))
    assert.ok(Math.abs(Math.hypot(...n)-1)<1e-8)
    assert.ok(n[0]*(p[0]-1)+n[1]*(p[1]-2)+n[2]*(p[2]-3)>0)
  }
})
test('reference fungi retain bounded finite meshes and sit on their substrate',()=>{
  const anchor={x:0,y:1,z:0,attached:true,support:'log'}
  for(const id of ['trametes-versicolor','pleurotus-citrinopileatus','hericium-erinaceus']){
    const entity=makeMushroom({id:'sample',count:1},SPECIES_BY_ID[id],anchor)
    assert.ok(entity.data.every(Number.isFinite))
    assert.ok(entity.data.length/9<18000,id)
    const bottom=Math.min(...entity.boxes.map(b=>b.min[1])),top=Math.max(...entity.boxes.map(b=>b.max[1]))
    assert.ok(bottom<1.05&&top>1.05,id)
    if(id==='trametes-versicolor')assert.ok(top<1.1,'log shelves must overlap near the wood instead of floating in a tall stack')
  }
})
test('contact shadows follow terrain and fade at the boundary without invalid alpha',()=>{
  const mesh=new MeshBuilder(),height=(x,z)=>x*.1+z*.2
  shadowPatch(mesh,2,3,.4,.6,.3,height)
  let clearEdge=0,opaqueCenter=0
  for(let i=0;i<mesh.vertices.length;i+=9){
    const [x,y,z]=mesh.vertices.slice(i,i+3),a=mesh.vertices[i+6]
    assert.ok(Math.abs(y-height(x,z)-.014)<1e-8)
    assert.ok(a>=0&&a<=.3)
    if(a<1e-8)clearEdge++
    if(a>.29)opaqueCenter++
  }
  assert.ok(clearEdge>0&&opaqueCenter>0)
})
test('deer head occlusion uses the same pose as rendering, including lowered head',()=>{
  const model=animalModel('deer')
  assert.ok(model.head&&model.headGeometry.length)
  const world={scene:{animals:[]},heightAt:()=>0,canStand:()=>true},wildlife=new Wildlife(world)
  for(const grazing of [false,true]){
    const actor={kind:'deer',x:2,y:0,z:1,yaw:.7,phase:1.3,moving:false,mode:'roam',grazing}
    wildlife.actors=[actor];wildlife.modelData.deer={...model,bodyGeometry:[]}
    const head=animalParts(actor,model).find(p=>p.key==='head'),m=animalMatrix(actor,head.offset,head.pitch)
    const transform=(p,w)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12]*w,m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13]*w,m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]*w]
    assert.equal(wildlife.blocksRay(transform([0,.40,1],1),transform([0,0,-1],0),2),true)
    assert.equal(wildlife.blocksRay(transform([0,2,1],1),transform([0,0,-1],0),2),false)
  }
})
test('river sample preserves the game quota and keeps water in the river corridor',()=>{
  const state=new ForagingState();state.startScene('jl-river')
  const world=new VoxelWorld(state.sceneData)
  assert.equal(world.targets.length,10)
  assert.ok(world.vertices.length/9<500000)
  assert.ok(world.shadows.length>0&&world.water.length>0)
  assert.ok(world.vertices.every(Number.isFinite)&&world.shadows.every(Number.isFinite))
  for(let i=0;i<world.water.length;i+=9)assert.equal(world.isWater(world.water[i],world.water[i+2]),true)
  assert.ok(world.canStand(world.start.x,world.start.z))
})
test('tree-growing reference fungus remains attached to the bark surface',()=>{
  const state=new ForagingState();state.startScene('jl-river')
  const scene={...state.sceneData,spawns:[{...state.sceneData.spawns[0],speciesId:'hericium-erinaceus',substrate:'wood',host:'broadleaf'}]}
  const world=new VoxelWorld(scene),target=world.targets[0],{x,y,z}=target.anchor
  const distances=world.solids.map(b=>rayGeometry([x,y,z+.3],[0,0,-1],b,1)).filter(v=>v!==null)
  assert.ok(distances.some(d=>d>=.27&&d<.45),'bark should be directly behind the attachment, not far behind it')
})
