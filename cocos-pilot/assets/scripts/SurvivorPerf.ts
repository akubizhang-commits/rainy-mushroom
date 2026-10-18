import {Node,Label,Color,Graphics,UITransform,director,view,sys} from 'cc';
import {LIMITS} from './shared/js/survivor/data/limits';
import {HUD_TOP_RESERVED} from './SurvivorHud';
// 调试性能面板（04 §5.2、08 P5 / BUG-S1-02）。只在浏览器 `?perf=1` 或微信启动参数 `perf=1` 时由 PinePilot 创建；
// 默认不创建，正式包不显示、不计时。
// 显示：FPS（均值 / P50）、帧耗时 P95、逻辑步耗时（均值 / 最大、每帧步数）、DrawCall、战斗层激活节点、
// 逻辑池占用（敌人 / 弹体 / 浊雾泡 / 孢子 / 雨滴区）与渲染池占用、diag.dropped / capSkipped。
// 面板右下的“满屏200”开关（PF-2）：开启后每帧把敌人补到 200 并回满血量，只在战斗中生效，再点一次关闭。
const WINDOW=180,REFRESH=.25,FILL=200;
const BG=new Color(10,20,18,200),EDGE=new Color(0x5f,0x7f,0x6e,255),TEXT=new Color(0xf4,0xf1,0xe8,255),ON=new Color(0xe8,0xb8,0x5a,255);
// 浏览器 ?perf=1；微信 wx.getLaunchOptionsSync().query.perf === '1'
export function perfEnabled(){
 try{
  if(sys.isBrowser&&typeof window!=='undefined'&&window.location&&new URLSearchParams(window.location.search).get('perf')==='1')return true;
  const q=(globalThis as any).wx?.getLaunchOptionsSync?.()?.query;return !!q&&String(q.perf)==='1';
 }catch{return false}
}
// 高精度时钟（ms）：performance.now；微信 wx.getPerformance().now() 单位为微秒
export function perfClock():()=>number{
 const p=(globalThis as any).performance;if(p&&typeof p.now==='function')return ()=>p.now();
 const w=(globalThis as any).wx?.getPerformance?.();if(w&&typeof w.now==='function')return ()=>w.now()/1000;
 return ()=>Date.now();
}
// 在视口内随机补满敌人到 count（冒烟与 PF-2 共用）。_spawnOne 自 L 系列起需要显式落点。
export function fillScreen(v:any,count=FILL){
 const run=v.run;if(!run)return;const minute=run.time/60,w=v.width,h=v.height;
 while(run.enemies.count<count){
  const before=run.enemies.count;run.spawner._spawnOne(run,run.enemies.count%3?'gnat':'beetle',minute,{x:run.player.x+(Math.random()-.5)*w,y:run.player.y+(Math.random()-.5)*h});if(run.enemies.count===before)break;
 }
}
const countActive=(n:Node):number=>{if(!n.active)return 0;let c=1;for(const ch of n.children)c+=countActive(ch);return c};
const pct=(sorted:Float64Array,p:number)=>sorted[Math.min(sorted.length-1,Math.floor(p*(sorted.length-1)+.5))];
export class SurvivorPerf{
 private root:Node;private label:Label;private toggle:Node;private toggleLabel:Label;private toggleG:Graphics;
 private frames=new Float64Array(WINDOW);private stepsMs=new Float64Array(WINDOW);private n=0;private i=0;private acc=0;private stepMax=0;
 private fill=false;private now=perfClock();private last=0;
 constructor(private host:any){
  this.root=this.node('Survivor Perf',host.canvas,360,300);
  const bg=this.root.addComponent(Graphics);bg.fillColor=BG;bg.rect(-180,-150,360,300);bg.fill();bg.strokeColor=EDGE;bg.lineWidth=1;bg.rect(-180,-150,360,300);bg.stroke();
  const ln=this.node('text',this.root,340,280);
  const l=this.label=ln.addComponent(Label);l.fontSize=18;l.lineHeight=22;l.color=TEXT;l.horizontalAlign=Label.HorizontalAlign.LEFT;l.verticalAlign=Label.VerticalAlign.TOP;l.overflow=Label.Overflow.CLAMP;l.cacheMode=Label.CacheMode.CHAR;
  // 开关热区 ≥ 88×88u，放在面板下方
  this.toggle=this.node('fill toggle',this.root,176,88);this.toggle.setPosition(90,-196);
  this.toggleG=this.toggle.addComponent(Graphics);
  const tl=this.node('label',this.toggle,170,60);const t=this.toggleLabel=tl.addComponent(Label);t.fontSize=22;t.lineHeight=28;t.color=TEXT;t.cacheMode=Label.CacheMode.CHAR;
  this.toggle.on(Node.EventType.TOUCH_END,()=>{this.fill=!this.fill;this.drawToggle()});
  this.drawToggle();this.last=this.now();
 }
 private node(name:string,parent:Node,w:number,h:number){const n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);return n}
 private drawToggle(){const g=this.toggleG;g.clear();g.fillColor=this.fill?ON:BG;g.roundRect(-84,-30,168,60,12);g.fill();g.strokeColor=EDGE;g.lineWidth=2;g.roundRect(-84,-30,168,60,12);g.stroke();this.toggleLabel.string=this.fill?'满屏200 开':'满屏200 关';this.toggleLabel.color=this.fill?BG:TEXT}
 // PinePilot.update 在 survivor.update 之后调用
 update(dt:number){
  const v=this.host.survivor;if(!v)return;
  if(!v.perfClock)v.perfClock=this.now;
  // 满屏：只在战斗中补怪并回满血量（死亡会打断 PF-2 采样）
  if(this.fill&&v.screen==='battle'&&v.run?.state==='playing'){fillScreen(v);v.run.player.hp=v.run.player.maxHp}
  const t=this.now(),frameMs=t-this.last;this.last=t;
  const k=this.i;this.frames[k]=frameMs;this.stepsMs[k]=v.stepMs||0;this.i=(k+1)%WINDOW;this.n=Math.min(WINDOW,this.n+1);this.stepMax=Math.max(this.stepMax,v.stepMs||0);
  // 面板贴可见区左侧、HUD 顶部区域之下（营地 / 战斗设计分辨率不同，每帧跟随）
  const s=view.getVisibleSize();this.root.setPosition(-s.width/2+190,s.height/2-(v.safe?.safeTop||0)-HUD_TOP_RESERVED-170);
  this.acc+=dt;if(this.acc<REFRESH)return;this.acc=0;this.label.string=this.text(v);this.stepMax=0;
 }
 private text(v:any){
  const n=this.n,f=this.frames.slice(0,n).sort(),st=this.stepsMs.slice(0,n);let sum=0,ss=0;for(let j=0;j<n;j++){sum+=this.frames[j];ss+=st[j]}
  const avg=n?sum/n:0,p50=n?pct(f,.5):0,p95=n?pct(f,.95):0,dc=(director.root as any)?.device?.numDrawCalls||0;
  const art=v.art,battle=art?.root&&art.root.active?countActive(art.root):0,run=v.run,P=LIMITS.pools;
  const lines=[
   `FPS ${avg?(1000/avg).toFixed(1):'-'}  P50 ${p50?(1000/p50).toFixed(1):'-'}`,
   `帧 P95 ${p95.toFixed(1)}ms`,
   `步耗时 ${(n?ss/n:0).toFixed(2)}ms  max ${this.stepMax.toFixed(2)}ms  ×${v.steps||0}`,
   `DrawCall ${dc}  战斗节点 ${battle}`,
  ];
  if(run){
   const d=run.diag||{},dr=d.dropped||{};
   lines.push(`${run.state} ${Math.floor(run.time)}s`,
    `敌人 ${run.enemies.count}/${P.enemies}  弹 ${run.shots.count}/${P.playerProjectiles}`,
    `雾泡 ${run.mistBubbles.count}/${P.mistBubbles}  孢子 ${run.spores.count}/${P.spores}  雨区 ${run.zones.count}/${P.raindropZones}`,
    `dropped ${dr.enemies||0}/${dr.shots||0}/${dr.bubbles||0}/${dr.zones||0}  capSkip ${d.capSkipped?.enemies||0}`);
  }else lines.push(v.screen||'');
  const pc=art?.poolCounts;if(pc)lines.push('渲染 '+Object.keys(pc).map(k=>k+' '+pc[k]).join(' '));
  return lines.join('\n');
 }
 destroy(){this.root.destroy();const v=this.host.survivor;if(v)v.perfClock=null}
}
