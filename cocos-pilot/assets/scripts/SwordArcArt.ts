import {towerResources as resources} from './TowerResources';
import {Color,ImageAsset,isValid,Node,Rect,Size,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';

type Actor={node:Node;sprite:Sprite;ui:UITransform;seen:boolean};
type Track={id:string;x:number;y:number;radius:number;faceX:number;faceY:number;started:number};
const FRAMES=16,CELL=256,COLUMNS=4,CAP=8;
const PROFILES={
 legacy:{resource:'tower-skill-fx/sword-arc',duration:.5,sizeRatio:1.2,forwardOffset:.5},
 // 816px square crop around source pivot (384,352); the source's 394px
 // enclosing radius maps directly to the real hit radius. No recentering.
 'tower-v2':{resource:'tower-skill-fx/sword-arc-v2',duration:.25,sizeRatio:816/394,forwardOffset:0},
 'tower-ice':{resource:'tower-skill-fx/sword-qi-crescent-ice-down-v1',duration:.25,sizeRatio:1.7,forwardOffset:.85},
} as const;

/** Approved Scenario sword slash, shared by tower and survivor presentations.
 * Absolute simulation time owns the phase. This class never advances gameplay.
 */
export class SwordArcArt {
 private requested=false;private dead=false;
 private image:ImageAsset|null=null;private texture:Texture2D|null=null;
 private frames:SpriteFrame[]=[];
 private actors=new Map<string,Actor>();private tracks=new Map<string,Track>();
 private drawn=new Set<string>();
 private white=new Color(255,255,255,255);private reducedWhite=new Color(255,255,255,140);
 private lastTime=-1;
 constructor(private profile:'legacy'|'tower-v2'|'tower-ice'='legacy'){}
 get ready(){return this.frames.length===(this.profile==='tower-ice'?1:FRAMES)}
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  resources.load(PROFILES[this.profile].resource,ImageAsset,(error,image)=>{
   if(this.dead)return;
   const ice=this.profile==='tower-ice',size=ice?512:1024;
   if(error||!image||image.width!==size||image.height!==size){
    console.warn('Sword arc atlas unavailable; retaining vector fallback.');return;
   }
   image.addRef();this.image=image;
   const texture=this.texture=new Texture2D();texture.image=image;
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   for(let i=0;i<(ice?1:FRAMES);i++){
    const frame=new SpriteFrame();frame.texture=texture;
    frame.rect=ice?new Rect(0,0,512,512):new Rect(i%COLUMNS*CELL,Math.floor(i/COLUMNS)*CELL,CELL,CELL);
    frame.originalSize=new Size(ice?512:CELL,ice?512:CELL);this.frames.push(frame);
   }
  });
 }
 beginFrame(){this.drawn.clear();for(const actor of this.actors.values())actor.seen=false}
 draw(parent:Node,id:string,x:number,y:number,dx:number,dy:number,radius:number,progress:number,reduced=false){
  if(this.dead||!this.ready||!isValid(parent,true)||![x,y,dx,dy,radius,progress].every(Number.isFinite)||
   radius<=0||radius>4096||progress<0||progress>=1||Math.hypot(dx,dy)<1e-6)return false;
  let actor=this.actors.get(id);
  if(actor&&(!isValid(actor.node,true)||actor.node.parent!==parent)){this.remove(id);actor=undefined}
  if(!actor){
   if(this.actors.size>=CAP)return false;
   const node=new Node(`弦月斩-${id}`);node.layer=parent.layer;parent.addChild(node);
   const ui=node.addComponent(UITransform);ui.setAnchorPoint(.5,.5);
   const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
   actor={node,sprite,ui,seen:true};this.actors.set(id,actor);
  }
  actor.seen=true;
  const d=Math.hypot(dx,dy),layout=PROFILES[this.profile];
  const ice=this.profile==='tower-ice';
  actor.node.setPosition(x+dx/d*radius*layout.forwardOffset,y+dy/d*radius*layout.forwardOffset+(ice?64:0));
  actor.node.angle=Math.atan2(dy,dx)*180/Math.PI;
  actor.ui.setContentSize(radius*layout.sizeRatio,radius*layout.sizeRatio);
  actor.ui.setAnchorPoint(ice ? .9319826338639653 : .5,ice ? .5014471780028944 : .5);
  actor.sprite.spriteFrame=this.frames[ice?0:Math.min(FRAMES-1,Math.floor(progress*FRAMES))];
  actor.sprite.color=ice?new Color(255,255,255,Math.round((reduced?140:255)*Math.min(1,progress/.08)*Math.min(1,(1-progress)/.38))):
   reduced?this.reducedWhite:this.white;
  this.drawn.add(id);
  return true;
 }
 endFrame(){for(const [id,actor] of this.actors)if(!actor.seen)this.remove(id)}
 /** IDs identify individual releases. Only successfully drawn sprites replace
  * procedural effects; pending/failed loads and the cap keep their fallback. */
 syncTower(parent:Node,effects:any[],time:number,camera:{x:number;y:number}):ReadonlySet<string>{
  if(this.dead||!Number.isFinite(time)){this.reset();return this.drawn}
  this.preload();
  if(time<this.lastTime)this.reset();
  this.lastTime=time;
  const duration=PROFILES[this.profile].duration;
  // Release both tracks and bindings before applying the cap, so a new impact
  // on an expiry boundary can use the old sprite's capacity immediately.
  for(const [id,track] of this.tracks)if(time<track.started||time>=track.started+duration){
   this.tracks.delete(id);this.remove(id);
  }
  for(const e of effects){
   if(e.kind!=='arc'||e.hostile||!e.id||this.tracks.has(e.id))continue;
   if(this.profile!=='legacy'&&e.angle!==undefined&&e.angle!==90)continue;
   const faceX=e.dirX??e.faceX,faceY=e.dirY??e.faceY;
   const started=e.startedAt??e.expiresAt-.25;
   if(![e.x,e.y,e.radius,faceX,faceY,started].every(Number.isFinite)||
    e.radius<=0||e.radius>4096||Math.hypot(faceX,faceY)<1e-6||time<started||time>=started+duration)continue;
   if(this.tracks.size>=CAP)continue;
   this.tracks.set(e.id,{id:e.id,x:e.x,y:e.y,radius:e.radius,faceX,faceY,started});
  }
  this.beginFrame();
  for(const [id,e] of this.tracks){
   const age=time-e.started;
   if(age<0||age>=duration){this.tracks.delete(id);continue}
   this.draw(parent,id,e.x-camera.x,e.y-camera.y,e.faceX,e.faceY,e.radius,age/duration);
  }
  this.endFrame();
  return this.drawn;
 }
 /** Rebinding after resize may keep the short simulation-timed visual tail. */
 clearBindings(){for(const id of this.actors.keys())this.remove(id)}
 reset(){this.clearBindings();this.tracks.clear();this.drawn.clear();this.lastTime=-1}
 destroy(){
  this.dead=true;this.reset();
  for(const frame of this.frames)frame.destroy();this.frames=[];
  this.texture?.destroy();this.image?.decRef();this.texture=null;this.image=null;
 }
 private remove(id:string){
  const actor=this.actors.get(id);
  if(actor&&isValid(actor.node,true)){actor.node.removeFromParent();actor.node.destroy()}
  this.actors.delete(id);
 }
}
