import {towerResources as resources} from './TowerResources';
import {ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {LiangyiPainter} from './LiangyiPainter';

type Actor={node:Node;ui:UITransform;sprite:Sprite};
type Surface={canvas:any;image:ImageAsset;texture:Texture2D;frame:SpriteFrame};
type HitPoint={id:string;x:number;y:number;radius:number};
type Track={id:string;x:number;y:number;radius:number;startedAt:number;pulseIndex:number;
 pulseCount:number;pulseAt:number|null;nextPulseAt:number|null;hitPoints:HitPoint[];hitKey:string};
type Slot={track:Track|null;painter:LiangyiPainter;surfaces:{ground:Surface;air:Surface};
 ground:Actor|null;air:Actor|null;lastKey:string};
const ART=[
 {key:'ring',path:'tower-skill-fx/liangyi-monochrome-v1',width:512,height:512},
 {key:'swordWhite',path:'tower-skill-fx/liangyi-pure-white-v1',width:544,height:128},
 {key:'swordBlack',path:'tower-skill-fx/liangyi-pure-black-v1',width:544,height:128},
];
const CAP=4,END=5.68;
const base=(z:any)=>z&&!z.hostile&&z.kind==='formation'&&z.source==='sj_formation'
 &&z.shape==='circle';
const sameCenter=(a:any,b:any)=>a.x===b.x&&a.y===b.y&&a.radius===b.radius;

/** Approved fixed ground array and airborne swords. This reads combat state;
 * it never changes a zone, selects a target, or advances the simulation.
 * Two reusable textures per live array update at 30 Hz and immediately on
 * pulse changes. Paused/camera-only redraws only reposition existing sprites.
 */
export class LiangyiFormationArt {
 private dead=false;private requested=false;private failed=false;
 private images:Record<string,ImageAsset>={};
 private slots:Slot[]=[];private drawn=new Set<string>();
 private state:any=null;private lastTime=-1;
 private wave:number|undefined;private floor:number|undefined;
 private uploads=0;
 get ready(){return !this.dead&&!this.failed&&ART.every(a=>!!this.images[a.key])}
 preload(){
  if(this.dead||this.requested)return;this.requested=true;
  for(const art of ART)resources.load(art.path,ImageAsset,(error,image)=>{
   if(this.dead||this.failed)return;
   if(error||!image||image.width!==art.width||image.height!==art.height){
    this.fail();return;
   }
   image.addRef();this.images[art.key]=image;
  });
 }
 private canvas(width:number,height:number):any{
  const scope=globalThis as any,wx=scope.wx;
  const canvas=wx?.createOffscreenCanvas?wx.createOffscreenCanvas({type:'2d',width,height})
   :wx?.createCanvas?wx.createCanvas():scope.document?.createElement('canvas');
  if(!canvas)throw Error('2D canvas unavailable');
  canvas.width=width;canvas.height=height;
  if(!canvas.getContext('2d'))throw Error('2D canvas context unavailable');
  return canvas;
 }
 private surface(width:number,height:number):Surface{
  const canvas=this.canvas(width,height),image=new ImageAsset(canvas),texture=new Texture2D();
  let frame:SpriteFrame|null=null;
  try{
   texture.image=image;texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   frame=new SpriteFrame();frame.texture=texture;
   // Dynamic canvas pixels must never be copied once into a static atlas.
   frame.packable=false;
   return {canvas,image,texture,frame};
  }catch(error){frame?.destroy();texture.destroy();image.destroy();throw error}
 }
 private createSlot():Slot{
  const ground=this.surface(512,512);
  let air:Surface|null=null;
  try{
   air=this.surface(768,1024);
   const painter=new LiangyiPainter(ground.canvas,air.canvas,{
    ring:this.images.ring.data,swordWhite:this.images.swordWhite.data,
    swordBlack:this.images.swordBlack.data,ringRadius:512/2.24,
   });
   const slot:Slot={track:null,painter,surfaces:{ground,air},ground:null,air:null,lastKey:''};
   this.slots.push(slot);return slot;
  }catch(error){this.releaseSurface(ground);if(air)this.releaseSurface(air);throw error}
 }
 private actor(parent:Node,layer:Surface,air:boolean):Actor{
  const node=new Node(air?'两仪落剑':'两仪阵纹');node.layer=parent.layer;parent.addChild(node);
  const ui=node.addComponent(UITransform);ui.setAnchorPoint(.5,air?.3125:.5);
  const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;
  sprite.trim=false;sprite.spriteFrame=layer.frame;
  return {node,ui,sprite};
 }
 private hide(slot:Slot){
  if(slot.ground&&isValid(slot.ground.node,true))slot.ground.node.active=false;
  if(slot.air&&isValid(slot.air.node,true))slot.air.node.active=false;
 }
 private bind(slot:Slot,ground:Node,air:Node){
  for(const [key,parent] of [['ground',ground],['air',air]] as const){
   const old=slot[key];
   if(!old||!isValid(old.node,true)||old.node.parent!==parent){
    if(old&&isValid(old.node,true)){old.node.removeFromParent();old.node.destroy()}
    slot[key]=this.actor(parent,slot.surfaces[key],key==='air');
   }
   slot[key]!.node.active=true;
  }
 }
 syncTower(ground:Node,air:Node,s:any,camera:{x:number;y:number}):ReadonlySet<string>{
  this.drawn.clear();
  if(this.dead||!s?.player||s.player.hp<=0||['lost','won','abandoned'].includes(s.phase)
   ||!isValid(ground,true)||!isValid(air,true)
   ||![s.time,camera.x,camera.y].every(Number.isFinite)){
   this.reset();return this.drawn;
  }
  // Clearing a wave cancels its zones immediately. Do not keep predicting
  // another strike in the next wave; natural zone expiry still keeps its tail.
  if(this.state!==s||s.wave!==this.wave||s.floor!==this.floor||s.time<this.lastTime)this.reset();
  this.state=s;this.lastTime=s.time;this.wave=s.wave;this.floor=s.floor;
  this.preload();
  if(!this.ready)return this.drawn;
  const effects=s.effects||[];
  try{
   for(const slot of this.slots)if(slot.track&&s.time-slot.track.startedAt>=END-1e-8){
    slot.track=null;slot.lastKey='';this.hide(slot);
   }
   for(const z of s.zones||[]){
    if(!base(z)||z.formId!=='sj_formation'||!z.id
     ||![z.x,z.y,z.radius,z.startedAt,z.pulseCount,z.pulseIndex,z.nextAt,z.interval].every(Number.isFinite)
     ||z.radius<=0||s.time<z.startedAt||s.time-z.startedAt>=END)continue;
    let slot=this.slots.find(a=>a.track?.id===z.id);
    if(!slot){
     slot=this.slots.find(a=>!a.track);
     if(!slot&&this.slots.length<CAP)slot=this.createSlot();
     if(!slot)continue;
     slot.lastKey='';
     slot.track={id:z.id,x:z.x,y:z.y,radius:z.radius,startedAt:z.startedAt,pulseIndex:0,
      pulseCount:z.pulseCount,pulseAt:null,nextPulseAt:null,hitPoints:[],hitKey:''};
    }
    const t=slot.track!;
    t.pulseIndex=z.pulseIndex;t.pulseCount=z.pulseCount;
    t.nextPulseAt=z.ticks>0?z.nextAt-z.startedAt:null;
    let pulse:any=null;
    for(const e of effects)if(base(e)&&sameCenter(e,z)&&e.pulseIndex===z.pulseIndex
     &&e.pulseCount===z.pulseCount&&e.startedAt>=z.startedAt
     &&(!pulse||e.startedAt>pulse.startedAt))pulse=e;
    // Restored live zones retain the schedule even after their short pulse
    // effect expires. Round to the authoritative 60 Hz combat tick.
    const pulseTime=pulse?.startedAt??Math.ceil((z.nextAt-z.interval-1e-8)*60)/60;
    t.pulseAt=z.pulseIndex>0?pulseTime-z.startedAt:null;
    const hitKey=`${z.pulseIndex}:${pulse?.id||''}`;
    if(t.hitKey!==hitKey){
     t.hitKey=hitKey;t.hitPoints.length=0;
     if(pulse)for(const hit of effects){
      if(hit.kind!=='hit'||hit.source!=='formation'||!(hit.damage>0)
       ||Math.abs(hit.startedAt-pulseTime)>1e-7)continue;
      // Hit snapshots retain collider/identity even when the target has moved
      // or died before this frame is rendered.
      if(!pulse.targetIds?.includes(hit.targetId))continue;
      const radius=hit.targetRadius;
      if(!Number.isFinite(radius)||Math.hypot(hit.x-t.x,hit.y-t.y)>t.radius+radius)continue;
      t.hitPoints.push({id:hit.id,x:hit.x-t.x,y:hit.y-t.y,radius});
     }
    }
   }
   for(const slot of this.slots){
    const t=slot.track;if(!t)continue;
    this.bind(slot,ground,air);
    slot.ground!.node.setPosition(t.x-camera.x,t.y-camera.y);
    slot.air!.node.setPosition(t.x-camera.x,t.y-camera.y);
    slot.ground!.ui.setContentSize(2.24*t.radius,2.24*t.radius);
    slot.air!.ui.setContentSize(3*t.radius,4*t.radius);
    const key=`${Math.floor((s.time+1e-8)*30)}:${t.pulseIndex}:${t.hitKey}`;
    if(slot.lastKey!==key){
     slot.painter.draw({age:s.time-t.startedAt,radius:t.radius,rainSeed:t.id,pulseIndex:t.pulseIndex,
      pulseCount:t.pulseCount,pulseAt:t.pulseAt,nextPulseAt:t.nextPulseAt,hitPoints:t.hitPoints});
     slot.surfaces.ground.texture.uploadData(slot.surfaces.ground.canvas);
     slot.surfaces.air.texture.uploadData(slot.surfaces.air.canvas);
     this.uploads+=2;slot.lastKey=key;
    }
    this.drawn.add(t.id);
    for(const e of effects)if(base(e)&&sameCenter(e,t)&&e.startedAt>=t.startedAt
     &&e.startedAt<=t.startedAt+5.01)this.drawn.add(e.id);
   }
  }catch(error){this.fail(error)}
  return this.drawn;
 }
 clearBindings(){
  for(const slot of this.slots)for(const key of ['ground','air'] as const){
   const a=slot[key];
   if(a&&isValid(a.node,true)){a.node.removeFromParent();a.node.destroy()}
   slot[key]=null;
  }
 }
 reset(){
  this.drawn.clear();this.state=null;this.lastTime=-1;this.wave=undefined;this.floor=undefined;
  for(const slot of this.slots){slot.track=null;slot.lastKey='';this.hide(slot)}
 }
 private releaseSurface(s:Surface){s.frame.destroy();s.texture.destroy();s.image.destroy()}
 private release(){
  this.clearBindings();
  for(const slot of this.slots){this.releaseSurface(slot.surfaces.ground);this.releaseSurface(slot.surfaces.air)}
  this.slots.length=0;
  for(const image of Object.values(this.images))image.decRef();
  this.images={};
 }
 private fail(error?:unknown){
  if(this.failed)return;this.failed=true;this.reset();this.release();
  console.warn('Liangyi textures unavailable; retaining the geometric formation.',error||'');
 }
 destroy(){this.dead=true;this.reset();this.release()}
}
