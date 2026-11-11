import {towerResources as resources} from './TowerResources';
import {Color,Graphics,ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UITransform,UIOpacity} from 'cc';
import {jinghongSwordOffset,JINGHONG_HOLD,JINGHONG_LEAD,JINGHONG_SCAR,JINGHONG_SPAWN_DISTANCE,JINGHONG_EXIT_RATIO} from './shared/js/xianxia/TowerJinghong';

// 2026-11-09：重剑剑体复用断流剑手持图（design/xianxia-jinghong-sword-2026-11-09），剑尖朝 +X。
const ART={path:'tower-skill-fx/jinghong-sword-v1',width:691,height:154};
const SWORD_LENGTH=176,POOL=6;
const GLOW=[109,224,248],CORE=[237,255,255];
type Actor={node:Node;ui:UITransform;sprite:Sprite;opacity:UIOpacity};
const lift=(r:number)=>Math.max(20,Math.min(88,(r||18)*1.25));
const easeOutBack=(t:number)=>{const c=1.7;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};

/** 惊鸿剑：重剑在目标四周随机方位显形并停顿，随后穿身而过、立即消失，只留一道锐利剑痕。
 * 时序与方位全部来自共享的 TowerJinghong（战斗在穿过身体中心的瞬间结算伤害）。
 * 只读战斗状态：显形与停顿取自未来脉冲时刻，剑痕取自已结算的命中效果。 */
export class JinghongSwordArt {
 private dead=false;private requested=false;
 private image:ImageAsset|null=null;private texture:Texture2D|null=null;private frame:SpriteFrame|null=null;
 private parent:Node|null=null;private actors:Actor[]=[];private scars:Graphics|null=null;private scarNode:Node|null=null;
 private glow=new Color();private fill=new Color();
 preload(){
  if(this.dead||this.requested)return;this.requested=true;
  resources.load(ART.path,ImageAsset,(error,image)=>{
   if(this.dead||error||!image||image.width!==ART.width||image.height!==ART.height)return;
   image.addRef();
   try{
    const texture=new Texture2D();texture.image=image;texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    const frame=new SpriteFrame();frame.texture=texture;
    this.image=image;this.texture=texture;this.frame=frame;
    for(const a of this.actors)a.sprite.spriteFrame=frame;
   }catch{image.decRef()}
  });
 }
 sync(parent:Node,s:any,camera:{x:number;y:number}){
  if(this.dead||!isValid(parent,true)||!s?.player||!Number.isFinite(s.time)){this.hide();return}
  this.preload();
  if(this.parent!==parent||!this.scarNode||!isValid(this.scarNode,true))this.bind(parent);
  const g=this.scars!;g.clear();
  if(s.player.hp<=0){this.hide();return}
  const time=s.time,enemies=new Map<any,any>((s.enemies||[]).map((e:any)=>[e.id,e]));
  let used=0;
  // 1) Upcoming thrusts of live zones: appear, hold, then dash in.
  for(const z of s.zones||[]){
   if(z.kind!=='jinghong'||z.hostile||!Number.isFinite(z.nextAt))continue;
   const target=enemies.get(z.targetId),tx=target&&target.hp>0?target.x:z.x,ty=target&&target.hp>0?target.y:z.y;
   const r=target?.radius??18;
   for(let k=z.pulseIndex+1;k<=z.hits&&used<POOL;k++){
    const hitAt=z.nextAt+(k-z.pulseIndex-1)*z.interval,t=time-hitAt;
    if(t<-JINGHONG_LEAD)break;
    const o=jinghongSwordOffset(z.id,k,t,z.dirX,z.dirY);if(!o)continue;
    this.place(this.actors[used++],tx-camera.x+o.x,ty-camera.y+lift(r)+o.y,o,g);
   }
  }
  // 2) Settled thrusts: the sword exits and vanishes; the scar stays where it cut.
  for(const e of s.effects||[]){
   if(e.kind!=='jinghong'||e.hostile||!Number.isFinite(e.startedAt))continue;
   const t=time-e.startedAt;if(t<0||t>=JINGHONG_SCAR)continue;
   const x=e.x-camera.x,y=e.y-camera.y+lift(e.radius);
   if(used<POOL){const o=jinghongSwordOffset(e.castId,e.pulseIndex,t,e.lockX,e.lockY);if(o)this.place(this.actors[used++],x+o.x,y+o.y,o,g)}
   this.scar(g,x,y,e.dirX,e.dirY,t);
  }
  for(let i=used;i<this.actors.length;i++)this.actors[i].node.active=false;
 }
 private place(a:Actor,x:number,y:number,o:any,g:Graphics){
  a.node.active=!!this.frame;
  const angle=Math.atan2(o.dirY,o.dirX);
  let alpha=1,scale=1;
  if(o.phase==='hold'){
   // Pop in with a slight overshoot, then hold still so the player can read it.
   const k=Math.min(1,o.age/.12);alpha=Math.min(1,o.age/.06);scale=.8+.2*easeOutBack(k);
   // Faint aim line toward the body during the hold.
   const reach=JINGHONG_SPAWN_DISTANCE*.85,fade=Math.min(1,o.age/.1)*(o.age<JINGHONG_HOLD?.55:0);
   this.line(g,x,y,x+o.dirX*reach,y+o.dirY*reach,GLOW,60*fade,2);
   // Spawn flash.
   if(o.age<.1){this.fill.set(CORE[0],CORE[1],CORE[2],Math.round(170*(1-o.age/.1)));g.fillColor=this.fill;g.circle(x,y,12+o.age*120);g.fill()}
  }else{
   // Short speed streak behind the sword during the dash.
   this.line(g,x,y,x-o.dirX*90,y-o.dirY*90,GLOW,110,7);this.line(g,x,y,x-o.dirX*90,y-o.dirY*90,CORE,200,2);
  }
  // Cyan rim under the steel sprite ties the sword to its scar.
  const hx=o.dirX*SWORD_LENGTH*.46*scale,hy=o.dirY*SWORD_LENGTH*.46*scale;
  this.line(g,x-hx,y-hy,x+hx,y+hy,GLOW,70*alpha,14*scale);this.line(g,x-hx,y-hy,x+hx,y+hy,GLOW,120*alpha,6*scale);
  a.opacity.opacity=Math.round(255*alpha);
  a.node.setPosition(x,y);a.node.angle=angle*180/Math.PI;
  a.ui.setContentSize(SWORD_LENGTH*scale,SWORD_LENGTH*ART.height/ART.width*scale);
  // Sword glow halo under the sprite (drawn in the same layer, below the actors).
  if(!a.node.active){this.line(g,x-o.dirX*SWORD_LENGTH/2,y-o.dirY*SWORD_LENGTH/2,x+o.dirX*SWORD_LENGTH/2,y+o.dirY*SWORD_LENGTH/2,CORE,230*alpha,6)}
 }
 /** Sharp tapered scar along the full path, brightest at the body; holds briefly then fades. */
 private scar(g:Graphics,x:number,y:number,dx:number,dy:number,t:number){
  const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  const R=JINGHONG_SPAWN_DISTANCE,entry=R*.95,exit=R*JINGHONG_EXIT_RATIO*1.1;
  const grow=Math.min(1,t/.05),fade=t<.15?1:Math.max(0,1-(t-.15)/(JINGHONG_SCAR-.15));
  if(fade<=0)return;
  const sx=x-dx*entry,sy=y-dy*entry,ex=x+dx*exit*grow,ey=y+dy*exit*grow,nx=-dy,ny=dx;
  const blade=(w:number,c:number[],a:number)=>{
   this.fill.set(c[0],c[1],c[2],Math.round(a*fade));g.fillColor=this.fill;
   g.moveTo(sx,sy);g.lineTo(x+nx*w,y+ny*w);g.lineTo(ex,ey);g.lineTo(x-nx*w,y-ny*w);g.close();g.fill();
  };
  const thin=.75+.25*fade;
  blade(11*thin,GLOW,55);blade(5*thin,GLOW,170);blade(2*thin,CORE,255);
 }
 private line(g:Graphics,x1:number,y1:number,x2:number,y2:number,c:number[],a:number,w:number){
  if(a<=0)return;this.glow.set(c[0],c[1],c[2],Math.round(Math.min(255,a)));g.strokeColor=this.glow;g.lineWidth=w;
  g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
 }
 private bind(parent:Node){
  this.clearBindings();this.parent=parent;
  const scarNode=this.scarNode=new Node('惊鸿剑痕');scarNode.layer=parent.layer;parent.addChild(scarNode);
  scarNode.addComponent(UITransform);this.scars=scarNode.addComponent(Graphics);
  for(let i=0;i<POOL;i++){
   const node=new Node(`惊鸿重剑-${i}`);node.layer=parent.layer;parent.addChild(node);
   const ui=node.addComponent(UITransform);ui.setAnchorPoint(.5,.5);
   const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
   const opacity=node.addComponent(UIOpacity);node.active=false;
   this.actors.push({node,ui,sprite,opacity});
  }
 }
 private hide(){for(const a of this.actors)a.node.active=false;this.scars?.clear()}
 clearBindings(){
  for(const a of this.actors)if(isValid(a.node,true)){a.node.removeFromParent();a.node.destroy()}
  this.actors=[];
  if(this.scarNode&&isValid(this.scarNode,true)){this.scarNode.removeFromParent();this.scarNode.destroy()}
  this.scarNode=null;this.scars=null;this.parent=null;
 }
 reset(){this.hide()}
 destroy(){
  this.dead=true;this.clearBindings();
  this.frame?.destroy();this.texture?.destroy();this.image?.decRef();this.frame=null;this.texture=null;this.image=null;
 }
}
