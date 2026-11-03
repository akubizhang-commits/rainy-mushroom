import {Color,Graphics} from 'cc';
import {collectHitFeedback,skillHitFeedback} from './shared/js/xianxia/TowerHitFeedback';

/** Shared settled-hit presentation. The host samples once for both body and
 * foreground; simultaneous skills cannot multiply a monster's displacement. */
export class TowerHitArt {
 poses:any[]=[];
 readonly covered=new Set<string>();
 readonly bodies=new Map<string,any>();
 reset(){this.poses=[];this.covered.clear();this.bodies.clear()}
 sample(s:any){
  this.reset();
  if(!s?.player||s.player.hp<=0||!Number.isFinite(s.time))return;
  this.poses=collectHitFeedback(s.effects,s.time);
  for(const hit of s.effects||[]){
   const at=hit?.startedAt??hit?.expiresAt-.25;
   if(hit?.id&&skillHitFeedback(hit,at))this.covered.add(hit.id);
  }
  for(const p of this.poses)this.bodies.set(p.hit.targetId,p);
 }
 draw(g:Graphics,camera:{x:number;y:number}){
  for(const p of this.poses){
   const {dx,dy,strength:k,fade,age,shape}=p;
   const x=p.hit.x-camera.x+p.x,y=p.hit.y-camera.y+p.lift+p.y;
   const point=(a:number,b:number)=>({x:x+dx*a-dy*b,y:y+dy*a+dx*b});
   const ray=(a:number,b:number,c:number,d:number)=>{
    const u=point(a,b),v=point(c,d);g.moveTo(u.x,u.y);g.lineTo(v.x,v.y);g.stroke();
   };
   const color=(alpha:number,width:number,core=false)=>{
    g.strokeColor=core?new Color(245,255,255,Math.round(alpha*fade)):
     p.terminal&&shape==='rain'?new Color(255,221,148,Math.round(alpha*fade)):
     p.skill==='sj_mark'?new Color(107,255,204,Math.round(alpha*fade)):
     shape==='shadow'?new Color(195,186,255,Math.round(alpha*fade)):
     new Color(107,225,251,Math.round(alpha*fade));
    g.lineWidth=width;
   };
   const cut=(width:number,alpha:number,core=false)=>{
    color(alpha,width,core);
    if(shape==='graze'){
     const u=point(-15*k,-4*k);g.moveTo(u.x,u.y);
     for(let i=1;i<=5;i++){const t=i/5,v=point((-15+30*t)*k,(-4+10*Math.sin(t*Math.PI))*k);g.lineTo(v.x,v.y)}g.stroke();
    }else if(shape==='slash'||shape==='cross'){
     ray(-20*k,-9*k,22*k,9*k);
     if(shape==='cross')ray(-20*k,9*k,22*k,-9*k);
    }else ray(-16*k,0,25*k,0);
   };
   // Short local halo, sharp white edge, then separating shards. No screen flash.
   cut((shape==='shadow'?10:6)*k,110);cut(shape==='shadow'?3:1.8,250,true);
   if(age<.05){
    const peak=1-age/.05;
    g.fillColor=new Color(244,255,255,Math.round(230*peak));
    const v=point(13*k,0);g.moveTo(v.x,v.y);
    for(const [a,b] of [[0,3],[-9,0],[0,-3]]){const v=point(a*k,b*k);g.lineTo(v.x,v.y)}g.close();g.fill();
   }
   const count=shape==='shadow'?(p.terminal?8:6):shape==='graze'?3:shape==='cleave'||(p.terminal&&shape==='rain')?7:5;
   for(let i=0;i<count;i++){
    const angle=(i/count)*Math.PI*2+.35,travel=(5+age*100)*k;
    const a=Math.cos(angle),b=Math.sin(angle);
    color(220,1.3,true);ray(a*travel,b*travel*.7,a*(travel+6*fade),b*(travel+6*fade)*.7);
   }
  }
 }
}
