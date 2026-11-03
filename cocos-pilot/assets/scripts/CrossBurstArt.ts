import {towerResources as resources} from './TowerResources';
import {Color,Graphics,ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {swordQiVisualLift} from './shared/js/xianxia/TowerSwordQi';

type Arc={node:Node;ui:UITransform;sprite:Sprite};
type Actor={node:Node;light:Graphics;arcs:Arc[]};
/** Frozen self-centered burst; all timing follows simulation time, never wall time. */
export class CrossBurstArt {
 private dead=false;private requested=false;
 private images:ImageAsset[]=[];private textures:Texture2D[]=[];private frames:(SpriteFrame|null)[]=[null,null];
 private actors=new Map<string,Actor>();private drawn=new Set<string>();
 get ready(){return this.frames.every(Boolean)}
 preload(){
  if(this.dead||this.requested)return;this.requested=true;
  ['cross-ice-arc-v1','cross-crimson-arc-v1'].forEach((path,i)=>{
   resources.load('tower-skill-fx/'+path,ImageAsset,(error,image)=>{
    if(this.dead||error||!image)return;
    image.addRef();this.images.push(image);
    const texture=new Texture2D();texture.image=image;texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    const frame=new SpriteFrame();frame.texture=texture;
    this.textures.push(texture);this.frames[i]=frame;
   });
  });
 }
 syncTower(parent:Node,effects:any[],time:number,camera:{x:number;y:number}):ReadonlySet<string>{
  this.drawn.clear();
  if(this.dead||!isValid(parent,true)||!Number.isFinite(time+camera.x+camera.y)){this.clearBindings();return this.drawn}
  this.preload();const live=new Set<string>();
  for(const e of effects){
   if(e?.hostile||e?.source!=='sj_cross'||e.shape!=='cross-burst'||typeof e.id!=='string'
    ||![e.x,e.y,e.radius,e.startedAt,e.expiresAt].every(Number.isFinite)||e.radius<=0
    ||time<e.startedAt||time>=e.expiresAt)continue;
   if(live.size>=8)continue;live.add(e.id);
   let a=this.actors.get(e.id);
   if(a&&(!isValid(a.node,true)||a.node.parent!==parent)){this.remove(e.id);a=undefined}
   if(!a){
    const node=new Node('剑啸八方交错爆发');node.layer=parent.layer;parent.addChild(node);node.addComponent(UITransform);
    const light=node.addComponent(Graphics);a={node,light,arcs:[]};
    for(let i=0;i<6;i++){
     const child=new Node(i<4?'蓝白弧刃':'红色辅光');child.layer=parent.layer;node.addChild(child);
     const ui=child.addComponent(UITransform);ui.setAnchorPoint(.5,.5);
     const sprite=child.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
     a.arcs.push({node:child,ui,sprite});
    }
    this.actors.set(e.id,a);
   }
   a.node.setPosition(e.x-camera.x,e.y-camera.y+swordQiVisualLift(e));
   const age=time-e.startedAt,r=e.radius;
   const dx=e.dirX??e.faceX??1,dy=e.dirY??e.faceY??0;
   a.node.angle=Number.isFinite(dx+dy)&&Math.hypot(dx,dy)>0?Math.atan2(dy,dx)*180/Math.PI:0;
   // Cast identity varies the choreography without wall-clock randomness or pause drift.
   let seed=0;for(let k=0;k<e.id.length;k++)seed=(seed*31+e.id.charCodeAt(k))|0;
   seed=(seed^Math.round(e.startedAt*1000))>>>0;
   this.lights(a.light,r,age,seed);
   a.arcs.forEach((arc,i)=>{
    const pose=this.pose(i,r,age,seed),frame=this.frames[i===1||i===4?1:0];
    arc.node.active=!!frame&&pose.active;if(!arc.node.active)return;
    arc.node.setPosition(pose.x,pose.y);arc.node.angle=pose.angle;
    arc.ui.setContentSize(pose.size*1.35,pose.size*.72);arc.sprite.spriteFrame=frame;
    arc.sprite.color=new Color(255,255,255,Math.round(255*pose.alpha*(i===1||i===4?.42:1)));
   });
   this.drawn.add(e.id);
  }
  for(const id of this.actors.keys())if(!live.has(id))this.remove(id);
  return this.drawn;
 }
 private pose(i:number,r:number,age:number,seed:number){
  const delays=[0,.045,.095,.14,.19,.235],lives=[.58,.61,.60,.60,.59,.58];
  const jitter=((seed>>>(i*4))&15)/15;
  const delay=delays[i]+(i?jitter*.018:0),life=lives[i]-(i===5?.018:0);
  const local=age-delay,t=Math.max(0,Math.min(1,local/life));
  const u=Math.pow(t,[.72,1.12,.84,.67,1.04,.8][i]);
  // Offset the blade heading from its outward travel: neighboring slanted arcs weave
  // through each other while their centers still unfold away from the caster.
  const radial=([340,130,250,100,235,15][i]+(jitter-.5)*8+(u-.5)*6)*Math.PI/180;
  const angle=radial*180/Math.PI+[35,35,35,-35,-30,-40][i]+(u-.5)*10;
  const sector=angle*Math.PI/180;
  const growth=.38+.62*(1-Math.pow(1-t,2));
  const size=2.1*r*(.32+[.02,-.015,.035,0,.01,-.025][i])*growth;
  const distance=18+r*(.12+.15*u);
  const x=Math.cos(radial)*distance,y=Math.sin(radial)*distance;
  const alpha=Math.min(1,Math.max(0,local/.045))*Math.pow(Math.max(0,1-t),.65);
  return {active:local>=0&&local<life,x,y,angle,size,alpha,t,sector};
 }
 private lights(g:Graphics,r:number,age:number,seed:number){
  g.clear();
  for(let i=0;i<6;i++){
   const p=this.pose(i,r,age,seed);if(!p.active)continue;
   // Slanted light strokes share the blade plane and cross neighboring strokes.
   const x0=-p.size*.46,y0=p.size*.16,x1=p.size*.68,y1=p.size*.16;
   const open=Math.min(1,p.t*5),ex=x0+(x1-x0)*open,ey=y0+(y1-y0)*open;
   const dx=ex-x0,dy=ey-y0,len=Math.hypot(dx,dy);if(len<1)continue;
   const nx=-dy/len,ny=dx/len,mx=(x0+ex)*.5,my=(y0+ey)*.5;
   for(const [width,a] of [[7,.06],[3,.2],[.8,.85]]){
    const w=width*r/220;
    g.fillColor=width<1?new Color(228,253,255,Math.round(255*p.alpha*a)):new Color(43,181,255,Math.round(255*p.alpha*a));
    const c=Math.cos(p.sector),s=Math.sin(p.sector);
    const points=[[x0,y0],[mx+nx*w,my+ny*w],[ex,ey],[mx-nx*w,my-ny*w]];
    points.forEach(([x,y],k)=>{const xx=p.x+x*c-y*s,yy=p.y+x*s+y*c;if(k===0)g.moveTo(xx,yy);else g.lineTo(xx,yy)});g.close();g.fill();
   }
  }
 }
 private remove(id:string){const a=this.actors.get(id);if(a&&isValid(a.node,true)){a.node.removeFromParent();a.node.destroy()}this.actors.delete(id)}
 clearBindings(){for(const id of this.actors.keys())this.remove(id);this.drawn.clear()}
 reset(){this.clearBindings()}
 destroy(){this.dead=true;this.reset();for(const f of this.frames)f?.destroy();for(const t of this.textures)t.destroy();for(const i of this.images)i.decRef();this.frames=[null,null];this.images=[];this.textures=[]}
}
