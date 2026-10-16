import {ADVENTURE_LEVELS as LONG_LEVELS} from './shared/js/microforest/ForestAdventureCampaign';
import {runForestCampaignSmoke} from './ForestCampaignSmoke';
import {_decorator,Component,Node,Camera,Canvas,UITransform,Layers,view,ResolutionPolicy,Color,sys,profiler} from 'cc';
import {MicroForestView} from './MicroForestView';
import {VINES,surfaceY} from './shared/js/microforest/MicroForestState';
import {runMicroForestSmoke} from './MicroForestSmoke';
import {LibraryView} from './LibraryView';
import {PackView} from './PackView';
import {SurvivorView} from './SurvivorView';
import {runSurvivorSmoke} from './SurvivorSmoke';
const {ccclass}=_decorator;
// Keep the serialized component UUID while replacing the legacy 3D host.
@ccclass('PinePilot')
export class PinePilot extends Component{
 canvas!:Node;microforest:MicroForestView|null=null;library:LibraryView|null=null;pack:PackView|null=null;survivor:SurvivorView|null=null;captureMode=false;
 demo=false;progressStorage:any=null;
 safeTop=28;safeBottom=20;
 private browserResize=()=>{if(sys.isBrowser)view.setFrameSize(window.innerWidth,window.innerHeight);};
 start(){
  view.setDesignResolutionSize(375,812,ResolutionPolicy.FIXED_WIDTH);
  this.canvas=new Node('Forest Canvas');this.node.scene.addChild(this.canvas);this.canvas.layer=Layers.Enum.UI_2D;this.canvas.addComponent(UITransform);
  const canvas=this.canvas.addComponent(Canvas),cameraNode=new Node('Forest UI Camera');this.node.scene.addChild(cameraNode);
  const camera=cameraNode.addComponent(Camera);camera.projection=Camera.ProjectionType.ORTHO;camera.clearFlags=Camera.ClearFlag.SOLID_COLOR;
  camera.clearColor=new Color('#263f3c');camera.visibility=Layers.Enum.UI_2D;cameraNode.setPosition(0,0,1000);camera.near=1;camera.far=2000;canvas.cameraComponent=camera;
  this.demo=sys.isBrowser&&(new URLSearchParams(window.location.search).has('review')||new URLSearchParams(window.location.search).get('microSmoke')==='1');if(sys.isBrowser&&(new URLSearchParams(window.location.search).get('campaignSmoke')==='1'||new URLSearchParams(window.location.search).has('audit'))){const data=new Map();this.progressStorage={getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v)};}profiler.hideStats();this.measureSafeArea();
  const query=sys.isBrowser?new URLSearchParams(window.location.search):null;
  // Survivor entrance (03 §2.2, M1–M2): browser ?survivor or WeChat launch query survivor. The default entry stays PackView until M3.
  if(this.survivorRequested(query)){const smoke=query?.get('smoke')==='1';if(smoke){const data=new Map();this.progressStorage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)};}this.survivor=new SurvivorView(this);view.on('canvas-resize',this.resize,this);if(sys.isBrowser){window.addEventListener('resize',this.browserResize);this.browserResize();}if(smoke)void runSurvivorSmoke(this);return;}
  if(!query||!['forest','audit','review','microSmoke','campaignSmoke'].some(k=>query.has(k))){query?.has('library')?this.library=new LibraryView(this):this.pack=new PackView(this);view.on('canvas-resize',this.resize,this);if(sys.isBrowser){window.addEventListener('resize',this.browserResize);this.browserResize();}return;}
  this.microforest=new MicroForestView(this);view.on('canvas-resize',this.resize,this);if(sys.isBrowser){window.addEventListener('resize',this.browserResize);this.browserResize();}
  // Review fixtures use memory-only progress; normal player saves are never read or written.
  if(sys.isBrowser&&new URLSearchParams(window.location.search).has('audit')){
   const q=new URLSearchParams(window.location.search),v:any=this.microforest;
   for(const l of LONG_LEVELS){v.progress.complete(l.id);v.rewards.complete(l.id);}
   const id=q.get('audit');if(LONG_LEVELS.some(l=>l.id===id)){const enter=()=>{if(v.loading||!v.art.ready){this.scheduleOnce(enter,.1);return;}v.chooseLevel(id);const frame=()=>{if(v.loading||!v.art.ready){this.scheduleOnce(frame,.1);return;}const zone=q.get('zone')||'outside';if(zone!=='outside'&&v.state.journey.root.rooms[zone])v.state.journey.enter(zone,v.state.journey.root.rooms[zone].start);const stages=v.state.level.stages||[],st=stages[Number(q.get('stage')||0)];if(st){v.state.journey.place({x:st.entryX,y:st.entryY??90});}if(q.get('focus')==='leaf'&&st){const leaf=v.state.physics.leaves.find((l:any)=>l.x>=st.x&&l.x<st.x+st.width);if(leaf){v.state.journey.place({x:leaf.x-leaf.width*.25,y:leaf.restY-leaf.offset-1.5});v.state.physics.support=leaf.id;}}if(q.get('focus')==='drip'&&st){const drip=v.state.level.drips.find((d:any)=>d.x>=st.x&&d.x<st.x+st.width);if(drip)v.state.journey.place({x:drip.x-65,y:drip.bottom});}if(q.get('focus')==='root'&&st){const root=v.state.level.platforms.find((p:any)=>p.rootCurve&&p.a>=st.x&&p.b<st.x+st.width);if(root){const x=(root.a+root.b)/2;v.state.journey.place({x,y:surfaceY(root,x)});v.state.physics.support=root.id;}}if(q.get('focus')==='grip'&&st){const grip=v.state.grips.find((g:any)=>g.type==='wrap'&&g.x>=st.x&&g.x<st.x+st.width);if(grip){v.state.journey.place({x:grip.x,y:grip.top});v.state.physics.support=grip.host;}}if(q.get('focus')==='crouch'){v.state.journey.place({x:100,y:90});v.state.downHeld=true;v.art.motion.update(v.state,.1);v.art.motion.update(v.state,.1);this.captureMode=true;}if(q.get('focus')==='mushroom'){const cap=v.state.level.platforms.find((p:any)=>p.kind==='mushroom');if(cap){const x=cap.a-65,p=v.state.terrain.filter((p:any)=>x>=p.a&&x<=p.b&&surfaceY(p,x)<=cap.y).sort((a:any,b:any)=>surfaceY(b,x)-surfaceY(a,x))[0];if(p)v.state.journey.place({x,y:surfaceY(p,x)});}}if(q.get('focus')==='push'){const r=v.state.physics.rocks.find((r:any)=>!r.fixed&&!r.buoyant);if(r)v.state.journey.place({x:r.x-r.radius-10,y:r.y});}if(q.get('focus')==='dragonfly'){const a=v.state.journey.actors.find((a:any)=>a.kind==='dragonfly');if(a){const x=a.min-85,p=v.state.terrain.filter((p:any)=>x>=p.a&&x<=p.b&&surfaceY(p,x)<a.flightY-35).sort((p:any,q:any)=>surfaceY(q,x)-surfaceY(p,x))[0];if(p)v.state.journey.place({x,y:surfaceY(p,x)});}}if(q.get('focus')==='exit'){const e=v.state.level.exit;if(Number.isFinite(e.x)){const x=e.x-100,p=v.state.terrain.find((p:any)=>x>=p.a&&x<=p.b&&Math.abs(surfaceY(p,x)-e.y)<45);v.state.journey.place({x,y:p?surfaceY(p,x):e.y});}}if(q.has('health')){v.state.journey.hp=Math.max(0,Math.min(3,Number(q.get('health'))||0));if(v.state.journey.hp===0)v.state.death={age:0,duration:.9,reason:'HUD review',falling:false};this.captureMode=true;}v.update(0);};this.scheduleOnce(frame,.1);};this.scheduleOnce(enter,.1);}
  }
  // Browser-only review entrance; regular play always starts at the first bank.
  if(sys.isBrowser&&new URLSearchParams(window.location.search).get('review')==='canopy'){const v=this.microforest,s=v.state;s.x=2345;s.y=VINES[1].top;s.checkpointStage=3;s.checkpoint={x:VINES[1].x,y:220};s.bridgeUsed=true;s.say('蕨叶路线试玩：走近叶尖，跳向右上方。');v.update(0)}
  if(sys.isBrowser&&new URLSearchParams(window.location.search).get('review')==='beetle'){const v=this.microforest,s=v.state;s.x=1740;s.y=220;s.checkpointStage=2;s.checkpoint={x:1740,y:220};s.bridgeUsed=true;s.say('向右接近甲虫，提前起跳并继续向前，越过虫背。也可以躲进树皮下。');v.update(0)}
  if(sys.isBrowser&&new URLSearchParams(window.location.search).get('review')==='obstacles'){const v=this.microforest,s=v.state,r=s.physics.rocks[1];r.x=1930;r.y=220;r.home={x:1930,y:220};s.physics.beetle.x=2030;s.physics.beetle.dir=-1;s.x=1900;s.y=220;s.checkpointStage=2;s.checkpoint={x:1900,y:220};s.say('石头会挡住甲虫。向左推，石头也会停在树皮边；向右推可改变甲虫活动空间。');v.update(0)}
  if(sys.isBrowser&&new URLSearchParams(window.location.search).get('review')==='physics'){const v=this.microforest,s=v.state;s.x=1435;s.y=220;s.checkpointStage=2;s.checkpoint={x:1435,y:220};s.say('按住 E + 方向推石头；压弯柔茎后推上石头配重。也可跳起攀附蕨类叶柄，沿叶轴越沟。');v.update(0)}
  if(sys.isBrowser&&new URLSearchParams(window.location.search).get('review')==='bridge'){const v=this.microforest,s=v.state;s.x=1530;s.y=220;s.checkpointStage=2;s.checkpoint={x:1530,y:220};s.say('按 E 压弯柔茎，站在桥上不会回弹；离开后5秒恢复。');v.update(0)}
  if(sys.isBrowser&&new URLSearchParams(window.location.search).get('campaignSmoke')==='1')this.scheduleOnce(()=>{void runForestCampaignSmoke(this)},.1);
  if(sys.isBrowser&&new URLSearchParams(window.location.search).get('microSmoke')==='1')this.scheduleOnce(()=>{void runMicroForestSmoke(this)},.1);
 }
 private survivorRequested(query:URLSearchParams|null){if(query)return query.has('survivor');try{const q=(globalThis as any).wx?.getLaunchOptionsSync?.()?.query;return !!q&&q.survivor!==undefined}catch{return false}}
 private measureSafeArea(){try{const api=(globalThis as any).wx,info=api?.getWindowInfo?.()||api?.getSystemInfoSync?.(),capsule=api?.getMenuButtonBoundingClientRect?.();if(info){const scale=view.getVisibleSize().width/info.windowWidth;this.safeTop=Math.max(22,(capsule?.bottom+8||info.safeArea?.top||24)*scale);this.safeBottom=Math.max(16,(info.windowHeight-(info.safeArea?.bottom||info.windowHeight))*scale+10)}}catch{}}
 update(dt:number){this.survivor?.update(dt);this.library?.update(dt);this.pack?.update(dt);this.microforest?.update(this.captureMode?0:dt)}
 exitMicroforest(){this.microforest?.destroy();this.microforest=new MicroForestView(this)}
 private resize(){this.measureSafeArea();this.survivor?.render();this.library?.render();this.pack?.render();this.microforest?.render()}
 onDestroy(){if(sys.isBrowser)window.removeEventListener('resize',this.browserResize);view.off('canvas-resize',this.resize,this);this.survivor?.destroy();this.survivor=null;this.library?.destroy();this.library=null;this.pack?.destroy();this.pack=null;this.microforest?.destroy();this.microforest=null}
}
