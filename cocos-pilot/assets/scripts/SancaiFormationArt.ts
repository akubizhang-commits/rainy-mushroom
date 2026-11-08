import {Color, Graphics, ImageAsset, isValid, Node, Sprite, SpriteFrame, Texture2D, UIOpacity, UITransform} from 'cc';
import {towerResources as resources} from './TowerResources';
import {sancaiVertices} from './shared/js/xianxia/TowerSancai';
import {sancaiMotion, SANCAI_COLORS} from './shared/js/xianxia/TowerSancaiMotion';

type Sword = {node:Node;sprite:Sprite;fallback:Graphics;opacity:UIOpacity};
type Slot = {id:string|null;ground:Node;air:Node;g:Graphics;energy:Graphics;
 plate:Sprite;plateOpacity:UIOpacity;swords:Sword[];key:string};
const CAP=4;

/** Three fixed eyes share the actual triangular combat boundary. User-supplied
 * art and tinted existing swords animate from simulation time, never wall time.
 * Slots and components are retained between casts; pause does not redraw them.
 */
export class SancaiFormationArt {
 private dead=false;private requested=false;
 private image:ImageAsset|null=null;private texture:Texture2D|null=null;private frame:SpriteFrame|null=null;
 private plateImage:ImageAsset|null=null;private plateTexture:Texture2D|null=null;private plateFrame:SpriteFrame|null=null;
 private slots:Slot[]=[];private drawn=new Set<string>();
 get ready(){return !!this.frame&&!!this.plateFrame}
 preload(){
  if(this.dead||this.requested)return;this.requested=true;
  resources.load('tower-skill-fx/liangyi-pure-white-v1',ImageAsset,(error,image)=>{
   if(this.dead||error||!image)return;
   try{
    image.addRef();this.image=image;this.texture=new Texture2D();this.texture.image=image;
    this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    this.frame=new SpriteFrame();this.frame.texture=this.texture;
   }catch{
    this.frame?.destroy();this.texture?.destroy();this.image?.decRef();
    this.frame=null;this.texture=null;this.image=null;
   }
  });
  resources.load('tower-skill-fx/sancai-triad-v1',ImageAsset,(error,image)=>{
   if(this.dead||error||!image)return;
   try{
    image.addRef();this.plateImage=image;this.plateTexture=new Texture2D();this.plateTexture.image=image;
    this.plateTexture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    this.plateFrame=new SpriteFrame();this.plateFrame.texture=this.plateTexture;
   }catch{
    this.plateFrame?.destroy();this.plateTexture?.destroy();this.plateImage?.decRef();
    this.plateFrame=null;this.plateTexture=null;this.plateImage=null;
   }
  });
 }
 private node(name:string,parent:Node){
  const node=new Node(name);node.layer=parent.layer;parent.addChild(node);
  node.addComponent(UITransform);return node;
 }
 private create(ground:Node,air:Node):Slot{
  const node=this.node('三才剑阵-阵纹',ground),sky=this.node('三才剑阵-落剑',air);
  const plateNode=this.node('天地人三才阵盘',node),plate=plateNode.addComponent(Sprite);
  plate.sizeMode=Sprite.SizeMode.CUSTOM;plate.trim=false;
  const plateOpacity=plateNode.addComponent(UIOpacity);
  const g=this.node('沿纹流光与阵眼',node).addComponent(Graphics);
  const energy=this.node('交错剑气',sky).addComponent(Graphics),swords:Sword[]=[];
  for(let i=0;i<3;i++){
   const n=this.node(`三才灵剑-${i+1}`,sky);
   n.getComponent(UITransform)!.setContentSize(112,112*128/544);
   const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
   const opacity=n.addComponent(UIOpacity),fallback=this.node('灵剑轮廓',n).addComponent(Graphics);
   fallback.fillColor=new Color(222,249,255,255);
   fallback.moveTo(56,0);fallback.lineTo(40,5);fallback.lineTo(-35,4);
   fallback.lineTo(-35,-4);fallback.lineTo(40,-5);fallback.close();fallback.fill();
   fallback.strokeColor=new Color(168,220,234,255);fallback.lineWidth=3;
   fallback.moveTo(-35,-9);fallback.lineTo(-35,9);fallback.moveTo(-36,0);fallback.lineTo(-51,0);fallback.stroke();
   n.angle=-90;
   swords.push({node:n,sprite,fallback,opacity});
  }
  const slot={id:null,ground:node,air:sky,g,energy,plate,plateOpacity,swords,key:''};this.slots.push(slot);return slot;
 }
 private hide(slot:Slot){
  if(isValid(slot.ground,true))slot.ground.active=false;
  if(isValid(slot.air,true))slot.air.active=false;
  slot.id=null;slot.key='';
 }
 private triangle(g:Graphics,vertices:{x:number;y:number}[],scale=1){
  g.moveTo(vertices[0].x*scale,vertices[0].y*scale);
  for(let i=1;i<3;i++)g.lineTo(vertices[i].x*scale,vertices[i].y*scale);
  g.close();
 }
 private stroke(g:Graphics,points:{x:number;y:number}[],color:number[],alpha:number,width:number){
  if(points.length<2)return;
  g.strokeColor=new Color(color[0],color[1],color[2],Math.round(Math.max(0,Math.min(255,alpha))));
  g.lineWidth=width;g.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
  g.stroke();
 }
 syncTower(ground:Node,air:Node,s:any,camera:{x:number;y:number},reducedMotion=false):ReadonlySet<string>{
  this.drawn.clear();
  if(this.dead||!s?.player||s.player.hp<=0||['won','lost','abandoned'].includes(s.phase)){
   this.reset();return this.drawn;
  }
  if(!isValid(ground,true)||!isValid(air,true))return this.drawn;
  if(this.slots.some(slot=>!isValid(slot.ground,true)||slot.ground.parent!==ground
   ||!isValid(slot.air,true)||slot.air.parent!==air))this.clearBindings();
  this.preload();
  const zones=(s.zones||[]).filter((z:any)=>z.kind==='sancai'&&z.formId==='sj_sancai'
   &&!z.hostile&&s.time>=z.startedAt&&s.time<z.expiresAt);
  for(const slot of this.slots)if(!zones.some((z:any)=>z.id===slot.id))this.hide(slot);
  for(const z of zones){
   let slot=this.slots.find(a=>a.id===z.id)||this.slots.find(a=>a.id===null);
   if(!slot&&this.slots.length<CAP)slot=this.create(ground,air);
   if(!slot)continue;
   slot.id=z.id;slot.ground.active=true;slot.air.active=true;
   slot.ground.setPosition(z.x-camera.x,z.y-camera.y);
   slot.air.setPosition(z.x-camera.x,z.y-camera.y);
   this.drawn.add(z.id);
   const key=`${z.id}:${z.radius}:${Math.floor(s.time*60+1e-6)}:${z.pulseIndex}:${reducedMotion}:${this.ready}`;
   if(slot.key===key)continue;slot.key=key;
   const age=s.time-z.startedAt,motion=sancaiMotion(z.radius,age,z.pulseIndex,reducedMotion),fade=motion.fade;
   const vertices=sancaiVertices({x:0,y:0,radius:z.radius});
   const since=z.pulseIndex>0?s.time-(z.nextAt-z.interval):999;
   const flash=reducedMotion?0:Math.max(0,1-since/.22);
   slot.plate.spriteFrame=this.plateFrame;slot.plate.enabled=!!this.plateFrame;
   // The source's measured eye centres are registered to radius 332 on 1024px.
   slot.plate.node.getComponent(UITransform)!.setContentSize(z.radius*1024/332,z.radius*1024/332);
   slot.plateOpacity.opacity=Math.round((174+motion.breath*43+flash*28)*fade);
   const g=slot.g,energy=slot.energy;g.clear();energy.clear();
   if(!this.plateFrame){
    g.strokeColor=new Color(125,211,235,Math.round(160*fade));g.lineWidth=2;
    this.triangle(g,vertices);g.stroke();
   }
   for(const flow of motion.flows){
    const color=SANCAI_COLORS[flow.tone];
    this.stroke(g,flow.points,color,45*fade,9);
    this.stroke(g,flow.points,color,175*fade,3);
    this.stroke(g,flow.points.slice(0,3),[240,255,250],240*fade,1.2);
   }
   for(const blade of motion.blades){
    const color=SANCAI_COLORS[blade.tone],alpha=blade.alpha*fade;
    this.stroke(energy,blade.points,color,45*alpha,12);
    this.stroke(energy,blade.points,color,200*alpha,4);
    // Taper each segment towards the tail instead of a blunt laser line.
    for(let k=1;k<blade.points.length;k++)
     this.stroke(energy,blade.points.slice(k-1,k+1),[245,255,248],
      255*alpha*(1-k/10),Math.max(.45,2.4-k*.25));
   }
   for(let i=0;i<3;i++){
    const v=motion.swords[i],{landed,impact,progress}=v,color=SANCAI_COLORS[v.tone];
    const eyeRadius=z.radius*.16;
    if(!reducedMotion){
     const arc=Array.from({length:14},(_,k)=>{
      const a=age*2.6+i*2.1+k*.095;
      return {x:v.x+Math.cos(a)*eyeRadius,y:v.y+Math.sin(a)*eyeRadius};
     });
     this.stroke(g,arc,color,(130+impact*110)*fade,2);
     this.stroke(g,arc.slice(-3),[240,255,248],220*fade,1.5);
    }
    if(landed&&!reducedMotion&&impact>0){
     g.strokeColor=new Color(color[0],color[1],color[2],Math.round(230*impact*fade));g.lineWidth=2.5*impact+.5;
     g.circle(v.x,v.y,eyeRadius+(1-impact)*25);g.stroke();
    }
    const sword=slot.swords[i];
    sword.node.active=v.visible;
    sword.node.setPosition(v.x,v.y+56+v.lift);
    sword.opacity.opacity=Math.round(255*fade*(landed ? .96 : progress));
    sword.sprite.color=new Color(color[0],color[1],color[2],255);
    sword.sprite.spriteFrame=this.frame;sword.sprite.enabled=!!this.frame;
    sword.fallback.node.active=!this.frame;
    if(v.visible&&!landed&&!reducedMotion)
     this.stroke(energy,[{x:v.x,y:v.y+v.lift+75},{x:v.x,y:v.y+v.lift+145}],color,
      100*progress*fade,5);
   }
  }
  for(const e of s.effects||[])if(e.kind==='sancai'&&e.source==='sj_sancai')this.drawn.add(e.id);
  return this.drawn;
 }
 reset(){for(const slot of this.slots)this.hide(slot);this.drawn.clear()}
 clearBindings(){
  for(const slot of this.slots)for(const node of [slot.ground,slot.air])if(isValid(node,true)){
   node.removeFromParent();node.destroy();
  }
  this.slots=[];this.drawn.clear();
 }
 destroy(){
  if(this.dead)return;this.dead=true;this.clearBindings();
  this.frame?.destroy();this.texture?.destroy();this.image?.decRef();
  this.plateFrame?.destroy();this.plateTexture?.destroy();this.plateImage?.decRef();
  this.frame=null;this.texture=null;this.image=null;
  this.plateFrame=null;this.plateTexture=null;this.plateImage=null;
 }
}
