import {Node,UITransform,view,ResolutionPolicy,assetManager,AssetManager} from 'cc';
import {SurvivorRun} from './shared/js/survivor/SurvivorRun';
import {SurvivorSave} from './shared/js/survivor/SurvivorSave';
import * as Meta from './shared/js/survivor/Meta';
import {STRINGS} from './shared/js/survivor/data/strings';
import {SurvivorPlatform,SafeInsets} from './SurvivorPlatform';
import {SurvivorBattleArt} from './SurvivorBattleArt';
import {SurvivorInput} from './SurvivorInput';
import {SurvivorHud,ResultInfo} from './SurvivorHud';
// 生存玩法宿主视图（03 §6.1）。由 PinePilot 持有（入口接入属 T10），接口与 PackView 一致：update / render / destroy。
// 生命周期：
//  1. 构造：设计分辨率 720×1280 FIXED_WIDTH（裁决 D10），取安全区，读存档，显示营地轻量页；
//  2. 并行 loadBundle('survivor')，图集就绪前“出发”禁用；
//  3. 出发：new SurvivorRun；Game.EVENT_HIDE → run.pause()；
//  4. 每帧：setInput → advance → drainEvents → BattleArt/HUD 同步 → 按 run.state 开关模态框；
//  5. 结算：Meta.settle → save.save → 结算页；
//  6. 销毁：解绑、释放图集引用，恢复 375×812。
const RunCtor:any=SurvivorRun;
type Screen='camp'|'battle';
export class SurvivorView{
 run:any=null;screen:Screen='camp';
 private root:Node;private surface:Node;private art:SurvivorBattleArt;private hud:SurvivorHud;private input:SurvivorInput|null=null;
 private platform:SurvivorPlatform;private save:any;private profile:any;private safe:SafeInsets;private width=720;private height=1280;
 private bundle:AssetManager.Bundle|null=null;private loading=false;private failed=false;private disposed=false;
 private shownOffer:any=null;private settled=false;private endTimer=0;private result:ResultInfo|null=null;private moveTime=0;private tutorialDone=false;private firstRun=false;
 constructor(private host:any){
  view.setDesignResolutionSize(720,1280,ResolutionPolicy.FIXED_WIDTH);
  this.platform=new SurvivorPlatform(host);this.safe=this.platform.safeArea();
  this.save=new SurvivorSave(this.platform.storage);this.profile=this.save.load();
  const s=view.getVisibleSize();this.width=s.width;this.height=s.height;
  this.root=new Node('Survivor');this.root.layer=host.canvas.layer;host.canvas.addChild(this.root);this.root.addComponent(UITransform).setContentSize(this.width,this.height);
  this.art=new SurvivorBattleArt(this.root,this.width,this.height);this.art.root.active=false;
  this.surface=new Node('Joystick surface');this.surface.layer=this.root.layer;this.root.addChild(this.surface);this.surface.addComponent(UITransform).setContentSize(this.width,this.height);
  this.hud=this.makeHud();
  this.platform.onHidden(()=>this.hide());
  this.render();void this.loadBundle();
 }
 private makeHud(){return new SurvivorHud(this.root,this.width,this.height,this.safe,{
  pause:()=>{if(this.run?.pause())this.input?.reset()},
  choose:(i:number)=>{this.run?.choose(i)},
  resume:()=>{this.run?.resume()},
  toggle:(key:string)=>{const st=this.profile.settings;st[key]=!st[key];this.save.save(this.profile);this.profile=this.save.profile;this.hud.showPause(this.run,this.profile.settings)},
  quit:()=>this.hud.showQuitConfirm(),
  cancelQuit:()=>this.hud.showPause(this.run,this.profile.settings),
  abandon:()=>{this.run?.abandon()},
  again:()=>this.startRun(),
  camp:()=>{this.run=null;this.screen='camp';this.render()},
 })}
 private async loadBundle(){
  if(this.loading||this.art.ready)return;this.loading=true;this.failed=false;this.render();
  try{
   const bundle=this.bundle||await new Promise<AssetManager.Bundle>((ok,fail)=>assetManager.loadBundle('survivor',(e,b)=>e?fail(e):ok(b)));
   if(this.disposed)return;this.bundle=bundle;await this.art.load(bundle);
   if(this.disposed)return;
   this.input=new SurvivorInput(this.surface,this.art.joyBase,this.art.joyKnob,this.width,this.height,this.safe);
  }catch(error){console.error(error);this.failed=true}
  finally{this.loading=false;if(!this.disposed&&this.screen==='camp')this.render()}
 }
 private saveWarning(){return this.save.locked?STRINGS.saveLocked:!this.save.saved?STRINGS.saveFailed:''}
 // 整体重建：屏幕切换与 canvas-resize 时调用（PinePilot.resize）。
 render(){
  if(this.disposed)return;
  const s=view.getVisibleSize();this.width=s.width;this.height=s.height;this.safe=this.platform.safeArea();
  this.root.getComponent(UITransform)!.setContentSize(this.width,this.height);this.surface.getComponent(UITransform)!.setContentSize(this.width,this.height);
  this.art.resize(this.width,this.height);this.input?.resize(this.width,this.height,this.safe);
  this.hud.destroy();this.hud=this.makeHud();
  if(this.screen==='camp'){
   this.art.root.active=false;
   this.hud.buildCamp({best:this.profile.bestSurvivalSec,wins:this.profile.wins,crystals:this.profile.crystals,ready:this.art.ready,failed:this.failed,saveWarning:this.saveWarning()},()=>this.startRun(),()=>{void this.loadBundle()});
   return;
  }
  this.art.root.active=true;this.hud.buildBattle(this.firstRun&&!this.tutorialDone);this.shownOffer=null;
 }
 private startRun(){
  if(!this.art.ready||!this.input)return;
  this.firstRun=!this.profile.tutorial?.move;
  try{
   this.run=new RunCtor({seed:String(Date.now()),viewport:{width:this.width,height:this.height},bonuses:Meta.bonuses(this.profile),firstRun:this.firstRun});
  }catch(error){
   // 03 §4：数据校验失败属致命错误，不带病运行
   console.error(error);this.run=null;this.screen='camp';this.render();this.hud.label(STRINGS.dataError,this.hud.root,0,0,640,80,28);return;
  }
  this.screen='battle';this.settled=false;this.endTimer=0;this.result=null;this.moveTime=0;this.tutorialDone=false;this.input.reset();this.render();
 }
 private hide(){if(this.run&&(this.run.state==='playing'||this.run.state==='levelup'))this.run.pause();this.input?.reset()}
 update(dt:number){
  if(this.disposed||this.screen!=='battle'||!this.run||!this.input)return;
  const run=this.run,settings=this.profile.settings,playing=run.state==='playing';
  // 1. 输入
  const v=this.input.vector(dt);run.setInput(playing?v.x:0,playing?v.y:0);
  if(playing&&!this.tutorialDone&&Math.hypot(v.x,v.y)>.1){this.moveTime+=dt;if(this.moveTime>3){this.tutorialDone=true;this.hud.hideTutorial()}}
  // 2. 推进固定步长
  run.advance(dt);
  // 3. 一次性事件 → FX / 反馈
  for(const e of run.drainEvents()){
   if(e.type==='purified')this.art.purify(e.x,e.y,e.kind,settings.reduceFlash);
   else if(e.type==='playerHurt'){this.art.hurt();this.hud.hurt(settings.reduceFlash);if(settings.vibration)this.platform.vibrate('light')}
   else if(e.type==='levelUp'){if(settings.vibration)this.platform.vibrate('light')}
   else if(e.type==='won'||e.type==='lost'){if(settings.vibration)this.platform.vibrate('medium')}
  }
  // 4. 渲染同步
  this.art.sync(run,dt,settings.reduceFlash);this.hud.update(run,dt);
  // 5. 按状态开关模态框
  this.syncModal(dt);
 }
 private syncModal(dt:number){
  const run=this.run,state=run.state,hud=this.hud,input=this.input!;
  if(state!=='playing'&&input.enabled){input.reset();input.enabled=false}
  if(state==='playing'){if(hud.modal)hud.closeModal();this.shownOffer=null;input.enabled=true;return}
  if(state==='levelup'){
   if(hud.modal!=='levelup'||this.shownOffer!==run.offer){const p=run.progression;this.shownOffer=run.offer;hud.showLevelup(run.offer,p.level-p.pendingLevels+1,p.totalLevelUps===1)}
   return;
  }
  if(state==='paused'){if(hud.modal!=='pause'&&hud.modal!=='confirm')hud.showPause(run,this.profile.settings);return}
  if(state==='won'||state==='lost'){
   if(!this.settled)this.settle();
   if(hud.modal==='pause'||hud.modal==='confirm')hud.closeModal();
   this.endTimer+=dt;
   // 失败演出 1 秒后进入结算（02 §4.6）；胜利 0.6 秒
   if(hud.modal!=='result'&&this.endTimer>=(state==='won'?.6:1))hud.showResult(this.result!);
  }
 }
 private settle(){
  this.settled=true;const summary=this.run.summary(),before=this.profile.bestSurvivalSec;
  const {profile,earned}=Meta.settle(this.profile,summary);
  if(this.tutorialDone)profile.tutorial={...profile.tutorial,move:true};
  const ok=this.save.save(profile);this.profile=this.save.profile;
  this.result={won:summary.outcome==='won',survivalSec:summary.survivalSec,purified:summary.purified,level:summary.level,earned,newRecord:Math.floor(summary.survivalSec)>before,saveWarning:ok?'':this.saveWarning()||STRINGS.saveFailed};
 }
 // 冒烟/性能面板读取
 get diag(){return {state:this.run?.state||'',activeNodes:this.art.activeNodes,enemies:this.run?.enemies.count||0}}
 destroy(){
  if(this.disposed)return;this.disposed=true;
  this.platform.destroy();this.input?.destroy();this.input=null;this.art.destroy();this.hud.destroy();this.root.destroy();this.run=null;
  view.setDesignResolutionSize(375,812,ResolutionPolicy.FIXED_WIDTH);
 }
}
