import {towerResources as resources} from './TowerResources';
import {Color,Graphics,ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UIOpacity,UITransform} from 'cc';
import {yujianHoverPose,yujianHeading,yujianVisualPose,YUJIAN_LENGTH} from './shared/js/xianxia/TowerYujian';

type Actor={node:Node;body:Sprite;fallback:Graphics;opacity:UIOpacity;size:UITransform;seen:boolean};
type Art={requested:boolean;image:ImageAsset|null;texture:Texture2D|null;frame:SpriteFrame|null};
const freshArt=():Art=>({requested:false,image:null,texture:null,frame:null});
const TAIL=.25,POOL_LIMIT=64;
/** Approved v3 swords. All animation uses simulation time; rendering never changes combat state. */
export class TowerProjectileArt {
 private dead=false;private modern=freshArt();private legacy=freshArt();private featherArt=freshArt();private sonicArt=freshArt();private poisonArt=freshArt();
 private actors=new Map<string,Actor>();private pool:Actor[]=[];
 private enabled=false;private heading:any=null;private lastTime=-1;
 beginFrame(){for(const actor of this.actors.values())actor.seen=false;}
 syncHover(parent:Node,s:any,camera:{x:number;y:number},visibleFace?:number){
  const level=Math.max(0,Math.min(10,Math.floor(s.loadout?.active?.sj_yujian||0)));
  this.enabled=!this.dead&&s.loadout?.growthVersion===1&&level>0&&s.player.hp>0&&!['lost','abandoned','won'].includes(s.phase);
  if(!this.enabled){this.heading=null;return;}
  const time=s.time,face=(visibleFace??s.player.faceX)<0?-1:1;
  if(!this.heading||time<this.lastTime)this.heading={...(s.yujian||{face,from:face<0?Math.PI:0,to:face<0?Math.PI:0,at:time})};
  if(face!==this.heading.face){
   const current=yujianHeading(this.heading,time),desired=face<0?Math.PI:0;
   this.heading={face,from:current,to:current+Math.atan2(Math.sin(desired-current),Math.cos(desired-current)),at:time};
  }
  this.lastTime=time;
  const center=s.yujian||s.player,angle=yujianHeading(this.heading,time);
  const gathering=(s.zones||[]).some((z:any)=>z.kind==='sword_rain'&&z.formId==='evo_wanjian'&&z.ticks>0);
  const tail=(s.effects||[]).some((e:any)=>e.kind==='convergence'&&e.terminal&&time<(e.startedAt??e.expiresAt-.25)+.25);
  const hoverAlpha=gathering||tail ? .06 : 1;
  for(let i=0;i<Math.min(level,s.yujian?.ready||0);i++){
   const slot=((s.yujian?.head||0)+i)%10;
   const p=yujianHoverPose(slot,time,center);
   this.sword(parent,`hover-${slot}`,p.x-camera.x,p.y-camera.y,angle,hoverAlpha,false);
  }
 }
 draw(parent:Node,shot:any,x:number,y:number,time=0,camera={x:0,y:0},g?:Graphics){
  if(!this.dead&&shot.hostile&&(shot.element==='feather'||shot.element==='sonic'||shot.element==='poison')&&isValid(parent,true)&&Number.isFinite(x+y+shot.vx+shot.vy))return this.monsterProjectile(parent,shot,x,y);
  if(this.dead||shot.hostile||shot.source!=='sj_yujian'||!isValid(parent,true)||!Number.isFinite(x+y+shot.vx+shot.vy))return false;
  if(!Number.isInteger(shot.yujianSlot)){
   this.sword(parent,`legacy-${shot.id}`,x,y,Math.atan2(shot.vy,shot.vx),1,true);return true;
  }
  if(!this.enabled)return true;
  const dissolved=Number.isFinite(shot.dissolveAt),end=dissolved?shot.dissolveAt:time;
  const fade=dissolved?Math.max(0,1-(time-end)/TAIL):1;
  if(fade<=0)return true;
  const history=(shot.trail||[]).filter((p:any)=>p.at>=end-TAIL&&p.at<=end);
  if(g&&history.length>1){
   // Layer a broad cyan wake, its bright edge, and a narrow white core.
   for(const [width,alpha] of [[9,35],[4,105],[1.2,210]])for(let i=1;i<history.length;i++){
    const a=history[i-1],b=history[i],strength=Math.max(0,1-(end-b.at)/TAIL)*fade;
    g.strokeColor=width<2?new Color(237,255,255,Math.round(alpha*strength)):new Color(109,224,248,Math.round(alpha*strength));
    g.lineWidth=width;g.moveTo(a.x-camera.x,a.y-camera.y);g.lineTo(b.x-camera.x,b.y-camera.y);g.stroke();
   }
  }
  for(let i=4;i>=1;i--){
   const target=end-i*.06;
   if(!history.length||target<history[0].at)continue;
   let p=history[0];for(const entry of history)if(Math.abs(entry.at-target)<Math.abs(p.at-target))p=entry;
   this.sword(parent,`ghost-${shot.id}-${i}`,p.x-camera.x,p.y-camera.y,p.angle,(.52-i*.08)*fade,false);
  }
  if(!dissolved){const p=yujianVisualPose(shot,time);this.sword(parent,`shot-${shot.id}`,p.x-camera.x,p.y-camera.y,p.angle,1,false);}
  return true;
 }
 private monsterProjectile(parent:Node,shot:any,x:number,y:number){
  const sonic=shot.element==='sonic',poison=shot.element==='poison',kind=sonic?'sonic':poison?'poison':'feather',label=sonic?'音波':poison?'毒液':'飞羽';
  const art=sonic?this.sonicArt:poison?this.poisonArt:this.featherArt;this.load(art,false,`tower-monsters-motion/${kind}`);
  if(!art.frame)return false; // Keep the existing projectile fallback while loading.
  const id=`${kind}-${shot.id}`;let actor=this.actors.get(id);
  if(actor&&(!isValid(actor.node,true)||actor.node.parent!==parent)){this.remove(id);actor=undefined;}
  if(!actor){
   actor=this.pool.pop();
   if(!actor){
    const node=new Node(label);node.layer=parent.layer;
    const size=node.addComponent(UITransform),body=node.addComponent(Sprite),opacity=node.addComponent(UIOpacity);
    const fallbackNode=new Node(`${label}回退`);fallbackNode.layer=parent.layer;node.addChild(fallbackNode);
    const fallback=fallbackNode.addComponent(Graphics);body.sizeMode=Sprite.SizeMode.CUSTOM;body.trim=false;
    actor={node,size,body,opacity,fallback,seen:true};
   }
   parent.addChild(actor.node);this.actors.set(id,actor);
  }
  actor.node.name=`${label}-${shot.id}`;actor.node.layer=parent.layer;actor.node.active=true;actor.seen=true;
  actor.node.setPosition(x,y);actor.node.angle=Math.atan2(shot.vy,shot.vx)*180/Math.PI;
  actor.opacity.opacity=255;actor.size.setContentSize(sonic?52:48,sonic?52:poison?24:15);
  actor.body.spriteFrame=art.frame;actor.body.enabled=true;actor.fallback.enabled=false;
  return true;
 }
 private load(art:Art,legacy:boolean,path?:string){
  if(art.requested)return;art.requested=true;
  try{resources.load(path||(legacy?'tower-skill-fx/yujian':'tower-skill-fx/orbit-sword-v1'),ImageAsset,(error,image)=>{
   if(this.dead||error||!image)return;
   try{image.addRef();art.image=image;art.texture=new Texture2D();art.texture.image=image;
    art.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    art.frame=new SpriteFrame();art.frame.texture=art.texture;
   }catch{art.frame?.destroy();art.texture?.destroy();art.image?.decRef();art.frame=null;art.texture=null;art.image=null;}
  });}catch{/* The shaped fallback remains visible when resource loading is unavailable. */}
 }
 private sword(parent:Node,id:string,x:number,y:number,angle:number,alpha:number,legacy:boolean){
  if(!isValid(parent,true)||![x,y,angle,alpha].every(Number.isFinite))return;
  const art=legacy?this.legacy:this.modern;this.load(art,legacy);
  let actor=this.actors.get(id);
  if(actor&&(!isValid(actor.node,true)||actor.node.parent!==parent)){this.remove(id);actor=undefined;}
  if(!actor){
   actor=this.pool.pop();
   if(!actor){const node=new Node('御剑术');node.layer=parent.layer;
    const size=node.addComponent(UITransform),body=node.addComponent(Sprite),opacity=node.addComponent(UIOpacity);
    const fallbackNode=new Node('剑体资源回退');fallbackNode.layer=parent.layer;node.addChild(fallbackNode);fallbackNode.addComponent(UITransform);
    const fallback=fallbackNode.addComponent(Graphics);
    body.sizeMode=Sprite.SizeMode.CUSTOM;body.trim=false;actor={node,size,body,fallback,opacity,seen:true};}
   parent.addChild(actor.node);actor.node.layer=parent.layer;this.actors.set(id,actor);
  }
  actor.node.name=`御剑术-${id}`;actor.node.active=true;actor.seen=true;actor.node.setPosition(x,y);actor.node.angle=angle*180/Math.PI;
  actor.opacity.opacity=Math.round(255*alpha);actor.size.setContentSize(legacy?80:YUJIAN_LENGTH*544/496,legacy?24:YUJIAN_LENGTH*128/496);
  actor.body.spriteFrame=art.frame;actor.body.enabled=!!art.frame;actor.fallback.enabled=!art.frame;
  if(!art.frame)this.fallback(actor.fallback,legacy?73:YUJIAN_LENGTH);
 }
 private fallback(g:Graphics,length:number){
  g.clear();const l=length/2;
  g.fillColor=new Color(150,230,243,240);g.moveTo(-l*.58,-2);g.lineTo(l*.72,-1.5);g.lineTo(l,0);g.lineTo(l*.72,1.5);g.lineTo(-l*.58,2);g.close();g.fill();
  g.strokeColor=new Color(247,255,255,255);g.lineWidth=.8;g.moveTo(-l*.58,0);g.lineTo(l,0);g.stroke();
  g.strokeColor=new Color(159,221,225,255);g.lineWidth=2;g.moveTo(-l*.62,-4);g.lineTo(-l*.62,4);g.stroke();
  g.strokeColor=new Color(101,173,186,255);g.lineWidth=2.2;g.moveTo(-l,0);g.lineTo(-l*.63,0);g.stroke();
 }
 endFrame(){for(const [id,actor] of this.actors)if(!actor.seen)this.remove(id);}
 clearBindings(){for(const id of this.actors.keys())this.remove(id);for(const actor of this.pool)actor.node.destroy();this.pool=[];this.heading=null;this.lastTime=-1;this.enabled=false;}
 destroy(){this.dead=true;this.clearBindings();for(const art of [this.modern,this.legacy,this.featherArt,this.sonicArt,this.poisonArt]){art.frame?.destroy();art.texture?.destroy();art.image?.decRef();art.frame=null;art.texture=null;art.image=null;}}
 private remove(id:string){const actor=this.actors.get(id);if(actor&&isValid(actor.node,true)){actor.node.active=false;actor.body.spriteFrame=null;actor.node.removeFromParent();if(this.pool.length<POOL_LIMIT)this.pool.push(actor);else actor.node.destroy();}this.actors.delete(id);}
}
