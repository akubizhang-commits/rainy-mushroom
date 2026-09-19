import {VoxelWorld} from '../voxel/VoxelWorld.js'
import {speciesSculpture} from './SpeciesSculptures.js'
import {BotanicalMesh} from './BotanicalGeometry.js'
import {makeMushroom} from '../voxel/mushrooms.js'
import {MeshBuilder,rgb} from '../voxel/geometry.js'
import {SPECIES_BY_ID} from '../data/explorationData.js'
import {detailedLog,fern,riverDetails} from '../voxel/RiverArt.js'
import {needleSpray,leafSpray,barkFurrows} from './TreeDetails.js'
import {forestAnimal} from './ForestAnimals.js'
export const HABITAT_LIGHT={
 pine:{sun:'#fff0cf',illuminance:35000,ambient:16000,fogStart:15,fogEnd:48},
 alpine:{sun:'#fff8ec',illuminance:42000,ambient:20000,fogStart:25,fogEnd:72},
 birch:{sun:'#f3f2d8',illuminance:33000,ambient:16500,fogStart:17,fogEnd:50},
 meadow:{sun:'#fff1d1',illuminance:34000,ambient:19000,fogStart:19,fogEnd:58},
 mixed:{sun:'#deeadb',illuminance:26000,ambient:17500,fogStart:9,fogEnd:37},
 river:{sun:'#eef7e5',illuminance:33000,ambient:19000,fogStart:18,fogEnd:55},
 oak:{sun:'#ffe5ad',illuminance:34000,ambient:18000,fogStart:18,fogEnd:54},
 edge:{sun:'#fff1c9',illuminance:36000,ambient:18500,fogStart:21,fogEnd:62}
}
export class HabitatWorld extends VoxelWorld{
 constructor(scene,{quality='balanced'}={}){
  super(scene);this.quality=quality;this.lighting=HABITAT_LIGHT[scene.environment]
  this.targets=this.targets.map(old=>{
   const spawn=scene.spawns.find(s=>s.id===old.id),species=SPECIES_BY_ID[spawn.speciesId]
   const target=makeMushroom(spawn,species,old.anchor,(x,z)=>this.heightAt(x,z),{mesh:new BotanicalMesh(),sculpt:speciesSculpture})
   return {...old,...target}
  })
  // Make even the small animal silhouettes smoother, without changing collision or AI.
  for(const kind of Object.keys(this.wildlife.modelData)){
   const model=forestAnimal(kind)||this.wildlife.modelData[kind];this.wildlife.modelData[kind]=model
   for(const part of ['body','head','leg'])if(model[part])model[part]=smoothCoat(model[part])
  }
  const tags=new Uint8Array(this.vertices.length/27)
  for(const range of this.materialRanges||[])tags.fill(range.kind,range.start/27,range.end/27)
  const sizes=[0,0,0,0,0];for(const tag of tags)sizes[tag]+=27
  const arrays=sizes.map(size=>new Float32Array(size)),offsets=[0,0,0,0,0]
  for(let i=0;i<tags.length;i++){const k=tags[i];arrays[k].set(this.vertices.subarray(i*27,i*27+27),offsets[k]);offsets[k]+=27}
  this.surfaces=arrays.map((data,i)=>({kind:['forest','ground','bark','leaves','stone'][i],data})).filter(g=>g.data.length)
  this.materialRanges=[]
 }
 _tag(kind,fn){const start=this.mesh.vertices.length,result=fn();(this.materialRanges||=[]).push({kind,start,end:this.mesh.vertices.length});return result}
 _terrain(){this._tag(1,()=>super._terrain())}
 _grass(x,z,height,color){this._tag(3,()=>super._grass(x,z,height,color))}
 _log(x,z){return this._tag(2,()=>detailedLog(this,x,z))}
 _tree(x,z,kind=this.biome.tree,scale=1){
  if(kind==='none')return
  const ground=this.heightAt(x,z),height=(4.6+this.random.next()*1.6)*scale,trunkWidth=.48*scale,bark=kind==='birch'?'#d7d6c7':this.biome.bark
  const leanX=Math.sin(x*1.7+z)*.24*scale,leanZ=Math.cos(z*1.3-x)*.18*scale
  this._tag(2,()=>{
   this._shape('branch',[[x,ground,z],[x+leanX,ground+height,z+leanZ],.25*scale,.065*scale,bark,14],{solid:true})
   for(let k=0;k<5;k++){const a=k*2.4,ex=x+Math.cos(a)*.7*scale,ez=z+Math.sin(a)*.7*scale;this._shape('branch',[[x,ground+.18,z],[ex,this.heightAt(ex,ez)+.012,ez],.105*scale,.012,bark,8])}
   barkFurrows(this.mesh,x,ground,z,height,scale,leanX,leanZ,kind==='birch')
   if(kind==='birch')for(let k=0;k<12;k++){const a=k*2.4,t=(k+1)/14,px=x+leanX*t+Math.sin(a)*(.25-.18*t)*scale,pz=z+leanZ*t+Math.cos(a)*(.25-.18*t)*scale;this.mesh.ellipsoid(px,ground+height*t,pz,.065*scale,.012*scale,.035*scale,'#6d7164',8,4,a)}
  })
  const greens=kind==='oak'?['#738653','#879857','#9ba866']:[this.biome.leaf,'#557956','#74925f']
  const pine=kind==='pine',tiers=pine?5:5
  for(let i=0;i<tiers;i++){
   const a=i*2.399+Math.sin(x+z),level=pine?.42+i*.105:.64+(i%3)*.10,cy=ground+height*level
   const radius=(pine?1.45-i*.17:.8+(i%3)*.27)*scale
   const origin=[x+leanX*level,cy,z+leanZ*level]
   const branches=pine?3:1
   for(let j=0;j<branches;j++){
    const angle=a+j*Math.PI*2/3,tip=[origin[0]+Math.cos(angle)*radius,cy+(pine?.17:.55)*scale,origin[2]+Math.sin(angle)*radius]
    this._tag(2,()=>this._shape('branch',[origin,tip,.055*scale,.014,bark,8]))
    this._tag(3,()=>{
     if(pine){
      // Irregular needle sprays on real branches instead of stacked cones.
      for(let n=0;n<2;n++){const t=.54+n*.35,px=origin[0]+(tip[0]-origin[0])*t,pz=origin[2]+(tip[2]-origin[2])*t,py=origin[1]+(tip[1]-origin[1])*t;
       this._shape('smoothEllipsoid',[px,py,pz,(.34-n*.035)*scale,.12*scale,(.36-n*.045)*scale,greens[(i+n)%3],7,3,angle])
       for(let spray=0;spray<1;spray++)needleSpray(this.mesh,[px,py,pz],angle+Math.sin(i+n)*.55,scale,greens[(i+n+spray)%3])}
     }else{
      for(let n=0;n<2;n++){const b=angle+n*2.4,px=tip[0]+Math.cos(b)*.40*scale,pz=tip[2]+Math.sin(b)*.40*scale;
       this._shape('smoothEllipsoid',[px,tip[1]+(n%2)*.27*scale,pz,.57*scale,(kind==='birch'?.36:.48)*scale,.57*scale,greens[(i+n)%3],8,4,b])
       for(let spray=0;spray<1;spray++){const leafAngle=b+i*1.57;leafSpray(this.mesh,[px+Math.cos(leafAngle)*.44*scale,tip[1]+.15*scale,pz+Math.sin(leafAngle)*.44*scale],leafAngle,scale,greens[(i+n+spray)%3],kind==='oak')} }
     }
    })
   }
  }
  if(pine)this._tag(3,()=>{
   const center=[x+leanX,ground+height*.94,z+leanZ]
   this._shape('smoothEllipsoid',[...center,.27*scale,.40*scale,.28*scale,greens[1],8,5])
   for(let k=0;k<3;k++)needleSpray(this.mesh,center,k*2.1,scale*.8,greens[k])
  })
  return {x,z,ground,height,trunkWidth}
 }
 _biomeDetails(){
  super._biomeDetails()
  if(this.scene.environment==='river'&&!this.water)riverDetails(this)
  for(let i=0;i<38;i++){
   const x=Math.sin(i*7.17)*13,z=Math.cos(i*3.27)*13
   if(this.isWater(x,z)||this.targets.some(t=>Math.hypot(t.anchor.x-x,t.anchor.z-z)<.8))continue
   if(['mixed','birch','river','pine'].includes(this.scene.environment)&&i%2===0)this._tag(3,()=>fern(this,x,z,.6+(i%3)*.2,i))
   else if(this.scene.environment==='alpine'||this.scene.environment==='meadow'){
    const y=this.heightAt(x,z);this._tag(3,()=>{for(let k=0;k<3;k++){const px=x+k*.07,h=.14+k*.035;this.mesh.branch([px,y,z],[px,y+h,z],.004,.002,'#65844f',5);for(let p=0;p<5;p++){const a=p*1.256;this.mesh.ellipsoid(px+Math.sin(a)*.025,y+h,z+Math.cos(a)*.025,.02,.012,.021,i%2?'#cab5db':'#ece4b3',6,4)}}})
   }
  }
 }
}
// Weld normals only within a color group, preserving eyes, stripes and hooves.
function smoothCoat(data){
 const out=data.slice(),normals=new Map(),key=i=>[0,1,2,6,7,8].map(k=>Math.round(data[i+k]*10000)).join(',')
 for(let i=0;i<data.length;i+=9){const k=key(i),n=normals.get(k)||[0,0,0];for(let j=0;j<3;j++)n[j]+=data[i+3+j];normals.set(k,n)}
 for(let i=0;i<data.length;i+=9){const n=normals.get(key(i)),len=Math.hypot(...n)||1;for(let j=0;j<3;j++)out[i+3+j]=n[j]/len}
 return out
}
