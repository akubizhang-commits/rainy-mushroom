import {towerResources as resources} from './TowerResources';
import {Color,Graphics,ImageAsset,isValid,Node,Rect,Size,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';

type Actor={node:Node;sprite:Sprite;ui:UITransform;seen:boolean};
type Track={id:string;x:number;y:number;toX:number;toY:number;width:number;started:number};
type Aura={node:Node;sprite:Sprite;ui:UITransform};
type Blade={id:string;x:number;y:number;toX:number;toY:number;width:number;start:number;strike:number;
 lift:number;released:boolean;hit:boolean;pivotX:number;pivotY:number;tipX:number;tipY:number;
 node?:Node;sprite?:Sprite;ui?:UITransform;fxNode?:Node;fx?:Graphics;auras?:Aura[];
 sweepNode?:Node;sweep?:Graphics};
const FRAMES=16,COLUMNS=4,CELL_WIDTH=1024,CELL_HEIGHT=192,CAP=8;
const FORWARD=64; // One body of visual clearance; clipped endpoint remains fixed.
const DURATION=.75,SOURCE_DURATION=.5,STRIKE_DURATION=.0625,COMBAT_DURATION=.25;
const SWING_DURATION=.14,TRAIL_DURATION=.28,TRAIL_STEPS=8;
// The 928×160 source crop places the pivot at (16,80). Its visible blade
// spans 896px inside a 128px hit corridor; preserve these world-space bounds.
const PIVOT_X=16/928,LENGTH_RATIO=928/896,WIDTH_RATIO=160/128;

/** Approved 一剑开天: one real heavy strike followed by its extended visual tail.
 * Absolute simulation time keeps pause/restore deterministic without more hits.
 */
export class SwordTiandiArt {
 private requested=false;private dead=false;
 private image:ImageAsset|null=null;private texture:Texture2D|null=null;
 private frames:SpriteFrame[]=[];
 private actors=new Map<string,Actor>();private tracks=new Map<string,Track>();
 private drawn=new Set<string>();private white=new Color(255,255,255,255);
 private lastTime=-1;
 private bladeImage:ImageAsset|null=null;private bladeTexture:Texture2D|null=null;private bladeFrame:SpriteFrame|null=null;
 private auraImage:ImageAsset|null=null;private auraTexture:Texture2D|null=null;private auraFrame:SpriteFrame|null=null;
 private blades=new Map<string,Blade>();
 get ready(){return this.frames.length===FRAMES}
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  resources.load('tower-skill-fx/sword-tiandi-v1',ImageAsset,(error,image)=>{
   if(this.dead)return;
   if(error||!image||image.width!==4096||image.height!==768){
    console.warn('Sword tiandi atlas unavailable; retaining vector fallback.');return;
   }
   image.addRef();this.image=image;
   const texture=this.texture=new Texture2D();texture.image=image;
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   for(let i=0;i<FRAMES;i++){
    const frame=new SpriteFrame();frame.texture=texture;
    frame.rect=new Rect(i%COLUMNS*CELL_WIDTH,Math.floor(i/COLUMNS)*CELL_HEIGHT,CELL_WIDTH,CELL_HEIGHT);
    frame.originalSize=new Size(CELL_WIDTH,CELL_HEIGHT);this.frames.push(frame);
   }
  });
  resources.load('tower-skill-fx/tiandi-solid-sword-v2',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||image.width!==1280||image.height!==224)return;
   image.addRef();this.bladeImage=image;
   const texture=this.bladeTexture=new Texture2D();texture.image=image;
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   const frame=this.bladeFrame=new SpriteFrame();frame.texture=texture;
  });
  // The unsharpened reference has a soft crest suitable for a downward cleave.
  resources.load('tower-skill-fx/convergence-ice-aura-v1',ImageAsset,(error,image)=>{
   if(this.dead||error||!image)return;
   image.addRef();this.auraImage=image;
   const texture=this.auraTexture=new Texture2D();texture.image=image;
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   const frame=this.auraFrame=new SpriteFrame();frame.texture=texture;
  });
 }
 /** Only actually drawn IDs suppress the procedural strike. Tracks survive
  * the .25s combat effect so the approved tail can finish at .75s. */
 syncTower(parent:Node,effects:any[],time:number,camera:{x:number;y:number},chestHeight=70):ReadonlySet<string>{
  if(this.dead||!Number.isFinite(time)){this.reset();return this.drawn}
  this.preload();
  if(time<this.lastTime)this.reset();
  this.lastTime=time;
  this.syncBlades(parent,effects,time,camera,chestHeight);
  for(const [id,track] of this.tracks)if(time<track.started||time>=track.started+DURATION){
   this.tracks.delete(id);this.remove(id);
  }
  for(const e of effects){
   if(!e||e.hostile||e.kind!=='tiandi'||e.source!=='evo_tiandi'||!e.id||this.tracks.has(e.id))continue;
   if(e.shape!==undefined&&e.shape!=='line')continue;
   const started=e.startedAt??e.expiresAt-COMBAT_DURATION;
   const length=Math.hypot(e.toX-e.x,e.toY-e.y);
   if(![e.x,e.y,e.toX,e.toY,e.width,started,length*LENGTH_RATIO,e.width*WIDTH_RATIO].every(Number.isFinite)||
    e.width<=0||length<1e-6||time<started||time>=started+DURATION)continue;
   if(this.tracks.size>=CAP)continue;
   this.tracks.set(e.id,{id:e.id,x:e.x,y:e.y,toX:e.toX,toY:e.toY,width:e.width,started});
  }
  this.drawn.clear();
  for(const actor of this.actors.values())actor.seen=false;
  for(const [id,track] of this.tracks)this.draw(parent,id,track,time,camera);
  for(const [id,actor] of this.actors)if(!actor.seen)this.remove(id);
  return this.drawn;
 }
 private syncBlades(parent:Node,effects:any[],time:number,camera:{x:number;y:number},lift:number){
  for(const [id,b] of this.blades)if(time>=b.strike+DURATION||time<b.start){
   this.removeBlade(b);this.blades.delete(id);
  }
  for(const e of effects){
   if(!e||e.hostile||e.source!=='evo_tiandi'||!['tiandi_windup','tiandi'].includes(e.kind)||!e.id)continue;
   const released=e.kind==='tiandi',start=e.startedAt??e.expiresAt-COMBAT_DURATION;
   const strike=released?start:e.expiresAt;
   if(![e.x,e.y,e.toX,e.toY,e.width,start,strike].every(Number.isFinite)||e.width<=0||
    Math.hypot(e.toX-e.x,e.toY-e.y)<1e-6||time<start||time>=strike+DURATION)continue;
   let b=this.blades.get(e.id);
   if(!b&&released)b=Array.from(this.blades.values()).find(v=>Math.abs(v.strike-strike)<.035);
   if(!b){
    if(this.blades.size>=CAP)continue;
    b={id:e.id,x:e.x,y:e.y,toX:e.toX,toY:e.toY,width:e.width,start:released?start-.45:start,strike,
     lift:Number.isFinite(lift)?lift:70,released:false,hit:false,pivotX:0,pivotY:0,tipX:0,tipY:0};
    this.blades.set(e.id,b);
   }
   if(!b.released){
    Object.assign(b,{x:e.x,y:e.y,toX:e.toX,toY:e.toY,width:e.width,strike});
    if(!e.locked)b.lift=Number.isFinite(lift)?lift:70;
    if(released){
     b.released=true;
     b.hit=effects.some(h=>h?.kind==='hit'&&h.source==='evo_tiandi'&&!h.hostile&&h.damage>0&&
      Math.abs((h.startedAt??h.expiresAt-COMBAT_DURATION)-strike)<1e-6);
    }
   }
  }
  if(!isValid(parent,true)||![camera.x,camera.y].every(Number.isFinite))return;
  for(const b of this.blades.values())this.drawBlade(parent,b,time,camera);
 }
 private drawBlade(parent:Node,b:Blade,time:number,camera:{x:number;y:number}){
  if(!this.bladeFrame)return;
  if(b.node&&(!isValid(b.node,true)||b.node.parent!==parent))this.removeBlade(b);
  if(!b.node){
   const sweepNode=b.sweepNode=new Node('一剑开天·下劈扫光');sweepNode.layer=parent.layer;parent.addChild(sweepNode);
   b.sweep=sweepNode.addComponent(Graphics);
   // Store the sweep as fixed-time poses, rather than echoes that chase the sword.
   b.auras=Array.from({length:TRAIL_STEPS+1},(_,i)=>{
    const node=new Node(`一剑开天·冰蓝剑光-${i}`);node.layer=parent.layer;parent.addChild(node);
    const ui=node.addComponent(UITransform);ui.setAnchorPoint(.25,.5);
    const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
    return {node,ui,sprite};
   });
   const node=b.node=new Node('一剑开天·凝剑重劈');node.layer=parent.layer;parent.addChild(node);
   const ui=b.ui=node.addComponent(UITransform);ui.setAnchorPoint(12/1280,.5);
   const sprite=b.sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
   sprite.spriteFrame=this.bladeFrame;
   const fx=b.fxNode=new Node('一剑开天·落地冲击');fx.layer=parent.layer;parent.addChild(fx);
   b.fx=fx.addComponent(Graphics);
  }
  const length=Math.hypot(b.toX-b.x,b.toY-b.y),dx=(b.toX-b.x)/length,dy=(b.toY-b.y)/length;
  const arm=Math.min(FORWARD+32,length*.3);
  b.pivotX=b.x+dx*arm;b.pivotY=b.y+dy*arm+b.lift;
  // Project an overhead swing in the vertical plane of the actual attack ray.
  // Foreshortening keeps the raised blade readable; the landed tip is exact.
  const swing=Math.max(0,Math.min(1,(time-(b.strike-SWING_DURATION))/SWING_DURATION));
  const pitch=(1-swing*swing)*Math.PI/2,reach=length-arm;
  b.tipX=b.pivotX+dx*reach*Math.cos(pitch);
  b.tipY=b.pivotY+(dy*reach-b.lift)*Math.cos(pitch)+Math.min(280,length*.48)*Math.sin(pitch);
  const vx=b.tipX-b.pivotX,vy=b.tipY-b.pivotY,span=Math.hypot(vx,vy);
  const age=time-b.strike,alpha=age<0?Math.min(1,(time-b.start)/.18):Math.max(0,1-Math.max(0,age-.07)/.28);
  b.node!.active=alpha>0;
  b.node!.setPosition(b.pivotX-camera.x,b.pivotY-camera.y);
  b.node!.angle=Math.atan2(vy,vx)*180/Math.PI;
  // Uniform scale preserves the narrow grip and long blade throughout the swing.
  b.ui!.setContentSize(1280*span/1256,224*span/1256);
  b.sprite!.color=new Color(225,249,255,Math.round(255*alpha));
  const vector=(phase:number)=>{
   const p=(1-phase*phase)*Math.PI/2;
   return {x:dx*reach*Math.cos(p),y:(dy*reach-b.lift)*Math.cos(p)+Math.min(280,length*.48)*Math.sin(p)};
  };
  for(const [i,a] of (b.auras||[]).entries()){
   const phase=i===0?swing:i/(TRAIL_STEPS+1);
   const born=b.strike-SWING_DURATION+phase*SWING_DURATION,elapsed=time-born;
   const v=vector(phase),ex=v.x,ey=v.y;
   const echoSpan=Math.hypot(ex,ey);
   const fade=elapsed<0?0:Math.pow(Math.max(0,1-elapsed/TRAIL_DURATION),1.35);
   const opacity=i===0?alpha*(.18+.30*swing):.45*fade;
   a.node.active=!!this.auraFrame&&opacity>0;
   a.sprite.spriteFrame=this.auraFrame;
   a.node.setPosition(b.pivotX-camera.x,b.pivotY-camera.y);
   a.node.angle=Math.atan2(ey,ex)*180/Math.PI;
   a.ui.setContentSize(echoSpan*1.30,echoSpan*(i===0?.24:.17));
   a.sprite.color=new Color(255,255,255,Math.round(255*opacity));
  }
  // Join the actual blade positions into a translucent swept surface. Each
  // segment fades where it was made, preserving the overhead-to-ground motion.
  const sweep=b.sweep!;sweep.clear();b.sweepNode!.setPosition(b.pivotX-camera.x,b.pivotY-camera.y);
  const bandCount=12,steps=24;
  for(let j=0;j<steps;j++){
   const from=j/steps,to=Math.min(swing,(j+1)/steps);
   if(to<=from)break;
   const born=b.strike-SWING_DURATION+to*SWING_DURATION;
   const fade=Math.pow(Math.max(0,1-(time-born)/TRAIL_DURATION),1.3);
   if(fade<=0)continue;
   const a=vector(from),c=vector(to);
   for(let k=0;k<bandCount;k++){
    const inner=.20+.80*k/bandCount,outer=.20+.80*(k+1)/bandCount;
    const strength=Math.pow(Math.sin(Math.PI*(k+.5)/bandCount),1.2);
    sweep.fillColor=new Color(64,174,255,Math.round(58*fade*strength));
    sweep.moveTo(a.x*inner,a.y*inner);sweep.lineTo(a.x*outer,a.y*outer);
    sweep.lineTo(c.x*outer,c.y*outer);sweep.lineTo(c.x*inner,c.y*inner);sweep.close();sweep.fill();
   }
  }
  const g=b.fx!;g.clear();b.fxNode!.setPosition(b.x-camera.x,b.y-camera.y);
  if(age<0||age>=.22)return;
  // Ground shock follows the same corridor, with a brief visual hold on impact.
  const fade=Math.pow(1-age/.22,2);
  const ray=(a:number,c:number,side:number)=>{
   g.moveTo(dx*a-dy*side,dy*a+dx*side);g.lineTo(dx*c-dy*side,dy*c+dx*side);g.stroke();
  };
  g.strokeColor=new Color(235,255,255,Math.round(235*fade));g.lineWidth=4+5*fade;
  ray(arm,length,0);
  g.strokeColor=new Color(132,219,248,Math.round(190*fade));g.lineWidth=2;
  for(const side of [-1,1])ray(arm,length,side*b.width*(.25+age*1.1));
  if(b.hit){
   for(let i=1;i<=5;i++){
    const along=arm+(length-arm)*i/6,spread=b.width*(.15+age*1.5);
    g.moveTo(dx*along-dy*spread,dy*along+dx*spread);
    g.lineTo(dx*(along+14)-dy*(spread+14*fade),dy*(along+14)+dx*(spread+14*fade));g.stroke();
    g.moveTo(dx*along+dy*spread,dy*along-dx*spread);
    g.lineTo(dx*(along+14)+dy*(spread+14*fade),dy*(along+14)-dx*(spread+14*fade));g.stroke();
   }
  }
 }
 /** One short, decaying camera impulse for a settled positive heavy hit. */
 cameraKick(time:number){
  for(const b of this.blades.values()){
   const age=time-b.strike;
   if(b.released&&b.hit&&age>=0&&age<.14){
    const fade=Math.pow(1-age/.14,2);
    return {x:Math.sin(age*85)*3*fade,y:Math.sin(age*65)*6*fade};
   }
  }
  return {x:0,y:0};
 }
 private removeBlade(b:Blade){
  for(const node of [b.node,b.fxNode,b.sweepNode,...(b.auras||[]).map(a=>a.node)])if(node&&isValid(node,true)){node.removeFromParent();node.destroy()}
  b.node=undefined;b.fxNode=undefined;b.ui=undefined;b.sprite=undefined;b.fx=undefined;
  b.auras=undefined;
  b.sweep=undefined;b.sweepNode=undefined;
 }
 private draw(parent:Node,id:string,track:Track,time:number,camera:{x:number;y:number}){
  if(!this.ready||!isValid(parent,true)||![camera.x,camera.y].every(Number.isFinite))return;
  let actor=this.actors.get(id);
  if(actor&&(!isValid(actor.node,true)||actor.node.parent!==parent)){this.remove(id);actor=undefined}
  if(!actor){
   if(this.actors.size>=CAP)return;
   const node=new Node(`一剑开天-${id}`);node.layer=parent.layer;parent.addChild(node);
   const ui=node.addComponent(UITransform);ui.setAnchorPoint(PIVOT_X,.5);
   const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
   actor={node,sprite,ui,seen:true};this.actors.set(id,actor);
  }
  actor.seen=true;
  const dx=track.toX-track.x,dy=track.toY-track.y,age=time-track.started;
  // Keep the first two cells at full speed; stretch only the dissipating tail.
  const sourceAge=age<=STRIKE_DURATION?age:
   STRIKE_DURATION+(age-STRIKE_DURATION)*(SOURCE_DURATION-STRIKE_DURATION)/(DURATION-STRIKE_DURATION);
  const length=Math.hypot(dx,dy),forward=Math.min(FORWARD,length*.2);
  actor.node.setPosition(track.x+dx/length*forward-camera.x,track.y+dy/length*forward-camera.y);
  actor.node.angle=Math.atan2(dy,dx)*180/Math.PI;
  actor.ui.setContentSize((length-forward)*LENGTH_RATIO,track.width*WIDTH_RATIO);
  actor.sprite.spriteFrame=this.frames[Math.min(FRAMES-1,Math.floor(sourceAge/SOURCE_DURATION*FRAMES))];
  actor.sprite.color=this.white;this.drawn.add(id);
 }
 /** Resizing rebuilds bindings without restarting a cast or its tail. */
 clearBindings(){for(const id of this.actors.keys())this.remove(id);for(const b of this.blades.values())this.removeBlade(b)}
 reset(){this.clearBindings();this.tracks.clear();this.blades.clear();this.drawn.clear();this.lastTime=-1}
 destroy(){
  this.dead=true;this.reset();
  for(const frame of this.frames)frame.destroy();this.frames=[];
  this.texture?.destroy();this.image?.decRef();this.texture=null;this.image=null;
  this.bladeFrame?.destroy();this.bladeTexture?.destroy();this.bladeImage?.decRef();
  this.bladeFrame=null;this.bladeTexture=null;this.bladeImage=null;
  this.auraFrame?.destroy();this.auraTexture?.destroy();this.auraImage?.decRef();
  this.auraFrame=null;this.auraTexture=null;this.auraImage=null;
 }
 private remove(id:string){
  const actor=this.actors.get(id);
  if(actor&&isValid(actor.node,true)){actor.node.removeFromParent();actor.node.destroy()}
  this.actors.delete(id);
 }
}
