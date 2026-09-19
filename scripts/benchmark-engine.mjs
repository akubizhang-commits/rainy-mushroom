import { ForagingState } from '../js/core/ForagingState.js'
import { FORAGING_SCENES } from '../js/data/foragingScenes.js'
import { VoxelWorld } from '../js/voxel/VoxelWorld.js'
import { buildSceneChunks,frustumPlanes,boundsVisible } from '../js/voxel/SceneChunks.js'
import { cameraMatrix } from '../js/voxel/math.js'

const rows=[]
for(const scene of FORAGING_SCENES){
  const state=new ForagingState();state.startScene(scene.id)
  const begin=performance.now(),world=new VoxelWorld(state.sceneData),chunks=buildSceneChunks(world.vertices)
  const buildMs=performance.now()-begin
  const counts=[]
  for(let i=0;i<8;i++){
    const planes=frustumPlanes(cameraMatrix({...world.start,yaw:i*Math.PI/4},320/568))
    counts.push(chunks.filter(c=>boundsVisible(c,planes)).reduce((n,c)=>n+c.data.length/9,0))
  }
  const from=[world.start.x,world.start.y,world.start.z],to=[world.start.x,world.start.y,world.start.z-4.8]
  rows.push({
    scene:scene.id,buildMs:Number(buildMs.toFixed(1)),staticVertices:world.vertices.length/9,chunks:chunks.length,
    meanSubmittedVertices:Math.round(counts.reduce((a,b)=>a+b)/counts.length),
    meanVertexReductionPercent:Number((100*(1-counts.reduce((a,b)=>a+b)/counts.length/(world.vertices.length/9))).toFixed(1)),
    occluders:world.occluders.length,shortRayCandidates:world.occludersBetween(from,to).length,
    staticVertexMiB:Number((world.vertices.byteLength/1024/1024).toFixed(2)),
    redundantBuilderVertices:world.mesh.vertices.length
  })
}
console.log(JSON.stringify({note:'Node CPU generation time; geometric submission counts at entrance over eight headings, 320/568 aspect. Not phone FPS or GPU time.',rows},null,2))
