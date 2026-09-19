import {Camera,Color,Label,Node,Button,Vec3,view,Graphics} from 'cc';
import {ForageTrial,TRIAL_SPECIES,trialWorld,SPECIES_BY_ID} from './shared/js/cocos/GameSession';
import {PilotUI,UI} from './PilotUI';
import {ForestMeshes} from './ForestMeshes';
const KEY='rainy-mushroom-forage-trial-v1';
export class ForageTrialView{
 state:any;forest:ForestMeshes|null=null;ui:PilotUI|null=null;private message='轻点菌物采集；落叶堆点两次';private exiting=false;private returning:string|null=null;private saved=false;
 private cameraState:any;private oldFog=false;private oldShadow=false;private oldLight:any;
 constructor(private host:any,private api:any){
  let saved:any;try{saved=api.getStorageSync(KEY)}catch{}this.state=new ForageTrial(saved?.round,saved?.shelf);
  const c=host.camera,g=host.node.scene.globals;
  this.cameraState={projection:c.projection,orthoHeight:c.orthoHeight,position:c.node.position.clone(),rotation:c.node.rotation.clone(),color:c.clearColor.clone()};
  this.oldFog=g.fog.enabled;this.oldShadow=g.shadows.enabled;g.fog.enabled=false;g.shadows.enabled=false;
  this.oldLight=g.ambient.skyIllum;g.ambient.skyIllum=22000;
  this.makeWorld();
 }
 private makeWorld(){this.forest?.destroy();this.forest=new ForestMeshes(this.host.node,trialWorld(this.state),this.host.materials.items);this.updateWorld()}
 private updateWorld(){this.forest?.update({basketSpawnIds:this.state.basket,eatenSpawnIds:[],revealedSpawnIds:[...this.state.revealed]});for(const t of this.state.targets){const n=this.forest?.targets.get(t.id);if(n)n.active=!this.state.basket.includes(t.id)&&(!t.covered||this.state.revealed.has(t.id))}}
 private label(text:string,x:number,y:number,w:number,h:number,size=15,color=UI.ink,parent=this.ui!.root){const n=this.ui!.text(text,parent,w,h,size,color);n.setPosition(x,y);n.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.CENTER;return n}
 private act(fn:()=>void){fn();this.updateWorld();this.render()}
 render(){
  this.ui?.destroy();const size=view.getVisibleSize(),u=this.ui=new PilotUI(this.host.canvas,size.width,size.height,this.host.safeTop,this.host.safeBottom),w=u.width,h=u.height,top=h/2-u.top,bottom=-h/2+u.bottom;
  const c=this.host.camera;c.projection=Camera.ProjectionType.ORTHO;c.orthoHeight=Math.max(7.5,h/Math.max(200,h-u.top-u.bottom-300)*3.2);c.clearColor=new Color('#C9D8BC');c.node.setPosition(0,14,12);c.node.lookAt(new Vec3(0,0,0));
  if(this.state.result){this.renderResult();return}
  if(this.exiting){u.page('离开这片林子');u.paragraph('本轮尚未带回的标本不会加入试验展柜。原版收藏不受影响。');u.button('继续寻找',()=>this.act(()=>this.exiting=false),u.content!);u.button('放弃本轮，返回首页',()=>this.host.exitTrial(),u.content!,w-48,52,'paper');return}
  if(this.returning){const t=this.state.targets.find((t:any)=>t.id===this.returning);u.page('整理背篓',()=>this.act(()=>this.returning=null));u.paragraph(SPECIES_BY_ID[t.speciesId].name);u.paragraph(`占用${t.size}格 · 展览积分${t.points}`);u.paragraph('放回后仍留在原地，可以重新采集。');u.button('放回林地',()=>this.act(()=>{this.state.putBack(t.id);this.returning=null;this.message='已放回原处，可以重新选择'}),u.content!);u.button('留在背篓',()=>this.act(()=>this.returning=null),u.content!,w-48,52,'paper');return}
  const head=u.node('Trial header',u.root,w-20,110);head.setPosition(0,top-55);u.box(head,UI.paper,18);
  u.icon('back',()=>this.act(()=>this.exiting=true)).setPosition(-w/2+36,top-28);
  this.label('林间寻宝',20,top-25,w-100,34,22);
  const wanted=this.state.round===0?'带回3种不同菌物':this.state.wanted.map((id:string)=>SPECIES_BY_ID[id].name.replace('（狭义）','')).join(' · ');
  this.label(wanted,0,top-64,w-40,32,12);
  this.label(`本轮目标 ${this.state.progress}/3  ·  展柜 ${this.state.shelf.size}/6种`,0,top-91,w-40,24,13,UI.green);
  // Invisible 44pt hit areas follow the actual 3D specimen anchors; no floating sprites.
  const scale=h/(2*c.orthoHeight),sin=14/Math.sqrt(340),cos=12/Math.sqrt(340);
  for(const t of this.state.targets){if(this.state.basket.includes(t.id))continue;
   const y=t.speciesId==='trametes-versicolor'?.65:.35;
   const n=u.node('采集 '+t.id,u.root,44,44);n.setPosition(t.x*scale,(cos*y-sin*t.z)*scale);n.addComponent(Button);n.on(Button.EventType.CLICK,()=>this.act(()=>{
    const result=this.state.pick(t.id),name=SPECIES_BY_ID[t.speciesId].name;
    this.message=result==='revealed'?'落叶拨开了，再点一下采集':result==='full'?`需要${t.size}格，点背篓标本可放回`:`${name}入篓 · 占${t.size}格`;
   }));
   if(t.covered&&!this.state.revealed.has(t.id)){const dot=u.node('Leaf hint',n,8,8);dot.setPosition(0,17);const g=dot.addComponent(Graphics);g.fillColor=new Color('#EFE0A3');g.circle(0,0,3);g.fill()}
  }
  const panel=u.node('Basket panel',u.root,w-16,168);panel.setPosition(0,bottom+84);u.box(panel,UI.paper,18);
  this.label(this.message,0,bottom+146,w-36,32,12,UI.green);
  const slotW=(w-36)/6;let slot=0;
  for(const t of this.state.items){const x=-w/2+18+slotW*(slot+t.size/2),width=slotW*t.size-4,n=u.button('',()=>this.act(()=>this.returning=t.id),u.root,width,52,'paper');n.setPosition(x,bottom+99);
   const name=SPECIES_BY_ID[t.speciesId].name.replace('（狭义）','');this.label(name,0,3,width-4,38,12,UI.ink,n);this.label(`${t.size}格`,0,-17,width-4,18,10,UI.muted,n);slot+=t.size;
  }
  for(;slot<6;slot++){const n=u.node('空格',u.root,slotW-4,52);n.setPosition(-w/2+18+slotW*(slot+.5),bottom+99);u.box(n,UI.sage,8);this.label('空',0,0,slotW-4,32,12,UI.muted,n)}
  this.label(`背篓 ${this.state.used}/6格 · 点已采标本可放回`,0,bottom+61,w-30,24,12,UI.muted);
  const button=u.button(this.state.goalMet?'目标达成，带回展柜':'带回已有收获',()=>this.act(()=>{if(!this.state.items.length){this.message='先采集一朵菌物再带回';return}this.state.finish();this.save()}),u.root,w-40,52);button.setPosition(0,bottom+27);
 }
 private save(){try{this.api.setStorageSync(KEY,{round:this.state.round+1,shelf:this.state.result.shelf});this.saved=true}catch{this.saved=false}}
 private renderResult(){const u=this.ui!,r=this.state.result;u.page(r.goalMet?'满载而归':'林间小收获');const card=u.card();u.paragraph(r.goalMet?'展览目标完成，额外获得6积分':'这次收获已经带回，下次再试试展览目标',card,20);u.paragraph(`带回${r.count}份标本 · ${r.points}积分`,card);u.paragraph(`新发现${r.newIds.length}种 · 试验展柜${r.shelf.length}/6种`,card);u.decorateCard(card);
  if(r.newIds.length){u.photo(r.newIds[0],0,u.content!,150);u.paragraph(SPECIES_BY_ID[r.newIds[0]].name)}
  u.paragraph(r.shelf.map((id:string)=>SPECIES_BY_ID[id].name).join(' · '),u.content!,14);
  if(!this.saved){u.paragraph('本机保存未成功，请重试；本轮收获仍在。');u.button('重试保存',()=>this.act(()=>this.save()),u.content!)}
  u.button('再去一片林子',()=>this.act(()=>{if(!this.saved){this.save();if(!this.saved)return}this.state=new ForageTrial(this.state.round+1,r.shelf);this.message='按展览目标取舍，背篓只有6格';this.saved=false;this.makeWorld()}),u.content!);
  u.button('返回原版首页',()=>{if(!this.saved){this.act(()=>this.save());return}this.host.exitTrial()},u.content!,u.width-48,52,'paper');u.paragraph('试验展柜独立保存，原版菌物收藏不变。游戏标本不能作为现实采食依据。',u.content!,12,UI.muted);
 }
 destroy(){this.ui?.destroy();this.forest?.destroy();const c=this.host.camera,g=this.host.node.scene.globals;c.projection=this.cameraState.projection;c.orthoHeight=this.cameraState.orthoHeight;c.clearColor=this.cameraState.color;c.node.setPosition(this.cameraState.position);c.node.setRotation(this.cameraState.rotation);g.fog.enabled=this.oldFog;g.shadows.enabled=this.oldShadow;g.ambient.skyIllum=this.oldLight}
}
