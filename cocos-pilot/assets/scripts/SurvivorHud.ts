import {Node,Label,Color,Graphics,UITransform,UIOpacity,Button,BlockInputEvents,tween,Vec3} from 'cc';
import {STRINGS} from './shared/js/survivor/data/strings';
import type {SafeInsets} from './SurvivorPlatform';
// 界面层（02 §4.1–§4.6、§5.2）：营地页、局内 HUD（经验条/等级/计时/净化数/暂停按钮/受伤晕影/新手提示）、
// 模态框（升级三选一、暂停、放弃确认、结算）。只用 Label/Graphics，不依赖分包，也不进战斗图集。
// Graphics 只在构建时绘制一次；经验条通过缩放填充节点更新，Label 只在数值变化时赋值。
const C=(h:string,a=255)=>{const c=new Color(h);c.a=a;return c};
const PANEL=C('#1C2E2B',224),PANEL_EDGE=C('#5F7F6E'),TEXT=C('#F4F1E8'),TEXT2=C('#B9C6BC'),PRIMARY=C('#E8B85A'),PRIMARY_TEXT=C('#1C2E2B');
const XP=C('#6FE3C1'),XP_BG=C('#1C2E2B'),GOLD=C('#F2C14E'),WARN=C('#E8A07A'),HURT=C('#E86A5A');
export const mmss=(sec:number)=>{const s=Math.max(0,Math.floor(sec));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
export type HudHandlers={pause():void,choose(i:number):void,resume():void,toggle(key:string):void,quit():void,abandon():void,cancelQuit():void,again():void,camp():void};
export type ResultInfo={won:boolean,survivalSec:number,purified:number,level:number,earned:any,newRecord:boolean,saveWarning:string};
export class SurvivorHud{
 root:Node;modal:string|null=null;
 private hud:Node|null=null;private modalNode:Node|null=null;private xpFill:Node|null=null;private xpShown=0;
 private levelLabel:Label|null=null;private timeLabel:Label|null=null;private purifiedLabel:Label|null=null;private vignette:UIOpacity|null=null;private tutorial:Node|null=null;
 private last={level:-1,sec:-1,purified:-1};private hurtFade=0;private hurtPeak=.4;private lowHp=false;private unlocked=false;
 constructor(parent:Node,private width:number,private height:number,private safe:SafeInsets,private on:HudHandlers){this.root=this.node('Survivor interface',parent,width,height)}
 private get top(){return this.height/2-this.safe.safeTop}
 private get bottom(){return -this.height/2+this.safe.safeBottom}
 // ---------- 基础组件 ----------
 node(name:string,parent:Node,w=1,h=1){const n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);return n}
 label(text:string,parent:Node,x:number,y:number,w:number,h:number,size=28,color=TEXT,align=Label.HorizontalAlign.CENTER,live=false){
  const n=this.node('label',parent,w,h);n.setPosition(x,y);const l=n.addComponent(Label);l.string=text;l.fontSize=size;l.lineHeight=Math.round(size*1.3);l.color=color;
  l.horizontalAlign=align;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;l.enableWrapText=true;if(live)l.cacheMode=Label.CacheMode.CHAR;return l;
 }
 private panel(n:Node,fill=PANEL,edge:Color|null=PANEL_EDGE,r=20,lw=2){const s=n.getComponent(UITransform)!.contentSize,g=n.addComponent(Graphics);g.fillColor=fill;g.roundRect(-s.width/2,-s.height/2,s.width,s.height,r);g.fill();if(edge){g.strokeColor=edge;g.lineWidth=lw;g.roundRect(-s.width/2+lw/2,-s.height/2+lw/2,s.width-lw,s.height-lw,r);g.stroke()}return g}
 // 热区 ≥ 88×88u（02 §5.2）；按下缩放 0.96，松手在热区内才触发（Button 自带判定）。
 button(text:string,parent:Node,x:number,y:number,w:number,h:number,fn:()=>void,tone:'primary'|'secondary'='primary',size=32){
  const n=this.node(text,parent,Math.max(88,w),Math.max(88,h));n.setPosition(x,y);
  const face=this.node('face',n,w,h);this.panel(face,tone==='primary'?PRIMARY:PANEL,tone==='primary'?null:PANEL_EDGE,18);
  this.label(text,n,0,0,w-24,h,size,tone==='primary'?PRIMARY_TEXT:TEXT);
  const b=n.addComponent(Button);b.transition=Button.Transition.SCALE;b.zoomScale=.96;n.on(Button.EventType.CLICK,fn);return n;
 }
 private dim(alpha:number){const n=this.node('modal',this.root,this.width,this.height);n.addComponent(BlockInputEvents);const g=n.addComponent(Graphics);g.fillColor=new Color(10,20,18,Math.round(255*alpha));g.rect(-this.width/2,-this.height/2,this.width,this.height);g.fill();return n}
 // ---------- 营地页（03 §6.1 轻量页，不依赖分包） ----------
 buildCamp(info:{best:number,wins:number,crystals:number,ready:boolean,failed:boolean,saveWarning:string},start:()=>void,retry:()=>void){
  this.clear();const page=this.node('camp',this.root,this.width,this.height),g=page.addComponent(Graphics);g.fillColor=C('#263F3C');g.rect(-this.width/2,-this.height/2,this.width,this.height);g.fill();
  this.label(`${STRINGS.campCrystals} ◆ ${info.crystals}`,page,-this.width/2+this.safe.safeLeft+130,this.top-30,260,48,28,TEXT,Label.HorizontalAlign.LEFT);
  this.label(STRINGS.gameTitle,page,0,this.top-260,600,96,64);
  this.label(`${STRINGS.campBest} ${mmss(info.best)}    ${STRINGS.campWins} ${info.wins}`,page,0,this.top-360,600,48,28,TEXT2);
  if(info.saveWarning)this.label(info.saveWarning,page,0,this.top-420,640,48,24,WARN);
  const y=this.bottom+360;
  if(info.failed)this.button(`${STRINGS.campLoadFailed} · ${STRINGS.campRetry}`,page,0,y,480,112,retry,'secondary');
  else if(!info.ready){this.button(STRINGS.campLoading,page,0,y,480,112,()=>{},'secondary').getComponent(Button)!.interactable=false}
  else this.button(STRINGS.campStart,page,0,y,480,112,start,'primary',40);
  this.modal=null;
 }
 // ---------- 局内 HUD（02 §4.3） ----------
 buildBattle(firstRun:boolean){
  this.clear();const hud=this.hud=this.node('hud',this.root,this.width,this.height);
  // 受伤 / 低生命晕影：屏幕四边 #E86A5A，不画在角色身上（02 §7）
  const vig=this.node('vignette',hud,this.width,this.height),vg=vig.addComponent(Graphics),W=this.width/2,H=this.height/2;
  for(let i=0;i<8;i++){const d=i*10,a=Math.round(150*(1-i/8));vg.fillColor=new Color(HURT.r,HURT.g,HURT.b,a);vg.rect(-W+d,-H,10,2*H);vg.rect(W-d-10,-H,10,2*H);vg.rect(-W,H-d-10,2*W,10);vg.rect(-W,-H+d,2*W,10);vg.fill()}
  this.vignette=vig.addComponent(UIOpacity);this.vignette.opacity=0;
  // 经验条：整宽（左右安全边距内），高 16u；等级 28u
  const left=-this.width/2+this.safe.safeLeft,right=this.width/2-this.safe.safeRight,barW=right-left-110,y1=this.top-16;
  const bg=this.node('xp-bg',hud,barW,16);bg.setPosition(left+barW/2,y1);this.panel(bg,XP_BG,PANEL_EDGE,8,2);
  const fill=this.xpFill=this.node('xp-fill',hud,barW,16);fill.getComponent(UITransform)!.setAnchorPoint(0,.5);fill.setPosition(left,y1);
  const fg=fill.addComponent(Graphics);fg.fillColor=XP;fg.roundRect(0,-8,barW,16,8);fg.fill();fill.setScale(0,1,1);this.xpShown=0;
  this.levelLabel=this.label('Lv 1',hud,right-50,y1,100,40,28,TEXT,Label.HorizontalAlign.RIGHT,true);
  // 第二行：净化数（左）· 计时（中，40u）· 暂停按钮（右，胶囊下方，视觉 64u / 热区 88u，裁决 D12）
  const y2=this.top-76;
  this.purifiedLabel=this.label('',hud,left+130,y2,260,48,28,TEXT,Label.HorizontalAlign.LEFT,true);
  this.timeLabel=this.label('00:00',hud,0,y2,200,56,40,TEXT,Label.HorizontalAlign.CENTER,true);
  const pause=this.node('pause',hud,88,88);pause.setPosition(right-44,y2);const face=this.node('face',pause,64,64);const pg=this.panel(face,PANEL,PANEL_EDGE,16);
  pg.fillColor=TEXT;pg.rect(-12,-16,8,32);pg.rect(4,-16,8,32);pg.fill();
  const b=pause.addComponent(Button);b.transition=Button.Transition.SCALE;b.zoomScale=.96;pause.on(Button.EventType.CLICK,()=>this.on.pause());
  // 新手首条提示（01 §14）：safeBottom 上方 200u
  if(firstRun){const t=this.tutorial=this.node('tutorial',hud,640,72);t.setPosition(0,this.bottom+200);this.panel(t);this.label(STRINGS.tutorialMove,t,0,0,600,64,28)}
  this.last={level:-1,sec:-1,purified:-1};this.hurtFade=0;this.modal=null;
 }
 hideTutorial(){if(this.tutorial){this.tutorial.destroy();this.tutorial=null}}
 // 小旅人受伤：晕影 α0.4 淡出 0.25 秒；reduceFlash 时 α0.25 常亮淡出不闪（02 §5.3）
 hurt(reduceFlash:boolean){this.hurtFade=.25;this.hurtPeak=reduceFlash?.25:.4}
 update(run:any,dt:number){
  if(!this.hud)return;const prog=run.progression,sec=Math.floor(run.time);
  if(prog.level!==this.last.level){this.last.level=prog.level;this.levelLabel!.string='Lv '+prog.level}
  if(sec!==this.last.sec){this.last.sec=sec;this.timeLabel!.string=mmss(sec)}
  if(run.purified!==this.last.purified){this.last.purified=run.purified;this.purifiedLabel!.string=`${STRINGS.hudPurified} ${run.purified}`}
  // 经验条填充平滑 0.15 秒
  const target=Math.max(0,Math.min(1,prog.xp/prog.needed));this.xpShown+=(target-this.xpShown)*Math.min(1,dt/.15);if(target<this.xpShown-.5)this.xpShown=target;this.xpFill!.setScale(this.xpShown,1,1);
  // 生命 < 30%：常驻暗红晕影 α0.25（不闪烁）
  this.lowHp=run.player.hp<run.player.maxHp*.3;if(this.hurtFade>0)this.hurtFade=Math.max(0,this.hurtFade-dt);
  const a=Math.max(this.lowHp?.25:0,this.hurtPeak*(this.hurtFade/.25));this.vignette!.opacity=Math.round(255*a);
 }
 // ---------- 模态框 ----------
 closeModal(){this.modalNode?.destroy();this.modalNode=null;this.modal=null;this.unlocked=false}
 private openModal(kind:string,alpha:number){this.closeModal();this.modal=kind;return this.modalNode=this.dim(alpha)}
 // 升级三选一（02 §4.4）：三张整宽卡竖向堆叠；0.4 秒内从下方 40u 滑入并淡入，结束前点击无效。
 showLevelup(offer:any[],level:number,first:boolean){
  const m=this.openModal('levelup',.6),cardH=200,gap=24,mid=(this.top+this.bottom)/2,y0=mid+cardH+gap-20;
  this.label(`${STRINGS.levelUpTitle} · Lv ${level}`,m,0,y0+cardH/2+90,640,64,44);
  if(first)this.label(STRINGS.levelUpHintFirst,m,0,y0+cardH/2+40,640,40,28,TEXT2);
  const cards:Node[]=[];
  offer.forEach((card,i)=>{
   const n=this.node('card',m,640,cardH),y=y0-i*(cardH+gap);n.setPosition(0,y-40);const op=n.addComponent(UIOpacity);op.opacity=0;this.panel(n,PANEL,card.kind==='weapon'?C('#F2B544'):PANEL_EDGE,20,4);
   const [name,desc,tag,icon]=card.kind==='weapon'?[STRINGS.cardSporeShot,STRINGS.cardSporeShotDesc,`Lv ${card.level-1}→${card.level}`,C('#F2B544')]:card.kind==='heal'?[STRINGS.cardHealDew,STRINGS.cardHealDewDesc,STRINGS.cardSupply,C('#8FD3FF')]:[STRINGS.cardShinySpore,STRINGS.cardShinySporeDesc,STRINGS.cardSupply,C('#8FD3FF')];
   // 占位图标：圆角方块（武器琥珀 / 兜底水蓝）+ 名称前 2 字（02 §8.5）
   const ic=this.node('icon',n,96,96);ic.setPosition(-320+24+48,0);this.panel(ic,icon,null,16);this.label(name.slice(0,2),ic,0,0,90,90,32,PRIMARY_TEXT);
   this.label(name,n,-320+144+130,40,260,48,32,TEXT,Label.HorizontalAlign.LEFT);
   this.label(tag,n,320-24-90,40,180,44,28,card.kind==='weapon'?GOLD:XP,Label.HorizontalAlign.RIGHT);
   this.label(desc,n,-320+144+220,-30,440,80,28,TEXT2,Label.HorizontalAlign.LEFT);
   const b=n.addComponent(Button);b.transition=Button.Transition.NONE;n.on(Button.EventType.CLICK,()=>this.pick(i,cards));
   tween(n).to(.4,{position:new Vec3(0,y,0)},{easing:'quadOut'}).start();tween(op).to(.4,{opacity:255}).start();cards.push(n);
  });
  this.unlocked=false;tween(m).delay(.4).call(()=>{if(this.modal==='levelup')this.unlocked=true}).start();
 }
 private pick(i:number,cards:Node[]){
  if(!this.unlocked||this.modal!=='levelup')return;this.unlocked=false;
  cards.forEach((c,j)=>{if(j!==i)tween(c.getComponent(UIOpacity)!).to(.12,{opacity:0}).start()});
  tween(cards[i]).to(.06,{scale:new Vec3(1.04,1.04,1)}).to(.06,{scale:new Vec3(1,1,1)}).delay(.08).call(()=>{if(this.modal==='levelup')this.on.choose(i)}).start();
 }
 // 暂停（02 §4.5）
 showPause(run:any,settings:any){
  const m=this.openModal('pause',.7);let y=this.top-140;
  this.label(STRINGS.pauseTitle,m,0,y,600,64,44);y-=80;
  this.label(`${STRINGS.pauseSurvival} ${mmss(run.time)}    ${STRINGS.hudPurified} ${run.purified}`,m,0,y,640,48,28,TEXT2);y-=110;
  this.button(STRINGS.pauseResume,m,0,y,480,112,()=>this.on.resume(),'primary',40);y-=136;
  for(const [key,text] of [['sound',STRINGS.settingSound],['vibration',STRINGS.settingVibration],['reduceFlash',STRINGS.settingReduceFlash]]){
   const on=!!settings[key],row=this.node(key,m,560,96);row.setPosition(0,y);this.panel(row,PANEL,PANEL_EDGE,16);
   this.label(text,row,-130,0,260,60,28,TEXT,Label.HorizontalAlign.LEFT);
   this.label(on?`${STRINGS.settingOn} ●`:`● ${STRINGS.settingOff}`,row,180,0,160,60,28,on?XP:TEXT2,Label.HorizontalAlign.RIGHT);
   const b=row.addComponent(Button);b.transition=Button.Transition.SCALE;b.zoomScale=.96;row.on(Button.EventType.CLICK,()=>this.on.toggle(key));y-=112;
  }
  y-=48;this.button(STRINGS.pauseQuit,m,0,y,480,96,()=>this.on.quit(),'secondary');
 }
 // 放弃确认：主按钮在左，两按钮间距 ≥ 32u（02 §4.5 / §5.2）
 showQuitConfirm(){
  const m=this.openModal('confirm',.75),box=this.node('confirm',m,640,320);box.setPosition(0,(this.top+this.bottom)/2);this.panel(box);
  this.label(STRINGS.quitConfirm,box,0,70,580,80,32);
  this.button(STRINGS.quitKeep,box,-150,-70,260,96,()=>this.on.cancelQuit(),'primary');
  this.button(STRINGS.quitGiveUp,box,150,-70,260,96,()=>this.on.abandon(),'secondary');
 }
 // 结算（02 §4.6）：统一“净化数”，失败“被浊雾笼罩”
 showResult(r:ResultInfo){
  const m=this.openModal('result',.75);let y=this.top-140;
  this.label(r.won?STRINGS.resultWin:STRINGS.resultLose,m,0,y,640,72,44,r.won?GOLD:TEXT);y-=64;
  this.label(r.won?STRINGS.resultWinDesc:STRINGS.resultLoseDesc,m,0,y,640,48,28,TEXT2);y-=60;
  const box=this.node('summary',m,640,380);box.setPosition(0,y-190);this.panel(box);
  const row=(k:string,v:string,yy:number,extra='')=>{this.label(k,box,-150,yy,280,48,28,TEXT2,Label.HorizontalAlign.LEFT);this.label(v,box,90,yy,200,48,32,TEXT,Label.HorizontalAlign.RIGHT);if(extra)this.label(extra,box,250,yy,120,44,24,GOLD)};
  row(STRINGS.resultSurvivalTime,mmss(r.survivalSec),130,r.newRecord?STRINGS.resultNewRecord:'');
  row(STRINGS.resultPurified,String(r.purified),70);row(STRINGS.resultLevel,'Lv '+r.level,10);
  row(STRINGS.resultCrystals,`+${r.earned.total} ◆`,-60);
  const e=r.earned;this.label(`${STRINGS.pauseSurvival} ${e.survival} · ${STRINGS.hudPurified} ${e.purified} · ${STRINGS.campWins} ${e.victory} · ${STRINGS.cardSupply} ${e.shiny}`,box,0,-130,600,40,24,TEXT2);
  y-=420;if(r.saveWarning){this.label(r.saveWarning,m,0,y,640,40,24,WARN);y-=50}
  this.button(STRINGS.btnPlayAgain,m,0,y-56,480,112,()=>this.on.again(),'primary',40);
  this.button(STRINGS.btnBackToCamp,m,0,y-56-136,480,96,()=>this.on.camp(),'secondary');
 }
 private clear(){this.closeModal();this.root.destroyAllChildren();this.hud=null;this.xpFill=null;this.levelLabel=this.timeLabel=this.purifiedLabel=null;this.vignette=null;this.tutorial=null}
 destroy(){this.root.destroy()}
}
