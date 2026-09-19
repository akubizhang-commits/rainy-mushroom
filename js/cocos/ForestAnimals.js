import {MeshBuilder} from '../voxel/geometry.js'
import {makeDeerModel} from '../voxel/DeerModel.js'
import {makeUngulateModel} from '../voxel/UngulateModels.js'
// Original articulated wildlife meshes, with separate heads and planted feet.
export function forestAnimal(kind){
 if(['deer','boar','yak'].includes(kind))return detailedUngulate(kind)
 if(!['bear','wolf','tiger','squirrel'].includes(kind))return null
 const body=new MeshBuilder(),head=new MeshBuilder(),leg=new MeshBuilder(),small=kind==='squirrel',bear=kind==='bear',tiger=kind==='tiger';
 const coat=small?'#976B45':bear?'#574437':tiger?'#BD873D':'#7E887F',shade=small?'#805536':bear?'#43362C':tiger?'#A06D32':'#626E67',cream=tiger?'#DDCBA0':bear?'#8F7D62':'#B7B7A3';
 const hip=small?.19:bear?.62:tiger?.51:.63,width=small?.12:bear?.39:tiger?.31:.25,length=small?.20:bear?.67:tiger?.76:.66;
 body.smoothEllipsoid(0,hip+.13,0,width,small?.15:bear?.38:.26,length,coat,14,8);
 body.smoothEllipsoid(0,hip+.17,length*.55,width*.88,small?.12:.29,length*.33,shade,12,8);
 body.smoothEllipsoid(0,hip-.07,.08,width*.7,small?.07:.11,length*.75,cream,12,6);
 if(bear)body.smoothEllipsoid(0,hip+.38,.27,.34,.25,.37,shade,14,8);
 const pivot=[0,hip+(small?.17:bear?.22:.18),length*.72],headZ=small?.14:.28;
 head.branch([0,0,0],[0,small?.03:.05,headZ*.65],width*.63,width*.42,coat,12);
 head.smoothEllipsoid(0,small?.06:.10,headZ,width*(bear?.60:.59),small?.095:bear?.19:.15,small?.13:bear?.20:.20,coat,16,10);
 const muzzle=kind==='wolf'?.19:small?.055:.11;
 head.smoothEllipsoid(0,small?.02:.035,headZ+(small?.10:.16),width*.39,small?.045:.068,muzzle,cream,12,8);
 head.smoothEllipsoid(0,small?.025:.04,headZ+(small?.14:kind==='wolf'?.32:.245),width*.22,small?.025:.04,small?.025:.04,'#302D26',10,6);
 for(const side of [-1,1]){
  const ey=small?.095:.15,ez=headZ+(small?.04:.095);
  head.smoothEllipsoid(side*width*.49,ey,ez,small?.012:.018,small?.014:.021,small?.017:.027,'#242A22',10,6);
  head.smoothEllipsoid(side*width*.49,ey+.006,ez+.016,.005,.006,.005,'#D8D9C2',6,4);
  if(kind==='wolf'){
   head.branch([side*.105,.18,headZ-.06],[side*.13,.38,headZ-.095],.065,.003,shade,8);
   head.branch([side*.107,.21,headZ-.015],[side*.13,.34,headZ-.047],.033,.003,cream,7);
  }else{
   const ex=side*width*.47,ey2=small?.145:bear?.245:.235;
   head.smoothEllipsoid(ex,ey2,headZ-.055,small?.035:bear?.063:.052,small?.054:.067,.035,shade,10,7);
   head.smoothEllipsoid(ex,ey2+.006,headZ-.027,small?.020:.029,small?.034:.041,.008,cream,9,5);
  }
  if(tiger){
   for(let i=0;i<9;i++)coatStripe(body,side,(i/8-.5)*1.62,width,hip+.13,.26,length,i)
   for(let i=0;i<3;i++)faceStripe(head,side,width*.59,headZ,i);
  }
 }
 if(kind==='wolf')for(let side of [-1,1])for(let k=0;k<9;k++){const z=.27+k*.035,y=hip+.23+(k%3)*.026;body.surface([[[side*.16,y+.07,z],[side*.255,y-.12,z+.04],[side*.20,y+.02,z+.07]]],k%3?cream:shade)}
 if(small)for(let side of [-1,1])for(let k=0;k<3;k++)head.branch([side*.055,.19,headZ-.055],[side*(.055+k*.004),.24+k*.014,headZ-.07],.008,.001,shade,4)
 const foot=small?.025:bear?.092:tiger?.083:.053,legLength=hip-.035;
 leg.smoothEllipsoid(0,-legLength*.22,0,bear?.105:small?.033:tiger?.085:.058,legLength*.30,bear?.115:small?.040:tiger?.10:.075,coat,10,7);
 leg.branch([0,-legLength*.15,0],[0,-legLength+.03,.01],bear?.077:small?.021:tiger?.068:.042,bear?.060:small?.015:tiger?.046:.03,coat,10);
 leg.smoothEllipsoid(0,-legLength,.028,foot,.035,foot*1.45,shade,10,6);
 for(let side of [-1,1])for(let k=0;k<(bear?3:2);k++){const px=(k-(bear?1:.5))*(bear?.045:.025);leg.smoothEllipsoid(px,-legLength-.006,.063,bear?.020:.010,.020,.032,cream,7,4);if(bear)leg.branch([px,-legLength-.008,.10],[px,-legLength-.018,.14],.010,.001,'#34312a',5)}
 const tail=[[0,hip+.16,-length*.83],[small?.03:.12,hip+(small?.35:.07),-length-.16],[small?.01:.20,hip+(small?.54:kind==='wolf'?-.12:.07),-length-(small?.23:.40)]];
 for(let i=1;i<tail.length;i++)body.branch(tail[i-1],tail[i],small?.10:bear?.028:kind==='wolf'?.10:.045,small?.12:bear?.012:kind==='wolf'?.05:.032,coat,10);
 if(small)body.smoothEllipsoid(.01,hip+.46,-length-.19,.12,.24,.14,shade,14,8);
 if(tiger)for(let i=0;i<4;i++)body.smoothEllipsoid(.13+i*.015,hip+.07,-length-.18-i*.065,.046,.046,.014,'#443C2D',8,5);
 return {body:body.data(),bodyGeometry:body.boxes,head:head.data(),headGeometry:head.boxes,headPivot:pivot,headDip:bear?.40:.5,leg:leg.data(),stride:small?.45:bear?.23:.30,hips:[[-width*.68,hip,length*.54],[width*.68,hip,length*.54],[-width*.70,hip,-length*.55],[width*.70,hip,-length*.55]]}
}

// Narrow color strips hug the main tiger torso, instead of hovering cylindrical marks.
function coatStripe(mesh,side,z0,rx,cy,ry,rz,index){
 const point=(t,edge)=>{const z=Math.max(-.93,Math.min(.93,z0+.07*Math.sin(t*5+index)+edge*(.020*(1-t)+.003))),a=.30+t*1.65,section=Math.sqrt(1-z*z);return [side*(rx+.003)*section*Math.sin(a),cy+(ry+.003)*section*Math.cos(a),z*rz]}
 const tris=[];for(let i=0;i<9;i++){const a=point(i/9,-1),b=point(i/9,1),c=point((i+1)/9,1),d=point((i+1)/9,-1);tris.push(...(side>0?[[a,b,c],[a,c,d]]:[[a,c,b],[a,d,c]]))}mesh.surface(tris,'#40382c')
}
function append(model,key,mesh){const prior=model[key],data=mesh.data(),out=new Float32Array(prior.length+data.length);out.set(prior);out.set(data,prior.length);model[key]=out;if(model[key+'Geometry'])model[key+'Geometry'].push(...mesh.boxes)}
function detailedUngulate(kind){
 const deer=kind==='deer',yak=kind==='yak',model=deer?makeDeerModel():makeUngulateModel(kind),body=new MeshBuilder(),head=new MeshBuilder(),leg=new MeshBuilder()
 if(deer){
  // Keep the existing generic woodland deer identity: no invented species-specific spots.
  for(const side of [-1,1]){
   const points=[[side*.055,.55,.17],[side*.085,.72,.10],[side*.12,.85,.035],[side*.10,.92,.005]]
   for(let i=0;i<3;i++)head.branch(points[i],points[i+1],.014-i*.003,.010-i*.003,'#ac9574',7)
   head.branch(points[1],[side*.16,.84,.17],.009,.002,'#c5af8b',6)
   head.smoothEllipsoid(side*.081,.434,.277,.015,.010,.025,'#c1a483',8,5)
   head.smoothEllipsoid(side*.084,.420,.285,.004,.004,.006,'#ded8bf',6,4)
  }
  body.smoothEllipsoid(0,.81,.36,.12,.12,.13,'#baa383',10,7)
  for(const side of [-1,1])leg.smoothEllipsoid(side*.014,-.86,.036,.013,.020,.043,'#282b25',8,5)
 }else if(yak){
  for(let i=0;i<56;i++){
   const a=i/56*Math.PI*2,x=Math.cos(a)*.43,z=Math.sin(a)*.69,top=.70+(i%3)*.03,bottom=.26+(i%5)*.018,w=.021
   body.surface([[[x-w,top,z],[x*1.045,bottom,z*1.04],[x+w,top,z]],[[x-w,top,z],[x,top+.04,z-.008],[x*1.045,bottom,z*1.04]]],i%3?'#574b3b':'#3d3930')
  }
  for(let i=0;i<10;i++){const x=(i-4.5)*.023;head.branch([x,.21,.21],[x*.7,-.09-(i%3)*.02,.30],.012,.001,i%2?'#514534':'#736047',5)}
  body.smoothEllipsoid(.11,.55,-.92,.075,.20,.075,'#39372f',12,8)
 }else{
  for(let i=0;i<35;i++){const z=-.43+i*.025,y=.94-Math.abs(z-.1)*.20;for(const side of [-1,1])body.branch([side*.03,y-.01,z],[side*.035,y+.07+(i%4)*.007,z-.025],.003,.0007,'#4b4438',3)}
  for(const side of [-1,1]){
   head.smoothEllipsoid(side*.18,.13,.06,.055,.08,.06,'#695a48',10,6)
   head.branch([side*.10,-.14,.32],[side*.145,-.12,.42],.017,.009,'#c9b99b',7)
   head.smoothEllipsoid(side*.045,-.088,.531,.013,.010,.005,'#171e1a',8,5)
  }
 }
 append(model,'body',body);append(model,'head',head);append(model,'leg',leg);return model
}

function faceStripe(mesh,side,rx,cz,row){
 const p=(u,e)=>{const yy=.02+row*.052+u*.009+e*.007,z=.075+u*.095,xx=Math.sqrt(Math.max(0,1-((yy-.10)/.15)**2-(z/.20)**2));return [side*(rx+.002)*xx,yy,cz+z]}
 const tris=[];for(let j=0;j<6;j++){const a=p(j/6,-1),b=p(j/6,1),c=p((j+1)/6,1),d=p((j+1)/6,-1);tris.push([a,b,c],[a,c,d],[a,c,b],[a,d,c])}mesh.surface(tris,'#40382c')
}
