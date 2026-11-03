import {Color,Graphics} from 'cc';
import {HEX_CENTER,HEX_VERTICES} from './shared/js/xianxia/TowerArena';

type Point={x:number;y:number};
type ArenaState={arenaVersion?:number;player?:Point;enemies?:Array<Point&{role?:string;hp?:number}>};
// Generated JS's .map(Object.freeze) loses its point type; retain its real data.
const HEX_POINTS=HEX_VERTICES as readonly Point[];
const C=(hex:string)=>new Color(hex);
const PALETTE={
 void:C('#101e1d'),stone:C('#172e2b'),seam:C('#26443e'),
 inset:C('#3c5148'),wall:C('#7a8765'),column:C('#28403a'),player:C('#f1d68d'),
};
const LEGACY_VERTICES:Point[]=[
 {x:-912,y:1020},{x:978,y:1020},{x:978,y:-1140},{x:-912,y:-1140},
];
const vertices=(version?:number):readonly Point[]=>version===1?HEX_POINTS:LEGACY_VERTICES;
const inset=(points:readonly Point[],factor:number):Point[]=>points.map(p=>({
 x:HEX_CENTER.x+(p.x-HEX_CENTER.x)*factor,
 y:HEX_CENTER.y+(p.y-HEX_CENTER.y)*factor,
}));

// Explicit last segment makes the six wall edges inspectable by Graphics recorders.
function polygon(g:Graphics,points:readonly Point[],camera:Point){
 g.moveTo(points[0].x-camera.x,points[0].y-camera.y);
 for(let i=1;i<=points.length;i++){
  const p=points[i%points.length];g.lineTo(p.x-camera.x,p.y-camera.y);
 }
 g.close();
}

/** Precompute world-anchored tile seams, clipped to the convex floor polygon. */
function seams(points:readonly Point[]):[Point,Point][]{
 const lines:[Point,Point][]=[];
 for(const axis of ['x','y'] as const){
  const other=axis==='x'?'y':'x',lo=Math.min(...points.map(p=>p[axis])),hi=Math.max(...points.map(p=>p[axis]));
  const origin=HEX_CENTER[axis],step=180;
  for(let value=origin+Math.ceil((lo-origin)/step)*step;value<hi;value+=step){
   const hits:number[]=[];
   for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],delta=b[axis]-a[axis];
    if(!delta)continue;
    const t=(value-a[axis])/delta;
    if(t>=0&&t<=1)hits.push(a[other]+t*(b[other]-a[other]));
   }
   if(hits.length<2)continue;
   const from=Math.min(...hits),to=Math.max(...hits);
   if(to-from<1)continue;
   lines.push(axis==='x'?[{x:value,y:from},{x:value,y:to}]:[{x:from,y:value},{x:to,y:value}]);
  }
 }
 return lines;
}
const HEX_SEAMS=seams(HEX_POINTS),LEGACY_SEAMS=seams(LEGACY_VERTICES);
const HEX_INSET=inset(HEX_POINTS,.94),COLUMN_BASES=inset(HEX_POINTS,.84);

/**
 * Append the arena beneath combat actors. The caller owns g.clear().
 * All floor/wall/decor positions use world minus camera; width/height affect
 * only the screen-space dark backing, never arena geometry or gameplay.
 * Missing/unknown versions retain the legacy rectangular arena.
 */
export function drawTowerArena(g:Graphics,camera:Point,width:number,height:number,arenaVersion?:number,textured=false){
 const hex=arenaVersion===1,points=vertices(arenaVersion);
 if(!textured){
 g.fillColor=PALETTE.void;g.rect(-width/2,-height/2,width,height);g.fill();
 g.fillColor=PALETTE.stone;polygon(g,points,camera);g.fill();
 g.strokeColor=PALETTE.seam;g.lineWidth=1;
 for(const [a,b] of hex?HEX_SEAMS:LEGACY_SEAMS){
  g.moveTo(a.x-camera.x,a.y-camera.y);g.lineTo(b.x-camera.x,b.y-camera.y);
 }
 g.stroke();
 }
 if(hex){
  g.strokeColor=PALETTE.inset;g.lineWidth=3;polygon(g,HEX_INSET,camera);g.stroke();

 }
 g.strokeColor=PALETTE.wall;g.lineWidth=8;polygon(g,points,camera);g.stroke();
}

/**
 * Append a passive rectangular 132×88 overview centered at HUD coordinates (x,y).
 * Same scale on both axes; positive world Y stays up. No camera dependency,
 * labels, nodes, event handlers, buttons or clearing of the existing HUD.
 */
export function drawTowerArenaMap(g:Graphics,state:ArenaState,x:number,y:number){
 const points=vertices(state.arenaVersion);
 // Fit the arena inside the inset frame, leaving room for edge markers.
 // A uniform scale preserves directions and relative distances.
 const extentX=Math.max(...points.map(p=>Math.abs(p.x-HEX_CENTER.x)));
 const extentY=Math.max(...points.map(p=>Math.abs(p.y-HEX_CENTER.y)));
 const scale=Math.min(54/extentX,32/extentY);
 const project=(p:Point)=>({x:x+(p.x-HEX_CENTER.x)*scale,y:y+(p.y-HEX_CENTER.y)*scale});
 g.fillColor=new Color(16,36,31,220);g.roundRect(x-66,y-44,132,88,6);g.fill();
 g.fillColor=PALETTE.stone;g.roundRect(x-62,y-40,124,80,4);g.fill();
 g.strokeColor=PALETTE.wall;g.lineWidth=1.5;g.roundRect(x-62,y-40,124,80,4);g.stroke();
 // The frame is rectangular; the floor inside follows the actual arena.
 polygon(g,points.map(project),{x:0,y:0});
 g.fillColor=C('#29463c');g.fill();
 g.strokeColor=C('#9da77c');g.lineWidth=1;g.stroke();
 for(const e of state.enemies||[]){
  if(!(e.hp>0)||!Number.isFinite(e.x)||!Number.isFinite(e.y))continue;
  const dot=project(e),r=e.role==='boss'?4:3;
  g.fillColor=C('#ef786c');
  if(e.role==='boss'){
   g.rect(dot.x-r,dot.y-r,r*2,r*2);
  }else if(e.role==='elite'){
   g.moveTo(dot.x,dot.y+r);g.lineTo(dot.x+r,dot.y);g.lineTo(dot.x,dot.y-r);g.lineTo(dot.x-r,dot.y);g.close();
  }else{
   g.circle(dot.x,dot.y,2);
  }
  g.fill();
 }
 const p=state.player;
 if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){
  const dot=project(p);
  g.fillColor=PALETTE.player;g.circle(dot.x,dot.y,3);g.fill();
  g.strokeColor=PALETTE.void;g.lineWidth=1;g.circle(dot.x,dot.y,3);g.stroke();
  // Ring keeps the player distinct from enemies beyond color alone.
  g.strokeColor=PALETTE.player;g.circle(dot.x,dot.y,4.5);g.stroke();
 }
}
