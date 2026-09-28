import {Node,Label,Color,Graphics,UITransform,EventTouch,Vec3,view,game,Game,tween,sys,BlockInputEvents} from 'cc';
import {PilotUI,UI} from './PilotUI';
import {LibraryRound,RACK_SIZE} from './shared/js/library/LibraryRound';
import {LibraryProgress} from './shared/js/library/LibraryProgress';
import {LIBRARY_LEVELS,SECTIONS,levelById} from './shared/js/library/LibraryLevels';
import {shelfLayout,nearestSlot} from './shared/js/library/ShelfBoard';
import {BOOK_W,BOOK_H} from './shared/js/library/BookPile';

const C=(v:string)=>new Color(v);
const WATER=C('#5d8fb0'),WOOD=C('#6b4a33'),SLOT=C('#3e2c20'),WET=C('#8fb6cc'),HINT=C('#f2d78e');
type Rect={left:number,top:number,width:number,height:number};
// Placeholder ad: resolves like AdService.showRewardedVideo() when a video finishes.
const ads={showRewardedVideo:()=>Promise.resolve({status:'rewarded'})};

// Grey-box rainy library: programmatic nodes only, no editor wiring.
export class LibraryView{
 u!:PilotUI;progress:LibraryProgress;round:LibraryRound|null=null;screen:'menu'|'round'='menu';paused=false;
 books=new Map<string,Node>();slots:any[]=[];shelf!:Rect;pile!:Rect;rack:Rect|null=null;
 water:Graphics|null=null;hint:Graphics|null=null;hud:{left:Label,hearts:Label,glass:Label}|null=null;dialog:Node|null=null;
 held:string|null=null;dirty=false;tipLeft=0;tip:Node|null=null;
 constructor(private host:any){this.progress=new LibraryProgress(host.progressStorage||sys.localStorage);game.on(Game.EVENT_HIDE,this.hide,this);this.render()}
 private hide(){if(this.screen==='round'&&this.round?.status==='playing'){this.cancelHeld();this.paused=true;this.render()}}
 render(){const s=view.getVisibleSize();if(this.u)this.u.destroy();this.u=new PilotUI(this.host.canvas,s.width,s.height,this.host.safeTop,this.host.safeBottom);this.books.clear();this.water=null;this.hint=null;this.hud=null;this.dialog=null;this.tip=null;
  if(this.screen==='menu')this.renderMenu();else this.renderRound()}
 private label(t:string,parent:Node,x:number,y:number,w:number,h:number,size=16,color=UI.paper){const n=this.u.text(t,parent,w,h,size,color);n.setPosition(x,y);const l=n.getComponent(Label)!;l.horizontalAlign=Label.HorizontalAlign.CENTER;return l}
 // ---------- menu ----------
 private renderMenu(){const u=this.u,w=u.width,h=u.height,top=h/2-u.top;u.box(u.root,C('#263f3c'),0);
  this.label('雨后森林图书馆',u.root,0,top-40,w-40,44,26);this.label(`已修复 ${this.progress.lit} / ${LIBRARY_LEVELS.length} 个书柜`,u.root,0,top-80,w-40,28,15,C('#cfdccb'));
  const cell=(w-60)/5;LIBRARY_LEVELS.forEach((l,i)=>{const lit=this.progress.completed.includes(l.id),n=u.node('全景'+i,u.root,cell-6,90);n.setPosition(-w/2+30+cell*(i+.5),top-160);u.box(n,lit?C('#e7bc61'):C('#3b524c'),8);this.label(lit?'✓':'…',n,0,0,cell,40,20,lit?UI.ink:C('#8aa39a'))});
  if(this.progress.locked)this.label('存档无法读取，本次进度不会保存',u.root,0,top-225,w-40,24,13,C('#e8a07a'));
  LIBRARY_LEVELS.forEach((l,i)=>{const open=this.progress.canOpen(l.id),b=u.button(`${i+1}. ${l.name}${this.progress.completed.includes(l.id)?'  ✓':open?'':'（未解锁）'}`,()=>{if(open)this.start(l.id)},u.root,w-64,56,open?'green':'paper');b.setPosition(0,top-270-i*66)})}
 private start(id:string){const level=levelById(id)!;this.round=new LibraryRound(level);this.screen='round';this.paused=false;this.held=null;this.tipLeft=3;this.render()}
 // ---------- round ----------
 private renderRound(){const u=this.u,w=u.width,h=u.height,top=h/2-u.top,bottom=-h/2+u.bottom,r=this.round!,lv=r.level;u.box(u.root,C('#263f3c'),0);
  const pause=u.icon('pause',()=>{this.cancelHeld();this.paused=true;this.render()});pause.setPosition(-w/2+36,top-30);
  this.label(lv.name,u.root,-20,top-20,170,24,16);const left=this.label('',u.root,-60,top-44,100,20,13,C('#cfdccb'));const hearts=this.label('',u.root,30,top-44,80,20,15,C('#e8877a'));
  const glass=u.button('',()=>this.magnify(),u.root,64,52,'paper');glass.setPosition(w/2-40,top-30);const glassLabel=glass.getComponentInChildren(Label)!;this.hud={left,hearts,glass:glassLabel};
  const areaTop=top-66,areaH=areaTop-bottom;this.shelf={left:-w/2+12,top:areaTop,width:w-24,height:areaH*.55};
  const rackW=lv.leaks.length?64:0;this.pile={left:-w/2+12,top:areaTop-areaH*.55-12,width:w-24-rackW-(rackW?8:0),height:areaH*.45-12};
  this.rack=rackW?{left:w/2-12-rackW,top:this.pile.top,width:rackW,height:this.pile.height}:null;
  this.drawShelf();this.drawPile();for(const b of r.books.slice().sort((a:any,c:any)=>a.z-c.z))if(b.state!=='soaked')this.bookNode(b);
  if(this.tipLeft>0){this.tip=u.node('提示',u.root,w-40,44);this.tip.setPosition(0,this.pile.top-30);u.box(this.tip,C('#1a332b'),12);this.label(lv.tip,this.tip,0,0,w-60,40,15)}
  this.refreshHud();this.drawWater();if(this.paused)this.pauseDialog();else if(r.status==='reviving')this.reviveDialog();else if(r.status==='won'||r.status==='lost')this.resultDialog()}
 private drawShelf(){const u=this.u,r=this.round!,s=this.shelf,rows=r.level.sections.length,n=u.node('书柜',u.root,s.width,s.height);n.setPosition(s.left+s.width/2,s.top-s.height/2);u.box(n,WOOD,10);
  this.slots=shelfLayout({left:s.left,top:s.top,width:s.width,height:s.height,plaque:40},rows,r.level.cols);
  r.level.sections.forEach((sec:string,row:number)=>{const y=s.top-(row+.5)*s.height/rows;this.label(SECTIONS[sec].icon,u.root,s.left+20,y,36,36,22)});
  const g=u.node('格子',u.root,s.width,s.height).addComponent(Graphics);g.node.setPosition(0,0);
  for(const slot of this.slots){g.fillColor=r.shelf.damaged.has(slot.key)?C('#2a1d15'):SLOT;g.roundRect(slot.x-slot.width/2+3,slot.y-slot.height/2+3,slot.width-6,slot.height-6,4);g.fill();
   const id=r.shelf.filled.get(slot.key);if(id){const b=r.book(id)!;this.paintSpine(g,slot.x,slot.y,slot.width-10,slot.height-10,SECTIONS[b.section].color)}}
  for(const slot of this.slots){const id=r.shelf.filled.get(slot.key);if(id){const b=r.book(id)!;this.label(`${SECTIONS[b.section].icon}${b.volume}`,u.root,slot.x,slot.y,slot.width,24,13)}else if(!r.shelf.damaged.has(slot.key))this.label(String(slot.col+1),u.root,slot.x,slot.y,slot.width,24,14,C('#7d6452'))}
  this.hint=u.node('高亮',u.root,s.width,s.height).addComponent(Graphics)}
 private paintSpine(g:Graphics,x:number,y:number,w:number,h:number,color:Color|string){g.fillColor=typeof color==='string'?C(color):color;g.roundRect(x-w/2,y-h/2,w,h,4);g.fill()}
 private drawPile(){const u=this.u,p=this.pile,n=u.node('地面',u.root,p.width,p.height);n.setPosition(p.left+p.width/2,p.top-p.height/2);u.box(n,C('#3a3226'),10);
  for(const leak of this.round!.level.leaks)this.label('💧',u.root,p.left+leak.x*p.width,p.top-10,30,24,16);
  if(this.rack){const k=this.rack,m=u.node('晾书架',u.root,k.width,k.height);m.setPosition(k.left+k.width/2,k.top-k.height/2);u.box(m,C('#4c6a5c'),10);this.label('晾书架',m,0,k.height/2-16,k.width,24,12);
   this.round!.rack.forEach((slot:any,i:number)=>{const b=this.round!.book(slot.id)!;const bn=this.label(`${SECTIONS[b.section].icon}\n${Math.ceil(slot.left)}s`,m,0,k.height/2-60-i*70,k.width-8,60,13);bn.lineHeight=18})}
  this.water=u.node('水位',u.root,p.width,p.height).addComponent(Graphics)}
 private pileXY(b:any){return {x:this.pile.left+b.x*this.pile.width,y:this.pile.top-this.pile.height+b.y*this.pile.height}}
 private bookNode(b:any){if(b.state==='shelved'||b.state==='drying')return;const u=this.u,bw=BOOK_W*this.pile.width,bh=BOOK_H*this.pile.height,n=u.node(b.id,u.root,bw,bh),{x,y}=this.pileXY(b);n.setPosition(x,y);
  const g=n.addComponent(Graphics);this.paintBook(n,g,b);this.books.set(b.id,n);
  n.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{if(this.paused||this.held||!this.round!.pick(b.id)){this.nudge(n);return}this.held=b.id;n.setSiblingIndex(n.parent!.children.length-1);n.setScale(1.3,1.3,1);this.follow(n,e);this.drawHint()});
  n.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{if(this.held===b.id)this.follow(n,e)});
  n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{if(this.held===b.id)this.release(b.id,n,e)});
  n.on(Node.EventType.TOUCH_CANCEL,()=>{if(this.held===b.id){this.round!.cancel(b.id);this.held=null;this.back(n,b)}})}
 private paintBook(n:Node,g:Graphics,b:any){const s=n.getComponent(UITransform)!.contentSize;g.clear();this.paintSpine(g,0,0,s.width,s.height,b.wet?WET:SECTIONS[b.section].color);g.strokeColor=C('#1d1a14');g.lineWidth=1.5;g.roundRect(-s.width/2,-s.height/2,s.width,s.height,4);g.stroke();
  n.removeAllChildren();this.label(b.wet?'?':`${SECTIONS[b.section].icon}\n${b.volume}`,n,0,0,s.width,s.height,13).lineHeight=17}
 // UI location is bottom-left based; the canvas (and root) sit at the world origin, centred under the camera.
 private local(e:EventTouch){const p=e.getUILocation(),s=view.getVisibleSize();return {x:p.x-s.width/2,y:p.y-s.height/2}}
 private follow(n:Node,e:EventTouch){const p=this.local(e);n.setPosition(p.x,p.y+20)}
 private release(id:string,n:Node,e:EventTouch){const r=this.round!,b=r.book(id)!,p=this.local(e);this.held=null;this.hint?.clear();
  const k=this.rack;if(k&&p.x>=k.left&&p.x<=k.left+k.width&&p.y<=k.top&&p.y>=k.top-k.height){if(r.dropToRack(id)){this.render();return}this.back(n,b);return}
  if(r.drop(id,nearestSlot(this.slots,p.x,p.y+20))==='shelved'){this.render();return}this.back(n,b)}
 private back(n:Node,b:any){n.setScale(1,1,1);const {x,y}=this.pileXY(b);tween(n).to(.15,{position:new Vec3(x,y,0)}).call(()=>this.nudge(n)).start()}
 private nudge(n:Node){const p=n.position.clone();tween(n).by(.05,{position:new Vec3(6,0,0)}).by(.1,{position:new Vec3(-12,0,0)}).to(.05,{position:p}).start()}
 private cancelHeld(){if(this.held&&this.round){this.round.cancel(this.held);this.held=null}}
 private drawHint(){const g=this.hint;if(!g||!this.held)return;g.clear();const key=this.round!.hintSlot(this.held);const slot=this.slots.find(s=>s.key===key);if(!slot)return;g.strokeColor=HINT;g.lineWidth=3;g.roundRect(slot.x-slot.width/2+2,slot.y-slot.height/2+2,slot.width-4,slot.height-4,5);g.stroke()}
 private drawWater(){const g=this.water,r=this.round;if(!g||!r)return;const p=this.pile;g.clear();g.fillColor=new Color(WATER.r,WATER.g,WATER.b,150);g.rect(p.left,p.top-p.height,p.width,r.water*p.height);g.fill();g.strokeColor=C('#bfe0f0');g.lineWidth=2;g.moveTo(p.left,p.top-p.height+r.water*p.height);g.lineTo(p.left+p.width,p.top-p.height+r.water*p.height);g.stroke();g.node.setSiblingIndex(g.node.parent!.children.length-1)}
 private refreshHud(){const r=this.round,h=this.hud;if(!r||!h)return;h.left.string=`剩余 ${r.remaining} 本`;h.hearts.string='♥'.repeat(r.hearts)+'♡'.repeat(Math.max(0,3-r.hearts));h.glass.string=r.magnifierLeft>0?`🔍${Math.ceil(r.magnifierLeft)}`:r.magnifierCharges>0?`🔍×${r.magnifierCharges}`:'🔍+'}
 private magnify(){const r=this.round;if(!r||this.paused)return;if(r.magnifierCharges>0){r.useMagnifier();this.refreshHud();return}
  void ads.showRewardedVideo().then(res=>{if(res.status==='rewarded'&&this.round===r){r.grantMagnifier();r.useMagnifier();this.refreshHud()}})}
 // ---------- dialogs ----------
 private modal(title:string,body:string,buttons:Array<[string,()=>void]>){const u=this.u,w=u.width,n=u.node('弹窗',u.root,w,u.height);n.addComponent(BlockInputEvents);u.box(n,new Color(10,20,16,190),0);const card=u.node('卡片',n,w-48,150+buttons.length*62);u.box(card,UI.paper,18);
  const ch=card.getComponent(UITransform)!.height;this.label(title,card,0,ch/2-34,w-80,36,22,UI.ink);this.label(body,card,0,ch/2-72,w-80,40,15,UI.muted);
  buttons.forEach(([t,fn],i)=>u.button(t,fn,card,w-96,52,i?'paper':'green').setPosition(0,ch/2-130-i*62));this.dialog=n}
 private pauseDialog(){this.modal('暂停','雨暂时停了',[['继续',()=>{this.paused=false;this.render()}],['重新开始',()=>this.start(this.round!.level.id)],['回图书馆',()=>this.toMenu()]])}
 private reviveDialog(){const r=this.round!;this.modal('书被泡坏太多了','看一段广告，水会退下一截，生命回满',[['看广告复活',()=>{void ads.showRewardedVideo().then(res=>{if(res.status==='rewarded'&&this.round===r&&r.revive())this.render()})}],['放弃',()=>{r.giveUp();this.render()}]])}
 private resultDialog(){const r=this.round!,id=r.level.id,i=LIBRARY_LEVELS.findIndex(l=>l.id===id),next=LIBRARY_LEVELS[i+1];
  if(r.status==='won'){const saved=this.progress.complete(id);const note=`用时 ${Math.round(r.time)} 秒，点亮了图书馆的第 ${i+1} 格${saved||!this.progress.locked?'':'（未保存）'}`;
   this.modal('书柜整理好了',note,next?[['下一关',()=>this.start(next.id)],['回图书馆',()=>this.toMenu()]]:[['回图书馆',()=>this.toMenu()]]);}
  else this.modal('这次没守住','再来一次，先救低处的书',[['重试',()=>this.start(id)],['回图书馆',()=>this.toMenu()]])}
 private toMenu(){this.cancelHeld();this.round=null;this.screen='menu';this.paused=false;this.render()}
 // ---------- frame ----------
 update(dt:number){const r=this.round;if(this.screen!=='round'||!r||this.paused)return;const before=r.status;r.update(dt);
  if(this.tipLeft>0){this.tipLeft-=dt;if(this.tipLeft<=0&&this.tip){this.tip.destroy();this.tip=null}}
  const events=r.drain();let rebuild=r.status!==before;
  for(const e of events){if(e.type==='soaked'){const n=this.books.get(e.id);if(n){tween(n).to(.3,{scale:new Vec3(.2,.2,1)}).call(()=>n.destroy()).start();this.books.delete(e.id)}}
   else if(e.type==='wet'){const n=this.books.get(e.id);if(n&&e.id!==this.held)this.paintBook(n,n.getComponent(Graphics)!,r.book(e.id))}
   else if(e.type==='dried'||e.type==='row')rebuild=true}
  if(r.rack.length&&!this.held)rebuild=rebuild||Math.ceil(r.rack[0].left)!==Math.ceil(r.rack[0].left+dt);
  if(rebuild)this.dirty=true;
  if(this.dirty&&!this.held){this.dirty=false;this.render();return}
  this.drawWater();this.refreshHud();if(this.held)this.drawHint()}
 destroy(){game.off(Game.EVENT_HIDE,this.hide,this);this.u?.destroy()}
}
