import {towerResources as resources} from './TowerResources';
import {Color,Graphics,ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';

type Sword={node:Node;sprite:Sprite;ui:UITransform;impact:Graphics};
type Rift={node:Node;sprite:Sprite;ui:UITransform};
type Actor={node:Node;rift:Rift;seen:boolean;sword?:Sword};
type Track={id:string;x:number;y:number;toX:number;toY:number;width:number;started:number;
 sword:boolean;lift:number;visualLength:number;hits:{along:number;across:number}[]};
const CAP=8,SOURCE_DURATION=.25;
const SWORD_WIDTH=1376,SWORD_HEIGHT=320,SWORD_SPAN=1252;
const FLIGHT_DURATION=.62,SWORD_DURATION=.72;
const RIFT_OPEN_AT=.5,RIFT_OPEN_FOR=.28,RIFT_CLOSE_AT=1.3,RIFT_CLOSE_FOR=.42;
const DURATION=1.82;
const ANTICIPATION=.025,IMPACT_DURATION=.12;

/** Approved 剑破虚空 art. Each real hit owns one frozen line and one visual tail.
 * Absolute simulation time preserves pause/resume without extending damage.
 */
export class SwordLineArt {
 private requested=false;private dead=false;
 private swordImage:ImageAsset|null=null;private swordTexture:Texture2D|null=null;
 private swordFrame:SpriteFrame|null=null;
 private riftImage:ImageAsset|null=null;private riftTexture:Texture2D|null=null;
 private riftFrame:SpriteFrame|null=null;
 private actors=new Map<string,Actor>();private tracks=new Map<string,Track>();
 private drawn=new Set<string>();
 private lastTime=-1;
 get ready(){return !!this.swordFrame}
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  resources.load('tower-skill-fx/line-sunlight-sword-blue-v3',ImageAsset,(error,image)=>{
   if(this.dead)return;
   if(error||!image||image.width!==SWORD_WIDTH||image.height!==SWORD_HEIGHT){
    console.warn('Giant sword unavailable; retaining the spatial rift.');return;
   }
   image.addRef();this.swordImage=image;
   const texture=this.swordTexture=new Texture2D();texture.image=image;
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   const frame=this.swordFrame=new SpriteFrame();frame.texture=texture;
  });
  resources.load('tower-skill-fx/line-rift-reference-v1',ImageAsset,(error,image)=>{
   if(this.dead)return;
   if(error||!image||image.width!==816||image.height!==344){
    console.warn('Reference rift unavailable; retaining the flying sword.');return;
   }
   image.addRef();this.riftImage=image;
   const texture=this.riftTexture=new Texture2D();texture.image=image;
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   const frame=this.riftFrame=new SpriteFrame();frame.texture=texture;
  });
 }
 /** Only IDs actually drawn suppress the procedural fallback. Cached tracks
  * outlive combat so the traced line can open and close after the sword exits. */
 syncTower(parent:Node,effects:any[],time:number,camera:{x:number;y:number},chestHeight=70,
  viewport={width:1280,height:720}):ReadonlySet<string>{
  if(this.dead||!Number.isFinite(time)){this.reset();return this.drawn}
  this.preload();
  if(time<this.lastTime)this.reset();
  this.lastTime=time;
  // Expired actors release capacity before this tick's new impacts arrive.
  for(const [id,track] of this.tracks)if(time<track.started||time>=track.started+DURATION){
   this.tracks.delete(id);this.remove(id);
  }
  for(const e of effects){
   if(!e||e.hostile||e.kind!=='line'||e.source!=='sj_line'||!e.id||this.tracks.has(e.id))continue;
   if(e.shape!==undefined&&e.shape!=='line')continue;
   const started=e.startedAt??e.expiresAt-SOURCE_DURATION;
   const length=Math.hypot(e.toX-e.x,e.toY-e.y);
   if(![e.x,e.y,e.toX,e.toY,e.width,started,length].every(Number.isFinite)||
    e.width<=0||length<1e-6||time<started||time>=started+DURATION)continue;
   if(this.tracks.size>=CAP)continue;
   const sword=e.pulseIndex===undefined||e.pulseIndex===1;
   const dx=(e.toX-e.x)/length,dy=(e.toY-e.y)/length;
   const lift=Number.isFinite(chestHeight)?chestHeight:70;
   // Extend only presentation: the settled combat endpoint and hit receipts stay intact.
   // Include the entire blade plus overscan beyond the viewport, in chest space.
   const halfW=Number.isFinite(viewport.width)&&viewport.width>0?viewport.width/2:640;
   const halfH=Number.isFinite(viewport.height)&&viewport.height>0?viewport.height/2:360;
   const cx=Number.isFinite(camera.x)?camera.x:e.x,cy=Number.isFinite(camera.y)?camera.y:e.y;
   const exitX=Math.abs(dx)>1e-6?(cx+Math.sign(dx)*(halfW+96)-e.x)/dx:Infinity;
   const exitY=Math.abs(dy)>1e-6?(cy+Math.sign(dy)*(halfH+96)-e.y-lift)/dy:Infinity;
   const visualLength=Math.max(length,Math.max(0,Math.min(exitX,exitY))+260);
   // Combat's settled positive hit receipts, not geometric guesses or later pulses.
   const hits=sword?effects.filter(h=>h?.kind==='hit'&&h.source==='sj_line'&&!h.hostile&&!h.impact&&
    Number.isFinite(h.damage)&&h.damage>0&&[h.x,h.y].every(Number.isFinite)&&
    Math.abs((h.startedAt??h.expiresAt-SOURCE_DURATION)-started)<1e-6)
    .map(h=>({along:(h.x-e.x)*dx+(h.y-e.y)*dy,across:-(h.x-e.x)*dy+(h.y-e.y)*dx})):[];
   this.tracks.set(e.id,{id:e.id,x:e.x,y:e.y,toX:e.toX,toY:e.toY,width:e.width,started,
    sword,lift,visualLength,hits});
  }
  this.drawn.clear();
  for(const actor of this.actors.values())actor.seen=false;
  for(const [id,track] of this.tracks)this.draw(parent,id,track,time,camera);
  for(const [id,actor] of this.actors)if(!actor.seen)this.remove(id);
  return this.drawn;
 }
 private draw(parent:Node,id:string,track:Track,time:number,camera:{x:number;y:number}){
  if(!isValid(parent,true)||![camera.x,camera.y].every(Number.isFinite))return;
  let actor=this.actors.get(id);
  if(actor&&(!isValid(actor.node,true)||actor.node.parent!==parent)){this.remove(id);actor=undefined}
  if(!actor){
   if(this.actors.size>=CAP)return;
   const node=new Node(`剑破虚空-${id}`);node.layer=parent.layer;parent.addChild(node);
   node.addComponent(UITransform);
   const riftNode=new Node('长虹空间裂隙');riftNode.layer=parent.layer;node.addChild(riftNode);
   const ui=riftNode.addComponent(UITransform);ui.setAnchorPoint(0,.5);
   const sprite=riftNode.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
   riftNode.active=false;
   const rift={node:riftNode,ui,sprite};
   actor={node,rift,seen:true};this.actors.set(id,actor);
  }
  actor.seen=true;
  const dx=track.toX-track.x,dy=track.toY-track.y,age=time-track.started;
  actor.node.setPosition(track.x-camera.x,track.y-camera.y);
  actor.node.angle=Math.atan2(dy,dx)*180/Math.PI;
  this.drawn.add(id);
  actor.rift.node.active=false;
  if(track.sword)this.drawRift(actor.rift,track,track.visualLength,age);
  if(track.sword)this.drawSword(actor,track,track.visualLength,age);
 }
 private drawSword(actor:Actor,track:Track,length:number,age:number){
  if(!this.swordFrame)return;
  if(!actor.sword){
   const node=new Node('剑破虚空巨剑');node.layer=actor.node.layer;actor.node.addChild(node);
   const ui=node.addComponent(UITransform);ui.setAnchorPoint(.5,.5);
   const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
   const impactNode=new Node('巨剑命中碎芒');impactNode.layer=actor.node.layer;actor.node.addChild(impactNode);
   const impact=impactNode.addComponent(Graphics);
   sprite.spriteFrame=this.swordFrame;actor.sword={node,ui,sprite,impact};
  }
  const sword=actor.sword;
  sword.impact.clear();
  sword.node.active=age<SWORD_DURATION;
  if(!sword.node.active)return;
  const span=260,scale=span/SWORD_SPAN;
  const phase=Math.max(0,Math.min(1,(age-ANTICIPATION)/(FLIGHT_DURATION-ANTICIPATION)));
  const progress=phase;
  // Inverse-rotate a WORLD vertical lift. A local Y offset would put leftward
  // swords below the caster and rotate the chest height sideways on vertical casts.
  const combatLength=Math.hypot(track.toX-track.x,track.toY-track.y);
  const liftX=(track.toY-track.y)/combatLength*track.lift,liftY=(track.toX-track.x)/combatLength*track.lift;
  sword.ui.setContentSize(SWORD_WIDTH*scale,SWORD_HEIGHT*scale);
  sword.node.setPosition(span/2+(length-span)*progress+liftX,liftY);
  // No in-screen dissolve: the blade remains solid until it has left the screen.
  sword.sprite.color=new Color(255,255,255,255);
  const g=sword.impact;
  for(const hit of track.hits){
   const arrival=ANTICIPATION+(FLIGHT_DURATION-ANTICIPATION)*
    Math.max(0,Math.min(1,(hit.along-span)/(length-span)));
   const elapsed=age-arrival;
   if(elapsed<0||elapsed>=IMPACT_DURATION)continue;
   const fade=1-elapsed/IMPACT_DURATION,x=hit.along+liftX,y=hit.across+liftY;
   g.strokeColor=new Color(236,255,255,Math.round(255*fade));
   g.lineWidth=2+3*fade;
   g.moveTo(x-18*fade,y);g.lineTo(x+27*fade,y);g.stroke();
   g.strokeColor=new Color(150,230,255,Math.round(225*fade));g.lineWidth=1.6;
   for(let i=0;i<6;i++){
    const a=i*Math.PI/3+.3,r=5+elapsed*135;
    g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.7);
    g.lineTo(x+Math.cos(a)*(r+11*fade),y+Math.sin(a)*(r+11*fade)*.7);g.stroke();
   }
  }
 }
 /** Open the full supplied contour behind the sword, preserving its pointed end.
  * A cropped reveal would leave an opaque vertical wall at the moving front.
  * The black void is opaque; only the surrounding blue glow is transparent. */
 private drawRift(rift:Rift,track:Track,length:number,age:number){
  if(!this.riftFrame)return;
  const phase=Math.max(0,Math.min(1,(age-.045-ANTICIPATION)/(FLIGHT_DURATION-ANTICIPATION)));
  if(phase<=0||age>=DURATION)return;
  const reach=Math.min(length,260+(length-260)*phase);
  const start=Math.min(22,length*.08);
  const combatLength=Math.hypot(track.toX-track.x,track.toY-track.y);
  const ox=(track.toY-track.y)/combatLength*track.lift,oy=(track.toX-track.x)/combatLength*track.lift;
  rift.node.active=true;
  rift.sprite.spriteFrame=this.riftFrame;
  // Leave a fine trace first, then open as the sword approaches the screen edge.
  // Hold and close back to the same seam without changing the travelled path.
  const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t)};
  const opening=smooth((age-RIFT_OPEN_AT)/RIFT_OPEN_FOR);
  const closing=1-smooth((age-RIFT_CLOSE_AT)/RIFT_CLOSE_FOR);
  const fade=Math.max(0,Math.min(1,(DURATION-age)/.1));
  rift.ui.setContentSize(reach-start,6+148*opening*closing);
  rift.node.setPosition(start+ox,oy);
  rift.sprite.color=new Color(255,255,255,Math.round(255*fade));
 }
 /** Resize rebuilds bindings while preserving the same simulation phase. */
 clearBindings(){for(const id of this.actors.keys())this.remove(id)}
 reset(){this.clearBindings();this.tracks.clear();this.drawn.clear();this.lastTime=-1}
 destroy(){
  this.dead=true;this.reset();
  this.swordFrame?.destroy();this.swordTexture?.destroy();this.swordImage?.decRef();
  this.swordFrame=null;this.swordTexture=null;this.swordImage=null;
  this.riftFrame?.destroy();this.riftTexture?.destroy();this.riftImage?.decRef();
  this.riftFrame=null;this.riftTexture=null;this.riftImage=null;
 }
 private remove(id:string){
  const actor=this.actors.get(id);
  if(actor&&isValid(actor.node,true)){actor.node.removeFromParent();actor.node.destroy()}
  this.actors.delete(id);
 }
}
