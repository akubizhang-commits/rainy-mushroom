import {towerResources as resources} from './TowerResources';
import {Color,Graphics,ImageAsset,isValid,Node,Rect,Size,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {SHADOW_LIFT,SHADOW_TAIL,shadowPreviewLine} from './shared/js/xianxia/TowerShadow';

type Blade={node:Node;sprite:Sprite;ui:UITransform};
type Actor={node:Node;blades:Blade[];glow:Blade;ink:Graphics;seen:boolean};
type Track={id:string;x:number;y:number;toX:number;toY:number;started:number;width:number;finisher:boolean};
const CAP=12,SPAN=496,SOURCE_WIDTH=544,SOURCE_HEIGHT=128;

/** Approved 分光连斩: observe fixed zones and real releases, never schedule hits.
 * All phases use simulation time, including the tail after a combat event ends. */
export class SwordShadowArt {
 private requested=false;private dead=false;failed=false;
 private image:ImageAsset|null=null;private texture:Texture2D|null=null;
 private frames:SpriteFrame[]=[];
 private actors=new Map<string,Actor>();private tracks=new Map<string,Track>();
 private marks=new Map<string,any>();
 private drawn=new Set<string>();private lastTime=-1;
 private color=new Color(220,244,255,255);
 get ready(){return this.frames.length===3}
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  resources.load('tower-skill-fx/sword-shadow-luminous-v1',ImageAsset,(error,image)=>{
   if(this.dead)return;
   if(error||!image||image.width!==544||image.height!==320){
    this.failed=true;console.warn('Sword shadow atlas unavailable; retaining vector fallback.');return;
   }
   image.addRef();this.image=image;
   try{
    const texture=this.texture=new Texture2D();texture.image=image;
    texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    for(const [y,height] of [[0,128],[128,128],[256,64]]){
     const frame=new SpriteFrame();this.frames.push(frame);frame.texture=texture;
     frame.rect=new Rect(0,y,544,height);frame.originalSize=new Size(544,height);
    }
   }catch(error){
    this.releaseImage();this.failed=true;
    console.warn('Sword shadow texture could not be initialized; retaining vector fallback.');
   }
  });
 }
 syncTower(parent:Node,s:any,camera:{x:number;y:number}):ReadonlySet<string>{
  const time=s?.time;
  if(this.dead||!s?.player||s.player.hp<=0||!Number.isFinite(time)){
   this.reset();return this.drawn;
  }
  this.preload();
  if(time<this.lastTime)this.reset();
  this.lastTime=time;this.drawn.clear();
  for(const a of this.actors.values())a.seen=false;
  for(const [id,t] of this.tracks)if(time<t.started||time>=t.started+SHADOW_TAIL){
   this.tracks.delete(id);this.remove(id);
  }
  for(const [id,z] of this.marks)if(time<z.startedAt||time>=z.expiresAt){
   this.marks.delete(id);this.remove(id);
  }
  for(const e of s.effects||[]){
   if(!e||e.hostile||e.kind!=='shadow'||e.source!=='sj_shadow'||!e.id||this.tracks.has(e.id))continue;
   if(e.shape!==undefined&&e.shape!=='shadow')continue;
   const started=e.startedAt??e.expiresAt-.25,length=Math.hypot(e.toX-e.x,e.toY-e.y);
   if(![e.x,e.y,e.toX,e.toY,e.width,started,length*SOURCE_WIDTH/SPAN].every(Number.isFinite)||
    e.width<=0||length<1e-6||time<started||time>=started+SHADOW_TAIL||this.tracks.size>=CAP)continue;
   this.tracks.set(e.id,{id:e.id,x:e.x,y:e.y,toX:e.toX,toY:e.toY,started,width:e.width,
    finisher:e.pulseCount>1&&e.pulseIndex===e.pulseCount});
  }
  for(const z of s.zones||[]){
   if(!z||z.hostile||z.kind!=='shadow'||z.source!=='sj_shadow'||!z.id||this.marks.has(z.id)||
    ![z.startedAt,z.nextAt,z.expiresAt,z.interval].every(Number.isFinite)||z.interval<=0||
    time<z.startedAt||time>=z.expiresAt||!Number.isInteger(z.pulseCount)||z.pulseCount<1||z.pulseCount>4||
    !Number.isInteger(z.pulseIndex)||z.pulseIndex<0||z.pulseIndex>z.pulseCount||this.marks.size>=CAP)continue;
   const firstAt=z.nextAt-z.pulseIndex*z.interval;
   const expiresAt=firstAt+(z.pulseCount-1)*z.interval+.5;
   if(![firstAt,expiresAt].every(Number.isFinite))continue;
   const lines=Array.from({length:z.pulseCount},(_,i)=>shadowPreviewLine(z,i,s.arenaVersion));
   if(lines.some(l=>!l))continue;
   // Preserve the ground print through the final fading slash, including when
   // the shorter-lived combat zone has already been removed.
   this.marks.set(z.id,{...z,nextAt:firstAt,expiresAt,lines});
  }
  if(this.ready&&isValid(parent,true)&&[camera.x,camera.y].every(Number.isFinite)){
   for(const [id,t] of this.tracks){
    if(![t.x-camera.x,t.y+SHADOW_LIFT-camera.y].every(Number.isFinite))continue;
    const actor=this.actor(parent,id);
    if(actor){this.stroke(actor,t,time,camera);this.drawn.add(id)}
   }
   for(const z of this.marks.values()){
    if(![z.x-camera.x,z.y+SHADOW_LIFT-camera.y].every(Number.isFinite))continue;
    const actor=this.actor(parent,z.id);
    if(actor){this.anticipate(actor,z,z.lines,time,camera);this.drawn.add(z.id)}
   }
  }
  for(const [id,a] of this.actors)if(!a.seen)this.remove(id);
  return this.drawn;
 }
 private actor(parent:Node,id:string){
  let a=this.actors.get(id);
  if(a&&(!isValid(a.node,true)||a.node.parent!==parent)){this.remove(id);a=undefined}
  if(!a){
   if(this.actors.size>=CAP)return null;
   const node=new Node(`分光连斩-${id}`);node.layer=parent.layer;parent.addChild(node);
   const ink=node.addComponent(Graphics),glow=this.blade(node,'剑痕柔光');
   const blades=Array.from({length:4},(_,i)=>this.blade(node,`剑影-${i}`));
   a={node,ink,glow,blades,seen:true};this.actors.set(id,a);
  }
  a.seen=true;a.ink.clear();a.glow.node.active=false;
  for(const b of a.blades)b.node.active=false;
  return a;
 }
 private blade(parent:Node,name:string):Blade{
  const node=new Node(name);node.layer=parent.layer;parent.addChild(node);
  const ui=node.addComponent(UITransform);ui.setAnchorPoint(.5,.5);
  const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
  return {node,ui,sprite};
 }
 private sword(b:Blade,x:number,y:number,angle:number,length:number,opacity:number,ghost:boolean){
  b.node.active=opacity>0;
  if(!b.node.active)return;
  b.node.setPosition(x,y);b.node.angle=angle*180/Math.PI;
  b.ui.setContentSize(length*SOURCE_WIDTH/SPAN,length*SOURCE_HEIGHT/SPAN);
  b.sprite.spriteFrame=this.frames[ghost?1:0];
  b.sprite.color=new Color(255,255,255,Math.round(255*Math.min(1,opacity)));
 }
 private line(g:Graphics,x:number,y:number,tx:number,ty:number,opacity:number,width:number,purple=false){
  this.color.r=purple?207:243;this.color.g=purple?201:255;this.color.b=255;
  this.color.a=Math.round(255*Math.max(0,Math.min(1,opacity)));
  g.strokeColor=this.color;g.lineWidth=width;g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();
 }
 private anticipate(a:Actor,z:any,lines:any[],time:number,camera:{x:number;y:number}){
  a.node.setPosition(z.x-camera.x,z.y-camera.y+SHADOW_LIFT);a.node.angle=0;
  const phase=Math.max(0,Math.min(1,(time-z.startedAt)/Math.max(.001,z.nextAt-z.startedAt)));
  const opacity=.24+.52*phase*phase*(3-2*phase);
  if(time<z.nextAt)lines.forEach((l,i)=>{
   if(l.length<1)return;
   const length=Math.min(72,l.length),distance=Math.min(l.length-length/2,Math.max(length/2,39.3));
   this.sword(a.blades[i],l.x-z.x+l.dx*distance,l.y-z.y+l.dy*distance,l.angle,length,opacity,true);
  });
  // One small sword-shaped ground print marks the fixed target, without a disk.
  const markAlpha=(.26+.34*phase)*Math.min(1,Math.max(0,(z.expiresAt-time)/.5));
  this.line(a.ink,-8,-SHADOW_LIFT-3,11,-SHADOW_LIFT+4,markAlpha,1.4,true);
  this.line(a.ink,-6,-SHADOW_LIFT+1,-3,-SHADOW_LIFT-6,markAlpha,1.2,true);
 }
 private stroke(a:Actor,t:Track,time:number,camera:{x:number;y:number}){
  const age=time-t.started,length=Math.hypot(t.toX-t.x,t.toY-t.y);
  const fade=Math.pow(Math.max(0,1-age/SHADOW_TAIL),1.2);
  a.node.setPosition(t.x-camera.x,t.y-camera.y+SHADOW_LIFT);
  a.node.angle=Math.atan2(t.toY-t.y,t.toX-t.x)*180/Math.PI;
  a.glow.node.active=true;a.glow.node.setPosition(length/2,0);a.glow.node.angle=0;
  const peak=Math.pow(Math.max(0,1-age/.09),2),weight=t.finisher?1.4:1;
  a.glow.ui.setContentSize(length*544/496,88+24*peak*weight);a.glow.sprite.spriteFrame=this.frames[2];
  a.glow.sprite.color=new Color(255,255,255,Math.round(255*fade));
  this.line(a.ink,0,0,length,0,.24*fade,8+7*peak*weight,true);
  this.line(a.ink,0,0,length,0,.82*fade+peak*.18,1.8+3.2*peak*weight);
  const swordLength=Math.min(72,length);
  for(let i=0;i<3;i++){
   const local=age-[0,.016,.032][i],opacity=local<0?0:Math.max(0,Math.min(1,(.13-local)/.055))*[1,.48,.28][i];
   const progress=Math.max(0,Math.min(1,local/.075));
   const distance=swordLength/2+(1-Math.pow(1-progress,3))*(length-swordLength);
   this.sword(a.blades[i],distance,0,0,swordLength,opacity,i>0);
  }
  for(let i=0;i<8;i++){
   const x=length*(.12+i*.105),drift=Math.sin(i*2.3)*(3+age*25);
   this.line(a.ink,x,drift,x+3+age*9,drift+(i%2?1:-1)*2,.68*fade,1.2,true);
  }
 }
 clearBindings(){for(const id of this.actors.keys())this.remove(id)}
 reset(){this.clearBindings();this.tracks.clear();this.marks.clear();this.drawn.clear();this.lastTime=-1}
 destroy(){this.dead=true;this.reset();this.releaseImage()}
 private releaseImage(){
  for(const frame of this.frames)frame.destroy();this.frames=[];
  this.texture?.destroy();this.image?.decRef();this.texture=null;this.image=null;
 }
 private remove(id:string){
  const a=this.actors.get(id);
  if(a&&isValid(a.node,true)){a.node.removeFromParent();a.node.destroy()}
  this.actors.delete(id);
 }
}
