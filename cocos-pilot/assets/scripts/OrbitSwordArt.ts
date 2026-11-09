import {towerResources as resources} from './TowerResources';
import {Color,Graphics,ImageAsset,isValid,Node,Rect,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {skillForm,orbitSwordPose} from './shared/js/xianxia/TowerSkillForms';
import {setTowerDepth} from './TowerDepthOrder';

type TrailPoint={x:number;y:number;worldX:number;worldY:number;time:number};
type Trail={radial:number;maxAlpha:number;maxWidth:number;points:TrailPoint[]};
type Actor={node:Node;ui:UITransform;sprite:Sprite;tail:Graphics;lastTrail:Trail[]};
const ART={path:'tower-skill-fx/orbit-sword-v1',width:544,height:128,span:496,thickness:88};
const TRAIL_SECONDS=.18,TRAIL_SEGMENTS=20,HISTORY_CAP=64;

/** Persistent radial swords. Combat owns their geometry and contacts; this
 * observer only samples player positions for the approved short curved tails.
 * Eight reusable actors cover the base skill; evolution expands the pool to twelve.
 */
export class OrbitSwordArt {
 private dead=false;private requested=false;private failed=false;
 private image:ImageAsset|null=null;private texture:Texture2D|null=null;private frame:SpriteFrame|null=null;
 private parent:Node|null=null;private actors:Actor[]=[];
 private state:any=null;private form:any=null;private level=-1;private evolution=-1;
 private lastTime=-1;private lastX=NaN;private lastY=NaN;
 private historyTime=new Float64Array(HISTORY_CAP);
 private historyX=new Float64Array(HISTORY_CAP);private historyY=new Float64Array(HISTORY_CAP);
 private historyHead=0;private historyCount=0;private sampleX=0;private sampleY=0;
 private stroke=new Color(145,226,244,255);
 private flowRequested=false;private flowImage:ImageAsset|null=null;private flowTexture:Texture2D|null=null;
 private flowFrame:SpriteFrame|null=null;private flowNode:Node|null=null;private flowUI:UITransform|null=null;
 private flowFrames:SpriteFrame[]=[];private flowSprite:Sprite|null=null;
 get ready(){return !!this.frame&&!this.dead}
 preload(){
  if(this.dead||this.requested)return;this.requested=true;
  resources.load(ART.path,ImageAsset,(error,image)=>{
   if(this.dead)return;
   if(error||!image||image.width!==ART.width||image.height!==ART.height){
    this.failed=true;console.warn('Orbit swords unavailable; retaining geometric fallback.');return;
   }
   let texture:Texture2D|null=null,frame:SpriteFrame|null=null;
   image.addRef();
   try{
    texture=new Texture2D();texture.image=image;
    texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    frame=new SpriteFrame();frame.texture=texture;
    this.image=image;this.texture=texture;this.frame=frame;
   }catch(error){
    frame?.destroy();texture?.destroy();image.decRef();this.failed=true;
    console.warn('Orbit sword texture unavailable; retaining geometric fallback.',error);
   }
  });
 }
 /** True means every outer sword has a sprite; false keeps the exact old fallback. */
 syncTower(parent:Node,s:any,camera:{x:number;y:number},waist?:{x:number;y:number}|null):boolean{
  if(this.dead||!isValid(parent,true)||!s?.player
   ||!Number.isFinite(s.time+s.player.x+s.player.y+camera.x+camera.y)){
   this.reset();return false;
  }
  const level=s.loadout?.active?.sj_wanjian||0;
  if(level<=0||s.player.hp<=0){this.hide();return false}
  if(s.loadout.growthVersion===1&&!s.loadout.evolutions?.includes('evo_wuwo')
   &&!(s.orbitUntil>s.time+1e-9)){this.hide();return false}
  this.preload();
  if(!this.frame){this.hide();return false}
  const bindingsChanged=this.parent!==parent||this.actors.some(a=>!isValid(a.node,true)||a.node.parent!==parent);
  if(bindingsChanged){
   this.clearBindings();this.parent=parent;
  }
  const evolution=s.loadout.evolutions?.includes('evo_wuwo')?(s.loadout.evolutionLevels?.evo_wuwo||1):0;
  const formChanged=level!==this.level||evolution!==this.evolution;
  if(formChanged){
   this.level=level;this.evolution=evolution;
   this.form=skillForm(evolution?'evo_wuwo':'sj_wanjian',evolution||level,level);
  }
  const f=this.form,p=s.player,time=s.time;
  const originX=waist?waist.x+camera.x:p.x;
  const originY=waist?waist.y+camera.y:p.y+57;
  if(this.state!==s||formChanged||time<this.lastTime
   ||time===this.lastTime&&(originX!==this.lastX||originY!==this.lastY))this.historyCount=0;
  const changed=this.state!==s||formChanged||time!==this.lastTime||originX!==this.lastX||originY!==this.lastY;
  // 剑域形态的周天剑阵最多 12 柄：固定一个 12 柄的复用池，升级时不重建节点。
  const capacity=f.swords>8||f.motion==='wuwo'?12:8;
  while(this.actors.length<capacity)this.actors.push(this.createActor(parent));
  if(changed)this.remember(time,originX,originY);
  for(let i=0;i<this.actors.length;i++){
   const actor=this.actors[i];actor.node.active=i<f.swords;
   if(!actor.node.active)continue;
   const pose=orbitSwordPose(f,time,i),x=originX+pose.x,y=originY+pose.y;
   actor.node.setPosition(x-camera.x,y-camera.y);actor.node.angle=pose.angle*180/Math.PI;
   setTowerDepth(actor.node,p.y+('depthY' in pose?pose.depthY:pose.y));
   actor.ui.setContentSize(ART.width*('length' in pose?pose.length:f.bladeLength)/ART.span,ART.height*f.bladeWidth/ART.thickness);
   if(changed||bindingsChanged)this.drawTail(actor,f,time,pose.angle,x,y,i);
  }
  // 2026-11-09：周天剑阵改用剑域形态（motion==='wuwo'），同样显示脚下冰蓝光环。
  this.drawFlow(parent,evolution||f.motion==='wuwo'?f:null,time,p.x-camera.x,p.y-camera.y,p.y);
  this.state=s;this.lastTime=time;this.lastX=originX;this.lastY=originY;
  return true;
 }
 private drawFlow(parent:Node,form:any,time:number,x:number,y:number,groundY:number){
  if(!form){if(this.flowNode)this.flowNode.active=false;return}
  if(!this.flowRequested){
   this.flowRequested=true;
   resources.load('tower-skill-fx/jianxin-aura-v1',ImageAsset,(error,image)=>{
    if(this.dead||error||!image||image.width!==2048||image.height!==1152)return;
    image.addRef();
    let texture:Texture2D|null=null,frame:SpriteFrame|null=null;
    try{
     texture=new Texture2D();texture.image=image;texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
     for(let i=0;i<16;i++){
      frame=new SpriteFrame();frame.texture=texture;
      frame.rect=new Rect(i%4*512,Math.floor(i/4)*288,512,288);this.flowFrames.push(frame);
     }
     this.flowImage=image;this.flowTexture=texture;this.flowFrame=frame;
    }catch{frame?.destroy();texture?.destroy();image.decRef()}
   });
  }
  if(!this.flowFrame)return;
  if(!this.flowNode){
   const node=this.flowNode=new Node('周天剑域·冰蓝地环');node.layer=parent.layer;parent.addChild(node);
   this.flowUI=node.addComponent(UITransform);this.flowUI.setAnchorPoint(848/1672,1-460/941);
   // Atlas cells use their cropped rectangle; an untrimmed atlas would shrink
   // each ring to a quarter of the authored display size.
   const sprite=this.flowSprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=true;
  }
  this.flowNode.active=true;this.flowNode.setPosition(x,y);
  this.flowNode.angle=0;
  this.flowSprite!.spriteFrame=this.flowFrames[Math.floor(((time%4)+4)%4*4)];
  this.flowSprite!.color=new Color(255,255,255,150);
  this.flowUI!.setContentSize(form.innerRadius*2.35,form.innerRadius*2.35*.5625);
  setTowerDepth(this.flowNode,groundY+10000);
 }
 private createActor(parent:Node):Actor{
  const node=new Node(`环剑-${this.actors.length}`);node.layer=parent.layer;parent.addChild(node);
  const ui=node.addComponent(UITransform);ui.setAnchorPoint(.5,.5);
  const tailNode=new Node('环剑短尾');tailNode.layer=node.layer;node.addChild(tailNode);
  tailNode.addComponent(UITransform).setContentSize(1,1);
  const tail=tailNode.addComponent(Graphics);
  const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
  sprite.spriteFrame=this.frame;
  const lastTrail:Trail[]=[];
  for(let strand=0;strand<2;strand++){
   const points:TrailPoint[]=[];
   for(let j=0;j<=TRAIL_SEGMENTS;j++)points.push({x:0,y:0,worldX:0,worldY:0,time:0});
   lastTrail.push({radial:0,maxAlpha:strand?40:90,maxWidth:strand?1:2.5,points});
  }
  return {node,ui,sprite,tail,lastTrail};
 }
 private remember(time:number,x:number,y:number){
  this.historyTime[this.historyHead]=time;this.historyX[this.historyHead]=x;this.historyY[this.historyHead]=y;
  this.historyHead=(this.historyHead+1)%HISTORY_CAP;
  this.historyCount=Math.min(HISTORY_CAP,this.historyCount+1);
 }
 private samplePlayer(time:number){
  const first=(this.historyHead+HISTORY_CAP-this.historyCount)%HISTORY_CAP;
  if(time<=this.historyTime[first]){
   this.sampleX=this.historyX[first];this.sampleY=this.historyY[first];return;
  }
  for(let i=this.historyCount-1;i>0;i--){
   const a=(first+i-1)%HISTORY_CAP,b=(first+i)%HISTORY_CAP;
   if(time>=this.historyTime[a]){
    const k=Math.min(1,(time-this.historyTime[a])/Math.max(1e-9,this.historyTime[b]-this.historyTime[a]));
    this.sampleX=this.historyX[a]+(this.historyX[b]-this.historyX[a])*k;
    this.sampleY=this.historyY[a]+(this.historyY[b]-this.historyY[a])*k;return;
   }
  }
  const last=(this.historyHead+HISTORY_CAP-1)%HISTORY_CAP;
  this.sampleX=this.historyX[last];this.sampleY=this.historyY[last];
 }
 private drawTail(actor:Actor,f:any,time:number,angle:number,x:number,y:number,index:number){
  const g=actor.tail,dx=Math.cos(angle),dy=Math.sin(angle);g.clear();
  const current=orbitSwordPose(f,time,index);
  const evolved=f.id==='evo_wuwo'||f.motion==='wuwo',speed='speedFactor' in current?current.speedFactor:1;
  const steps=evolved?TRAIL_SEGMENTS:8;
  const wake=evolved?.65+.25*Math.max(0,(speed-.4)/1.2):TRAIL_SECONDS;
  const depth='depthY' in current&&current.depthY>0?.85:1;
  for(let strand=0;strand<2;strand++){
   const trail=actor.lastTrail[strand],points=trail.points;
   while(points.length<=steps)points.push({x:0,y:0,worldX:0,worldY:0,time:0});
   points.length=steps+1;
   trail.maxAlpha=evolved?(strand?240:180)*depth:(strand?40:90);
   trail.maxWidth=evolved?(strand?2.5+speed:8+speed*4):(strand?1:2.5);
   trail.radial=f.radius+f.bladeLength*(strand?-.1:.18);
   for(let j=0;j<=steps;j++){
    const point=points[j],t=Math.max(0,time-wake*(1-j/steps));
    this.samplePlayer(t);
    if(evolved){
     // Emit from the hilt, so the visible wake is behind the sword rather
     // than buried under its body. Both glow and core follow this same path.
     const pose=orbitSwordPose(f,t,index),offset=-('length' in pose?pose.length:f.bladeLength)/2;
     point.worldX=this.sampleX+pose.x+Math.cos(pose.angle)*offset;
     point.worldY=this.sampleY+pose.y+Math.sin(pose.angle)*offset;
    }else{
     const a=angle-(time-t)*f.angularSpeed;
     point.worldX=this.sampleX+Math.cos(a)*trail.radial;
     point.worldY=this.sampleY+Math.sin(a)*trail.radial;
    }
    point.time=t;
    const rx=point.worldX-x,ry=point.worldY-y;
    point.x=rx*dx+ry*dy;point.y=-rx*dy+ry*dx;
    if(j===0)continue;
    this.stroke.r=evolved?(strand?204:58):145;this.stroke.g=evolved?(strand?249:171):226;this.stroke.b=evolved?255:244;
    this.stroke.a=Math.round(trail.maxAlpha*Math.pow(j/steps,evolved?.9:1.8));
    g.strokeColor=this.stroke;g.lineWidth=trail.maxWidth*(j/steps*(evolved?.92:.7)+(evolved?.08:.3));
    g.moveTo(points[j-1].x,points[j-1].y);g.lineTo(point.x,point.y);g.stroke();
   }
  }
 }
 private hide(){
  for(const actor of this.actors)actor.node.active=false;
  if(this.flowNode)this.flowNode.active=false;
  this.historyHead=0;this.historyCount=0;this.state=null;this.lastTime=-1;this.lastX=NaN;this.lastY=NaN;
 }
 clearBindings(){
  // Pause/menu/viewport rebuilds replace scene nodes without advancing combat.
  // Keep the same state's sampled route so a rebuilt tail stays pixel-stable.
  for(const actor of this.actors)if(isValid(actor.node,true)){
   actor.node.removeFromParent();actor.node.destroy();
  }
  this.actors.length=0;this.parent=null;
  if(this.flowNode&&isValid(this.flowNode,true)){this.flowNode.removeFromParent();this.flowNode.destroy()}
  this.flowNode=null;this.flowUI=null;this.flowSprite=null;
 }
 reset(){this.clearBindings();this.hide()}
 destroy(){
  this.dead=true;this.reset();
  this.frame?.destroy();this.texture?.destroy();this.image?.decRef();
  this.frame=null;this.texture=null;this.image=null;
  for(const frame of this.flowFrames)frame.destroy();this.flowFrames=[];
  this.flowTexture?.destroy();this.flowImage?.decRef();
  this.flowFrame=null;this.flowTexture=null;this.flowImage=null;
 }
}
