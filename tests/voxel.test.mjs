import test from 'node:test'
import assert from 'node:assert/strict'
import { SCENES } from '../js/data/explorationData.js'
import { VoxelWorld } from '../js/voxel/VoxelWorld.js'
import { normalize, screenRay, rayBox, rayGeometry } from '../js/voxel/math.js'
import { MeshBuilder } from '../js/voxel/geometry.js'
import { VoxelInput } from '../js/voxel/VoxelInput.js'

test('camera ray follows yaw and pitch and rejects boxes behind camera',()=>{
  const player={yaw:0,pitch:0}
  assert.deepEqual(screenRay(player,100,100,200,200),[0,0,-1])
  assert.equal(rayBox([0,0,0],[0,0,-1],{min:[-1,-1,2],max:[1,1,3]}),null)
})
for(const scene of SCENES) test(`${scene.id}: every fungus can be reached on foot and selected without a lens`,()=>{
  const world=new VoxelWorld(scene)
  assert.ok(world.canStand(world.start.x,world.start.z))
  // Flood fill the navigable half-metre grid from the player entrance.
  const queue=[[0,8]],seen=new Set(['0,8']), reachable=[]
  for(let i=0;i<queue.length;i++) {
    const [x,z]=queue[i];reachable.push([x,world.heightAt(x,z)+1.58,z])
    for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]) {
      const nx=x+dx,nz=z+dz,key=`${nx},${nz}`
      if(seen.has(key)) continue
      seen.add(key)
      if(world.canStand(nx,nz) && Math.abs(world.heightAt(nx,nz)-world.heightAt(x,z))<.5) queue.push([nx,nz])
    }
  }
  for(const target of world.targets) {
    const found=reachable.some(origin=>{
      if(Math.hypot(origin[0]-target.anchor.x,origin[2]-target.anchor.z)>3.5) return false
      return target.boxes.some(box=>{
        const point=box.min.map((v,i)=>(v+box.max[i])/2)
        return world.pick(origin,normalize(point.map((v,i)=>v-origin[i])))?.id===target.id
      })
    })
    assert.ok(found,`${target.id} unreachable or fully occluded`)
  }
  const target=world.targets[0],origin=[target.anchor.x, target.anchor.y+1.4,target.anchor.z+2]
  const direction=normalize([0,-1, -2])
  world.occluders.unshift({min:[origin[0]-.5,origin[1]-.5,origin[2]-.7],max:[origin[0]+.5,origin[1]+.5,origin[2]-.2]})
  assert.equal(world.pick(origin,direction),null,'solid scenery blocks inspection')
})
test('two fingers move and look independently; drag never triggers inspection; cancellation stops motion',()=>{
  let dismissed=0,inspected=0
  const game={visibleCanvas:{width:375,height:812},input:{_findHit:()=>null},player:{yaw:0,pitch:0},dismissHint:()=>dismissed++,inspectAt:()=>inspected++}
  const input=new VoxelInput(game)
  const send=(type,id,x,y)=>input.event(type,{changedTouches:[{identifier:id,clientX:x,clientY:y}]})
  send('start',1,70,670);send('move',1,70,625)
  send('start',2,280,420);send('move',2,320,440)
  assert.equal(input.axes()[1],1);assert.ok(game.player.yaw>0);assert.ok(game.player.pitch<0)
  send('end',2,320,440);assert.equal(inspected,0);assert.equal(input.axes()[1],1)
  input.event('cancel',{});assert.deepEqual(input.axes(),[0,0]);assert.ok(dismissed>0)
})

test('curved geometry does not select empty corners of its bounding box',()=>{
  const mesh=new MeshBuilder(),shape=mesh.ellipsoid(0,0,0,1,1,1,'#ffffff',12,8)
  assert.notEqual(rayBox([.9,.9,3],[0,0,-1],shape),null)
  assert.equal(rayGeometry([.9,.9,3],[0,0,-1],shape),null)
  assert.ok(Math.abs(rayGeometry([0,0,3],[0,0,-1],shape)-2)<1e-6)
})
test('ground remains continuous across mesh boundaries',()=>{
  const world=new VoxelWorld(SCENES[0])
  for(let x=-10;x<10;x+=.5)for(let z=-10;z<10;z+=.5){
    assert.ok(Math.abs(world.heightAt(x-1e-6,z)-world.heightAt(x+1e-6,z))<1e-5)
    assert.ok(Math.abs(world.heightAt(x,z-1e-6)-world.heightAt(x,z+1e-6))<1e-5)
  }
})
