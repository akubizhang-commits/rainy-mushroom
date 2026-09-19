import fs from 'node:fs'
import {GameSession,FORAGING_SCENES,buildSceneChunks,indexedGeometry} from '../js/cocos/GameSession.js'
const rows=[]
for(const scene of FORAGING_SCENES){
 const s=new GameSession({getStorageSync(){},setStorageSync(){}});s.start('relaxed',scene.id)
 let original=0,indexed=0;const start=performance.now()
 for(const surface of s.world.surfaces)for(const chunk of buildSceneChunks(surface.data)){
  for(let offset=0;offset<chunk.data.length;offset+=540000){const geometry=indexedGeometry(chunk.data.subarray(offset,Math.min(offset+540000,chunk.data.length)),surface.kind);original+=geometry.indices.length;indexed+=geometry.positions.length/3}
 }
 rows.push({scene:scene.id,originalVertices:original,indexedVertices:indexed,reductionPercent:Number((100*(1-indexed/original)).toFixed(1)),indexAndChunkMs:Math.round(performance.now()-start)})
}
const report={note:'Cocos static geometry CPU measurement. Exact attributes and triangle count retained. Vertex counts are not phone FPS or GPU timings.',rows}
console.log(JSON.stringify(report,null,2));if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n')
