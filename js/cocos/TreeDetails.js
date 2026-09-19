// Small opaque leaf/needle geometry: no alpha cards, billboards or external textures.
export function needleSpray(mesh,center,angle,scale,color){
 const [x,y,z]=center,dx=Math.cos(angle),dz=Math.sin(angle),end=[x+dx*.44*scale,y+.045*scale,z+dz*.44*scale]
 mesh.branch(center,end,.009*scale,.002,'#6b7150',5)
 const triangles=[]
 for(let k=0;k<6;k++)for(const side of [-1,1]){
  const t=.12+k*.13,px=x+dx*t*.44*scale,pz=z+dz*t*.44*scale,py=y+t*.045*scale,len=(.18-k*.007)*scale
  for(let n=0;n<1;n++){const a=angle+side*(.70+n*.30),tip=[px+Math.cos(a)*len,py+(.025+n*.018)*scale,pz+Math.sin(a)*len],w=.006*scale;
   triangles.push([[px-dz*w,py,pz+dx*w],tip,[px+dz*w,py,pz-dx*w]])}
 }
 mesh.surface(triangles,color)
}
export function leafSpray(mesh,center,angle,scale,color,oak=false){
 const [x,y,z]=center,dx=Math.cos(angle),dz=Math.sin(angle),end=[x+dx*.43*scale,y+.07*scale,z+dz*.43*scale]
 mesh.branch(center,end,.008*scale,.002,'#7d7850',5)
 for(let k=0;k<3;k++){
  const a=angle+(k%2?1:-1)*.78,t=.15+k*.25,px=x+dx*t*.43*scale,py=y+t*.07*scale,pz=z+dz*t*.43*scale,len=(oak?.23:.18)*scale,w=(oak?.072:.068)*scale,triangles=[]
  const point=(u,side)=>{const breadth=w*Math.sin(u*Math.PI)*(oak?(.77+.23*Math.cos(u*Math.PI*8)):1);return [px+Math.cos(a)*len*u-Math.sin(a)*breadth*side,py+.035*scale*Math.sin(u*Math.PI)-Math.abs(side)*.016*scale,pz+Math.sin(a)*len*u+Math.cos(a)*breadth*side]}
  const steps=oak?6:4
  for(let i=0;i<steps;i++)for(const side of [-1,1]){const u=i/steps,v=(i+1)/steps;const tris=[[point(u,0),point(u,side),point(v,side)],[point(u,0),point(v,side),point(v,0)]];triangles.push(...(side<0?tris.map(t=>t.reverse()):tris))}
  mesh.surface(triangles,color)
 }
}
export function barkFurrows(mesh,x,y,z,height,scale,leanX,leanZ,birch){
 if(birch)return
 for(let k=0;k<6;k++){
  const a=k*2.4,lo=.10+(k%3)*.07,hi=.62+(k%4)*.08,point=t=>[x+leanX*t+Math.cos(a)*(.25-.185*t)*scale,y+height*t,z+leanZ*t+Math.sin(a)*(.25-.185*t)*scale]
  mesh.branch(point(lo),point(hi),.010*scale,.004*scale,'#66523e',4)
 }
}
