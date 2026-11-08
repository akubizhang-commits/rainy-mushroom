import {Color,Graphics} from 'cc';
import {skillForm,orbitSwordPose} from './shared/js/xianxia/TowerSkillForms';
import {swordQiSegments,swordQiVisualLift,swordQiPoseIndex} from './shared/js/xianxia/TowerSwordQi';
import {SHADOW_LIFT,shadowPreviewLine,shadowHitFeedback} from './shared/js/xianxia/TowerShadow';
import {sancaiVertices} from './shared/js/xianxia/TowerSancai';
import {drawQinglianWindup,drawQinglianBurst} from './QinglianFormationArt';

const FRIENDLY=new Set(['basic_swing','arc','cross','line','tiandi','tiandi_windup','shadow','formation','sancai','qinglian','convergence','sword_rain','orbit','wuwo','hit','gate','armor_heal','sword_charge','sword_burst_charge','sword_burst','sword_burst_hit']);
/** Geometric skill presentation. Every damaging frontier comes from combat.
 * Uses one existing Graphics layer and cached colors: no per-frame nodes,
 * textures, tweens, timers, particles, random choices or gameplay writes.
 */
export class TowerSkillEffects {
 private markOrigins=new Map<string,{x:number;y:number;side:number}>();private markStarts=new Map<string,number>();private markState:any=null;private markTime=-1;
 private fill=new Color(115,218,232,255);
 private stroke=new Color(185,248,255,255);
 private cx=0;private cy=0;
 private gateTracks=new Map<string,any>();private gateState:any=null;private gateTime=-1;
 private orbitLevel=-1;private orbitEvolution=-1;private orbitForm:any=null;
 handles(e:any){return !!e&&!e.hostile&&(FRIENDLY.has(e.kind)||e.source==='evo_sixiang')}
 draw(g:Graphics,s:any,camera:{x:number;y:number},arcSprites?:ReadonlySet<string>,lineSprites?:ReadonlySet<string>,tiandiSprites?:ReadonlySet<string>,qiSprites?:ReadonlySet<string>,orbitSprites=false,formationSprites?:ReadonlySet<string>,waist?:{x:number;y:number}|null,shadowSprites?:ReadonlySet<string>,coveredHits?:ReadonlySet<string>){
  if(!s||!Number.isFinite(s.time)||!s.player||s.player.hp<=0)return;
  this.cx=camera.x;this.cy=camera.y;
  this.drawGateAftershocks(g,s);
  this.orbit(g,s,orbitSprites,waist);
  for(const z of s.zones||[])if(this.handles(z)&&!formationSprites?.has(z.id)&&!shadowSprites?.has(z.id)){
   if(z.kind==='shadow'&&z.source==='sj_shadow')this.shadow(g,z,s.time,true,s.arenaVersion);
   else this.item(g,z,s.time,true);
  }
  for(const e of s.effects||[])if(this.handles(e)){
   if(e.kind==='gate'&&this.gateTracks.has(e.id))continue;
   if(e.kind==='hit'&&coveredHits?.has(e.id))continue;
   if(formationSprites?.has(e.id))continue;
   if(e.kind==='shadow'&&e.source==='sj_shadow'){
    if(!shadowSprites?.has(e.id))this.shadow(g,e,s.time,false,s.arenaVersion);
    continue;
   }
   if(e.kind==='arc'&&arcSprites?.has(e.id))continue;
   if(e.kind==='line'&&e.source==='sj_line'&&!e.hostile)continue; // Ground qi retired; chest sword/rift owns this effect.
   if(e.kind==='tiandi'&&e.source==='evo_tiandi'&&tiandiSprites?.has(e.id))continue;
   if(e.kind==='cross'&&e.source==='sj_moon'){
    if(!qiSprites?.has(e.id)){
     const alpha=Math.round(210*Math.max(0,1-(s.time-e.startedAt)/.42));
     this.lineColor(g,220,245,255,alpha,8);
     const angle=Math.atan2(e.dirY,e.dirX),r=e.radius;
     for(let i=0;i<=60;i++){
      const t=(-150+i*5)*Math.PI/180,x=r*Math.cos(t),y=r*.5*Math.sin(t);
      const px=e.x-this.cx+x*Math.cos(angle)-y*Math.sin(angle),py=e.y-this.cy+swordQiVisualLift(e)+x*Math.sin(angle)+y*Math.cos(angle);
      if(i===0)g.moveTo(px,py);else g.lineTo(px,py);
     }g.stroke();
    }continue;
   }
   if(e.kind==='cross'&&e.source==='sj_cross'){
    if(e.shape==='cross-burst'){
     if(!qiSprites?.has(e.id)){this.lineColor(g,180,240,255,Math.round(120*Math.max(0,1-(s.time-e.startedAt)/.9)),2);const a=Math.atan2(e.dirY??0,e.dirX??1);g.arc(e.x-this.cx,e.y-this.cy+swordQiVisualLift(e),e.radius,a-Math.PI/2,a+Math.PI/2,false);g.stroke()}
    }else if(!qiSprites?.has(e.id))this.drawSwordQi(g,e,s.time,camera);
    continue;
   }
   // A formation's visible eyes/border live once on its shared zone; effects
   // carry actual pulse times, rather than painting a second duplicate array.
   if(e.kind==='formation'&&(s.zones||[]).some((z:any)=>z.kind==='formation'&&z.x===e.x&&z.y===e.y))continue;
   this.item(g,e,s.time,false);
  }
 }
 /** One readable jade cut settles into one scar. No recurring particles or cuts. */
 drawQingpingMarks(g:Graphics,s:any,camera:{x:number;y:number}){
  if(!s?.player||s.player.hp<=0)return;
  this.cx=camera.x;this.cy=camera.y;
  if(this.markState!==s||s.time<this.markTime){this.markStarts.clear();this.markOrigins.clear();this.markState=s}this.markTime=s.time;
  const active=new Set<string>();
  let drawn=0;
  for(const e of s.enemies||[]){
   const pending=e.qingping&&!e.qingping.applied;
   if(e.hp<=0||(!pending&&(!(e.woundBudget>0)||!(e.woundUntil>s.time))))continue;
   if(drawn++>=32)break;
   active.add(e.id);if(e.qingping&&e.qingping.startedAt>(this.markStarts.get(e.id)??-1)){this.markStarts.delete(e.id);this.markOrigins.delete(e.id)}if(!this.markStarts.has(e.id))this.markStarts.set(e.id,e.qingping?.startedAt??e.woundUntil-2);
   const remaining=pending?2:e.woundUntil-s.time,age=Math.max(0,s.time-this.markStarts.get(e.id)!),fade=Math.min(1,remaining/.6);
   const size=Math.min(80,Math.max(50,(e.radius||18)*2));
   const x=e.x-this.cx,y=e.y-this.cy+Math.min(76,Math.max(32,(e.radius||18)*1.4));
   if(!this.markOrigins.has(e.id))this.markOrigins.set(e.id,{x:e.qingping?.originX??s.player.x,y:Math.max((e.qingping?.originY??s.player.y)+145,e.y+Math.min(76,Math.max(32,(e.radius||18)*1.4))+Math.abs(e.x-(e.qingping?.originX??s.player.x))),side:e.qingping?.side??(e.x>=s.player.x?1:-1)});
   const origin=this.markOrigins.get(e.id)!;
   const dx=origin.side*Math.SQRT1_2,dy=-Math.SQRT1_2;
   const blade=(cx:number,cy:number,len:number,width:number,alpha:number)=>{
    this.paint(g,20,125,110,alpha*.9);g.moveTo(cx-dx*len*.5,cy-dy*len*.5);
    g.lineTo(cx-dy*width,cy+dx*width);g.lineTo(cx+dx*len*.5,cy+dy*len*.5);
    g.lineTo(cx+dy*width*.48,cy-dx*width*.48);g.close();g.fill();
    this.paint(g,110,255,211,alpha);g.moveTo(cx-dx*len*.5,cy-dy*len*.5);
    g.lineTo(cx-dy*width*.42,cy+dx*width*.42);g.lineTo(cx+dx*len*.5,cy+dy*len*.5);
    g.lineTo(cx+dy*width*.18,cy-dx*width*.18);g.close();g.fill();
    this.lineColor(g,235,255,241,alpha,1.5);g.moveTo(cx-dx*len*.36,cy-dy*len*.36);g.lineTo(cx+dx*len*.42,cy+dy*len*.42);g.stroke();
   };
   const reveal=Math.max(0,Math.min(1,(age-.48)/.08)),length=size*(.12+.88*reveal)*(.65+.35*fade);
   if(reveal>0){
    this.lineColor(g,51,220,172,65*fade,10);g.moveTo(x-dx*length*.5,y-dy*length*.5);g.lineTo(x+dx*length*.5,y+dy*length*.5);g.stroke();
    blade(x,y,length,4.5,240*fade);
   }
   // Hold above the caster's head, then accelerate down into the single scar.
   if(age<.62){
    const t=Math.max(0,Math.min(1,(age-.10)/.38)),travel=t*t*t;
    const tipX=origin.x-this.cx+(x-(origin.x-this.cx))*travel;
    const tipY=origin.y-this.cy+(y-(origin.y-this.cy))*travel;
    const alpha=255*Math.min(1,age/.06)*Math.min(1,(.62-age)/.10),len=148;
    const baseX=tipX-dx*len,baseY=tipY-dy*len;
    // Local u follows the blade; v crosses it. Every contour tapers, including the glow.
    const shape=(points:number[][],r:number,gg:number,b:number,a:number)=>{
     this.paint(g,r,gg,b,a);
     for(let i=0;i<points.length;i++){const [u,v]=points[i],px=baseX+dx*u-dy*v,py=baseY+dy*u+dx*v;if(i===0)g.moveTo(px,py);else g.lineTo(px,py)}g.close();g.fill();
    };
    for(let layer=3;layer>=1;layer--){
     const contour:number[][]=[],width=5+layer*3;
     for(let i=0;i<=24;i++){const t=i/24;contour.push([t*len,width*Math.sin(Math.PI*t)**.65])}
     for(let i=24;i>=0;i--){const t=i/24;contour.push([t*len,-width*Math.sin(Math.PI*t)**.65])}
     shape(contour,72,240,190,alpha*.065);
    }
    // Long bevels converge into an uninterrupted needle point.
    shape([[0,-4.8],[15,-5.5],[110,-3.3],[148,0],[110,3.3],[15,5.5],[0,4.8]],48,160,140,alpha);
    shape([[1,0],[15,-4.2],[110,-2.5],[148,0]],143,255,222,alpha);
    shape([[1,0],[148,0],[110,2.5],[15,4.2]],74,214,181,alpha);
    shape([[2,-.65],[125,-.7],[148,0],[125,.7],[2,.65]],242,255,244,alpha);
    // Slim wrapped grip and swept leaf-shaped guard replace blunt line caps.
    shape([[-28,0],[-23,-2.6],[-5,-3],[-1,0],[-5,3],[-23,2.6]],29,98,92,alpha);
    shape([[-26,0],[-22,-1],[-4,-1],[-2,0],[-4,1],[-22,1]],174,231,208,alpha);
    for(let i=0;i<4;i++){const u=-21+i*4;shape([[u,-2.8],[u+1,-2.8],[u+3,2.8],[u+2,2.8]],89,180,150,alpha)}
    shape([[-7,0],[-5,-6],[2,-11],[8,-16],[6,-8],[1,-3],[2,0],[1,3],[6,8],[8,16],[2,11],[-5,6]],57,147,124,alpha);
    shape([[-4,0],[-2,-5],[4,-10],[8,-16],[3,-7],[0,0],[3,7],[8,16],[4,10],[-2,5]],196,244,218,alpha);
    shape([[-34,0],[-29,-4],[-24,0],[-29,4]],57,153,130,alpha);
    shape([[-32,0],[-29,-2],[-26,0],[-29,2]],201,255,229,alpha);

   }

  }
  for(const id of this.markStarts.keys())if(!active.has(id)){this.markStarts.delete(id);this.markOrigins.delete(id)}
 }
 /** Blood-drop debuff under the target HP strip; progress follows actual duration. */
 drawQingpingBadge(g:Graphics,e:any,time:number,x:number,y:number){
  if(!e||e.qingpingDot||e.hp<=0||!(e.woundBudget>0)||!(e.woundUntil>time))return;
  this.lineColor(g,255,146,155,255,2);
  g.arc(x,y,12,Math.PI/2,Math.PI/2+Math.PI*2*Math.min(1,(e.woundUntil-time)/2),false);g.stroke();
  this.paint(g,230,54,79,255);
  g.moveTo(x,y+8);g.lineTo(x-5.5,y-.5);
  for(let i=0;i<=16;i++){const a=Math.PI+i*Math.PI/16;g.lineTo(x+5.5*Math.cos(a),y-.5+5.5*Math.sin(a))}
  g.lineTo(x,y+8);g.close();g.fill();
  this.paint(g,255,185,182,240);g.ellipse(x-2,y-1,1.2,2.4);g.fill();

 }

 resetAftershocks(){this.markStarts.clear();this.markOrigins.clear();this.markState=null;this.markTime=-1;this.gateTracks.clear();this.gateState=null;this.gateTime=-1}
 /** A kill burst lasts 450ms, but never extends its instantaneous damage. */
 private drawGateAftershocks(g:Graphics,s:any){
  if(this.gateState!==s||s.time<this.gateTime){this.gateTracks.clear();this.gateState=s}
  this.gateTime=s.time;
  for(const [id,e] of this.gateTracks)if(s.time-e.at>=.45)this.gateTracks.delete(id);
  for(const e of s.effects||[]){
   if(e.kind!=='gate'||e.hostile||!e.id||this.gateTracks.has(e.id))continue;
   const at=e.startedAt??e.expiresAt-.25;
   if(![e.x,e.y,e.radius,at].every(Number.isFinite)||e.radius<=0||s.time<at||s.time-at>=.45)continue;
   if(this.gateTracks.size<8)this.gateTracks.set(e.id,{x:e.x,y:e.y,r:e.radius,at});
  }
  for(const e of this.gateTracks.values()){
   const age=s.time-e.at,t=age/.45,fade=(1-t)**1.5,x=e.x-this.cx,y=e.y-this.cy;
   // The outer ripple stops at the real radius. Fine arcs break up the disk.
   const front=e.r*(.16+.84*(1-(1-Math.min(1,age/.20))**3));
   this.lineColor(g,112,221,240,115*fade,8*fade+1);
   g.circle(x,y,front);g.stroke();
   this.lineColor(g,233,255,250,240*fade,2.1);
   g.circle(x,y,front);g.stroke();
   this.lineColor(g,178,224,244,170*fade,1.3);
   const inner=e.r*(.08+.72*Math.min(1,age/.28));
   for(let i=0;i<6;i++){const a=i*Math.PI/3+t*.24;g.arc(x,y,inner,a,a+.34,false);g.stroke()}
   // A brief sword-shaped scar at the source, followed by inward fading cracks.
   if(age<.16){
    const k=1-age/.16,top=36+18*(1-k);
    this.lineColor(g,134,233,255,90*k,12*k+1);g.moveTo(x,y+5);g.lineTo(x,y+top);g.stroke();
    this.paint(g,242,255,250,245*k);g.moveTo(x,y+top+12);g.lineTo(x+4*k,y+15);
    g.lineTo(x,y+5);g.lineTo(x-4*k,y+15);g.close();g.fill();
    this.lineColor(g,255,231,176,220*k,2);g.moveTo(x-8,y+13);g.lineTo(x+8,y+13);g.stroke();
   }
   for(let i=0;i<10;i++){
    const a=i*Math.PI/5+.17,dx=Math.cos(a),dy=Math.sin(a),reach=e.r*(.38+.18*(i%3));
    this.lineColor(g,171,231,237,130*fade,1.1);
    g.moveTo(x+dx*8,y+dy*8);g.lineTo(x+dx*reach*.5-dy*4,y+dy*reach*.5+dx*4);
    g.lineTo(x+dx*reach,y+dy*reach);g.stroke();
    const r=Math.min(e.r-5,10+age*e.r*3.5),length=5+7*fade;
    this.lineColor(g,235,252,246,220*fade,1.6);
    g.moveTo(x+dx*r,y+dy*r);g.lineTo(x+dx*Math.max(0,r-length),y+dy*Math.max(0,r-length));g.stroke();
   }
  }
 }
 /** A hit flash belongs to settled damage, never to the anticipated target. */
 drawShadowHits(g:Graphics,s:any,camera:{x:number;y:number}){
  if(!s?.player||s.player.hp<=0)return;
  for(const e of s.effects||[]){
   const hit=shadowHitFeedback(e,s.time);if(!hit)continue;
   const {age,dx,dy,strength,fade}=hit,x=e.x-camera.x,y=e.y-camera.y+SHADOW_LIFT;
   if(!Number.isFinite(x+y))continue;
   const point=(along:number,across:number)=>({x:x+dx*along-dy*across,y:y+dy*along+dx*across});
   const ray=(a:number,b:number,c:number,d:number)=>{
    const start=point(a,b),end=point(c,d);g.moveTo(start.x,start.y);g.lineTo(end.x,end.y);g.stroke();
   };
   // A brief solid core, then separated directional shards. No persistent disk.
   this.lineColor(g,199,222,255,175*fade,10*strength);
   ray(-16*strength,0,23*strength,0);
   this.lineColor(g,247,255,255,255*fade,3);
   ray(-20*strength,0,29*strength,0);
   if(age<.07){
    const core=(1-age/.07)*strength,tip=point(17*core,0);
    g.fillColor=new Color(246,255,255,Math.round(245*(1-age/.07)));
    g.moveTo(tip.x,tip.y);
    for(const [along,across] of [[0,4],[-11,0],[0,-4]]){
     const p=point(along*core,across*core);g.lineTo(p.x,p.y);
    }
    g.close();g.fill();
   }
   const count=strength>1?8:6;
   for(let i=0;i<count;i++){
    const angle=i*Math.PI*2/count+.3,travel=(7+age*105)*strength;
    const cos=Math.cos(angle),sin=Math.sin(angle);
    this.lineColor(g,i%2?217:243,i%2?209:255,255,235*fade,1.7);
    ray(cos*travel,sin*travel*.65,cos*(travel+7*fade),sin*(travel+7*fade)*.65);
   }
  }
 }
 private shadow(g:Graphics,e:any,time:number,zone:boolean,arenaVersion:number){
  const started=e.startedAt??e.expiresAt-.25;
  if(![e.x,e.y,started,e.expiresAt].every(Number.isFinite)||time<started||time>=e.expiresAt)return;
  if(zone){
   if(!Number.isInteger(e.pulseCount)||e.pulseCount<1||e.pulseCount>4)return;
   const phase=Math.max(0,Math.min(1,(time-started)/Math.max(.001,e.nextAt-started)));
   this.lineColor(g,207,201,255,70+phase*80,1.8);
   const x=e.x-this.cx,y=e.y-this.cy;
   g.moveTo(x-8,y-3);g.lineTo(x+11,y+4);g.moveTo(x-6,y+1);g.lineTo(x-3,y-6);g.stroke();
   if(e.pulseIndex!==0||time>=e.nextAt)return;
   for(let i=0;i<e.pulseCount;i++){
    const l=shadowPreviewLine(e,i,arenaVersion);if(!l||l.length<1)continue;
    const length=Math.min(72,l.length),cx=l.x-this.cx,cy=l.y-this.cy+SHADOW_LIFT;
    this.blade(g,cx,cy,cx+l.dx*length,cy+l.dy*length,5,85+phase*105,false);
   }
  }else if([e.toX,e.toY,e.width].every(Number.isFinite)&&e.width>0){
   const fade=Math.pow(Math.max(0,1-(time-started)/.25),1.2);
   this.blade(g,e.x-this.cx,e.y-this.cy+SHADOW_LIFT,e.toX-this.cx,e.toY-this.cy+SHADOW_LIFT,10,255*fade,false);
  }
 }
 /** Only real positive-damage events can produce the short foreground slash. */
 drawWuwoHits(g:Graphics,s:any,camera:{x:number;y:number}){
  if(!s?.player||s.player.hp<=0)return;
  for(const e of s.effects||[]){
   const age=s.time-(e.startedAt??e.expiresAt-.25);
   if(e.kind!=='hit'||e.source!=='evo_wuwo'||!(e.damage>0)||age<0||age>=.18
    ||!Number.isFinite(e.x+e.y))continue;
   const fade=Math.pow(1-age/.18,1.5),x=e.x-camera.x,y=e.y-camera.y+(e.targetRadius||18)*.8;
   const length=12+Math.min(7,e.targetRadius||18)*.6;
   this.lineColor(g,106,218,247,110*fade,5);
   g.moveTo(x-length,y-length*.5);g.lineTo(x+length,y+length*.5);g.stroke();
   this.lineColor(g,230,255,255,250*fade,1.8);
   g.moveTo(x-length,y-length*.5);g.lineTo(x+length,y+length*.5);g.stroke();
  }
 }
 /** Resource failures use the exact same segment frontier as combat, never a
  * small round bullet. Tail opacity follows the saved termination time. */
 drawSwordQi(g:Graphics,e:any,time:number,camera:{x:number;y:number}){
  const near=e?.kind==='cross',kind=near?'cross':e?.bladeKind;
  if(e?.hostile||!['crescent','cross'].includes(kind)
   ||(kind==='crescent'?!['sj_arc','sj_moon','sj_moon_triple'].includes(e.source):e.source!=='sj_cross')
   ||(near?e.shape!=='cross':e.shape!==`${kind}-projectile`))return false;
  const started=e.startedAt,expires=e.expiresAt,width=e.width;
  const dx=e.dirX??e.vx,dy=e.dirY??e.vy,d=Math.hypot(dx,dy);
  if(![e.x,e.y,started,expires,width,dx,dy,d,time].every(Number.isFinite)
   ||width<=0||d<1e-8||time<started||time>=expires)return true;
  const ux=dx/d,uy=dy/d,x=e.x-camera.x,y=e.y-camera.y+swordQiVisualLift(e);
  const ended=Number.isFinite(e.dissolveAt)&&time>=e.dissolveAt;
  const alpha=near?Math.pow(Math.max(0,1-(time-started)/(expires-started)),1.2):
   ended?Math.pow(Math.max(0,1-(time-e.dissolveAt)/Math.max(.001,expires-e.dissolveAt)),1.35):
   Math.min(1,(time-started)/.055);
  const segments=swordQiSegments(kind,width,swordQiPoseIndex(e)),thickness=e.bladeWidth||12;
  for(let layer=0;layer<2;layer++){
   this.lineColor(g,layer?211:72,layer?251:200,255,alpha*(layer?240:65),thickness*(layer?.55:1.7));
   for(const edge of segments){
    g.moveTo(x+edge.a.x*ux-edge.a.y*uy,y+edge.a.x*uy+edge.a.y*ux);
    g.lineTo(x+edge.b.x*ux-edge.b.y*uy,y+edge.b.x*uy+edge.b.y*ux);
   }
   g.stroke();
  }
  return true;
 }
 private paint(g:Graphics,r:number,b:number,c:number,a:number){
  this.fill.r=r;this.fill.g=b;this.fill.b=c;this.fill.a=Math.max(0,Math.min(255,Math.round(a)));g.fillColor=this.fill;
 }
 private lineColor(g:Graphics,r:number,b:number,c:number,a:number,width:number){
  this.stroke.r=r;this.stroke.g=b;this.stroke.b=c;this.stroke.a=Math.max(0,Math.min(255,Math.round(a)));g.strokeColor=this.stroke;g.lineWidth=width;
 }
 private orbit(g:Graphics,s:any,outerSprites=false,waist?:{x:number;y:number}|null){
  const level=s.loadout?.active?.sj_wanjian||0;if(!level)return;
  const evo=s.loadout.evolutions?.includes('evo_wuwo')?(s.loadout.evolutionLevels?.evo_wuwo||1):0;
  if(s.actions?.version===2){
   const active=s.actions.orbit?.castContext?.loadout;
   if(!active||active.active.sj_wanjian!==level||(active.evolutionLevels?.evo_wuwo||0)!==evo)return;
  }
  if(s.player.hp<=0||!evo&&s.loadout.growthVersion===1&&!(s.orbitUntil>s.time+1e-9))return;
  if(level!==this.orbitLevel||evo!==this.orbitEvolution){
   this.orbitLevel=level;this.orbitEvolution=evo;
   this.orbitForm=skillForm(evo?'evo_wuwo':'sj_wanjian',evo||level,level);
  }
  const f=this.orbitForm,x=s.player.x-this.cx,y=s.player.y-this.cy;
  if(evo&&f.innerRadius){
   // Ground coverage stays understated; the waist-centered flow is decorative.
   this.lineColor(g,145,220,228,18,1);g.circle(x,y,f.innerRadius);g.stroke();
  }
  // The evolution's inner coverage remains visible even when sprites replace the outer swords.
  if(outerSprites)return;
  const originX=waist?.x??x,originY=waist?.y??y+57;
  for(let i=0;i<f.swords;i++){
   const p=orbitSwordPose(f,s.time,i);
   this.blade(g,originX+p.baseX,originY+p.baseY,originX+p.tipX,originY+p.tipY,f.bladeWidth,220,false);
  }
 }
 private item(g:Graphics,e:any,time:number,zone:boolean){
  const started=e.startedAt??((e.expiresAt??time+.25)-.25);
  if(!Number.isFinite(e.x+e.y)||time<started||Number.isFinite(e.expiresAt)&&time>=e.expiresAt)return;
  const life=Math.max(.001,(e.expiresAt??started+.25)-started);
  const progress=Math.max(0,Math.min(1,(time-started)/life));
  const alpha=zone?1:Math.pow(1-progress,1.2);
  const x=e.x-this.cx,y=e.y-this.cy;
  if(e.kind==='orbit'||e.kind==='wuwo')return; // Actual blades already convey these hits.
  if(e.kind==='qinglian'){
   // A zone-less windup shows 起阵/成阵; the zone itself shows the burst and fade.
   if(!zone&&e.phase==='windup')drawQinglianWindup(g,x,y,time-e.startedAt,e.expiresAt-e.startedAt);
   else drawQinglianBurst(g,x,y,time,e.startedAt,e.expiresAt-e.startedAt,e.pulseIndex??0);
   return;
  }
  if(e.kind==='sancai'){
   const vertices=sancaiVertices({x,y,radius:e.radius});
   this.lineColor(g,147,230,228,130*alpha,1.5);
   g.moveTo(vertices[0].x,vertices[0].y);
   for(let i=1;i<3;i++)g.lineTo(vertices[i].x,vertices[i].y);
   g.close();g.stroke();return;
  }
  if(e.kind==='formation'||e.source==='evo_sixiang'){
   this.formation(g,e,time,alpha);return;
  }
  if(e.kind==='shadow'&&zone){
   const r=e.radius||30;
   // A fixed sword-print predicts the selected crossing point, not a full
   // damaging disk. The true strike lines arrive through per-pulse effects.
   this.lineColor(g,164,187,240,70,1);
   g.moveTo(x-r*.35,y);g.lineTo(x+r*.35,y);g.moveTo(x,y-r*.35);g.lineTo(x,y+r*.35);g.stroke();
   return;
  }
  // Basic attacks keep their character swing and hit feedback, without a qi crescent.
  if(e.kind==='basic_swing')return;
  if(e.kind==='arc'){
   const dir=Math.atan2(e.dirY??e.faceY??0,e.dirX??e.faceX??1);
   this.crescent(g,x,y,e.radius,dir,(e.angle||90)*Math.PI/180,alpha,e.pulseIndex||1,progress);return;
  }
  if(e.kind==='line'||e.kind==='tiandi'||e.kind==='shadow'||e.kind==='convergence'){
   const reach=e.reach||e.radius*2||80,d=Math.hypot(e.dirX??e.faceX??1,e.dirY??e.faceY??0)||1;
   const tx=Number.isFinite(e.toX)?e.toX-this.cx:x+(e.dirX??e.faceX??1)/d*reach;
   const ty=Number.isFinite(e.toY)?e.toY-this.cy:y+(e.dirY??e.faceY??0)/d*reach;
   const width=e.width||12;
   this.blade(g,x,y,tx,ty,width,245*alpha,e.kind==='tiandi'||!!e.terminal);
   return;
  }
  if(e.kind==='tiandi_windup'){
   const tx=(e.toX??e.x)-this.cx,ty=(e.toY??e.y)-this.cy;
   this.lineColor(g,188,230,245,60+90*progress,1+progress*2);
   g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();
   // Keep the locked starting sword seal visible while the player moves.
   this.lineColor(g,211,236,241,150,2);
   g.moveTo(x-6,y-9);g.lineTo(x,y+9);g.lineTo(x+6,y-9);g.stroke();return;
  }
  if(e.kind==='sword_rain'){
   // Compatibility fallback only. New convergence has physical strike lines.
   this.lineColor(g,174,214,230,55,1);g.moveTo(x-8,y);g.lineTo(x+8,y);g.stroke();return;
  }
  if(e.kind==='hit'){
   if(e.source==='evo_wuwo'||e.source==='shadow')return;
   const r=e.critical?15:6;this.lineColor(g,e.critical?255:195,e.critical?229:234,e.critical?167:244,215*alpha,e.critical?2.3:1.2);
   g.moveTo(x-r,y-r*.7);g.lineTo(x+r,y+r*.7);g.moveTo(x-r*.45,y+r*.7);g.lineTo(x+r*.45,y-r*.7);g.stroke();return;
  }
  if(e.kind==='armor_heal'){
   this.lineColor(g,165,230,177,190*alpha,2);
   g.moveTo(x-5,y+40+progress*12);g.lineTo(x+5,y+40+progress*12);
   g.moveTo(x,y+35+progress*12);g.lineTo(x,y+45+progress*12);g.stroke();return;
  }
  if(e.kind==='gate'){
   const r=e.radius||30;
   this.paint(g,166,194,242,22*alpha);g.circle(x,y,r);g.fill();
   this.lineColor(g,184,202,247,140*alpha,2);g.circle(x,y,r*(.45+.55*progress));g.stroke();
  }
 }
 private crescent(g:Graphics,x:number,y:number,radius:number,dir:number,angle:number,alpha:number,pulse:number,progress:number){
  if(!Number.isFinite(radius)||radius<=0)return;
  radius*=.9+.1*Math.min(1,progress/.22);
  const start=dir-angle/2,steps=32,bands=4,width=radius*(pulse>=3?.16:.1);
  for(let band=0;band<bands;band++){
   this.paint(g,105+band*30,211+band*10,239+band*4,(75+band*45)*alpha);
   for(let i=0;i<=steps;i++){
    const t=i/steps,a=start+angle*t,r=radius-width*Math.sin(Math.PI*t)*(bands-band)/bands;
    if(i===0)g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);else g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
   }
   for(let i=steps;i>=0;i--){
    const t=i/steps,a=start+angle*t,r=radius-width*Math.sin(Math.PI*t)*(bands-band-1)/bands;
    g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
   }
   g.close();g.fill();
  }
  const head=pulse%2?progress:1-progress;
  for(let i=0;i<steps;i++){
   const t=(i+.5)/steps,flow=Math.exp(-Math.pow((t-head)/.2,2)),a=start+angle*i/steps,b=start+angle*(i+1)/steps;
   this.lineColor(g,219,253,255,(105+125*flow)*Math.sin(Math.PI*t)*alpha,1.5);
   g.moveTo(x+Math.cos(a)*radius,y+Math.sin(a)*radius);g.lineTo(x+Math.cos(b)*radius,y+Math.sin(b)*radius);g.stroke();
  }
 }
 private blade(g:Graphics,x:number,y:number,tx:number,ty:number,width:number,alpha:number,heavy:boolean){
  const length=Math.hypot(tx-x,ty-y);if(!(length>0)||!(width>0))return;
  const dx=(tx-x)/length,dy=(ty-y)/length,half=width/2;
  // Low-opacity rectangular envelope matches every point of the hit corridor.
  this.paint(g,107,210,235,alpha*(heavy?.17:.08));
  g.moveTo(x-dy*half,y+dx*half);g.lineTo(tx-dy*half,ty+dx*half);g.lineTo(tx+dy*half,ty-dx*half);g.lineTo(x+dy*half,y-dx*half);g.close();g.fill();
  const taper=Math.min(length*.12,width),side=half*.7;
  this.paint(g,128,226,244,alpha*.58);
  g.moveTo(x,y);g.lineTo(x+dx*taper-dy*side,y+dy*taper+dx*side);
  g.lineTo(tx-dx*taper-dy*side,ty-dy*taper+dx*side);g.lineTo(tx,ty);
  g.lineTo(tx-dx*taper+dy*side,ty-dy*taper-dx*side);
  g.lineTo(x+dx*taper+dy*side,y+dy*taper-dx*side);g.close();g.fill();
  this.lineColor(g,235,255,255,alpha,Math.min(width*.2,heavy?5:2));
  g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();
 }
 private formation(g:Graphics,e:any,time:number,alpha:number){
  const x=e.x-this.cx,y=e.y-this.cy,r=e.radius||80,diamond=e.shape==='diamond'||e.source==='evo_sixiang';
  const eyes=diamond?4:2;
  const pulseAt=Number.isFinite(e.nextAt)&&Number.isFinite(e.interval)?e.nextAt-e.interval:e.startedAt;
  const since=e.pulseIndex>0&&Number.isFinite(pulseAt)?Math.max(0,time-pulseAt):999;
  const flash=Math.max(0,1-since/.18);
  const final=e.pulseIndex===e.pulseCount&&(diamond||e.pulseCount>=7);
  this.paint(g,diamond?128:105,diamond?202:207,218,(8+flash*(final?45:27))*alpha);
  this.region(g,x,y,r,diamond);g.fill();
  this.lineColor(g,diamond?188:147,diamond?229:230,228,(80+flash*130)*alpha,final&&flash>0?3:1.5);
  this.region(g,x,y,r,diamond);g.stroke();
  for(let i=0;i<eyes;i++){
   const er=diamond?r:r*.66;
   // Cardinal values stay exact (no accumulated trig drift at diamond corners).
   // The two-eye layout is vertical so caster/target side-by-side poses do not
   // routinely hide both eyes behind their feet.
   const ex=diamond?x+(i===1?r:i===3?-r:0):x;
   const ey=diamond?y+(i===0?r:i===2?-r:0):y+(i===0?er:-er);
   const active=e.pulseIndex>0&&(final||(e.pulseIndex-1)%eyes===i);
   this.lineColor(g,i%2?125:208,i%2?211:245,235,(active?150+flash*105:75)*alpha,active?2.5:1.5);
   g.circle(ex,ey,6+flash*(active?3:0));g.stroke();
   this.paint(g,i%2?103:220,i%2?206:247,231,(active?180+flash*70:75)*alpha);g.circle(ex,ey,2.5);g.fill();
  }
 }
 private region(g:Graphics,x:number,y:number,r:number,diamond:boolean){
  if(!diamond){g.circle(x,y,r);return}
  g.moveTo(x,y+r);g.lineTo(x+r,y);g.lineTo(x,y-r);g.lineTo(x-r,y);g.close();
 }
}
