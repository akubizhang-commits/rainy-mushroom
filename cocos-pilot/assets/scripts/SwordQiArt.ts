import {towerResources as resources} from './TowerResources';
import {Color,ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {swordQiVisualLift} from './shared/js/xianxia/TowerSwordQi';

type Part={node:Node;sprite:Sprite;ui:UITransform;color:Color};
type Actor={node:Node;parts:Part[];seen:boolean};
type Asset={image:ImageAsset|null;texture:Texture2D|null;frame:SpriteFrame|null;requested:boolean};
const CAP=24;
const SPECS={
 crescent:{path:'tower-skill-fx/sword-qi-crescent-ice-diagonal-v1',width:512,height:512,anchor:.9319826338639653,anchorY:.5014471780028944,span:512*.7091172214182344},
 sweep:{path:'tower-skill-fx/sword-qi-crescent-ice-sweep-v1',width:512,height:512,anchor:.9319826338639653,anchorY:.5014471780028944,span:512*.7091172214182344},
 down:{path:'tower-skill-fx/sword-qi-crescent-ice-down-v1',width:512,height:512,anchor:.9319826338639653,anchorY:.5014471780028944,span:512*.7091172214182344},
 cross:{path:'tower-skill-fx/sword-qi-cross-v3',width:512,height:512,anchor:.7555981975459283,anchorY:.5,span:472.60467427781646},
};

/** Reusable sword-qi bodies. Combat owns motion, stopping and lifetime; this
 * renderer never infers hits or changes simulation state. Nodes are pooled
 * across casts, with a bounded procedural fallback when art is unavailable.
 */
export class SwordQiArt {
 private dead=false;private lastTime=-1;
 private assets:Record<string,Asset>={
  crescent:{image:null,texture:null,frame:null,requested:false},
  sweep:{image:null,texture:null,frame:null,requested:false},
  down:{image:null,texture:null,frame:null,requested:false},
  cross:{image:null,texture:null,frame:null,requested:false},
 };
 private actors=new Map<string,Actor>();private pool:Actor[]=[];
 private drawn=new Set<string>();
 get ready(){return Object.values(this.assets).every(asset=>!!asset.frame)}
 preload(){
  if(this.dead)return;
  for(const kind of Object.keys(SPECS)){
   const asset=this.assets[kind],spec=SPECS[kind as keyof typeof SPECS];
   if(asset.requested)continue;asset.requested=true;
   resources.load(spec.path,ImageAsset,(error,image)=>{
    if(this.dead)return;
    if(error||!image||image.width!==spec.width||image.height!==spec.height){
     console.warn(`Sword qi ${kind} unavailable; retaining geometric fallback.`);return;
    }
    image.addRef();asset.image=image;
    asset.texture=new Texture2D();asset.texture.image=image;
    asset.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    asset.frame=new SpriteFrame();asset.frame.texture=asset.texture;
   });
  }
 }
 syncTower(parent:Node,projectiles:any[],effects:any[],time:number,camera:{x:number;y:number}):ReadonlySet<string>{
  this.drawn.clear();
  if(this.dead||!Number.isFinite(time)||!isValid(parent,true)||!Number.isFinite(camera.x+camera.y)){
   this.clearBindings();return this.drawn;
  }
  if(time<this.lastTime)this.reset();
  this.lastTime=time;this.preload();
  for(const actor of this.actors.values())actor.seen=false;
  // Retire absent/expired actors first so all capacity can be reused this frame.
  for(const [id] of this.actors){
   const live=projectiles.some(p=>p?.id===id&&p.expiresAt>time)
    ||effects.some(e=>e?.id===id&&e.expiresAt>time);
   if(!live)this.retire(id);
  }
  for(const p of projectiles)this.draw(parent,p,time,camera,false);
  for(const e of effects)this.draw(parent,e,time,camera,true);
  for(const [id,actor] of this.actors)if(!actor.seen)this.retire(id);
  return this.drawn;
 }
 private draw(parent:Node,item:any,time:number,camera:{x:number;y:number},near:boolean){
  if(!item||item.hostile||typeof item.id!=='string')return;
  const kind=near?'cross':item.bladeKind;
  if(kind!=='cross'&&kind!=='crescent')return;
  if(near?(item.kind!=='cross'||item.source!=='sj_cross'||item.shape!=='cross'):
   (item.source!==(kind==='crescent'?'sj_arc':'sj_cross')||item.shape!==`${kind}-projectile`))return;
  const dx=item.dirX??item.vx,dy=item.dirY??item.vy,d=Math.hypot(dx,dy);
  const started=item.startedAt,expires=item.expiresAt,width=item.width;
  if(![item.x,item.y,dx,dy,d,started,expires,width].every(Number.isFinite)
   ||width<=0||d<1e-8||time<started||time>=expires)return;
  const variant=kind==='crescent'?(item.pulseIndex===2?'sweep':item.pulseIndex===3?'down':'crescent'):kind;
  const asset=this.assets[variant],spec=SPECS[variant as keyof typeof SPECS];
  if(!asset.frame)return;
  let actor=this.actors.get(item.id);
  if(actor&&(!isValid(actor.node,true)||actor.node.parent!==parent)){
   this.destroyActor(actor);this.actors.delete(item.id);actor=undefined;
  }
  if(!actor){
   if(this.actors.size>=CAP)return;
   actor=this.acquire(parent);this.actors.set(item.id,actor);
  }
  actor.seen=true;actor.node.active=true;
  actor.node.setPosition(item.x-camera.x,item.y-camera.y+swordQiVisualLift(item));
  actor.node.angle=Math.atan2(dy,dx)*180/Math.PI;
  const dissolved=Number.isFinite(item.dissolveAt)&&time>=item.dissolveAt;
  const opacity=near?Math.pow(Math.max(0,1-(time-started)/(expires-started)),1.2):
   dissolved?Math.pow(Math.max(0,1-(time-item.dissolveAt)/Math.max(.001,expires-item.dissolveAt)),1.35):
   Math.min(1,(time-started)/.055);
  for(let i=0;i<actor.parts.length;i++){
   const part=actor.parts[i],trail=i>0;
   part.node.active=!trail||(!near&&kind!=='crescent');
   part.node.setPosition(trail?-width*.034*i:0,0);
   part.ui.setAnchorPoint(spec.anchor,spec.anchorY);
   part.ui.setContentSize(width*spec.width/spec.span,width*spec.height/spec.span);
   part.sprite.spriteFrame=asset.frame;
   part.color.a=Math.round(255*opacity*(trail?.09/(i*i):1));
   part.sprite.color=part.color;
  }
  this.drawn.add(item.id);
 }
 private acquire(parent:Node):Actor{
  while(this.pool.length){
   const candidate=this.pool.pop()!;
   if(isValid(candidate.node,true)&&candidate.node.parent===parent)return candidate;
   this.destroyActor(candidate);
  }
  const node=new Node('剑气飞行体');node.layer=parent.layer;parent.addChild(node);
  const actor:Actor={node,parts:[],seen:true};
  // Keep the sharp frontmost body above its low-opacity trailing copies.
  for(let i=0;i<4;i++){
   const child=new Node(i?'剑气短尾':'剑气主锋');child.layer=parent.layer;
   const ui=child.addComponent(UITransform);
   const sprite=child.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
   actor.parts.push({node:child,sprite,ui,color:new Color(255,255,255,255)});
  }
  for(let i=3;i>=0;i--)node.addChild(actor.parts[i].node);
  return actor;
 }
 private retire(id:string){
  const actor=this.actors.get(id);if(!actor)return;
  this.actors.delete(id);
  if(isValid(actor.node,true)&&this.pool.length<CAP){actor.node.active=false;this.pool.push(actor)}
  else this.destroyActor(actor);
 }
 private destroyActor(actor:Actor){
  if(isValid(actor.node,true)){actor.node.removeFromParent();actor.node.destroy()}
 }
 clearBindings(){
  for(const actor of this.actors.values())this.destroyActor(actor);
  for(const actor of this.pool)this.destroyActor(actor);
  this.actors.clear();this.pool=[];this.drawn.clear();
 }
 reset(){this.clearBindings();this.lastTime=-1}
 destroy(){
  this.dead=true;this.reset();
  for(const asset of Object.values(this.assets)){
   asset.frame?.destroy();asset.texture?.destroy();asset.image?.decRef();
   asset.frame=null;asset.texture=null;asset.image=null;
  }
 }
}
