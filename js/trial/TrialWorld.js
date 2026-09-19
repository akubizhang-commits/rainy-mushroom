import {MeshBuilder} from '../voxel/geometry.js';
import {BotanicalMesh} from '../cocos/BotanicalGeometry.js';
import {speciesSculpture} from '../cocos/SpeciesSculptures.js';
import {makeMushroom} from '../voxel/mushrooms.js';
import {SPECIES_BY_ID} from '../data/explorationData.js';
// A compact clearing: all specimens share real geometry, light and ground contact.
export function trialWorld(state){
 const ground=new MeshBuilder(),wood=new BotanicalMesh(),plants=new BotanicalMesh(),stone=new BotanicalMesh();
 ground.box(0,-.35,0,10,.6,12,'#657855');
 ground.ellipsoid(0,-.08,0,4.8,.18,5.7,'#899568',28,5);
 for(let i=0;i<110;i++){
  const x=Math.sin(i*12.73)*4.3,z=Math.cos(i*6.19)*5;
  if(state.targets.some(t=>Math.hypot(t.x-x,t.z-z)<.65))continue;
  plants.branch([x,0,z],[x+.09,.15+(i%3)*.05,z],.018,.004,i%2?'#6C8555':'#A3AD6E',5);
  if(i%3===0)ground.ellipsoid(x,.025,z,.12,.013,.05,i%2?'#9C8655':'#B49B63',6,3,i);
 }
 for(const [x,z] of [[-4,-4],[4,-3.8],[-4.1,.6],[4.2,1],[-3.8,4.7],[3.9,4.8]]){
  wood.branch([x,0,z],[x+.12,3.5,z],.24,.11,'#775B3F',12);
  for(let j=0;j<4;j++){
   const y=1.5+j*.5,r=1.05-j*.18;
   for(let k=0;k<4;k++){
    const a=k*1.57+j*.7,dx=Math.cos(a)*r,dz=Math.sin(a)*r;
    wood.branch([x,y,z],[x+dx,y+.1,z+dz],.045,.012,'#775B3F',7);
    plants.ellipsoid(x+dx*.65,y+.18,z+dz*.65,r*.5,.23,r*.35,j%2?'#587D53':'#456A4A',9,4,a);
   }
  }
 }
 // Fallen trunk at the rear edge and a short standing log for bracket fungi.
 wood.branch([-3.6,.25,-4.6],[2.8,.25,-4.8],.3,.24,'#785B3B',14);
 for(let i=0;i<5;i++)stone.ellipsoid(-4+i*2,.1,5,.4,.25,.32,'#929787',9,5,i);
 const targets=state.targets.map(t=>{
  const y=t.speciesId==='trametes-versicolor'?.45:.04;
  if(y>.1)wood.branch([t.x-.25,0,t.z],[t.x-.25,.95,t.z],.24,.18,'#70553C',12);
  const target=makeMushroom({id:t.id,count:1},SPECIES_BY_ID[t.speciesId],{x:t.x,y,z:t.z},null,{mesh:new BotanicalMesh(),sculpt:speciesSculpture});
  // Consistent modest enlargement for readable touch targets, still grounded in 3D.
  for(let i=0;i<target.data.length;i+=9){target.data[i]=t.x+(target.data[i]-t.x)*1.55;target.data[i+1]=y+(target.data[i+1]-y)*1.55;target.data[i+2]=t.z+(target.data[i+2]-t.z)*1.55}
  return target;
 });
 const covers=state.targets.filter(t=>t.covered).map(t=>{const m=new MeshBuilder();for(let j=0;j<9;j++)m.ellipsoid(t.x+Math.sin(j*2.4)*.32,.30+(j%3)*.08,t.z+Math.cos(j*2.4)*.3,.34,.045,.13,j%2?'#AD905A':'#8F7E4C',7,3,j);return {id:t.id,data:m.data()}});
 return {surfaces:[{kind:'ground',data:ground.data()},{kind:'bark',data:wood.data()},{kind:'leaves',data:plants.data()},{kind:'stone',data:stone.data()}],targets,covers,wildlife:{actors:[],modelData:{}}};
}
