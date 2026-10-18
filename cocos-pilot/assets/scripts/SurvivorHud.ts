import {Node,Label,Color,Graphics,UITransform,UIOpacity,Button,BlockInputEvents,tween,Vec3} from 'cc';
import {STRINGS} from './shared/js/survivor/data/strings';
import {WAVES} from './shared/js/survivor/data/waves';
import type {SafeInsets} from './SurvivorPlatform';
// 界面层（02 §4.1–§4.6、§5.2）：营地页、局内 HUD（经验条/等级/计时/净化数/暂停按钮/武器栏/被动栏/Boss 血条/提示横幅/受伤晕影/新手提示）、
// 模态框（升级三选一、暂停、放弃确认、结算）。只用 Label/Graphics，不依赖分包，也不进战斗图集。
// 合批（BUG-S1-03）：局内 HUD 与三选一模态框的 Graphics 全部排在前面，Label 一律 CHAR 缓存并集中放在最后一个 text 层，
// 共享字符图集连续提交为一个批次；同一层的多个底板合并到同一个 Graphics。
// Graphics 只在构建与低频变化（选卡后栏位、Boss 出现/狂暴、横幅换色）时重绘；经验条/Boss 血条通过缩放填充节点更新，Label 只在数值变化时赋值。
const C=(h:string,a=255)=>{const c=new Color(h);c.a=a;return c};
const PANEL=C('#1C2E2B',224),PANEL_EDGE=C('#5F7F6E'),TEXT=C('#F4F1E8'),TEXT2=C('#B9C6BC'),PRIMARY=C('#E8B85A'),PRIMARY_TEXT=C('#1C2E2B');
const XP=C('#6FE3C1'),XP_BG=C('#1C2E2B'),GOLD=C('#F2C14E'),WARN=C('#E8A07A'),HURT=C('#E86A5A');
const WEAPON=C('#F2B544'),PASSIVE=C('#9FD18B'),SUPPLY=C('#8FD3FF'),EMPTY=C('#1C2E2B',77),EMPTY_EDGE=C('#5F7F6E',77);
const BOSS_BG=C('#3A2A3A',224),BOSS_FILL=C('#9B7BC4'),BOSS_RAGE=C('#FF6B4A'),BANNER_BOSS=C('#4A3560',200),BANNER_SUN=C('#1C2E2B',224);
// 局内 HUD 占用 safeTop 以下约 300u（两行状态 + 武器/被动栏 + Boss 血条），屏外指示箭头不进入这一区域
export const HUD_TOP_RESERVED=300;
const SLOT=44,SLOT_GAP=6,SLOTS=4,BOSS_W=560;
export const mmss=(sec:number)=>{const s=Math.max(0,Math.floor(sec));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
export type HudHandlers={pause():void,choose(i:number):void,resume():void,toggle(key:string):void,quit():void,abandon():void,cancelQuit():void,again():void,camp():void};
type BuildItem={id:string,level:number};
export type ResultInfo={won:boolean,survivalSec:number,purified:number,level:number,earned:any,newRecord:boolean,saveWarning:string,bossDefeated:boolean,weapons:BuildItem[],passives:BuildItem[]};
type Banner={text:string,sec:number,tone:'boss'|'sun',t:number};
const S=STRINGS as any;
// 武器/被动名称：孢子弹沿用 S1 键，其余按 card_<id>，缺失时显示 id
const nameOf=(id:string)=>id==='spore_shot'?STRINGS.cardSporeShot:(S['card_'+id]||id);
const passivesOf=(p:any):BuildItem[]=>Object.keys(p||{}).map(id=>({id,level:p[id]}));
export class SurvivorHud{
 root:Node;modal:string|null=null;
 private hud:Node|null=null;private modalNode:Node|null=null;private xpFill:Node|null=null;private xpShown=0;
 private levelLabel:Label|null=null;private timeLabel:Label|null=null;private purifiedLabel:Label|null=null;private vignette:UIOpacity|null=null;private tutorial:Node[]=[];
 private frame:Graphics|null=null;private text:Node|null=null;private slotLabels:Label[]=[];private slotKey=-1;private slotItems:{weapons:BuildItem[],passives:BuildItem[]}={weapons:[],passives:[]};
 private boss:Node|null=null;private bossFill:Graphics|null=null;private bossText:Node[]=[];private bossStatus:Label|null=null;private bossStage=-1;private bossShown=false;
 private bannerBox:Node|null=null;private bannerG:Graphics|null=null;private bannerOp:UIOpacity|null=null;private bannerLabel:Label|null=null;private bannerLabelOp:UIOpacity|null=null;
 private banner:Banner|null=null;private bannerQueue:Banner[]=[];private bannerTone='';private waveSeen=-1;
 private last={level:-1,sec:-1,purified:-1};private hurtFade=0;private hurtPeak=.4;private lowHp=false;private unlocked=false;
 constructor(parent:Node,private width:number,private height:number,private safe:SafeInsets,private on:HudHandlers){this.root=this.node('Survivor interface',parent,width,height)}
 private get top(){return this.height/2-this.safe.safeTop}
 private get bottom(){return -this.height/2+this.safe.safeBottom}
 private get left(){return -this.width/2+this.safe.safeLeft}
 private get right(){return this.width/2-this.safe.safeRight}
 // ---------- 基础组件 ----------
 node(name:string,parent:Node,w=1,h=1){const n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);return n}
 // live = CHAR 缓存：字形进共享图集，可与相邻 Label 合批（局内 HUD 与三选一全部使用）
 label(text:string,parent:Node,x:number,y:number,w:number,h:number,size=28,color=TEXT,align=Label.HorizontalAlign.CENTER,live=false){
  const n=this.node('label',parent,w,h);n.setPosition(x,y);const l=n.addComponent(Label);l.string=text;l.fontSize=size;l.lineHeight=Math.round(size*1.3);l.color=color;
  l.horizontalAlign=align;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;l.enableWrapText=true;if(live)l.cacheMode=Label.CacheMode.CHAR;return l;
 }
 private rounded(g:Graphics,x:number,y:number,w:number,h:number,fill:Color,edge:Color|null,r=20,lw=2){g.fillColor=fill;g.roundRect(x,y,w,h,r);g.fill();if(edge){g.strokeColor=edge;g.lineWidth=lw;g.roundRect(x+lw/2,y+lw/2,w-lw,h-lw,r);g.stroke()}}
 private panel(n:Node,fill=PANEL,edge:Color|null=PANEL_EDGE,r=20,lw=2){const s=n.getComponent(UITransform)!.contentSize,g=n.addComponent(Graphics);this.rounded(g,-s.width/2,-s.height/2,s.width,s.height,fill,edge,r,lw);return g}
 // 热区 ≥ 88×88u（02 §5.2）；按下缩放 0.96，松手在热区内才触发（Button 自带判定）。
 button(text:string,parent:Node,x:number,y:number,w:number,h:number,fn:()=>void,tone:'primary'|'secondary'='primary',size=32){
  const n=this.node(text,parent,Math.max(88,w),Math.max(88,h));n.setPosition(x,y);
  const face=this.node('face',n,w,h);this.panel(face,tone==='primary'?PRIMARY:PANEL,tone==='primary'?null:PANEL_EDGE,18);
  this.label(text,n,0,0,w-24,h,size,tone==='primary'?PRIMARY_TEXT:TEXT);
  const b=n.addComponent(Button);b.transition=Button.Transition.SCALE;b.zoomScale=.96;n.on(Button.EventType.CLICK,fn);return n;
 }
 private dim(alpha:number){const n=this.node('modal',this.root,this.width,this.height);n.addComponent(BlockInputEvents);const g=n.addComponent(Graphics);g.fillColor=new Color(10,20,18,Math.round(255*alpha));g.rect(-this.width/2,-this.height/2,this.width,this.height);g.fill();return n}
 // 栏位格（02 §4.3）：武器琥珀 / 被动青绿圆角方块 + 名称首字，右下角等级小字；空格 α0.3 空框。
 // 底板画进调用方给的 Graphics（同一层合并为一个批次），文字放进 text 层；labels 给出时复用已有 Label。
 private drawSlots(g:Graphics,text:Node,items:BuildItem[],kind:'weapon'|'passive',x0:number,y:number,size:number,gap:number,labels?:Label[]){
  const fs=size>=64?32:24;
  for(let i=0;i<SLOTS;i++){
   const x=x0+i*(size+gap)+size/2,it=items[i];
   if(it)this.rounded(g,x-size/2,y-size/2,size,size,kind==='weapon'?WEAPON:PASSIVE,null,size*.2);
   else this.rounded(g,x-size/2,y-size/2,size,size,EMPTY,EMPTY_EDGE,size*.2,2);
   const ch=it?nameOf(it.id).slice(0,1):'',lv=it?String(it.level):'';
   if(labels){labels[i*2].string=ch;labels[i*2+1].string=lv}
   else if(it){this.label(ch,text,x-size*.1,y+size*.06,size*.8,size*.8,fs,PRIMARY_TEXT,Label.HorizontalAlign.CENTER,true);this.label(lv,text,x+size*.3,y-size*.22,size*.45,32,24,PRIMARY_TEXT,Label.HorizontalAlign.CENTER,true)}
  }
 }
 // ---------- 营地页（03 §6.1 轻量页，不依赖分包） ----------
 buildCamp(info:{best:number,wins:number,crystals:number,ready:boolean,failed:boolean,saveWarning:string},start:()=>void,retry:()=>void){
  this.clear();const page=this.node('camp',this.root,this.width,this.height),g=page.addComponent(Graphics);g.fillColor=C('#263F3C');g.rect(-this.width/2,-this.height/2,this.width,this.height);g.fill();
  this.label(`${STRINGS.campCrystals} ◆ ${info.crystals}`,page,this.left+130,this.top-30,260,48,28,TEXT,Label.HorizontalAlign.LEFT);
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
 // 节点顺序：晕影 → frame（经验条底 + 栏位 + Boss 血条底，一个 Graphics）→ 经验条填充 → Boss 血条填充 → 暂停按钮 → 横幅底 → 新手提示底 → text（全部 Label）。
 buildBattle(firstRun:boolean){
  this.clear();const hud=this.hud=this.node('hud',this.root,this.width,this.height);
  // 受伤 / 低生命晕影：屏幕四边 #E86A5A，不画在角色身上（02 §7）
  const vig=this.node('vignette',hud,this.width,this.height),vg=vig.addComponent(Graphics),W=this.width/2,H=this.height/2;
  for(let i=0;i<8;i++){const d=i*10,a=Math.round(150*(1-i/8));vg.fillColor=new Color(HURT.r,HURT.g,HURT.b,a);vg.rect(-W+d,-H,10,2*H);vg.rect(W-d-10,-H,10,2*H);vg.rect(-W,H-d-10,2*W,10);vg.rect(-W,-H+d,2*W,10);vg.fill()}
  this.vignette=vig.addComponent(UIOpacity);this.vignette.opacity=0;
  const left=this.left,right=this.right,barW=right-left-110,y1=this.top-16,y2=this.top-76;
  this.frame=this.node('frame',hud,this.width,this.height).addComponent(Graphics);
  // 经验条：整宽（左右安全边距内），高 16u；等级 28u
  const fill=this.xpFill=this.node('xp-fill',hud,barW,16);fill.getComponent(UITransform)!.setAnchorPoint(0,.5);fill.setPosition(left,y1);
  const fg=fill.addComponent(Graphics);fg.fillColor=XP;fg.roundRect(0,-8,barW,16,8);fg.fill();fill.setScale(0,1,1);this.xpShown=0;
  // Boss 血条（02 §4.3）：560×20u，位于被动栏下方；狂暴时填充改橙红并显示状态字
  const by=this.top-250,bw=Math.min(BOSS_W,right-left);
  const boss=this.boss=this.node('boss-fill',hud,bw-4,14);boss.getComponent(UITransform)!.setAnchorPoint(0,.5);boss.setPosition(-bw/2+2,by);this.bossFill=boss.addComponent(Graphics);boss.active=false;
  // 暂停按钮（右，胶囊下方，视觉 64u / 热区 88u，裁决 D12）
  const pause=this.node('pause',hud,88,88);pause.setPosition(right-44,y2);const face=this.node('face',pause,64,64);const pg=this.panel(face,PANEL,PANEL_EDGE,16);
  pg.fillColor=TEXT;pg.rect(-12,-16,8,32);pg.rect(4,-16,8,32);pg.fill();
  const b=pause.addComponent(Button);b.transition=Button.Transition.SCALE;b.zoomScale=.96;pause.on(Button.EventType.CLICK,()=>this.on.pause());
  // 提示横幅底（02 §4.3：屏幕中上部，44u 字）：在 HUD 区下方、角色上方，不遮挡战斗主体
  const ny=Math.min(this.top-370,this.height/2*.45),box=this.bannerBox=this.node('banner',hud,600,88);box.setPosition(0,ny);this.bannerG=box.addComponent(Graphics);this.bannerOp=box.addComponent(UIOpacity);box.active=false;
  // 新手首条提示（01 §14）：safeBottom 上方 200u
  let tutorial:Node|null=null;if(firstRun){tutorial=this.node('tutorial',hud,640,72);tutorial.setPosition(0,this.bottom+200);this.panel(tutorial)}
  // 文字层：放在所有 Graphics 之后，CHAR 缓存连续合批
  const text=this.text=this.node('text',hud,this.width,this.height);
  this.levelLabel=this.label('Lv 1',text,right-50,y1,100,40,28,TEXT,Label.HorizontalAlign.RIGHT,true);
  this.purifiedLabel=this.label('',text,left+130,y2,260,48,28,TEXT,Label.HorizontalAlign.LEFT,true);
  this.timeLabel=this.label('00:00',text,0,y2,200,56,40,TEXT,Label.HorizontalAlign.CENTER,true);
  // 武器栏 / 被动栏：4 格 × 44u，间距 6u；格内文字预建，选卡后只改字
  this.slotLabels=[];
  for(const y of [this.top-130,this.top-180])for(let i=0;i<SLOTS;i++){const x=left+i*(SLOT+SLOT_GAP)+SLOT/2;
   this.slotLabels.push(this.label('',text,x-SLOT*.1,y+SLOT*.06,SLOT*.8,SLOT*.8,24,PRIMARY_TEXT,Label.HorizontalAlign.CENTER,true),this.label('',text,x+SLOT*.3,y-SLOT*.22,SLOT*.45,32,24,PRIMARY_TEXT,Label.HorizontalAlign.CENTER,true))}
  const bn=this.label(STRINGS.bossName,text,-bw/2+130,by+28,260,36,24,TEXT,Label.HorizontalAlign.LEFT,true);
  this.bossStatus=this.label('',text,bw/2-150,by+28,300,36,24,BOSS_RAGE,Label.HorizontalAlign.RIGHT,true);
  this.bossText=[bn.node,this.bossStatus.node];for(const n of this.bossText)n.active=false;
  this.bannerLabel=this.label('',text,0,ny,560,80,44,TEXT,Label.HorizontalAlign.CENTER,true);this.bannerLabelOp=this.bannerLabel.node.addComponent(UIOpacity);this.bannerLabel.node.active=false;
  if(tutorial){const tl=this.label(STRINGS.tutorialMove,text,0,this.bottom+200,600,64,28,TEXT,Label.HorizontalAlign.CENTER,true);this.tutorial=[tutorial,tl.node]}
  this.last={level:-1,sec:-1,purified:-1};this.hurtFade=0;this.modal=null;
  this.slotKey=-1;this.slotItems={weapons:[],passives:[]};this.bossStage=-1;this.bossShown=false;this.banner=null;this.bannerQueue=[];this.bannerTone='';this.waveSeen=-1;
  this.drawFrame();
 }
 // frame：经验条底 + 武器/被动栏 + （Boss 在场时）Boss 血条底，一次画完
 private drawFrame(){
  const g=this.frame;if(!g||!this.text)return;g.clear();
  const left=this.left,right=this.right,barW=right-left-110;
  this.rounded(g,left,this.top-24,barW,16,XP_BG,PANEL_EDGE,8,2);
  this.drawSlots(g,this.text,this.slotItems.weapons,'weapon',left,this.top-130,SLOT,SLOT_GAP,this.slotLabels.slice(0,8));
  this.drawSlots(g,this.text,this.slotItems.passives,'passive',left,this.top-180,SLOT,SLOT_GAP,this.slotLabels.slice(8));
  if(this.bossShown){const bw=Math.min(BOSS_W,right-left);this.rounded(g,-bw/2,this.top-260,bw,20,BOSS_BG,PANEL_EDGE,6,2)}
 }
 hideTutorial(){for(const n of this.tutorial)n.destroy();this.tutorial=[]}
 // 小旅人受伤：晕影 α0.4 淡出 0.25 秒；reduceFlash 时 α0.25 常亮淡出不闪（02 §5.3）
 hurt(reduceFlash:boolean){this.hurtFade=.25;this.hurtPeak=reduceFlash?.25:.4}
 // 一次性事件 → 横幅（SurvivorView 在 drainEvents 时逐条转交）
 event(e:any){
  if(!this.hud)return;
  if(e.type==='bossWarning')this.showBanner(STRINGS.bannerBossWarning,2,'boss');
  else if(e.type==='bossSpawn')this.showBanner(STRINGS.bannerBossSpawn,2,'boss');
  else if(e.type==='bossEnrage')this.showBanner(e.stage===1?STRINGS.bannerBossEnrage1:e.stage===2?STRINGS.bannerBossEnrage2:STRINGS.bannerBossErosion,2,'boss');
  else if(e.type==='cleansing'){this.clearBanners();this.showBanner(STRINGS.bannerCleansing,WAVES.extraction.cleansingSec,'sun')}
  else if(e.type==='extractionOpen')this.showBanner(STRINGS.bannerExtractOpen,2.5,'sun');
  else if(e.type==='won'||e.type==='lost')this.clearBanners();
 }
 private showBanner(text:string,sec:number,tone:'boss'|'sun'){const b={text,sec,tone,t:0};if(this.banner&&isFinite(this.banner.sec))this.bannerQueue.push(b);else this.startBanner(b)}
 private startBanner(b:Banner|null){
  this.banner=b;const on=!!b;this.bannerBox!.active=on;this.bannerLabel!.node.active=on;if(!b)return;
  this.bannerLabel!.string=b.text;
  if(this.bannerTone!==b.tone){this.bannerTone=b.tone;const g=this.bannerG!;g.clear();this.rounded(g,-300,-44,600,88,b.tone==='boss'?BANNER_BOSS:BANNER_SUN,b.tone==='boss'?C('#9B7BC4'):GOLD,20,2)}
 }
 private clearBanners(){this.bannerQueue=[];if(this.bannerBox)this.startBanner(null)}
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
  // 武器/被动栏：等级只增不减，签名 = 武器等级和 + 1000 × 被动等级和；只在选卡后变化
  let key=0;for(const w of run.weapons)key+=w.level;for(const id in run.passives)key+=1000*run.passives[id];
  // Boss 血条：出现后显示，被净化后收起
  const b=run.boss,showBoss=!!b&&b.alive;
  if(key!==this.slotKey||showBoss!==this.bossShown){
   this.slotKey=key;this.bossShown=showBoss;this.slotItems={weapons:run.weapons.slice(0,SLOTS).map((w:any)=>({id:w.id,level:w.level})),passives:passivesOf(run.passives).slice(0,SLOTS)};
   this.boss!.active=showBoss;for(const n of this.bossText)n.active=showBoss;this.drawFrame();
  }
  if(showBoss){
   this.boss!.setScale(Math.max(0,Math.min(1,b.hpRatio)),1,1);
   if(b.enrageStage!==this.bossStage){
    const st=this.bossStage=b.enrageStage,w=this.boss!.getComponent(UITransform)!.width,g=this.bossFill!;g.clear();g.fillColor=st>0?BOSS_RAGE:BOSS_FILL;g.rect(0,-7,w,14);g.fill();
    this.bossStatus!.string=st<=0?'':st===1?STRINGS.bossStatusEnrage1:st===2?STRINGS.bossStatusEnrage2:`${STRINGS.bossStatusEnrage2} · ${STRINGS.bossStatusErosion} ×${st-2}`;
   }
  }
  // 包围圈 / 横穿 / 围墙（WAVES.events）：Spawner.nextEvent 前进即事件已触发；重建 HUD 时不重放
  const fired=run.spawner?.nextEvent||0;if(this.waveSeen<0)this.waveSeen=fired;
  while(this.waveSeen<fired){const ev:any=WAVES.events[this.waveSeen++];if(!ev||ev.optional)continue;this.showBanner(ev.type==='cross'?STRINGS.bannerEventCross:ev.gap?STRINGS.bannerEventWall:STRINGS.bannerEventRing,2,'boss')}
  // 横幅：淡入 0.2 秒、淡出 0.3 秒；extract 阶段队列空时常驻撤离提示
  const state=run.state;
  if(this.banner&&!isFinite(this.banner.sec)&&(state!=='extract'||this.bannerQueue.length))this.startBanner(null);
  if(!this.banner&&this.bannerQueue.length)this.startBanner(this.bannerQueue.shift()!);
  if(!this.banner&&state==='extract')this.startBanner({text:STRINGS.hintExtractHold,sec:Infinity,tone:'sun',t:0});
  const cur=this.banner;
  if(cur){
   if(run.simulating)cur.t+=dt;
   const op=Math.round(255*Math.max(0,Math.min(1,cur.t/.2,isFinite(cur.sec)?(cur.sec-cur.t)/.3:1)));this.bannerOp!.opacity=op;this.bannerLabelOp!.opacity=op;
   if(cur.t>=cur.sec)this.startBanner(null);
  }
 }
 // 冒烟读取：HUD 栏位显示数、Boss 血条是否可见
 get slotsShown(){return {weapons:this.slotItems.weapons.length,passives:this.slotItems.passives.length}}
 get bossBarVisible(){return !!this.boss&&this.boss.active&&this.bossShown}
 // ---------- 模态框 ----------
 closeModal(){this.modalNode?.destroy();this.modalNode=null;this.modal=null;this.unlocked=false}
 private openModal(kind:string,alpha:number){this.closeModal();this.modal=kind;return this.modalNode=this.dim(alpha)}
 // 升级三选一（02 §4.4）：三张整宽卡竖向堆叠；0.4 秒内从下方 40u 滑入并淡入，结束前点击无效。
 // 合批（BUG-S1-03）：每张卡的底板 + 图标画在同一个 Graphics（backs 层），全部文字放在其后的 text 层（CHAR 缓存），
 // 卡片与其文字组用同一组 tween 驱动，模态框自身只增加 1 + 3 + 1 个批次。
 showLevelup(offer:any[],level:number,first:boolean){
  const m=this.openModal('levelup',.6),cardH=200,gap=24,mid=(this.top+this.bottom)/2,y0=mid+cardH+gap-20;
  const backs=this.node('backs',m,this.width,this.height),text=this.node('text',m,this.width,this.height);
  this.label(`${STRINGS.levelUpTitle} · Lv ${level}`,text,0,y0+cardH/2+90,640,64,44,TEXT,Label.HorizontalAlign.CENTER,true);
  if(first)this.label(STRINGS.levelUpHintFirst,text,0,y0+cardH/2+40,640,40,28,TEXT2,Label.HorizontalAlign.CENTER,true);
  const cards:Node[][]=[];
  offer.forEach((card,i)=>{
   // 卡片类型（02 §4.4，色盲可读：颜色 + 文字标签）：新武器 / 新被动 →“新武器/新被动”青绿；升级 → Lv a→b（武器金 / 被动绿）；兜底 →“补给”水蓝
   const build=card.kind==='weapon'||card.kind==='passive',weapon=card.kind==='weapon',spore=card.id==='spore_shot';
   const bName=nameOf(card.id),bDesc=spore?STRINGS.cardSporeShotDesc:(S['card_'+card.id+'_desc']||STRINGS.cardGenericDesc);
   const bTag=card.isNew?(weapon?STRINGS.cardNewWeapon:STRINGS.cardNewPassive):`Lv ${card.level-1}→${card.level}`;
   const tone=weapon?WEAPON:build?PASSIVE:SUPPLY,tagColor=!build?SUPPLY:card.isNew?XP:weapon?GOLD:PASSIVE;
   const [name,desc,tag]=build?[bName,bDesc,bTag]:card.kind==='heal'?[STRINGS.cardHealDew,STRINGS.cardHealDewDesc,STRINGS.cardSupply]:[STRINGS.cardShinySpore,STRINGS.cardShinySporeDesc,STRINGS.cardSupply];
   const y=y0-i*(cardH+gap),n=this.node('card',backs,640,cardH),t=this.node('card-text',text,640,cardH);
   const g=this.panel(n,PANEL,tone,20,4);
   // 占位图标：圆角方块（武器琥珀 / 被动青绿 / 兜底水蓝）+ 名称前 2 字（02 §8.5）
   this.rounded(g,-320+24,-48,96,96,tone,null,16);this.label(name.slice(0,2),t,-320+24+48,0,90,90,32,PRIMARY_TEXT,Label.HorizontalAlign.CENTER,true);
   this.label(name,t,-320+144+130,40,260,48,32,TEXT,Label.HorizontalAlign.LEFT,true);
   this.label(tag,t,320-24-90,40,180,44,28,tagColor,Label.HorizontalAlign.RIGHT,true);
   this.label(desc,t,-320+144+220,-30,440,80,28,TEXT2,Label.HorizontalAlign.LEFT,true);
   const b=n.addComponent(Button);b.transition=Button.Transition.NONE;n.on(Button.EventType.CLICK,()=>this.pick(i,cards));
   for(const k of [n,t]){k.setPosition(0,y-40);const op=k.addComponent(UIOpacity);op.opacity=0;tween(k).to(.4,{position:new Vec3(0,y,0)},{easing:'quadOut'}).start();tween(op).to(.4,{opacity:255}).start()}
   cards.push([n,t]);
  });
  this.unlocked=false;tween(m).delay(.4).call(()=>{if(this.modal==='levelup')this.unlocked=true}).start();
 }
 private pick(i:number,cards:Node[][]){
  if(!this.unlocked||this.modal!=='levelup')return;this.unlocked=false;
  cards.forEach((pair,j)=>{if(j!==i)for(const c of pair)tween(c.getComponent(UIOpacity)!).to(.12,{opacity:0}).start()});
  const [n,t]=cards[i];tween(t).to(.06,{scale:new Vec3(1.04,1.04,1)}).to(.06,{scale:new Vec3(1,1,1)}).start();
  tween(n).to(.06,{scale:new Vec3(1.04,1.04,1)}).to(.06,{scale:new Vec3(1,1,1)}).delay(.08).call(()=>{if(this.modal==='levelup')this.on.choose(i)}).start();
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
 // 结算（02 §4.6 / 01 §12）：统一“净化数”，失败“被浊雾笼罩”；胜利标“撤离成功”，击败 Boss 标“浊雾巨蜗已净化”；本局武器与被动图标
 showResult(r:ResultInfo){
  const m=this.openModal('result',.75);let y=this.top-140;
  this.label(r.won?STRINGS.resultWin:STRINGS.resultLose,m,0,y,640,72,44,r.won?GOLD:TEXT);y-=64;
  this.label(r.won?STRINGS.resultWinDesc:STRINGS.resultLoseDesc,m,0,y,640,48,28,TEXT2);y-=52;
  const badges=[r.won?STRINGS.resultExtracted:'',r.bossDefeated?STRINGS.resultBossDefeated:''].filter(Boolean).join(' · ');
  if(badges)this.label(badges,m,0,y,640,44,28,GOLD);y-=40;
  const boxH=500,box=this.node('summary',m,640,boxH);box.setPosition(0,y-boxH/2);this.panel(box);
  const row=(k:string,v:string,yy:number,extra='')=>{this.label(k,box,-150,yy,280,48,28,TEXT2,Label.HorizontalAlign.LEFT);this.label(v,box,90,yy,200,48,32,TEXT,Label.HorizontalAlign.RIGHT);if(extra)this.label(extra,box,250,yy,120,44,24,GOLD)};
  row(STRINGS.resultSurvivalTime,mmss(r.survivalSec),210,r.newRecord?STRINGS.resultNewRecord:'');
  row(STRINGS.resultPurified,String(r.purified),155);row(STRINGS.resultLevel,'Lv '+r.level,100);
  // 本局构成：武器 / 被动各 4 格 × 64u
  this.label(STRINGS.resultBuild,box,-230,-8,140,44,24,TEXT2,Label.HorizontalAlign.LEFT);
  const icons=this.node('build',box,640,boxH).addComponent(Graphics),iconText=this.node('build-text',box,640,boxH);
  this.drawSlots(icons,iconText,r.weapons,'weapon',-140,30,64,12);this.drawSlots(icons,iconText,r.passives,'passive',-140,-46,64,12);
  row(STRINGS.resultCrystals,`+${r.earned.total} ◆`,-130);
  const e=r.earned;this.label(`${STRINGS.pauseSurvival} ${e.survival} · ${STRINGS.hudPurified} ${e.purified} · ${STRINGS.campWins} ${e.victory} · ${STRINGS.cardSupply} ${e.shiny}`,box,0,-195,600,40,24,TEXT2);
  y-=boxH+40;if(r.saveWarning){this.label(r.saveWarning,m,0,y,640,40,24,WARN);y-=50}
  this.button(STRINGS.btnPlayAgain,m,0,y-56,480,112,()=>this.on.again(),'primary',40);
  this.button(STRINGS.btnBackToCamp,m,0,y-56-136,480,96,()=>this.on.camp(),'secondary');
 }
 private clear(){
  this.closeModal();this.root.destroyAllChildren();this.hud=null;this.xpFill=null;this.levelLabel=this.timeLabel=this.purifiedLabel=null;this.vignette=null;this.tutorial=[];
  this.frame=null;this.text=null;this.slotLabels=[];this.boss=null;this.bossFill=null;this.bossText=[];this.bossStatus=null;
  this.bannerBox=null;this.bannerG=null;this.bannerOp=null;this.bannerLabel=null;this.bannerLabelOp=null;this.banner=null;this.bannerQueue=[];
 }
 destroy(){this.root.destroy()}
}
