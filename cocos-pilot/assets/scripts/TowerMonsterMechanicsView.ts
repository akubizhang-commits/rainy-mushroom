import {TowerChainArt} from './TowerChainArt';
import {TowerFallingRockArt} from './TowerFallingRockArt';
import {TowerSafeSealArt} from './TowerSafeSealArt';
import {TowerCrystalArt} from './TowerCrystalArt';
import {TowerCoreArt} from './TowerCoreArt';
import {TowerPillarArt} from './TowerPillarArt';
import {TowerShockwaveArt} from './TowerShockwaveArt';
import {TowerWindbladeArt} from './TowerWindbladeArt';
import {TowerBreathArt} from './TowerBreathArt';
import {TowerLightningArt} from './TowerLightningArt';
import {TowerEggArt} from './TowerEggArt';
import {TowerMiasmaArt} from './TowerMiasmaArt';
import {TowerSpiderWebArt} from './TowerSpiderWebArt';
import {Node,UITransform,Graphics,Color,Label,Sprite} from 'cc';

const KIND:Record<string,string>={clone:'镜魄',minion:'召唤兽',core:'汲灵核',crystal:'护甲结晶',pillar:'破阵机关柱',egg:'噬灵妖卵',hatchling:'幼体',lock:'锁柱'};
const OBJECTS=new Set(['core','crystal','pillar','egg','lock']);
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** Pure simulation-time feedback. Nodes are allocated once per battle, never per frame. */
export class TowerMonsterMechanicsView {
 readonly graphics:Graphics;
 readonly labels:Label[]=[];
 private cursor=0;
 private shockwaveArt:TowerShockwaveArt;
 private chainArt:TowerChainArt;
 private windbladeArt:TowerWindbladeArt;
 private breathArt:TowerBreathArt;
 private fallingRockArt:TowerFallingRockArt;
 private lightningArt:TowerLightningArt;
 private crystalArt:TowerCrystalArt;
 private coreArt:TowerCoreArt;
 private pillarArt:TowerPillarArt;
 private eggArt:TowerEggArt;
 private safeSealArt:TowerSafeSealArt;
 private miasmaArt:TowerMiasmaArt;
 private webArt:TowerSpiderWebArt;
 constructor(parent:Node,groundParent:Node=parent,actorParent:Node=parent){
  this.eggArt=new TowerEggArt(actorParent);
  this.crystalArt=new TowerCrystalArt(actorParent);
  this.coreArt=new TowerCoreArt(actorParent);
  this.pillarArt=new TowerPillarArt(actorParent);
  this.miasmaArt=new TowerMiasmaArt(groundParent);
  const root=new Node('怪物机制预警与标识');root.layer=parent.layer;parent.addChild(root);
  root.addComponent(UITransform).setContentSize(1280,720);
  this.graphics=root.addComponent(Graphics);
  this.webArt=new TowerSpiderWebArt(root);
  this.safeSealArt=new TowerSafeSealArt(root);
  this.lightningArt=new TowerLightningArt(root);
  this.fallingRockArt=new TowerFallingRockArt(root);
  this.windbladeArt=new TowerWindbladeArt(root);
  this.breathArt=new TowerBreathArt(root);
  this.chainArt=new TowerChainArt(groundParent);
  this.shockwaveArt=new TowerShockwaveArt(groundParent);
  for(let i=0;i<64;i++){
   const node=new Node(`机制提示${i}`);node.layer=root.layer;root.addChild(node);
   node.addComponent(UITransform).setContentSize(310,32);
   const label=node.addComponent(Label);label.fontSize=17;label.lineHeight=22;
   label.color=new Color('#FFF4D9');label.enableOutline=true;label.outlineColor=new Color('#172924');label.outlineWidth=2;
   node.active=false;this.labels.push(label);
  }
 }
 /** Called immediately after TowerMonsterArt resets the actor's base pose. */
 styleActor(enemy:any,node:Node|undefined){
  if(!node)return;
  const sprite=node.getComponent(Sprite);
  const enraged=(enemy.hp===undefined||enemy.hp>0)&&enemy.mechanic?.enraged;
  if(sprite)sprite.color=enemy.temporary?.kind==='clone'?new Color(177,224,241,150):enraged&&enemy.family!=='boar'?new Color(255,115,105,255):new Color(255,255,255,255);
  if(enraged)node.setScale(node.scale.x*1.2,1.2,1);
 }
 destroy(){this.windbladeArt.destroy();this.crystalArt.destroy();this.coreArt.destroy();this.chainArt.destroy();this.fallingRockArt.destroy();this.safeSealArt.destroy();this.pillarArt.destroy();this.shockwaveArt.destroy();this.webArt.destroy();this.miasmaArt.destroy();this.eggArt.destroy();this.lightningArt.destroy();this.breathArt.destroy();}
 isObject(enemy:any){return OBJECTS.has(enemy.temporary?.kind);}
 private text(value:string,x:number,y:number,safe=false){
  const label=this.labels[this.cursor++];if(!label)return;
  label.node.active=true;label.node.setPosition(x,y);label.string=value;
  label.color=new Color(safe?'#C8FFE8':'#FFF4D9');
 }
 private bar(x:number,y:number,width:number,ratio:number,color:string){
  const g=this.graphics;g.fillColor=new Color('#192B28');g.rect(x-width/2,y,width,5);g.fill();
  g.fillColor=new Color(color);g.rect(x-width/2,y,width*clamp(ratio),5);g.fill();
 }
 /** Cocos arc() starts a fresh subpath. Keep compound warnings in one continuous polygon. */
 private arcPath(x:number,y:number,r:number,start:number,end:number){
  const steps=Math.max(1,Math.ceil(Math.abs(end-start)/(Math.PI/48)));
  for(let i=1;i<=steps;i++){
   const a=start+(end-start)*i/steps;
   this.graphics.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
  }
 }
 bossStatus(enemy:any,time:number){
  const m=enemy?.mechanic;if(!m)return '';
  if(m.vulnerableUntil>time)return `破绽 · ${(m.vulnerableUntil-time).toFixed(1)}秒`;
  const end=m.phase==='windup'?m.activatesAt:m.until;
  const label=[m.enraged?'血怒':'',m.label==='血怒'&&m.enraged?'':m.label||''].filter(Boolean).join(' · ');
  return label+(end>time&&m.phase!=='idle'?` · ${(end-time).toFixed(1)}秒`:'');
 }
 draw(state:any,camera:{x:number;y:number},viewport={width:1280,height:720}){
  const g=this.graphics;g.clear();this.cursor=0;
  this.webArt.draw(state,camera);
  this.miasmaArt.draw(state,camera);
  this.safeSealArt.draw(state,camera);
  this.eggArt.draw(state,camera);
  this.crystalArt.draw(state,camera);
  this.coreArt.draw(state,camera);
  this.pillarArt.draw(state,camera);
  this.lightningArt.draw(state,camera);
  this.fallingRockArt.draw(state,camera);
  this.windbladeArt.draw(state,camera);
  this.breathArt.draw(state,camera);
  this.chainArt.draw(state,camera);
  this.shockwaveArt.draw(state,camera);
  // Map bottom: 220px from top; wave badge + gap: 40px; caption half-height + gap: 24px.
  const captionTop=viewport.height/2-284,captionBottom=-viewport.height/2+70;
  const captionX=(x:number)=>Math.max(-viewport.width/2+155,Math.min(viewport.width/2-155,x));
  for(const z of state.monsterMechanics?.zones||[]){
   const x=z.x-camera.x,y=z.y-camera.y,r=z.radius;
   if(!Number.isFinite(x+y+r)||state.time>=z.expiresAt)continue;
   const active=z.phase==='active';
   g.fillColor=new Color(208,72,40,active?100:42);g.strokeColor=new Color(active?'#FFD298':'#FF9A73');g.lineWidth=active?4:3;
   if(z.skillId==='M15'&&this.shockwaveArt.has(z.id)){g.fillColor=new Color(0,0,0,0);g.strokeColor=new Color('#C6B684');g.lineWidth=1;}
   if(z.skillId==='M18'&&this.chainArt.has(z.id)){g.fillColor=new Color(0,0,0,0);g.strokeColor=new Color('#A5B2C7');g.lineWidth=1;}
   if(z.skillId==='M16'&&this.breathArt.has(z.id)){g.fillColor=new Color(0,0,0,0);g.strokeColor=new Color('#B7C58A');g.lineWidth=1.5;}
   if(z.skillId==='M10'){
    // The authored web replaces this skill's red disk and outline.
   }else if(z.skillId==='M11'&&this.miasmaArt.has(z.id)){
    g.strokeColor=new Color('#B7C58A');g.lineWidth=1.5;g.circle(x,y,r);g.stroke();
   }else if(z.shape==='capsule'){
    const tx=z.toX-camera.x,ty=z.toY-camera.y,a=Math.atan2(ty-y,tx-x),half=z.width/2;
    g.moveTo(x+Math.cos(a-Math.PI/2)*half,y+Math.sin(a-Math.PI/2)*half);
    g.lineTo(tx+Math.cos(a-Math.PI/2)*half,ty+Math.sin(a-Math.PI/2)*half);
    this.arcPath(tx,ty,half,a-Math.PI/2,a+Math.PI/2);
    g.lineTo(x+Math.cos(a+Math.PI/2)*half,y+Math.sin(a+Math.PI/2)*half);
    this.arcPath(x,y,half,a+Math.PI/2,a+Math.PI*1.5);g.close();g.fill();g.stroke();
   }else if(z.shape==='sector'||z.shape==='ring'){
    const a=Math.atan2(z.faceY,z.faceX),half=z.angle/2,inner=z.shape==='ring'?z.innerRadius:0;
    g.moveTo(x+Math.cos(a-half)*inner,y+Math.sin(a-half)*inner);
    g.lineTo(x+Math.cos(a-half)*r,y+Math.sin(a-half)*r);
    this.arcPath(x,y,r,a-half,a+half);
    g.lineTo(x+Math.cos(a+half)*inner,y+Math.sin(a+half)*inner);
    if(inner>0)this.arcPath(x,y,inner,a+half,a-half);
    else g.lineTo(x,y);
    g.close();g.fill();g.stroke();
   }else{g.circle(x,y,r);g.fill();g.stroke();}
   if(z.shape==='safe-gates'){
    for(const safe of z.safeZones||[]){
     const sx=safe.x-camera.x,sy=safe.y-camera.y,sr=safe.radius;
     // Opaque safe disk erases the hostile tint; double outline + hatching work without colour.
     g.fillColor=new Color('#214D43');g.strokeColor=new Color('#B8FFE2');g.lineWidth=3;
     g.circle(sx,sy,sr);g.fill();g.stroke();g.circle(sx,sy,Math.max(0,sr-6));g.stroke();
     g.lineWidth=1;for(let dy=-sr+12;dy<sr;dy+=16){const dx=Math.sqrt(Math.max(0,sr*sr-dy*dy))*.82;g.moveTo(sx-dx,sy+dy);g.lineTo(sx+dx,sy+dy);}g.stroke();
     this.text('◇ 安全门区 ◇',sx,sy,true);
    }
   }
   // Consecutive M14 pulses can share one target; keep the earliest live caption legible.
   if(z.skillId==='M14'&&(state.monsterMechanics?.zones||[]).some((other:any)=>other.id!==z.id&&other.skillId==='M14'&&other.expiresAt>state.time&&other.activatesAt<z.activatesAt&&Math.hypot(other.x-z.x,other.y-z.y)<120))continue;
   const remaining=Math.max(0,z.activatesAt-state.time);
   const zoneCaptionX=z.skillId==='M17'?(x+z.toX-camera.x)/2:x;
   const desiredCaptionY=z.skillId==='M14'?y-r-32:z.shape==='safe-gates'&&(z.safeZones||[]).length?Math.min(...z.safeZones.map((safe:any)=>safe.y-camera.y-safe.radius-32)):y+Math.min(r,170)+21;
   const captionY=Math.max(captionBottom,Math.min(captionTop,desiredCaptionY));
   this.text(`${z.name||z.skillId} · ${active?'生效中':remaining.toFixed(1)+'秒'}`,captionX(zoneCaptionX),captionY);
   if(!active)this.bar(captionX(zoneCaptionX),captionY-16,72,(state.time-z.startedAt)/Math.max(.001,z.activatesAt-z.startedAt),'#FFB488');
  }
  for(const e of state.enemies||[]){
   if(e.hp<=0)continue;
   const x=e.x-camera.x,y=e.y-camera.y,r=e.radius||18,m=e.mechanic;
   if(e.temporary){
    const kind=e.temporary.kind;
    if(this.isObject(e)&&!this.eggArt.has(e.id)&&!this.pillarArt.has(e.id)&&!this.coreArt.has(e.id)&&!this.crystalArt.has(e.id)){
     g.fillColor=new Color('#45696A');g.strokeColor=new Color('#E8D6A2');g.lineWidth=3;
     if(kind==='egg'){g.circle(x,y+r,r);g.fill();g.stroke();g.moveTo(x-r/2,y+r);g.lineTo(x,y+r*1.5);g.lineTo(x+r/2,y+r*.7);g.stroke();}
     else{g.moveTo(x,y+r*2);g.lineTo(x+r,y+r);g.lineTo(x,y);g.lineTo(x-r,y+r);g.close();g.fill();g.stroke();}
    }
    const top=y+(this.isObject(e)?((kind==='pillar'||kind==='lock')?Math.max(100,r*3):(kind==='egg'||kind==='core'||kind==='crystal')?Math.max(56,r*2):r*2):Math.max(100,r*2));
    const labelY=kind==='crystal'?top+26:(top+26>captionTop?y-r-48:top+26);
    const owner=(kind==='pillar'||kind==='lock')?state.enemies.find((a:any)=>a.id===e.temporary.ownerId):null;
    const labelX=(kind==='pillar'||kind==='lock')?captionX(x+(owner&&owner.x<x?60:-60)):x;
    this.text(KIND[kind]||'机关',labelX,labelY);
    this.bar(labelX,labelY+(labelY<y?17:-19),Math.max(48,r*2),e.hp/e.maxHp,'#AEDDD1');
   }
   if(e.role==='boss'&&!e.temporary)this.text('◆ 真身',x,y-r-23);
   if(!m)continue;
   const vulnerable=m.vulnerableUntil>state.time;
   const label=vulnerable?`破绽 · ${(m.vulnerableUntil-state.time).toFixed(1)}秒`:m.label;
   if(label||m.enraged){
    const end=m.phase==='windup'?m.activatesAt:m.until;
    const timed=!vulnerable&&end>state.time&&m.phase!=='idle';
    const tallBoss=['boar','wolf','bear','spider','crocodile','rhino','yak','bat','falcon'].includes(e.family)&&e.role==='boss';
    const bodyTop=y+Math.max(64,Math.min(110,r*3.2))*2*.9*(['bat','falcon'].includes(e.family)?1.25:1)*(m.enraged?1.2:1);
    const labelY=tallBoss?(bodyTop+24>captionTop?y-r-50:bodyTop+24):y+r*2+55;
    this.text(`${m.enraged?'血怒 · ':''}${label||''}${timed?' · '+(end-state.time).toFixed(1)+'秒':''}`,x,labelY,vulnerable);
    if(timed)this.bar(x,labelY-19,100,(state.time-m.startedAt)/Math.max(.001,end-m.startedAt),'#F0CA86');
   }
  }
  for(let i=Math.min(this.cursor,this.labels.length);i<this.labels.length;i++)this.labels[i].node.active=false;
 }
}
