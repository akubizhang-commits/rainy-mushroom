import {Node,Label,Color,Graphics,UITransform,EventTouch,Vec3,view,game,Game,tween,Tween,BlockInputEvents,UIOpacity,sys} from 'cc';
import {PilotUI,UI} from './PilotUI';
import {PackRound} from './shared/js/library/PackRound';
import {LibraryProgress} from './shared/js/library/LibraryProgress';
import {PACK_LEVELS,PACK_IDS,PACK_PROGRESS_KEY,packLevelById,COLORS,PATTERNS} from './shared/js/library/PackLevels';

const C=(v:string)=>new Color(v);
const BG=C('#263f3c'),WOOD=C('#6b4a33'),WALL=C('#3a281d'),CELL=C('#54402f'),FLOOR=C('#3a3226'),WATER=C('#5d8fb0'),UNKNOWN=C('#8d8a7e'),EDGE=C('#1d1a14'),OK=C('#9fd89a'),BAD=C('#e8877a'),FLASH=C('#f2d78e');
type Rect={x:number,y:number,w:number,h:number};
type RowRect=Rect&{left:number,unit:number,short:number,tall:number};
type Held={id:string,from:'floor'|'shelf',touch:number,x:number,y:number,moved:boolean};
type Modal='pause'|'revive'|'won'|'lost'|null;
// Placeholder ad: resolves like AdService.showRewardedVideo() when a video finishes.
const ads={showRewardedVideo:()=>Promise.resolve({status:'rewarded'})};
const REASON:Record<string,string>={'too-tall':'太高了，放不进矮层','too-thick':'太厚了，这层放不下','mismatch':'和这个柜的标志不符'};
const DRAG=8,LIFT=28,MAX_UNITS=7;

// Packing grey box: two cabinets, a floor of books, water that rises with every step. Built once per screen, then updated per event.
export class PackView{
 u!:PilotUI;progress:LibraryProgress;round:PackRound|null=null;screen:'menu'|'round'='menu';modal:Modal=null;saved=true;
 nodes=new Map<string,Node>();rects=new Map<string,Rect>();floorRects=new Map<string,Rect>();rowRects:RowRect[][]=[];floor!:Rect;
 board:Node|null=null;floorLayer:Node|null=null;drag:Node|null=null;fx:Node|null=null;water:Graphics|null=null;hover:Graphics|null=null;
 reason:Label|null=null;steps:Label|null=null;toastNode:Node|null=null;dialog:Node|null=null;ghost:Node|null=null;held:Held|null=null;waterShown=0;
 constructor(private host:any){this.progress=new LibraryProgress(host.progressStorage||sys.localStorage,PACK_IDS,PACK_PROGRESS_KEY);game.on(Game.EVENT_HIDE,this.hide,this);this.render()}
 private hide(){this.cancelHeld();if(this.screen==='round'&&this.round?.status==='playing'&&!this.modal)this.openModal('pause')}
 // Full rebuild: only on screen changes and resizes. Everything is re-derived from the round, including an open dialog.
 render(){this.cancelHeld();const s=view.getVisibleSize();this.u?.destroy();this.u=new PilotUI(this.host.canvas,s.width,s.height,this.host.safeTop,this.host.safeBottom);
  this.nodes.clear();this.rects.clear();this.floorRects.clear();this.rowRects=[];this.board=this.floorLayer=this.drag=this.fx=null;this.water=this.hover=null;this.reason=this.steps=null;this.toastNode=this.dialog=null;
  if(this.screen==='menu')this.buildMenu();else this.buildRound()}
 private label(t:string,parent:Node,x:number,y:number,w:number,h:number,size=16,color=UI.paper){const n=this.u.text(t,parent,w,h,size,color);n.setPosition(x,y);const l=n.getComponent(Label)!;l.horizontalAlign=Label.HorizontalAlign.CENTER;return l}
 // ---------- menu ----------
 private buildMenu(){const u=this.u,w=u.width,top=u.height/2-u.top;u.box(u.root,BG,0);
  this.label('雨后森林图书馆',u.root,0,top-50,w-40,44,26);this.label(`把书塞进对的柜子 · 已整理 ${this.progress.lit} / ${PACK_LEVELS.length}`,u.root,0,top-92,w-40,28,15,C('#cfdccb'));
  if(this.progress.locked||!this.progress.saved)this.label(this.progress.locked?'存档无法读取，本次进度不会保存':'存档写不进去，本次进度不会保存',u.root,0,top-124,w-40,24,13,C('#e8a07a'));
  PACK_LEVELS.forEach((l:any,i:number)=>{const open=this.progress.canOpen(l.id),done=this.progress.completed.includes(l.id);u.button(`${i+1}. ${l.name}${done?'  ✓':open?'':'（未解锁）'}`,()=>{if(open)this.start(l.id)},u.root,w-64,56,open?'green':'paper').setPosition(0,top-180-i*68)})}
 private start(id:string){this.round=new PackRound(packLevelById(id));this.screen='round';this.modal=null;this.saved=true;this.waterShown=0;this.render();this.toast(this.round.level.tip,3.5)}
 private toMenu(){this.round=null;this.screen='menu';this.modal=null;this.render()}
 // ---------- round layout ----------
 private buildRound(){const u=this.u,w=u.width,h=u.height,top=h/2-u.top,bottom=-h/2+u.bottom,r=this.round!,lv=r.level;u.box(u.root,BG,0);
  const layer=(name:string)=>u.node(name,u.root,w,h);this.board=layer('书柜');this.floorLayer=layer('地面');const waterNode=layer('水');this.drag=layer('手上');this.fx=layer('效果');
  this.water=waterNode.addComponent(Graphics);this.hover=this.fx.addComponent(Graphics);this.reason=this.label('',this.fx,0,0,200,24,13,BAD);
  u.icon('pause',()=>{this.cancelHeld();if(!this.modal)this.openModal('pause')}).setPosition(-w/2+36,top-28);
  this.label(lv.name,u.root,0,top-28,160,28,17);this.steps=this.label('',u.root,w/2-62,top-28,110,28,15);
  const floorTop=this.layoutCabinets(top-60,top-60-bottom);this.floor={x:0,y:(floorTop+bottom)/2,w:w-24,h:floorTop-bottom};
  const f=u.node('地板',this.floorLayer,this.floor.w,this.floor.h);f.setPosition(0,this.floor.y);u.box(f,FLOOR,10);this.layoutFloor();
  for(const b of r.books){this.bookNode(b);if(b.state==='floor')this.toFloor(b)}
  this.rowRects.forEach((rows,c)=>rows.forEach((_,row)=>this.layoutRow(c,row)));
  const root=u.root;root.on(Node.EventType.TOUCH_START,this.onStart,this);root.on(Node.EventType.TOUCH_MOVE,this.onMove,this);root.on(Node.EventType.TOUCH_END,this.onEnd,this);root.on(Node.EventType.TOUCH_CANCEL,this.onCancel,this);
  this.refreshHud();this.drawWater();if(this.modal)this.openModal(this.modal)}
 // Two cabinets side by side; each row is exactly as wide as its length, so a full row reads as full. Rows scaled so the cabinets take about half of the play area. Returns the floor's top edge.
 private layoutCabinets(top:number,playH:number){const u=this.u,w=u.width,lv=this.round!.level,gap=12,cw=(w-gap*3)/2,plaque=34,pad=8;
  const natural=Math.max(...lv.cabinets.map((c:any)=>c.rows.reduce((s:number,row:any)=>s+(row.height==='tall'?62:46)+pad,pad)));
  const k=Math.min(1.35,Math.max(.8,(playH*.5-plaque)/natural)),short=46*k,tall=62*k,bodyH=natural*k;
  lv.cabinets.forEach((cab:any,c:number)=>{const cx=-w/2+gap+cw/2+c*(cw+gap),left=cx-cw/2+8,unit=(cw-16)/MAX_UNITS;
   const sign=u.node('标志',this.board!,cw,plaque-4);sign.setPosition(cx,top-plaque/2);u.box(sign,C(COLORS[cab.color].hex),8);this.label(`${COLORS[cab.color].name} · ${PATTERNS[cab.pattern].icon} ${PATTERNS[cab.pattern].name}`,sign,0,0,cw,plaque-4,15);
   const body=u.node('柜体',this.board!,cw,bodyH);body.setPosition(cx,top-plaque-bodyH/2);u.box(body,WOOD,8);
   const g=u.node('层',this.board!,w,u.height).addComponent(Graphics);let y=top-plaque-pad*k;
   this.rowRects[c]=cab.rows.map((row:any)=>{const rh=row.height==='tall'?tall:short,rw=row.length*unit,R:RowRect={x:left+rw/2,y:y-rh/2,w:rw,h:rh,left,unit,short,tall};
    g.fillColor=WALL;g.rect(left,y-rh,rw,rh);g.fill();g.fillColor=CELL;for(let i=0;i<row.length;i++){g.rect(left+i*unit+1,y-rh+1,unit-2,rh-2);g.fill()}
    y-=rh+pad*k;return R})});
  return top-plaque-bodyH-14}
 // Floor books sit in fixed, non-overlapping slots in deal order; the unit shrinks until every book fits.
 private layoutFloor(){const r=this.round!,F=this.floor,books=r.books.slice().sort((a:any,b:any)=>a.slot-b.slot);
  for(let fu=30;;fu-=2){const lineH=fu*3.2,width=F.w-20,out:Array<[string,Rect,number]>=[];let x=0,line=0;
   for(const b of books){const bw=b.thickness*fu,bh=b.height==='tall'?fu*3:fu*2.2;if(x&&x+bw>width){x=0;line++}out.push([b.id,{x:-F.w/2+10+x+bw/2,y:0,w:bw,h:bh},line]);x+=bw+8}
   if((line+1)*lineH+16>F.h&&fu>14)continue;
   for(const [id,R,l] of out){R.y=F.y+F.h/2-10-(l+1)*lineH+6+R.h/2;this.floorRects.set(id,R)}return}}
 // ---------- books ----------
 private bookNode(b:any){const n=this.u.node(b.id,this.floorLayer!,10,10);n.addComponent(Graphics);n.addComponent(UIOpacity);const t=this.u.text('',n,10,10,14,UI.paper);t.name='字';t.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.CENTER;this.nodes.set(b.id,n);return n}
 private paint(n:Node,b:any,R:Rect,shelved:boolean){n.getComponent(UITransform)!.setContentSize(R.w,R.h);const g=n.getComponent(Graphics)!,vis=shelved?['color','pattern']:this.round!.visible(b.id);g.clear();
  g.fillColor=vis.includes('color')?C(COLORS[b.color].hex):UNKNOWN;g.roundRect(-R.w/2,-R.h/2,R.w,R.h,4);g.fill();g.strokeColor=EDGE;g.lineWidth=1.5;g.roundRect(-R.w/2,-R.h/2,R.w,R.h,4);g.stroke();
  if(!shelved&&this.round!.canFlip(b.id)){g.fillColor=C('#f4ecd0');g.moveTo(R.w/2-10,R.h/2);g.lineTo(R.w/2,R.h/2);g.lineTo(R.w/2,R.h/2-10);g.close();g.fill()}
  const t=n.getChildByName('字')!,l=t.getComponent(Label)!;t.getComponent(UITransform)!.setContentSize(R.w,R.h);l.string=vis.includes('pattern')?PATTERNS[b.pattern].icon:'?';l.fontSize=Math.max(10,Math.min(18,R.w*.6));l.lineHeight=l.fontSize*1.3}
 private put(n:Node,parent:Node,R:Rect){if(n.parent!==parent)n.setParent(parent);n.setPosition(R.x,R.y);n.setScale(1,1,1);n.getComponent(UIOpacity)!.opacity=255}
 private toFloor(b:any){const n=this.nodes.get(b.id)!,R=this.floorRects.get(b.id)!;this.put(n,this.floorLayer!,R);this.paint(n,b,R,false);this.rects.set(b.id,R)}
 // Books in a row pack to the left in arrival order; short books stand on the floor of a tall row.
 private layoutRow(c:number,row:number){const r=this.round!,R=this.rowRects[c][row];let x=R.left;
  for(const b of r.board.row(c,row).books){const bw=b.thickness*R.unit,bh=(b.height==='tall'?R.tall:R.short)-6,S={x:x+bw/2,y:R.y-R.h/2+3+bh/2,w:bw-2,h:bh};const n=this.nodes.get(b.id)!;this.put(n,this.board!,S);this.paint(n,b,S,true);this.rects.set(b.id,S);x+=bw}}
 // ---------- input: one root listener, one finger ----------
 // UI location is bottom-left based; the canvas (and root) sit at the world origin, centred under the camera.
 private local(e:EventTouch){const p=e.getUILocation(),s=view.getVisibleSize();return {x:p.x-s.width/2,y:p.y-s.height/2}}
 private inside(R:Rect,x:number,y:number,pad=0){return Math.abs(x-R.x)<=R.w/2+pad&&Math.abs(y-R.y)<=R.h/2+pad}
 private bookAt(x:number,y:number){const r=this.round!;const hit=(state:string)=>r.books.find((b:any)=>b.state===state&&this.inside(this.rects.get(b.id)!,x,y,4));return hit('shelved')||hit('floor')||null}
 private rowAt(x:number,y:number){for(let c=0;c<this.rowRects.length;c++)for(let row=0;row<this.rowRects[c].length;row++)if(this.inside(this.rowRects[c][row],x,y,6))return {c,row};return null}
 private onStart(e:EventTouch){const r=this.round;if(this.screen!=='round'||!r||this.modal)return;if(this.held)this.cancelHeld();// a lost touch-end must not leave a book in hand
  const p=this.local(e),b=this.bookAt(p.x,p.y);if(!b||!r.canPick(b.id))return;this.held={id:b.id,from:b.state==='shelved'?'shelf':'floor',touch:e.getID(),x:p.x,y:p.y,moved:false}}
 private onMove(e:EventTouch){const h=this.held;if(!h||e.getID()!==h.touch)return;const p=this.local(e);if(!h.moved&&Math.hypot(p.x-h.x,p.y-h.y)<DRAG)return;if(!h.moved){h.moved=true;this.lift()}this.follow(p.x,p.y)}
 private onEnd(e:EventTouch){const h=this.held;if(!h||e.getID()!==h.touch)return;const p=this.local(e);if(!h.moved){this.cancelHeld();this.tap(h.id);return}this.drop(h,p.x,p.y+LIFT)}
 private onCancel(e:EventTouch){if(this.held&&e.getID()===this.held.touch)this.cancelHeld()}
 private lift(){const h=this.held!,b=this.round!.book(h.id),R=this.rects.get(h.id)!,n=this.nodes.get(h.id)!;n.getComponent(UIOpacity)!.opacity=90;
  const F=this.floorRects.get(h.id)!,g=this.u.node('拿着',this.drag!,F.w,F.h);g.addComponent(Graphics);g.addComponent(UIOpacity);const t=this.u.text('',g,F.w,F.h,14,UI.paper);t.name='字';t.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.CENTER;
  this.paint(g,b,{x:0,y:0,w:F.w,h:F.h},h.from==='shelf');g.setScale(1.12,1.12,1);g.setPosition(R.x,R.y);this.ghost=g}
 private follow(x:number,y:number){const h=this.held!;this.ghost?.setPosition(x,y+LIFT);this.preview(h,x,y+LIFT)}
 private preview(h:Held,x:number,y:number){const g=this.hover!,r=this.round!;g.clear();this.reason!.string='';const t=this.rowAt(x,y);if(!t)return;
  const b=r.book(h.id),at=h.from==='shelf'?r.board.where(b):null;if(at&&at.cabinet===t.c&&at.row===t.row)return;
  const R=this.rowRects[t.c][t.row],fit=r.preview(h.id,t.c,t.row);
  if(fit==='ok'){const used=r.board.used(t.c,t.row),bh=(b.height==='tall'?R.tall:R.short)-6;g.fillColor=new Color(OK.r,OK.g,OK.b,120);g.rect(R.left+used*R.unit,R.y-R.h/2+3,b.thickness*R.unit-2,bh);g.fill();return}
  g.strokeColor=BAD;g.lineWidth=3;g.rect(R.x-R.w/2,R.y-R.h/2,R.w,R.h);g.stroke();this.reason!.string=REASON[fit]||'';this.reason!.node.setPosition(R.x,R.y-R.h/2-12)}
 // A shelved book comes out (1 step) only when dropped on the floor or another row; anywhere else it goes back for free.
 private drop(h:Held,x:number,y:number){const r=this.round!,t=this.rowAt(x,y),b=r.book(h.id);this.cancelHeld();
  if(h.from==='shelf'){const at=r.board.where(b);if(t?at&&at.cabinet===t.c&&at.row===t.row:!this.inside(this.floor,x,y))return;r.remove(h.id)}
  const fit=t&&r.status==='playing'?r.place(h.id,t.c,t.row):null;this.apply(r.drain());
  if(fit==='too-tall'||fit==='too-thick'){this.toast(REASON[fit]);this.shake(this.nodes.get(h.id)!)}}
 private tap(id:string){const r=this.round!;if(r.flip(id)){this.apply(r.drain());return}if(r.book(id).state==='floor')this.toast('拖到柜子里；角上有白角的书可以点开看全')}
 private cancelHeld(){if(this.ghost?.isValid)this.ghost.destroy();this.ghost=null;const h=this.held;this.held=null;if(!h)return;
  const n=this.nodes.get(h.id);if(n?.isValid)n.getComponent(UIOpacity)!.opacity=255;if(this.hover?.isValid)this.hover.clear();if(this.reason?.isValid)this.reason.string=''}
 // ---------- events → incremental updates ----------
 private apply(events:any[]){const r=this.round!;
  for(const e of events){const b=e.id?r.book(e.id):null,n=e.id?this.nodes.get(e.id):null;
   if(e.type==='flipped'){this.toFloor(b);this.pop(n!)}
   else if(e.type==='wrong'){this.toFloor(b);this.shake(n!);this.toast(`不是这个柜 · 多用了 2 步`)}
   else if(e.type==='placed'){this.layoutRow(e.cabinet,e.row);this.pop(n!);this.floatText('咔',this.rects.get(e.id)!)}
   else if(e.type==='removed'){this.toFloor(b);this.layoutRow(e.cabinet,e.row)}
   else if(e.type==='full'){this.flashRow(e.cabinet,e.row);this.toast(`这一层塞满了 · 退回 ${r.level.refund} 步`)}
   else if(e.type==='revived')this.toast('水退下去了一截')
   else if(e.type==='won'){this.saved=this.progress.complete(r.level.id);this.openModal('won')}// the only save write per clear
   else if(e.type==='reviving')this.openModal('revive')
   else if(e.type==='lost')this.openModal('lost')}
  this.refreshHud()}
 private refreshHud(){const r=this.round,l=this.steps;if(!r||!l?.isValid)return;l.string=`剩余 ${r.left} 步`;l.color=r.left<=3?BAD:UI.paper}
 private pop(n:Node){Tween.stopAllByTarget(n);n.setScale(1.18,1.18,1);tween(n).to(.12,{scale:new Vec3(1,1,1)}).start()}
 private shake(n:Node){const p=n.position.clone();tween(n).by(.05,{position:new Vec3(6,0,0)}).by(.1,{position:new Vec3(-12,0,0)}).to(.05,{position:p}).start()}
 private floatText(t:string,R:Rect){const l=this.label(t,this.fx!,R.x,R.y+R.h/2+6,60,24,16,FLASH),n=l.node,o=n.addComponent(UIOpacity);tween(n).by(.5,{position:new Vec3(0,18,0)}).call(()=>n.destroy()).start();tween(o).delay(.2).to(.3,{opacity:0}).start()}
 private flashRow(c:number,row:number){const R=this.rowRects[c][row],n=this.u.node('塞满',this.fx!,R.w,R.h);n.setPosition(R.x,R.y);const g=n.addComponent(Graphics),o=n.addComponent(UIOpacity);g.fillColor=new Color(FLASH.r,FLASH.g,FLASH.b,150);g.rect(-R.w/2,-R.h/2,R.w,R.h);g.fill();tween(o).to(.6,{opacity:0}).call(()=>n.destroy()).start()}
 private toast(text:string,seconds=1.6){if(!this.fx?.isValid)return;if(!this.toastNode?.isValid){const n=this.u.node('提示',this.fx,this.u.width-40,34);n.setPosition(0,this.floor.y+this.floor.h/2+2);this.u.box(n,new Color(20,34,28,220),12);this.label('',n,0,0,this.u.width-56,34,14);n.addComponent(UIOpacity);this.toastNode=n}
  const n=this.toastNode!,o=n.getComponent(UIOpacity)!;n.getComponentInChildren(Label)!.string=text;Tween.stopAllByTarget(o);o.opacity=255;tween(o).delay(seconds).to(.3,{opacity:0}).start()}
 private drawWater(){const g=this.water,F=this.floor;if(!g?.isValid)return;g.clear();if(this.waterShown<=.001)return;const top=F.y-F.h/2+this.waterShown*F.h;
  g.fillColor=new Color(WATER.r,WATER.g,WATER.b,140);g.rect(-this.u.width/2,-this.u.height/2,this.u.width,top+this.u.height/2);g.fill();g.strokeColor=C('#bfe0f0');g.lineWidth=2;g.moveTo(-this.u.width/2,top);g.lineTo(this.u.width/2,top);g.stroke()}
 // ---------- dialogs: built once, unchanged until closed ----------
 private openModal(kind:Modal){this.closeModal();this.modal=kind;const r=this.round!,id=r.level.id,i=PACK_IDS.indexOf(id),next=PACK_LEVELS[i+1];
  if(kind==='pause')this.card('暂停','水先停一停',[['继续',()=>this.closeModal()],['重新开始',()=>this.start(id)],['回菜单',()=>this.toMenu()]]);
  else if(kind==='revive')this.card('水漫上来了','看一段广告，水退下去三成',[['看广告退水',()=>{void ads.showRewardedVideo().then((res:any)=>{if(res.status==='rewarded'&&this.round===r&&r.revive()){this.closeModal();this.apply(r.drain())}})}],['放弃',()=>{r.giveUp();this.openModal('lost')}]]);
  else if(kind==='won')this.card('这一柜整理好了',`还剩 ${r.left} 步${this.saved?'':'（未保存）'}`,next?[['下一关',()=>this.start(next.id)],['回菜单',()=>this.toMenu()]]:[['回菜单',()=>this.toMenu()]]);
  else if(kind==='lost')this.card('书被水泡了','先想好每层怎么塞，再动手',[['重试',()=>this.start(id)],['回菜单',()=>this.toMenu()]])}
 private closeModal(){if(this.dialog?.isValid)this.dialog.destroy();this.dialog=null;this.modal=null}
 private card(title:string,body:string,buttons:Array<[string,()=>void]>){const u=this.u,w=u.width,n=u.node('弹窗',u.root,w,u.height);n.addComponent(BlockInputEvents);u.box(n,new Color(10,20,16,190),0);const card=u.node('卡片',n,w-48,150+buttons.length*62);u.box(card,UI.paper,18);
  const ch=card.getComponent(UITransform)!.height;this.label(title,card,0,ch/2-34,w-80,36,22,UI.ink);this.label(body,card,0,ch/2-72,w-80,40,15,UI.muted);
  buttons.forEach(([t,fn],i)=>u.button(t,fn,card,w-96,52,i?'paper':'green').setPosition(0,ch/2-130-i*62));this.dialog=n}
 // ---------- frame: only the water line eases toward the round's level ----------
 update(dt:number){const r=this.round;if(this.screen!=='round'||!r)return;const target=r.water,d=target-this.waterShown;if(Math.abs(d)<.001)return;this.waterShown=Math.abs(d)<.002?target:this.waterShown+d*Math.min(1,Math.min(dt,.1)*6);this.drawWater()}
 destroy(){game.off(Game.EVENT_HIDE,this.hide,this);this.cancelHeld();this.u?.destroy()}
}
