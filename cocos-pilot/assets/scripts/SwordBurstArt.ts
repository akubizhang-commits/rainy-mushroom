import { presentationPreferences } from './TowerPreferences';
import {towerResources as resources} from './TowerResources';
import {Color,Graphics,ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UITransform,AudioSource,AudioClip} from 'cc';
/** One windup, four staggered inward stabs, one finite layered explosion. */
export class SwordBurstArt {
 private frame:SpriteFrame|null=null;private texture:Texture2D|null=null;private image:ImageAsset|null=null;
 private clip:AudioClip|null=null;private sound:AudioSource|null=null;private requested=false;private dead=false;
 private actors=new Map<string,{node:Node;ui:UITransform;sprite:Sprite}>();
 private bursts=new Map<string,any>();private sounded=new Set<string>();private state:any=null;private time=-1;private lastSound=-1;
 readonly covered=new Set<string>();
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  resources.load('tower-skill-fx/tiandi-solid-sword-v2',ImageAsset,(err,img)=>{if(this.dead||err||!img)return;img.addRef();this.image=img;this.texture=new Texture2D();this.texture.image=img;this.frame=new SpriteFrame();this.frame.texture=this.texture});
  resources.load('tower-skill-fx/sword-burst',AudioClip,(err,clip)=>{if(this.dead||err||!clip)return;clip.addRef();this.clip=clip});
 }
 cameraKick(s:any){
  let age=1;if(s.player?.hp<=0)return {x:0,y:0};
  for(const e of s.effects||[])if(e.kind==='sword_burst'&&e.targetIds?.length&&Math.hypot(e.x-s.player.x,e.y-s.player.y)<600){const a=s.time-e.startedAt;if(a>=0)age=Math.min(age,a)}
  const f=Math.max(0,1-age/.16);return {x:Math.sin(age*145)*4*f,y:Math.sin(age*110)*5*f};
 }
 sync(parent:Node,g:Graphics,s:any,camera:{x:number;y:number}){
  this.preload();if(this.state!==s||s.time<this.time){this.reset();this.state=s}this.time=s.time;this.covered.clear();
  if(s.player?.hp<=0){this.reset();return}
  if(!this.sound&&isValid(parent,true)){this.sound=parent.addComponent(AudioSource);this.sound.playOnAwake=false;this.sound.volume=.55}
  if(this.sound)this.sound.volume=.55*presentationPreferences().soundVolume;
  if(s.phase!=='playing')this.sound?.stop();
  const seen=new Set<string>(),lift=(r:number)=>Math.min(80,Math.max(34,r*1.4));
  const sword=(id:string,x:number,y:number,angle:number,span:number,alpha:number,gold=false)=>{
   if(!this.frame||!isValid(parent,true)||seen.size>=128)return;
   let a=this.actors.get(id);if(!a){const node=new Node(`爆裂剑气-${id}`);node.layer=parent.layer;parent.addChild(node);const ui=node.addComponent(UITransform);ui.setAnchorPoint(12/1280,.5);const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;a={node,ui,sprite};this.actors.set(id,a)}
   a.node.setPosition(x-camera.x,y-camera.y);a.node.angle=angle*180/Math.PI;a.ui.setContentSize(span*1280/1256,span*224/1256);a.sprite.color=new Color(255,gold?237:255,gold?170:255,Math.round(Math.max(0,alpha)));seen.add(id);
   const dx=Math.cos(angle),dy=Math.sin(angle),bx=x-camera.x,by=y-camera.y;
   g.strokeColor=gold?new Color(255,213,123,Math.round(alpha*.42)):new Color(106,220,255,Math.round(alpha*.42));g.lineWidth=7;
   g.moveTo(bx+dx*span*.18,by+dy*span*.18);g.lineTo(bx+dx*span,by+dy*span);g.stroke();
   g.fillColor=gold?new Color(255,251,218,Math.round(alpha)):new Color(224,253,255,Math.round(alpha));
   g.moveTo(bx+dx*span,by+dy*span);g.lineTo(bx+dx*span*.24-dy*2.2,by+dy*span*.24+dx*2.2);
   g.lineTo(bx+dx*span*.24+dy*2.2,by+dy*span*.24-dx*2.2);g.close();g.fill();
  };
  // Queue timing survives save/restore and does not depend on short-lived effect events.
  for(const e of s.swordBursts||[]){
   const age=s.time-e.startedAt,y=e.y+lift(e.targetRadius||24);
   for(let i=0;i<4;i++){
    const a=i*Math.PI/2+Math.PI/4,local=age-(.07+i*.08),t=Math.max(0,Math.min(1,local/.055));
    const span=68,r=112-58*(1-(1-t)**3),alpha=local<0?130:255;
    sword(`${e.id}:in:${i}`,e.x+Math.cos(a)*r,y+Math.sin(a)*r,a+Math.PI,span,alpha,local>=0);
    if(local>=0&&local<.085){
     const f=1-local/.085,cx=e.x-camera.x,cy=y-camera.y;
     g.strokeColor=new Color(255,249,205,Math.round(255*f));g.lineWidth=3*f;
     for(let j=0;j<5;j++){const q=a+(j-2)*.4,rr=16+20*f;g.moveTo(cx+Math.cos(q)*8,cy+Math.sin(q)*8);g.lineTo(cx+Math.cos(q)*rr,cy+Math.sin(q)*rr);g.stroke()}
    }
   }
  }
  for(const e of s.effects||[])if(e.kind==='sword_burst'&&!this.bursts.has(e.id))this.bursts.set(e.id,{...e});
  for(const [id,e] of this.bursts){
   const age=s.time-e.startedAt;if(age<0||age>=.55){this.bursts.delete(id);this.sounded.delete(id);continue}this.covered.add(id);
   const target=s.enemies.find((t:any)=>t.id===e.targetId),y=e.y+lift(target?.radius||e.targetRadius||24),x=e.x,fade=(1-age/.55)**1.4,t=Math.min(1,age/.18);
   if(s.phase==='playing'&&!this.sounded.has(id)){this.sounded.add(id);if(e.targetIds?.length&&this.clip&&this.sound&&s.time-this.lastSound>.09){this.sound.stop();this.sound.clip=this.clip;this.sound.play();this.lastSound=s.time}}
   const r=e.radius*(.12+.88*(1-(1-t)**3));
   for(const [width,alpha] of [[14,95],[4,230]]){g.strokeColor=new Color(255,232,163,Math.round(alpha*fade));g.lineWidth=width*fade;for(let i=0;i<8;i++){const a=i*Math.PI/4+.06;g.arc(x-camera.x,y-camera.y,r,a,a+.62,false);g.stroke()}}
   if(age<.09){const f=1-age/.09;g.fillColor=new Color(220,245,255,Math.round(95*f));g.circle(x-camera.x,y-camera.y,42*f);g.fill();g.fillColor=new Color(255,254,233,Math.round(255*f));for(let i=0;i<16;i++){const a=i*Math.PI/8,rr=(i%2?13:54)*f,xx=x-camera.x+Math.cos(a)*rr,yy=y-camera.y+Math.sin(a)*rr;if(i===0)g.moveTo(xx,yy);else g.lineTo(xx,yy)}g.close();g.fill()}
   // A jagged corona, crossed cutting arcs and two speeds of fragments break the circular silhouette.
   const cx=x-camera.x,cy=y-camera.y,p=Math.min(1,age/.24),out=1-(1-p)**3;
   for(let layer=0;layer<2;layer++){
    g.fillColor=new Color(layer?255:94,layer?235:206,layer?170:255,Math.round((layer?100:65)*fade));
    for(let i=0;i<48;i++){const a=i*Math.PI/24+layer*.065,rr=(i%2?(.18+(i%5)*.025):(.64+(i%7)*.055))*e.radius*(.3+.7*out)*(layer?.84:1.12);const xx=cx+Math.cos(a)*rr,yy=cy+Math.sin(a)*rr;if(i===0)g.moveTo(xx,yy);else g.lineTo(xx,yy)}g.close();g.fill();
   }
   for(let k=0;k<4;k++){
    const angle=k*Math.PI/2+.35,spread=e.radius*(.35+.7*out);
    for(let pass=0;pass<2;pass++){
     g.strokeColor=new Color(255,pass?252:199,pass?230:95,Math.round((pass?245:90)*fade));g.lineWidth=(pass?2.5:10)*fade;
     for(let j=0;j<=18;j++){const q=j/18,a=angle+(q-.5)*1.8,rr=spread*(.8+.2*Math.sin(q*Math.PI));const xx=cx+Math.cos(a)*rr,yy=cy+Math.sin(a)*rr*.62;if(j===0)g.moveTo(xx,yy);else g.lineTo(xx,yy)}g.stroke();
    }
   }
   if(age<.12){const f=1-age/.12;for(let i=0;i<4;i++){const a=i*Math.PI/2+.35,dx=Math.cos(a),dy=Math.sin(a),len=e.radius*1.12;g.fillColor=new Color(255,255,231,Math.round(245*f));g.moveTo(cx+dx*len,cy+dy*len);g.lineTo(cx-dy*9*f,cy+dx*9*f);g.lineTo(cx-dx*len*.4,cy-dy*len*.4);g.lineTo(cx+dy*9*f,cy-dx*9*f);g.close();g.fill()}}
   for(let i=0;i<24;i++){const a=i*Math.PI/12+.13,span=15+(i%4)*7,travel=(e.radius-span)*(1-(1-Math.min(1,age/(i%2?.32:.19)))**3);sword(`${id}:shard:${i}`,x+Math.cos(a)*travel,y+Math.sin(a)*travel,a,span,230*fade,true)}
   for(let i=0;i<28;i++){const a=i*2.399,rr=e.radius*(.25+.85*out)*( .6+(i%5)*.1),f=fade*(i%3?.7:1);g.fillColor=new Color(255,231,164,Math.round(230*f));g.circle(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr-age*age*70,1+(i%3)*.6);g.fill()}

  }
  for(const [id,a] of this.actors)if(!seen.has(id)){a.node.destroy();this.actors.delete(id)}
 }
 clearBindings(){for(const a of this.actors.values())a.node.destroy();this.actors.clear();this.sound?.stop();this.sound?.destroy();this.sound=null}
 reset(){this.clearBindings();this.bursts.clear();this.sounded.clear();this.lastSound=-1;this.time=-1;this.state=null;this.covered.clear()}
 destroy(){this.dead=true;this.reset();this.frame?.destroy();this.texture?.destroy();this.image?.decRef();this.clip?.decRef()}
}
