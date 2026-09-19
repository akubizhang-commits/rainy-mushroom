import {_decorator,Component,Node,Camera,Canvas,UITransform,Layers,view,ResolutionPolicy,Color,Vec3,Vec2,input,Input,EventTouch,EventMouse,EventKeyboard,KeyCode,geometry,game,Game,sys,profiler,DirectionalLight,Label} from 'cc';
import {GameSession,FORAGING_SCENE_BY_ID} from './shared/js/cocos/GameSession';
import {ForageTrialView} from './ForageTrialView';
import {ForestMeshes} from './ForestMeshes';
import {PilotUI,UI} from './PilotUI';
import {GameScreens} from './GameScreens';
import {renderBrandScreen} from './BrandScreen';
import {HabitatMaterials} from './HabitatMaterials';
import {showModelStudy} from './ModelStudy';
import {capturePreviews} from './PreviewCapture';
import {runMigrationSmoke} from './MigrationSmoke';
const {ccclass}=_decorator;
@ccclass('PinePilot')
export class PinePilot extends Component{
 session:any;forest:ForestMeshes|null=null;materials=new HabitatMaterials();camera!:Camera;canvas!:Node;ui!:PilotUI;screens:GameScreens|null=null;ready=false;
 keys=new Set<number>();pointers=new Map<number,{x:number,y:number,lastX:number,lastY:number,move:boolean,moved:boolean}>();
 captureMode=false;private lastUI='';private lastPage='';private now=0;private look=new Vec3();private ray=new geometry.Ray();private mouseStart:any=null;private lastTouch=0;private uiEpoch=0;
 private trial:ForageTrialView|null=null;
 private pickupNode:Node|null=null;private pickupKey='';private safeTop=28;private safeBottom=20;private api:any;private savedSettings='';
 start(){
  view.setDesignResolutionSize(375,812,ResolutionPolicy.FIXED_WIDTH);
  const wxApi=(globalThis as any).wx;
  this.api={getStorageSync:(k:string)=>{const raw=wxApi?.getStorageSync?wxApi.getStorageSync(k):sys.localStorage.getItem(k);if(typeof raw==='string'){try{return JSON.parse(raw)}catch{return null}}return raw||null},setStorageSync:(k:string,v:any)=>wxApi?.setStorageSync?wxApi.setStorageSync(k,v):sys.localStorage.setItem(k,JSON.stringify(v))};
  this.session=new GameSession(this.api,wxApi||{});try{const saved=this.api.getStorageSync('rainy-mushroom-cocos-settings-v1');if(saved)this.session.settings={quality:saved.quality==='performance'?'performance':'balanced',reducedMotion:saved.reducedMotion===true}}catch{}
  this.savedSettings=JSON.stringify(this.session.settings);
  this.camera=this.node.scene.getComponentInChildren(Camera)!;this.camera.fov=60;this.camera.near=.045;this.camera.far=100;this.camera.visibility=Layers.Enum.DEFAULT;this.camera.clearFlags=Camera.ClearFlag.SOLID_COLOR;this.camera.clearColor=new Color('#BFD5C8');
  this.canvas=new Node('Canvas');this.node.scene.addChild(this.canvas);this.canvas.layer=Layers.Enum.UI_2D;this.canvas.addComponent(UITransform);const canvas=this.canvas.addComponent(Canvas);
  const uiNode=new Node('UI Camera');this.node.scene.addChild(uiNode);const uiCamera=uiNode.addComponent(Camera);uiCamera.projection=Camera.ProjectionType.ORTHO;uiCamera.clearFlags=Camera.ClearFlag.DEPTH_ONLY;uiCamera.visibility=Layers.Enum.UI_2D;uiCamera.priority=10;uiNode.setPosition(0,0,1000);uiCamera.near=1;uiCamera.far=2000;canvas.cameraComponent=uiCamera;
  this.measureSafeArea();
  input.on(Input.EventType.KEY_DOWN,this.keyDown,this);input.on(Input.EventType.KEY_UP,this.keyUp,this);input.on(Input.EventType.TOUCH_START,this.touchStart,this);input.on(Input.EventType.TOUCH_MOVE,this.touchMove,this);input.on(Input.EventType.TOUCH_END,this.touchEnd,this);input.on(Input.EventType.TOUCH_CANCEL,this.cancelInput,this);input.on(Input.EventType.MOUSE_DOWN,this.mouseDown,this);input.on(Input.EventType.MOUSE_MOVE,this.mouseMove,this);input.on(Input.EventType.MOUSE_UP,this.mouseUp,this);game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);view.on('canvas-resize',this.resize,this);
  this.session.screen='boot';profiler.hideStats();this.renderUI();
  this.prepareMaterials();
 }
 private prepareMaterials(){
  if(this.session.resourceStatus==='loading')return;this.session.resourceStatus='loading';this.lastUI='';
  this.materials.load().then(()=>{
   if(!this.isValid)return;this.ready=true;this.session.resourceStatus='ready';if(this.session.screen==='boot')this.session.screen='home';this.lastUI='';
   if(sys.isBrowser&&typeof window!=='undefined'&&window.location){
    const q=new URLSearchParams(window.location.search);
    if(q.get('trial')==='1')this.session.screen='trial';
    else if(q.has('loadingPreview'))this.session.screen=q.get('loadingPreview')==='boot'?'boot':'loading';
    else if(q.has('modelStudy'))showModelStudy(this,q.get('modelStudy')!);
    else if(q.get('capturePreviews')==='1')capturePreviews(this).then(report=>window.parent.postMessage({type:'rainy-pilot-smoke',...report},window.location.origin));
    else if(q.get('migrationSmoke')==='1')runMigrationSmoke(this.node,this.materials.items).then(report=>{window.parent.postMessage({type:'rainy-pilot-smoke',...report},window.location.origin);console.log('MIGRATION_SMOKE',JSON.stringify(report))});
    else if(q.has('scene')&&FORAGING_SCENE_BY_ID[q.get('scene')!]){this.session.selectedSceneId=q.get('scene');this.run('relaxed')}
   }
  },err=>{if(!this.isValid)return;console.error(err);this.ready=false;if(this.session.screen==='boot')this.session.screen='home';this.session.resourceStatus='failed';this.session.notice('素材加载未完成，可点击重试（R01）');this.lastUI=''})
 }
 private measureSafeArea(){const size=view.getVisibleSize();try{const api=(globalThis as any).wx,info=api?.getWindowInfo?.()||api?.getSystemInfoSync?.(),capsule=api?.getMenuButtonBoundingClientRect?.();if(info){const scale=size.width/info.windowWidth;this.safeTop=Math.max(22,(capsule?.bottom+8||info.safeArea?.top||24)*scale);this.safeBottom=Math.max(16,(info.windowHeight-(info.safeArea?.bottom||info.windowHeight))*scale+10)}}catch{}}
 private run(mode:string){
  if(!this.ready){this.session.notice('正在准备场景素材，请稍候');return}
  if(this.session.requestIntro(mode)){this.cancelInput();this.lastUI='';return}
  this.cancelInput();this.session.screen='loading';this.lastUI='';
  this.scheduleOnce(()=>this.action(()=>{
   this.forest?.destroy();this.forest=null;
   try{this.session.start(mode);this.forest=new ForestMeshes(this.node,this.session.world,this.materials.items);this.applyLighting();this.positionCamera();this.forest.update(this.session.state.currentRun)}catch(error){this.session.screen='brief';throw error}
  }),.05)
 }
 private applyLighting(){const s=this.session,world=s.world;if(!world)return;const globals=this.node.scene.globals,light=this.node.scene.getComponentInChildren(DirectionalLight),settings=world.lighting;
  globals.skybox.enabled=false;globals.ambient.skyIllum=settings.ambient;globals.ambient.skyLightingColor=new Color('#DCE9DF');globals.ambient.groundLightingColor=new Color('#91977A');globals.fog.enabled=true;globals.fog.type=0;globals.fog.fogStart=settings.fogStart;globals.fog.fogEnd=settings.fogEnd;globals.fog.fogColor=new Color(world.biome.fog);this.camera.clearColor=new Color(world.biome.sky);
  globals.shadows.enabled=s.settings.quality!=='performance';globals.shadows.type=1;globals.shadows.shadowMapSize=512;
  if(light){light.color=new Color(settings.sun);light.illuminance=settings.illuminance;light.node.setRotationFromEuler(-48,-35,0);light.shadowEnabled=s.settings.quality!=='performance';light.shadowDistance=24;light.shadowPcf=1;light.shadowBias=.0015;light.shadowNormalBias=.015}
 }
 private positionCamera(){const p=this.session.player;if(!p)return;this.camera.node.setPosition(p.x,p.y,p.z);this.look.set(p.x+Math.sin(p.yaw)*Math.cos(p.pitch),p.y+Math.sin(p.pitch),p.z-Math.cos(p.yaw)*Math.cos(p.pitch));this.camera.node.lookAt(this.look)}
 update(dt:number){
  if(!this.session||this.captureMode)return;
  if(this.session.screen==='trial'&&this.ready){if(this.forest)this.forest.root.active=false;if(!this.trial){this.cancelInput();this.ui?.destroy();this.trial=new ForageTrialView(this,this.api);this.trial.render()}return}
this.now+=dt*1000;const s=this.session;
  if(s.active){if(!Array.from(this.pointers.values()).some(p=>p.move)){s.side=Number(this.keys.has(KeyCode.KEY_D))-Number(this.keys.has(KeyCode.KEY_A));s.forward=Number(this.keys.has(KeyCode.KEY_W))-Number(this.keys.has(KeyCode.KEY_S));s.sprint=this.keys.has(KeyCode.SHIFT_LEFT)}}else this.cancelInput();
  s.tick(this.now);if(s.active){this.forest?.update(s.state.currentRun);this.positionCamera();if(!s.settings.reducedMotion&&s.settings.quality!=='performance')this.materials.update(this.now/1000)}
  if(this.forest)this.forest.root.active=['field','pause'].includes(s.screen);
  const e=s.state.selectedCollectionSpecies?s.state.getCollectionEntry(s.state.selectedCollectionSpecies.id):null;
  const key=s.screen==='field'?`field:${this.ready}:${s.player?.crouched}:${s.state.currentRun?.hasPanned}`:JSON.stringify([s.screen,this.ready,s.resourceStatus,s.revision,s.collectionPage,s.collectionFilter,s.detailTab,s.journalTab,s.notePage,s.poolPage,s.creditsPage,s.state.collectionPhotoIndex,e?.identified,e?.studiedClues,s.state.collectionLockRemaining()>0,s.player?.crouched,s.state.currentRun?.hasPanned]);
  if(this.lastUI!==key){this.lastUI=key;this.renderUI()}
  this.screens?.update();this.updatePickup();
 }
 exitTrial(){this.trial?.destroy();this.trial=null;this.session.home();this.lastUI='';this.lastPage='';this.cancelInput()}
 private action(fn:()=>void){try{fn();const settings=JSON.stringify(this.session.settings);if(settings!==this.savedSettings){this.api.setStorageSync('rainy-mushroom-cocos-settings-v1',this.session.settings);this.savedSettings=settings}}catch(error){console.error(error);this.session.notice(error instanceof Error?error.message:String(error))}if(this.session.screen!=='field')this.lastUI=''}
 private pageKey(){const s=this.session;switch(s.screen){case 'credits':return `credits:${s.creditsPage}`;case 'collection':return `collection:${s.collectionFilter}:${s.collectionPage}`;case 'detail':return `detail:${s.state.selectedCollectionSpeciesId}:${s.detailTab}`;case 'scenes':return `scenes:${s.state.selectedRegionId}`;case 'pool':return `pool:${s.selectedSceneId}:${s.poolPage}`;case 'brief':return `brief:${s.selectedSceneId}`;case 'journal':return `journal:${s.journalTab}:${s.notePage}`;default:return s.screen}}
 private renderUI(){
  const s=this.session;if(this.ui&&this.lastPage)s.scrollPositions[this.lastPage]=this.ui.scrollY();this.ui?.destroy();this.pickupNode=null;this.pickupKey='';const size=view.getVisibleSize();this.ui=new PilotUI(this.canvas,size.width,size.height,this.safeTop,this.safeBottom);this.screens=null;
  if(s.screen==='boot'||s.screen==='loading'){this.lastPage='';++this.uiEpoch;renderBrandScreen(this.ui,s.screen==='loading'?s.scene?.name||'林间探索':'');return}
  this.screens=new GameScreens(this.ui,s,{act:fn=>this.action(fn),run:mode=>this.run(mode),quality:value=>{s.settings.quality=value;this.applyLighting()},retry:()=>this.prepareMaterials()});this.screens.render();this.screens.update();
  this.lastPage=this.pageKey();const epoch=++this.uiEpoch,y=s.scrollPositions[this.lastPage]||0;this.scheduleOnce(()=>{if(epoch===this.uiEpoch)this.ui.restoreScroll(y)},0);
 }
 private updatePickup(){const s=this.session,p=s.lastPickup,key=s.screen==='field'&&p?.known&&p.until>Date.now()?p.speciesId+':'+p.until:'';if(key===this.pickupKey)return;this.pickupKey=key;this.pickupNode?.destroy();this.pickupNode=null;
  if(key){const n=this.ui.node('采集实拍',this.ui.root,116,102);n.setPosition(this.ui.width/2-76,this.ui.height/2-this.safeTop-181);this.ui.box(n,UI.paper,13);this.ui.photo(p.speciesId,0,n,82);this.pickupNode=n}
 }
 private eligible(x:number,y:number){const size=view.getVisibleSize();if(y>size.height-this.safeTop-60||y<this.safeBottom)return false;if(x>size.width*.42&&y<this.safeBottom+126)return false;return true}
 private touchStart(e:EventTouch){this.lastTouch=Date.now();if(!this.session.active)return;const p=e.getUILocation();if(!this.eligible(p.x,p.y))return;const size=view.getVisibleSize();this.pointers.set(e.getID(),{x:p.x,y:p.y,lastX:p.x,lastY:p.y,move:p.x<size.width*.42&&p.y<size.height*.43,moved:false})}
 private touchMove(e:EventTouch){const t=this.pointers.get(e.getID());if(!t)return;const p=e.getUILocation();t.moved ||=Math.hypot(p.x-t.x,p.y-t.y)>10;if(t.move){this.session.side=Math.max(-1,Math.min(1,(p.x-t.x)/44));this.session.forward=Math.max(-1,Math.min(1,(p.y-t.y)/44));this.session.sprint=Math.hypot(p.x-t.x,p.y-t.y)>64}else this.rotate(p.x-t.lastX,p.y-t.lastY);t.lastX=p.x;t.lastY=p.y}
 private touchEnd(e:EventTouch){this.lastTouch=Date.now();const t=this.pointers.get(e.getID());if(!t)return;this.pointers.delete(e.getID());if(t.move){this.session.side=this.session.forward=0;this.session.sprint=false}else if(!t.moved){const p=e.getLocation();this.pick(p.x,p.y)}}
 private rotate(dx:number,dy:number){if(!this.session.active)return;this.session.dismissHint();const p=this.session.player;p.yaw-=dx*.0045;p.pitch=Math.max(-1.2,Math.min(1.2,p.pitch+dy*.0045))}
 private pick(x:number,y:number){this.camera.screenPointToRay(x,y,this.ray);this.action(()=>{const hit=this.session.pick([this.ray.o.x,this.ray.o.y,this.ray.o.z],[this.ray.d.x,this.ray.d.y,this.ray.d.z]);if(hit)this.session.collect(hit)})}
 private mouseDown(e:EventMouse){if(Date.now()-this.lastTouch<500)return;const p=e.getUILocation();if(this.session.active&&this.eligible(p.x,p.y))this.mouseStart={x:p.x,y:p.y,lastX:p.x,lastY:p.y,moved:false}}
 private mouseMove(e:EventMouse){if(!this.mouseStart)return;const p=e.getUILocation(),m=this.mouseStart;m.moved ||=Math.hypot(p.x-m.x,p.y-m.y)>10;this.rotate(p.x-m.lastX,p.y-m.lastY);m.lastX=p.x;m.lastY=p.y}
 private mouseUp(e:EventMouse){if(this.mouseStart&&!this.mouseStart.moved&&Date.now()-this.lastTouch>=500){const p=e.getLocation();this.pick(p.x,p.y)}this.mouseStart=null}
 private keyDown(e:EventKeyboard){if(this.trial)return;if(this.session?.adBusy)return;if(this.keys.has(e.keyCode))return;this.keys.add(e.keyCode);if(e.keyCode===KeyCode.SPACE)this.session.jump();if(e.keyCode===KeyCode.KEY_C)this.session.crouch();if(e.keyCode===KeyCode.ESCAPE)this.session.active?this.session.pause():this.session.screen==='pause'?this.session.resume():this.session.back()}
 private keyUp(e:EventKeyboard){this.keys.delete(e.keyCode)}
 private cancelInput(){this.keys.clear();this.pointers.clear();this.mouseStart=null;if(this.session){this.session.side=this.session.forward=0;this.session.sprint=false}}
 private hide(){if(!this.session)return;this.session.suspended=true;this.session.stopInput();this.cancelInput();this.session.save()}
 private show(){if(this.session){this.session.suspended=false;this.session.session.pause()}}
 private resize(){this.measureSafeArea();if(this.trial)this.trial.render();this.lastUI=''}
 onDestroy(){this.trial?.destroy();this.session?.save();this.session?.destroy();input.off(Input.EventType.KEY_DOWN,this.keyDown,this);input.off(Input.EventType.KEY_UP,this.keyUp,this);input.off(Input.EventType.TOUCH_START,this.touchStart,this);input.off(Input.EventType.TOUCH_MOVE,this.touchMove,this);input.off(Input.EventType.TOUCH_END,this.touchEnd,this);input.off(Input.EventType.TOUCH_CANCEL,this.cancelInput,this);input.off(Input.EventType.MOUSE_DOWN,this.mouseDown,this);input.off(Input.EventType.MOUSE_MOVE,this.mouseMove,this);input.off(Input.EventType.MOUSE_UP,this.mouseUp,this);game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);view.off('canvas-resize',this.resize,this);this.forest?.destroy();this.ui?.destroy();this.materials.destroy()}
}
