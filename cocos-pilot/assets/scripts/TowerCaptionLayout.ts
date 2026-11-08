export type CaptionBox={left:number;right:number;bottom:number;top:number};
export type CaptionRequest={x:number;y:number;width:number;top:number;bottom:number;priority:number;pinned?:boolean};
const overlap=(a:CaptionBox,b:CaptionBox)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top,b.top)-Math.max(a.bottom,b.bottom));
const offsets=Array.from({length:21},(_,y)=>Array.from({length:21},(_,x)=>({x:(x-10)*48,y:(y-10)*28}))).flat()
 .sort((a,b)=>(a.x*a.x+a.y*a.y)-(b.x*b.x+b.y*b.y)||a.y-b.y||a.x-b.x);
/** Place whole text/bar blocks. Pure, deterministic and independent of combat state. */
export function layoutTowerCaptions<T extends CaptionRequest>(requests:T[],obstacles:CaptionBox[],viewport:{width:number;height:number}){
 const occupied:CaptionBox[]=[],placed:{request:T;x:number;y:number;box:CaptionBox}[]=[];
 const sorted=requests.map((request,index)=>({request,index})).sort((a,b)=>Number(!!b.request.pinned)-Number(!!a.request.pinned)||b.request.priority-a.request.priority||a.index-b.index);
 for(const {request:r} of sorted){
  let best:{request:T;x:number;y:number;box:CaptionBox}|undefined;
  let bestLabels=Infinity,bestObstacles=Infinity,bestDistance=Infinity;
  for(const offset of r.pinned?[{x:0,y:0}]:offsets){
   const x=r.pinned?r.x:Math.max(-viewport.width/2+r.width/2+6,Math.min(viewport.width/2-r.width/2-6,r.x+offset.x));
   const y=r.pinned?r.y:Math.max(-viewport.height/2+72-r.bottom,Math.min(viewport.height/2-26-r.top,r.y+offset.y));
   const box={left:x-r.width/2-3,right:x+r.width/2+3,bottom:y+r.bottom-2,top:y+r.top+2};
   const labels=occupied.reduce((sum,b)=>sum+overlap(box,b),0),blocked=obstacles.reduce((sum,b)=>sum+overlap(box,b),0);
   const distance=(x-r.x)**2+(y-r.y)**2;
   if(labels<bestLabels||labels===bestLabels&&(blocked<bestObstacles||blocked===bestObstacles&&distance<bestDistance)){
    best={request:r,x,y,box};bestLabels=labels;bestObstacles=blocked;bestDistance=distance;
   }
   if(!labels&&!blocked&&distance===0)break;
  }
  if(best){placed.push(best);occupied.push(best.box);}
 }
 return placed;
}
