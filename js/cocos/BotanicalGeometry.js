import {MeshBuilder} from '../voxel/geometry.js'
// Shared by rendering and hit geometry: detail never creates a separate billboard.
export class BotanicalMesh extends MeshBuilder{
  lathe(x,y,z,profile,color,segments=12,scaleZ=1,phase=0){
    const count=Math.min(40,Math.max(segments,Math.round(segments*1.5))),start=this.vertices.length
    const shape=super.lathe(x,y,z,profile,color,count,scaleZ,phase)
    // Smooth the revolution circumferentially while preserving sharp profile rims.
    for(let j=0;j<profile.length-1;j++){
      const dr=profile[j+1][1]-profile[j][1],dy=profile[j+1][0]-profile[j][0],length=Math.hypot(dr,dy)||1
      for(let i=start+j*count*54;i<start+(j+1)*count*54;i+=9){
        const a=Math.atan2((this.vertices[i+2]-z)/scaleZ,this.vertices[i]-x)
        const n=[Math.cos(a)*dy/length,-dr/length,Math.sin(a)*dy/length/scaleZ],l=Math.hypot(...n)||1
        for(let k=0;k<3;k++)this.vertices[i+3+k]=n[k]/l
        const grain=1+.025*Math.sin(a*17+this.vertices[i+1]*43)+.018*Math.sin(a*41+phase)
        for(let k=6;k<9;k++)this.vertices[i+k]=Math.min(1,this.vertices[i+k]*grain)
      }
    }
    return shape
  }
}
