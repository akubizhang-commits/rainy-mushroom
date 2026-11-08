import {enemyDebuffs} from './shared/js/xianxia/TowerEnemyStatuses';
import {NORMAL_SKILL_NAMES} from './shared/js/xianxia/TowerEnemyAttacks';
import {layoutTowerCaptions,CaptionBox} from './TowerCaptionLayout';
import {TowerArmorArt} from './TowerArmorArt';
import {TowerSlamArt} from './TowerSlamArt';
import {TowerSpiritFlowArt} from './TowerSpiritFlowArt';
import {TowerChainArt} from './TowerChainArt';
import {TowerFallingRockArt} from './TowerFallingRockArt';
import {TowerSafeSealArt} from './TowerSafeSealArt';
import {TowerCrystalArt} from './TowerCrystalArt';
import {TowerCoreArt} from './TowerCoreArt';
import {TowerPillarArt} from './TowerPillarArt';
import {TowerShockwaveArt} from './TowerShockwaveArt';
import {TowerWindbladeArt} from './TowerWindbladeArt';
import {TowerClawSwipeArt} from './TowerClawSwipeArt';
import {TowerEarthWaveArt} from './TowerEarthWaveArt';
import {TowerBreathArt} from './TowerBreathArt';
import {TowerLightningArt} from './TowerLightningArt';
import {TowerEggArt} from './TowerEggArt';
import {TowerMiasmaArt} from './TowerMiasmaArt';
import {TowerSpiderWebArt} from './TowerSpiderWebArt';
import {Node,UITransform,Graphics,Color,Label,Sprite} from 'cc';

const KIND:Record<string,string>={clone:'镜魄',minion:'召唤兽',core:'汲灵核',crystal:'护甲结晶',pillar:'破阵机关柱',egg:'噬灵妖卵',hatchling:'幼体',lock:'锁柱'};
const OBJECTS=new Set(['core','crystal','pillar','egg','lock']);
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
type CaptionBar={offset:number;width:number;ratio:number;color:string};
type Caption={debuffId?:any;statusRows?:number;value:string;x:number;y:number;safe:boolean;bar?:CaptionBar;priority:number;anchor?:{x:number;y:number};pinned:boolean};
/** Pure simulation-time feedback. Nodes are allocated once per battle, never per frame. */
export class TowerMonsterMechanicsView {
 readonly graphics:Graphics;
 readonly ranges:Graphics;
 readonly labels:Label[]=[];
 private cursor=0;
 private captions:Caption[]=[];
 readonly debuffAnchors=new Map<any,{x:number;y:number}>();
 private shockwaveArt:TowerShockwaveArt;
 private chainArt:TowerChainArt;
 private windbladeArt:TowerWindbladeArt;
 private slamArt:TowerSlamArt;
 private heavySweepArt:TowerClawSwipeArt;
 private crocodileSweepArt:TowerClawSwipeArt;
 private centipedeSweepArt:TowerClawSwipeArt;
 private clawSwipeArt:TowerClawSwipeArt;
 private bearSwipeArt:TowerClawSwipeArt;
 private apeSwipeArt:TowerClawSwipeArt;
 private earthWaveArt:TowerEarthWaveArt;
 private breathArt:TowerBreathArt;
 private fallingRockArt:TowerFallingRockArt;
 private lightningArt:TowerLightningArt;
 private brokenCrystalArt:TowerCrystalArt;
 private crystalArt:TowerCrystalArt;
 private armorArt:TowerArmorArt;
 private spiritFlowArt:TowerSpiritFlowArt;
 private coreArt:TowerCoreArt;
 private pillarArt:TowerPillarArt;
 private hatchedEggArt:TowerEggArt;
 private eggArt:TowerEggArt;
 private safeSealArt:TowerSafeSealArt;
 private miasmaArt:TowerMiasmaArt;
 private webArt:TowerSpiderWebArt;
 constructor(parent:Node,groundParent:Node=parent,private actorParent:Node=parent){
  this.armorArt=new TowerArmorArt(actorParent);
  this.hatchedEggArt=new TowerEggArt(actorParent,true);
  this.eggArt=new TowerEggArt(actorParent);
  this.brokenCrystalArt=new TowerCrystalArt(actorParent,true);
  this.crystalArt=new TowerCrystalArt(actorParent);
  this.spiritFlowArt=new TowerSpiritFlowArt(parent);
  this.coreArt=new TowerCoreArt(actorParent);
  this.pillarArt=new TowerPillarArt(actorParent);
  this.miasmaArt=new TowerMiasmaArt(groundParent);
  const root=new Node('怪物机制预警与标识');root.layer=parent.layer;parent.addChild(root);
  root.addComponent(UITransform).setContentSize(1280,720);
  this.graphics=root.addComponent(Graphics);
  const rangeRoot=new Node('怪物范围地面预警');rangeRoot.layer=groundParent.layer;groundParent.addChild(rangeRoot);
  rangeRoot.addComponent(UITransform);this.ranges=rangeRoot.addComponent(Graphics);
  this.webArt=new TowerSpiderWebArt(root);
  this.safeSealArt=new TowerSafeSealArt(root,groundParent);
  this.lightningArt=new TowerLightningArt(root);
  this.fallingRockArt=new TowerFallingRockArt(root);
  this.windbladeArt=new TowerWindbladeArt(root);
  this.breathArt=new TowerBreathArt(root);
  this.chainArt=new TowerChainArt(groundParent);
  this.shockwaveArt=new TowerShockwaveArt(groundParent);
  this.slamArt=new TowerSlamArt(groundParent);
  this.heavySweepArt=new TowerClawSwipeArt(root,'rhino','heavy-sweep',.8,.3);
  this.crocodileSweepArt=new TowerClawSwipeArt(root,'crocodile','heavy-sweep',.8,.3,[185,214,179,225]);
  this.centipedeSweepArt=new TowerClawSwipeArt(root,'centipede','heavy-sweep',.7,.26,[223,194,142,225]);
  this.clawSwipeArt=new TowerClawSwipeArt(root);
  // 83号：普通熊掌扫复用爪痕，普通猿抡臂复用重扫弧光，只换色。
  this.bearSwipeArt=new TowerClawSwipeArt(root,'bear','claw-swipe',.75,.5,[226,196,160,235],'slam');
  this.apeSwipeArt=new TowerClawSwipeArt(root,'ape','heavy-sweep',.75,.28,[214,200,178,225],'slam');
  this.earthWaveArt=new TowerEarthWaveArt(groundParent);
  for(let i=0;i<64;i++){
   const node=new Node(`机制提示${i}`);node.layer=root.layer;root.addChild(node);
   node.addComponent(UITransform).setContentSize(310,32);
   const label=node.addComponent(Label);label.fontSize=17;label.lineHeight=22;label.enableWrapText=false;
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
 destroy(){this.crocodileSweepArt.destroy();this.centipedeSweepArt.destroy();this.armorArt.destroy();this.slamArt.destroy();this.spiritFlowArt.destroy();this.brokenCrystalArt.destroy();this.hatchedEggArt.destroy();this.heavySweepArt.destroy();this.clawSwipeArt.destroy();this.bearSwipeArt.destroy();this.apeSwipeArt.destroy();this.earthWaveArt.destroy();this.windbladeArt.destroy();this.crystalArt.destroy();this.coreArt.destroy();this.chainArt.destroy();this.fallingRockArt.destroy();this.safeSealArt.destroy();this.pillarArt.destroy();this.shockwaveArt.destroy();this.webArt.destroy();this.miasmaArt.destroy();this.eggArt.destroy();this.lightningArt.destroy();this.breathArt.destroy();}
 isObject(enemy:any){return OBJECTS.has(enemy.temporary?.kind);}
 private text(value:string,x:number,y:number,safe=false,bar?:CaptionBar,priority=10,anchor?:{x:number;y:number}){
  if(!Number.isFinite(x+y))return;
  this.captions.push({value,x,y,safe,bar,priority,anchor,pinned:value==='◇ 安全门区 ◇'});
 }
 private placeCaptions(state:any,camera:{x:number;y:number},viewport:{width:number;height:number}){
  this.debuffAnchors.clear();
  const W=viewport.width,H=viewport.height;
  const obstacles:CaptionBox[]=[
   {left:-W/2,right:-W/2+310,bottom:H/2-160,top:H/2},
   {left:-210,right:210,bottom:H/2-145,top:H/2},
   {left:W/2-280,right:W/2,bottom:H/2-284,top:H/2}
  ];
  // Protect rendered creature silhouettes; children inherit the actual mirrored/scaled pose.
  for(const node of this.actorParent.children){
   if(!node.active||!node.name.startsWith('妖兽素材-'))continue;
   const t=node.getComponent(UITransform);if(!t)continue;
   const width=t.width*Math.abs(node.scale.x),height=t.height*Math.abs(node.scale.y);
   const x=node.position.x+(0.5-t.anchorX)*t.width*node.scale.x;
   const bottom=node.position.y+(0.05-t.anchorY)*height,top=node.position.y+(0.92-t.anchorY)*height;
   obstacles.push({left:x-width*.36,right:x+width*.36,bottom,top});
  }
  const objective=(e:any)=>{
   const x=e.x-camera.x,y=e.y-camera.y,h=['pillar','lock'].includes(e.temporary?.kind)?Math.max(100,e.radius*3):Math.max(56,e.radius*2);
   if(Number.isFinite(x+y+h))obstacles.push({left:x-h*.42-6,right:x+h*.42+6,bottom:y-6,top:y+h+6});
  };
  for(const e of state.enemies||[])if(e.hp>0&&this.isObject(e))objective(e);
  for(const e of state.effects||[])if(['monster_crystal_break','monster_egg_hatched'].includes(e.kind)&&state.time>=e.startedAt&&state.time<e.expiresAt)objective(e);
  if(state.player){
   const x=state.player.x-camera.x,y=state.player.y-camera.y;
   obstacles.push({left:x-40,right:x+40,bottom:y-8,top:y+115});
  }
  const requests=this.captions.filter(c=>Math.abs(c.x)<=W/2+90&&Math.abs(c.y)<=H/2+180).map(c=>({
   ...c,width:Math.min(W-24,420,Math.max(c.bar?.width||0,32,Array.from(c.value).reduce((w,ch)=>w+(/[^\x00-\x7f]/.test(ch)?17:9),0)+10)),
   top:Math.max(16,c.bar?c.bar.offset+8:16),bottom:Math.min(-16,c.statusRows?-49:c.bar?c.bar.offset-3:-16)
  }));
  for(const placed of layoutTowerCaptions(requests,obstacles,viewport)){
   const c=placed.request,label=this.labels[this.cursor++];if(!label)break;
   label.node.active=true;label.node.setPosition(placed.x,placed.y);label.string=c.value;
   label.node.getComponent(UITransform)!.setContentSize(c.width,32);
   label.color=new Color(c.safe?'#C8FFE8':'#FFF4D9');
   if(c.anchor&&Math.hypot(placed.x-c.x,placed.y-c.y)>20){
    const g=this.graphics;g.strokeColor=new Color(174,211,199,155);g.lineWidth=1;
    g.moveTo(c.anchor.x,c.anchor.y);
    g.lineTo(Math.max(placed.box.left,Math.min(placed.box.right,c.anchor.x)),Math.max(placed.box.bottom,Math.min(placed.box.top,c.anchor.y)));g.stroke();
   }
   if(c.debuffId!==undefined)this.debuffAnchors.set(c.debuffId,{x:placed.x-(c.bar?.width||c.width)/2,y:placed.y-35});
   if(c.bar)this.bar(placed.x,placed.y+c.bar.offset,c.bar.width,c.bar.ratio,c.bar.color);
  }
 }
 private bar(x:number,y:number,width:number,ratio:number,color:string){
  const g=this.graphics;g.fillColor=new Color('#192B28');g.rect(x-width/2,y,width,5);g.fill();
  g.fillColor=new Color(color);g.rect(x-width/2,y,width*clamp(ratio),5);g.fill();
 }
 /** Line hazards share the same light tint and actual windup clock as areas. */
 drawCharge(g:Graphics,z:any,time:number,camera:{x:number;y:number}){
  this.drawAreaWarning(g,{...z,shape:'capsule'},time,camera);
 }
 /** Angles are radians here; the ordinary attack adapter converts its degrees. */
 drawAreaWarning(g:Graphics,z:any,time:number,camera:{x:number;y:number},tint=[225,128,112]){
  const x=z.x-camera.x,y=z.y-camera.y,r=z.radius;
  if(![x,y,r].every(Number.isFinite)||r<=0)return;
  const progress=z.phase==='active'?1:clamp((time-z.startedAt)/Math.max(.001,z.activatesAt-z.startedAt));
  const arc=(radius:number,start:number,end:number)=>{
   const steps=Math.max(1,Math.ceil(Math.abs(end-start)/(Math.PI/48)));
   for(let i=1;i<=steps;i++){const a=start+(end-start)*i/steps;g.lineTo(x+Math.cos(a)*radius,y+Math.sin(a)*radius);}
  };
  const paint=(p:number,alpha:number)=>{
   if(!(p>0))return;
   g.fillColor=new Color(tint[0],tint[1],tint[2],alpha);
   if(z.shape==='capsule'||z.shape==='line'){
    const dx=z.toX-z.x,dy=z.toY-z.y,length=Math.hypot(dx,dy),half=(z.width||r*2)/2;
    if(!Number.isFinite(length+half)||length<=0||half<=0)return;
    const ux=dx/length,uy=dy/length,start=-half,end=start+(length+half*2)*p;
    g.moveTo(x+ux*start-uy*half,y+uy*start+ux*half);
    g.lineTo(x+ux*end-uy*half,y+uy*end+ux*half);
    g.lineTo(x+ux*end+uy*half,y+uy*end-ux*half);
    g.lineTo(x+ux*start+uy*half,y+uy*start-ux*half);g.close();
   }else if(z.shape==='sector'||z.shape==='ring'){
    const inner=z.shape==='ring'?Math.max(0,z.innerRadius||0):0;
    const outer=inner+(r-inner)*p,a=Math.atan2(z.faceY||0,z.faceX??1),half=(z.angle??Math.PI*2)/2;
    if(inner>=r||!Number.isFinite(half))return;
    g.moveTo(x+Math.cos(a-half)*inner,y+Math.sin(a-half)*inner);
    g.lineTo(x+Math.cos(a-half)*outer,y+Math.sin(a-half)*outer);arc(outer,a-half,a+half);
    g.lineTo(x+Math.cos(a+half)*inner,y+Math.sin(a+half)*inner);
    if(inner>0)arc(inner,a+half,a-half);else g.lineTo(x,y);g.close();
   }else g.circle(x,y,r*p);
   g.fill();
  };
  // Full danger is visible from the first frame; cumulative opacity stays below 22%.
  paint(1,16);paint(Number.isFinite(progress)?progress:1,Math.round(30+12*(Number.isFinite(progress)?progress:1)));
 }
 bossStatus(enemy:any,time:number){
  const m=enemy?.mechanic;if(!m)return '';
  if(m.vulnerableUntil>time)return `破绽 · ${(m.vulnerableUntil-time).toFixed(1)}秒`;
  const end=m.phase==='windup'?m.activatesAt:m.until;
  const label=[m.enraged?'血怒':'',m.label==='血怒'&&m.enraged?'':m.label||''].filter(Boolean).join(' · ');
  return label+(end>time&&m.phase!=='idle'?` · ${(end-time).toFixed(1)}秒`:'');
 }
 draw(state:any,camera:{x:number;y:number},viewport={width:1280,height:720},mouthPosition?:(id:string)=>{x:number;y:number}|null,actorTop?:(id:string)=>number|undefined,attachmentPosition?:(id:string,kind:'web'|'spirit')=>{x:number;y:number}|null){
  let g=this.ranges;g.clear();this.graphics.clear();this.cursor=0;this.captions=[];
  this.webArt.draw(state,camera,id=>attachmentPosition?.(id,'web')??null);
  this.miasmaArt.draw(state,camera);
  this.safeSealArt.draw(state,camera);
  this.eggArt.draw(state,camera);
  this.hatchedEggArt.draw(state,camera);
  this.crystalArt.draw(state,camera);
  this.armorArt.draw(state);
  this.brokenCrystalArt.draw(state,camera);
  this.coreArt.draw(state,camera);
  this.spiritFlowArt.draw(state,camera,id=>attachmentPosition?.(id,'spirit')??null);
  this.pillarArt.draw(state,camera);
  this.lightningArt.draw(state,camera);
  this.fallingRockArt.draw(state,camera);
  this.windbladeArt.draw(state,camera);
  this.breathArt.draw(state,camera,mouthPosition);
  this.chainArt.draw(state,camera);
  this.shockwaveArt.draw(state,camera);
  this.earthWaveArt.draw(state,camera);
  this.clawSwipeArt.draw(state,camera);
  this.bearSwipeArt.draw(state,camera);
  this.apeSwipeArt.draw(state,camera);
  this.heavySweepArt.draw(state,camera);
  this.crocodileSweepArt.draw(state,camera);
  this.centipedeSweepArt.draw(state,camera);
  this.slamArt.draw(state,camera);
  // Map bottom: 220px from top; wave badge + gap: 40px; caption half-height + gap: 24px.
  const captionTop=viewport.height/2-284,captionBottom=-viewport.height/2+70;
  const captionX=(x:number)=>Math.max(-viewport.width/2+155,Math.min(viewport.width/2-155,x));
  const painted=new Set<string>();
  for(const z of [...(state.monsterMechanics?.zones||[])].sort((a,b)=>a.activatesAt-b.activatesAt)){
   const x=z.x-camera.x,y=z.y-camera.y,r=z.radius;
   if(!Number.isFinite(x+y+r)||state.time>=z.expiresAt)continue;
   const active=z.phase==='active';
   const key=JSON.stringify([z.ownerId,z.skillId,z.shape,z.x,z.y,z.toX,z.toY,z.radius,z.width,z.angle,z.faceX,z.faceY]);
   const duplicate=painted.has(key);painted.add(key);
   const authoredActive=active&&(
    z.skillId==='M10'&&this.webArt.has(z.id)||['M11','M12'].includes(z.skillId)&&this.miasmaArt.has(z.id)||
    z.skillId==='M15'&&this.shockwaveArt.has(z.id)||z.skillId==='M18'&&this.chainArt.has(z.id)||
    z.skillId==='M16'&&this.breathArt.has(z.id));
   if(!duplicate&&!authoredActive){
    if(z.skillId==='M06'||z.skillId==='M20'&&z.damage>0)this.drawCharge(g,z,state.time,camera);
    else this.drawAreaWarning(g,z,state.time,camera,z.skillId==='M21'||z.damage===0?[210,180,112]:undefined);
   }
   if(z.shape==='safe-gates'){
    for(const safe of z.safeZones||[]){
     const sx=safe.x-camera.x,sy=safe.y-camera.y,sr=safe.radius;
     // Safe ground remains distinct; no extra circumference outlines.
     g.fillColor=new Color('#214D43');g.strokeColor=new Color(184,255,226,90);g.lineWidth=1;
     g.circle(sx,sy,sr);g.fill();
     g.lineWidth=1;for(let dy=-sr+12;dy<sr;dy+=16){const dx=Math.sqrt(Math.max(0,sr*sr-dy*dy))*.82;g.moveTo(sx-dx,sy+dy);g.lineTo(sx+dx,sy+dy);}g.stroke();
     this.text('◇ 安全门区 ◇',sx,sy,true);
    }
   }
   // Consecutive M14 pulses can share one target; keep the earliest live caption legible.
   if(z.skillId==='M14'&&(state.monsterMechanics?.zones||[]).some((other:any)=>other.id!==z.id&&other.skillId==='M14'&&other.expiresAt>state.time&&other.activatesAt<z.activatesAt&&Math.hypot(other.x-z.x,other.y-z.y)<120))continue;
   const remaining=Math.max(0,z.activatesAt-state.time);
   const zoneCaptionX=z.skillId==='M17'?(x+z.toX-camera.x)/2:x;
   const desiredCaptionY=['M14','M21'].includes(z.skillId)?y-r-32:z.shape==='safe-gates'&&(z.safeZones||[]).length?Math.min(...z.safeZones.map((safe:any)=>safe.y-camera.y-safe.radius-32)):y+Math.min(r,170)+21;
   const captionY=Math.max(captionBottom,Math.min(captionTop,desiredCaptionY));
   if(z.skillId==='M21'){
    const owner=state.enemies.find((e:any)=>e.id===z.ownerId);
    const progress=clamp((owner?.mechanic?.pulses||0)/90);
    this.text(active?(progress>=1?'镇妖破甲阵 · 引妖入阵':`镇妖破甲阵 · 入阵蓄能 ${Math.floor(progress*100)}%`):`镇妖破甲阵 · 凝成 ${remaining.toFixed(1)}秒`,captionX(zoneCaptionX),captionY,false,
     active?{offset:-16,width:72,ratio:progress,color:'#EBC888'}:{offset:-16,width:72,ratio:(state.time-z.startedAt)/Math.max(.001,z.activatesAt-z.startedAt),color:'#FFB488'},30);
   }else this.text(`${z.name||z.skillId} · ${active?'生效中':remaining.toFixed(1)+'秒'}`,captionX(zoneCaptionX),captionY,false,
    active?undefined:{offset:-16,width:72,ratio:(state.time-z.startedAt)/Math.max(.001,z.activatesAt-z.startedAt),color:'#FFB488'},30);
  }
  g=this.graphics;
  for(const e of state.enemies||[]){
   if(e.hp<=0)continue;
   if(e.temporary&&(state.time>=e.temporary.expiresAt||e.temporary.ownerId!==undefined&&!state.enemies.some((owner:any)=>owner.id===e.temporary.ownerId&&owner.hp>0)))continue;
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
    this.text(KIND[kind]||'机关',labelX,labelY,false,{offset:labelY<y?17:-19,width:Math.max(48,r*2),ratio:e.hp/e.maxHp,color:'#AEDDD1'},this.isObject(e)?20:0,{x,y:top+6});
   }
   const statuses=enemyDebuffs(e,state.time);
   if(statuses.length&&!this.isObject(e)){
    this.text(`${e.name||'妖兽'}`,x,(actorTop?.(e.id)??y+r*2)+55,false,{offset:-19,width:156,ratio:e.hp/e.maxHp,color:'#D98979'},18,{x,y:actorTop?.(e.id)??y+r});
    const caption=this.captions[this.captions.length-1];caption.debuffId=e.id;caption.statusRows=statuses.length;
   }
   // 83号：普通怪技能前摇显示招式名；普通攻击不显示，避免小怪堆里刷屏。
   const native=e.ai?.attack;
   if(e.role==='normal'&&e.ai?.mode==='windup'&&native&&native.kind!=='bite'&&NORMAL_SKILL_NAMES[e.family]
    &&[native.startedAt,e.ai.until,state.time].every(Number.isFinite)){
    const bodyTop=actorTop?.(e.id)??y+r*2;
    const labelY=bodyTop+24>captionTop?y-24:bodyTop+24;
    this.text(`${NORMAL_SKILL_NAMES[e.family]} · ${Math.max(0,e.ai.until-state.time).toFixed(1)}秒`,x,labelY,false,
     {offset:-19,width:80,ratio:clamp((state.time-native.startedAt)/Math.max(.001,e.ai.until-native.startedAt)),color:'#F0CA86'},15);
   }
   if(!m)continue;
   const vulnerable=m.vulnerableUntil>state.time;
   const label=vulnerable?'':m.label;
   if(label||m.enraged){
    const end=m.phase==='windup'?m.activatesAt:m.until;
    const timed=!vulnerable&&end>state.time&&m.phase!=='idle';
    const tallBoss=['boar','wolf','bear','spider','crocodile','rhino','yak','bat','falcon'].includes(e.family)&&e.role==='boss';
    const bodyTop=actorTop?.(e.id)??y+Math.max(64,Math.min(110,r*3.2))*2*.9*(['bat','falcon'].includes(e.family)?1.25:1)*(m.enraged?1.2:1);
    // Below-body fallback hugs the feet (art aligns feet to y); layout nudges it clear of the silhouette.
    const labelY=tallBoss||actorTop?.(e.id)!==undefined?(bodyTop+24>captionTop?y-24:bodyTop+24):y+r*2+55;
    this.text(`${m.enraged?'血怒 · ':''}${label||''}${timed?' · '+(end-state.time).toFixed(1)+'秒':''}`,x,labelY,vulnerable,
     timed?{offset:-19,width:100,ratio:(state.time-m.startedAt)/Math.max(.001,end-m.startedAt),color:'#F0CA86'}:undefined,25);
   }
  }
  this.placeCaptions(state,camera,viewport);
  for(let i=Math.min(this.cursor,this.labels.length);i<this.labels.length;i++)this.labels[i].node.active=false;
 }
}
