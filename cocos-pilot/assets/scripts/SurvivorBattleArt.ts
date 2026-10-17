import {Node,Sprite,SpriteFrame,Texture2D,ImageAsset,Rect,Size,UITransform,Color,AssetManager} from 'cc';
import {SURVIVOR_FRAMES} from './SurvivorBattleFrames';
// 战斗渲染（03 §6.2，02 §1.3 / §9.1）。
// - 分层父节点（自下而上）：地面 → 孢子 → 敌人 → 小旅人（底影/方向弧/本体/生命条）→ 玩家弹体 → 敌方弹体（S1 空）→ FX → 摇杆。
//   层序按 02 §1.3：敌方弹体在玩家攻击之上、拾取物在敌人之下。
// - 每层一个 Sprite 节点池，每帧按序分配：只为视口（含 64u 余量）内的实体取节点，本帧未用到的节点隐藏；
//   节点不跨帧保存实体状态。节点池按需创建，不超过上限。
// - 战斗层所有动态 Sprite 来自同一张 survivor-battle 图集（裁决 D6），地面单独一张平铺图。
// - 不在战斗中重绘 Graphics；受击闪白通过切换到预烘焙的白色剪影帧实现（不改混合模式，不打断合批）。
const MARGIN=64,TILE=256;
type Slot={node:Node,sprite:Sprite,ui:UITransform,frame:string,color:number};
class SpritePool{
 private slots:Slot[]=[];private used=0;private shown=0;
 constructor(private parent:Node,private cap:number,private art:SurvivorBattleArt){}
 begin(){this.used=0}
 next():Slot|null{
  if(this.used>=this.cap)return null;
  let s=this.slots[this.used];
  if(!s){const node=new Node('s');node.layer=this.parent.layer;this.parent.addChild(node);const ui=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;s={node,sprite,ui,frame:'',color:-1};this.slots.push(s)}
  if(this.used>=this.shown)s.node.active=true;
  this.used++;return s;
 }
 end(){for(let i=this.used;i<this.shown;i++)this.slots[i].node.active=false;this.shown=this.used}
 get count(){return this.shown}
 set(s:Slot,key:string){if(s.frame===key)return;s.frame=key;this.art.apply(s.sprite,s.ui,key)}
}
function tint(s:Slot,r:number,g:number,b:number,a:number){const k=((r<<24)>>>0)+(g<<16)+(b<<8)+a;if(s.color===k)return;s.color=k;s.sprite.color=new Color(r,g,b,a)}
const WHITE=[255,255,255];
const KIND_TINT:Record<string,number[]>={moth:[0xc8,0xbc,0xe0],snail:[0x9a,0x86,0xc0],sporeling:[0xb8,0xe0,0x9a],elite_beetle:[0xff,0xd8,0x8a],boss_mist_snail:[0x8a,0x70,0xb0]};
const BIG_KINDS:Record<string,boolean>={beetle:true,snail:true,elite_beetle:true,boss_mist_snail:true};
type Dot={x:number,y:number,vx:number,vy:number,life:number,gold:boolean};
export class SurvivorBattleArt{
 root:Node;ready=false;joyBase!:Node;joyKnob!:Node;
 private ground:Node;private world:Node;private screen:Node;private frames=new Map<string,SpriteFrame>();
 private image:ImageAsset|null=null;private texture:Texture2D|null=null;private groundImage:ImageAsset|null=null;private groundTexture:Texture2D|null=null;private groundFrame:SpriteFrame|null=null;
 private tiles:Node[]=[];private pools:Record<string,SpritePool>={} as any;private dots:Dot[]=[];private hurtAt=-99;private lastDirX=1;private clock=0;
 constructor(parent:Node,private width:number,private height:number){
  this.root=this.layer(parent,'Survivor battle');this.ground=this.layer(this.root,'Ground');this.world=this.layer(this.root,'World');this.screen=this.layer(this.root,'Screen');
 }
 private layer(parent:Node,name:string){const n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform).setContentSize(1,1);return n}
 async load(bundle:AssetManager.Bundle){
  const get=(path:string)=>new Promise<ImageAsset>((ok,fail)=>bundle.load(path,ImageAsset,(e,a)=>e?fail(e):ok(a)));
  const [atlas,ground]=await Promise.all([get('survivor-battle'),get('ground')]);
  if(!this.root.isValid)return;
  atlas.addRef();ground.addRef();this.image=atlas;this.groundImage=ground;
  const t=this.texture=new Texture2D();t.image=atlas;t.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
  const gt=this.groundTexture=new Texture2D();gt.image=ground;gt.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
  const gf=this.groundFrame=new SpriteFrame();gf.texture=gt;
  this.build();this.ready=true;
 }
 frame(key:string){
  let f=this.frames.get(key);if(f)return f;const info=SURVIVOR_FRAMES[key];if(!info||!this.texture)throw Error('Survivor sprite unavailable: '+key);
  f=new SpriteFrame();f.texture=this.texture;f.rect=new Rect(info.x,info.y,info.w,info.h);f.originalSize=new Size(info.w,info.h);this.frames.set(key,f);return f;
 }
 apply(sprite:Sprite,ui:UITransform,key:string){const info=SURVIVOR_FRAMES[key];sprite.spriteFrame=this.frame(key);ui.setContentSize(info.width,info.height);ui.setAnchorPoint(info.anchorX,info.anchorY)}
 private single(parent:Node,key:string){const n=new Node(key);n.layer=parent.layer;parent.addChild(n);const ui=n.addComponent(UITransform),s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.trim=false;this.apply(s,ui,key);return n}
 private build(){
  // 节点池上限（03 §6.2）：敌人 160、玩家弹体 120、浊雾泡 40、孢子 150、FX 80。敌人底影已烘焙进敌人帧，每个敌人 1 个节点。
  const L=(name:string)=>this.layer(this.world,name);
  const zones=L('Zones'),spores=L('Spores'),enemies=L('Enemies'),player=L('Player'),shots=L('Player shots'),mist=L('Mist bubbles');const fx=L('FX');
  this.pools.zones=new SpritePool(zones,2,this);this.pools.spores=new SpritePool(spores,150,this);this.pools.enemies=new SpritePool(enemies,160,this);
  this.pools.shots=new SpritePool(shots,120,this);this.pools.mist=new SpritePool(mist,40,this);this.pools.fx=new SpritePool(fx,80,this);
  this.pools.player=new SpritePool(player,5,this);
  this.joyBase=this.single(this.screen,'joy-base');this.joyKnob=this.single(this.screen,'joy-knob');
  this.layoutGround();
 }
 resize(width:number,height:number){this.width=width;this.height=height;if(this.ready)this.layoutGround()}
 private layoutGround(){
  for(const t of this.tiles)t.destroy();this.tiles=[];
  const cols=Math.ceil(this.width/TILE)+1,rows=Math.ceil(this.height/TILE)+1;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const n=new Node('tile');n.layer=this.ground.layer;this.ground.addChild(n);n.addComponent(UITransform).setContentSize(TILE+1,TILE+1);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=this.groundFrame;n.setPosition(-this.width/2+TILE/2+c*TILE,-this.height/2+TILE/2+r*TILE);this.tiles.push(n)}
 }
 hurt(){this.hurtAt=this.clock}
 // 净化光点（02 §5.3）：4–6 个暖白光点上飘 0.3 秒；reduceFlash 时减半。菌灵（S2）为金色。
 purify(x:number,y:number,kind:string,reduceFlash:boolean){
  const n=(reduceFlash?2:4)+((x*7+y*3)&1)*(reduceFlash?1:2);
  for(let i=0;i<n;i++){if(this.dots.length>=80)this.dots.shift();const a=(i/n)*Math.PI*2+x*.01;this.dots.push({x,y,vx:Math.cos(a)*40,vy:Math.sin(a)*24+60,life:.3,gold:kind==='sporeling'})}
 }
 // 每帧同步：只读逻辑层状态，不修改。
 sync(run:any,dt:number,reduceFlash:boolean){
  if(!this.ready)return;this.clock+=dt;
  const p=run.player,t=run.time,cx=p.x,cy=p.y,hw=this.width/2+MARGIN,hh=this.height/2+MARGIN;
  this.world.setPosition(-cx,-cy);
  // 地面平铺随镜头取模偏移
  const ox=-(((cx%TILE)+TILE)%TILE),oy=-(((cy%TILE)+TILE)%TILE);this.ground.setPosition(ox,oy);
  const visible=(x:number,y:number)=>Math.abs(x-cx)<hw&&Math.abs(y-cy)<hh;
  // 孢子：菱形，1.2 秒呼吸缩放 ±8%
  // 阳光撤离点（S2 临时占位，第二批 P1 换光柱帧）：摇杆底圆放大到撤离半径染暖金，内圈按停留进度放大
  const zp=this.pools.zones;zp.begin();const ex=run.extraction;
  if(ex){
   const o=zp.next()!;zp.set(o,'joy-base');o.ui.setContentSize(ex.r*2,ex.r*2);o.node.setPosition(ex.x,ex.y);tint(o,0xff,0xe0,0x8a,150);
   const k=Math.max(.05,ex.progress),q=zp.next()!;zp.set(q,'joy-base');q.ui.setContentSize(ex.r*2*k,ex.r*2*k);q.node.setPosition(ex.x,ex.y);tint(q,0xff,0xf4,0xc8,230);
  }
  zp.end();
  const sp=this.pools.spores;sp.begin();
  for(let i=0;i<run.spores.count;i++){const s=run.spores.active[i];if(!visible(s.x,s.y))continue;const n=sp.next();if(!n)break;sp.set(n,s.tier===2?'spore-l':s.tier===1?'spore-m':'spore-s');const k=1+.08*Math.sin((t+s.uid*.37)*Math.PI*2/1.2);n.node.setPosition(s.x,s.y);n.node.setScale(k,k,1)}
  sp.end();
  // 敌人：底影烘焙在帧内；受击 0.1 秒闪白（reduceFlash 时改为 1.1 缩放脉冲）
  const ep=this.pools.enemies;ep.begin();
  for(let i=0;i<run.enemies.count;i++){
   const e=run.enemies.active[i];if(!visible(e.x,e.y))continue;const n=ep.next();if(!n)break;
   const hit=e.lastHitTime>=0&&t-e.lastHitTime<.1,flash=hit&&!reduceFlash,phase=t+e.uid*.37;
   // S2 临时占位（第二批 P1 换正式帧）：蜗牛/精英/Boss 借甲虫帧、灰蛾/菌灵借蚊蚋帧，按碰撞半径缩放 + 按种类着色
   const big=!!BIG_KINDS[e.kind],base=big?'beetle':'gnat';ep.set(n,flash?base+'-flash':base);
   const c=flash?WHITE:(KIND_TINT[e.kind]||WHITE);tint(n,c[0],c[1],c[2],255);const rs=e.r/(big?16:10);
   let x=e.x,y=e.y-e.r*.5;if(base==='gnat'){x+=Math.sin(phase*23)*1.5;y+=Math.cos(phase*19)*1.5}else y+=Math.abs(Math.sin(phase*10));
   n.node.setPosition(x,y);const k=(hit&&reduceFlash?1.1:1)*rs;n.node.setScale(base==='beetle'&&p.x<e.x?-k:k,k,1);
  }
  ep.end();
  // 浊雾泡（敌方弹体）：S2 临时用大孢子帧染品红 #E05AD0（02 §1.2），按碰撞直径缩放
  const mp=this.pools.mist;mp.begin();
  for(let i=0;i<(run.mistBubbles?run.mistBubbles.count:0);i++){const b=run.mistBubbles.active[i];if(!visible(b.x,b.y))continue;const n=mp.next();if(!n)break;mp.set(n,'spore-l');n.ui.setContentSize(b.r*2,b.r*2);n.node.setPosition(b.x,b.y);tint(n,0xe0,0x5a,0xd0,255)}
  mp.end();
  // 小旅人：底影 + 方向弧 + 本体 + 生命条
  const pp=this.pools.player;pp.begin();const moving=Math.hypot(run._inX||0,run._inY||0)>.01,feetY=p.y-p.r*.5;
  if(Math.abs(p.dirX)>.05)this.lastDirX=p.dirX>0?1:-1;
  const shadow=pp.next()!;pp.set(shadow,'player-shadow');shadow.node.setPosition(p.x,feetY);
  const arc=pp.next()!;pp.set(arc,'player-arc');arc.node.setPosition(p.x+p.dirX*22,feetY+p.dirY*8);arc.node.angle=Math.atan2(p.dirY,p.dirX)*180/Math.PI;tint(arc,255,255,255,moving?255:0);
  const body=pp.next()!;pp.set(body,'player');body.node.setPosition(p.x,feetY+(moving?Math.abs(Math.sin(t*12))*2:0));body.node.setScale(this.lastDirX,1,1);
  let a=255;if(p.invuln>0)a=reduceFlash?153:(Math.floor(t*20)%2?89:255);if(run.state==='lost')a=110;tint(body,255,255,255,a);
  const ratio=Math.max(0,Math.min(1,p.hp/p.maxHp)),barA=ratio>=1&&this.clock-this.hurtAt>2?128:255;
  const bg=pp.next()!;pp.set(bg,'white');bg.ui.setContentSize(64,8);bg.node.setPosition(p.x,feetY-12);tint(bg,0x3a,0x2a,0x2a,barA);
  const fill=pp.next()!;pp.set(fill,'white');fill.ui.setContentSize(64*ratio,8);fill.ui.setAnchorPoint(0,.5);fill.node.setPosition(p.x-32,feetY-12);tint(fill,0xe8,0x6a,0x5a,barA);
  pp.end();
  // 玩家弹体：沿速度方向旋转
  const sh=this.pools.shots;sh.begin();
  for(let i=0;i<run.shots.count;i++){const s=run.shots.active[i];if(!visible(s.x,s.y))continue;const n=sh.next();if(!n)break;sh.set(n,'spore-shot');n.node.setPosition(s.x,s.y);n.node.angle=Math.atan2(s.vy,s.vx)*180/Math.PI}
  // S2 临时占位（第二批 P1 换正式帧）：菌伞片用大孢子帧按碰撞直径缩放；露珠环用 16 个净化光点排成圆环
  for(const w of run.weapons){
   if(w.id==='umbrella_blades')for(let i=0;i<w.bladeCount;i++){const n=sh.next();if(!n)break;sh.set(n,'spore-l');n.ui.setContentSize(w.bladeR*2,w.bladeR*2);n.node.setPosition(w.bladeX[i],w.bladeY[i]);n.node.angle=t*360}
   else if(w.id==='dew_ring'&&w.ringR>0)for(let i=0;i<16;i++){const n=sh.next();if(!n)break;sh.set(n,'purify-dot');const a=i/16*Math.PI*2+t*.5;n.node.setPosition(p.x+Math.cos(a)*w.ringR,p.y+Math.sin(a)*w.ringR);n.node.angle=0}
  }
  sh.end();
  // FX：净化光点（表现层计时）
  const fp=this.pools.fx;fp.begin();
  for(let i=this.dots.length-1;i>=0;i--){const d=this.dots[i];d.life-=dt;if(d.life<=0){this.dots.splice(i,1);continue}d.x+=d.vx*dt;d.y+=d.vy*dt}
  for(const d of this.dots){const n=fp.next();if(!n)break;fp.set(n,'purify-dot');n.node.setPosition(d.x,d.y);tint(n,d.gold?0xf2:255,d.gold?0xc1:255,d.gold?0x4e:255,Math.round(255*Math.min(1,d.life/.3)))}
  fp.end();
 }
 // 冒烟/性能用：战斗层当前激活的动态节点数（不含地面与摇杆）
 get activeNodes(){let n=0;for(const k in this.pools)n+=this.pools[k].count;return n}
 destroy(){
  this.root.destroy();for(const f of this.frames.values())f.destroy();this.frames.clear();this.groundFrame?.destroy();
  this.texture?.destroy();this.groundTexture?.destroy();this.texture=this.groundTexture=null;this.groundFrame=null;
  this.image?.decRef();this.groundImage?.decRef();this.image=this.groundImage=null;this.ready=false;
 }
}
