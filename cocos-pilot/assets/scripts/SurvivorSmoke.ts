import {Node,director,view} from 'cc';
import {STRINGS} from './shared/js/survivor/data/strings';
import {fillScreen} from './SurvivorPerf';
// 生存玩法浏览器冒烟（03 §2.2 / §10、04 §L5、08 P5）：`?survivor&smoke=1`。
// 阶段 1：脚本输入（绕圈摇杆）真实时间跑 30 秒，升级优先选新武器卡（否则第一张）；断言新武器上场且有对应渲染帧；
// 阶段 2：调试钩子快进逻辑时间到 2:45（经过 2:30 蚊蚋包围圈事件）并把敌人池铺满视口，再真实时间跑 10 秒；断言事件横幅；
// 阶段 3：快进到 5:30（菌灵波段，经过 4:30 灰蛾横穿），真实时间跑 6 秒；断言新敌人（菌灵/灰蛾/蜗牛）与浊雾泡渲染；
// 阶段 4：快进到 Boss 出现（7:00），真实时间跑 3 秒，断言 Boss 血条可见；
// 阶段 5：Boss 生命置 0 → cleansing（全场净化、横幅）→ extract（撤离点）→ 把小旅人放进撤离点 → won → 胜利结算页；
// 阶段 6：结算后“再来一局”，生命置 1 并在脚下生成甲虫 → 接触致死 → lost → 失败结算页；
// 每个阶段的第一次升级保持三选一 0.6 秒（滑入结束后）再选，采样模态帧 DrawCall（BUG-S1-03，≤ 25）；
// 阶段结束时断言 HUD 武器/被动栏显示数与 run.weapons / run.passives 一致。
// 结束后销毁视图，断言设计分辨率恢复 375×812。
// 断言：无 console.error / 未捕获异常；战斗层激活节点 ≤ 600；战斗帧（playing/cleansing/extract 且无模态框）DrawCall ≤ 25；三选一模态帧 DrawCall ≤ 25；
// 胜利 / 失败结算模态帧（dcByState["won/result"]、["lost/result"]，结算页各停留 0.5 秒采样）DrawCall ≤ 25（BUG-S2-03）。
// 结果经 postMessage('survivor-smoke') 发给父页，同时写到 window.__survivorSmoke 供无头浏览器读取。
// 调试钩子（血量回满、直接生成敌人、改 Boss 生命、移动小旅人）只在冒烟里使用；冒烟存档为内存存储（PinePilot 注入），不写正式存档。
const NODE_BUDGET=600,DRAWCALL_BUDGET=25,FILL=200;
const WEAPON_FRAME:Record<string,string>={umbrella_blades:'umbrella-blade',dew_ring:'dew-ring',raindrop:'raindrop',leaf_boomerang:'leaf'};
export async function runSurvivorSmoke(host:any){
 const results:string[]=[],errors:string[]=[],check=(v:boolean,n:string)=>{if(!v)throw Error(n);results.push(n)};
 const onError=(e:ErrorEvent)=>{errors.push('error: '+(e.message||String(e.error)))},onRejection=(e:PromiseRejectionEvent)=>{errors.push('unhandledrejection: '+String(e.reason))};
 const consoleError=console.error;console.error=(...args:any[])=>{errors.push('console.error: '+args.map(String).join(' '));consoleError.apply(console,args)};
 window.addEventListener('error',onError);window.addEventListener('unhandledrejection',onRejection);
 const frame=()=>new Promise<void>(r=>host.scheduleOnce(r,0));
 let raindropHint=false,maxNodes=0,maxDrawCalls=0,maxEnemies=0,maxModalDrawCalls=0,modalSamples=0,maxMist=0,maxMistShown=0,maxGlow=0,maxBossArrow=0;const dcByState:Record<string,number>={},dcHist:Record<number,number>={};
 // 观测：逻辑事件类型（包一层 drainEvents）、渲染池显示过的帧、HUD 横幅文本、出现过的 run.state
 const seen=new Set<string>(),enemyFrames=new Set<string>(),shotFrames=new Set<string>(),banners=new Set<string>(),states=new Set<string>();
 const tap=(r:any)=>{const d=r.drainEvents.bind(r);r.drainEvents=()=>{const out=d();for(const e of out)seen.add(e.type);return out}};
 const countActive=(n:Node):number=>{if(!n.active)return 0;let c=1;for(const ch of n.children)c+=countActive(ch);return c};
 const sample=(v:any)=>{
  const battle=v.art.root as Node,nodes=battle.active?countActive(battle):0,dc=(director.root as any)?.device?.numDrawCalls||0;
  maxNodes=Math.max(maxNodes,nodes);const run=v.run,st=(run?.state||'')+'/'+(v.hud?.modal||'');dcByState[st]=Math.max(dcByState[st]||0,dc);dcHist[dc]=(dcHist[dc]||0)+1;
  // 预算针对战斗帧（模拟推进且无模态框）；升级卡 / 结算等模态帧单独记录在 dcByState
  if(st==='playing/'||st==='cleansing/'||st==='extract/')maxDrawCalls=Math.max(maxDrawCalls,dc);
  if(!run)return;states.add(run.state);maxEnemies=Math.max(maxEnemies,run.enemies.count);maxMist=Math.max(maxMist,run.mistBubbles.count);
  const pc=v.art.poolCounts;maxMistShown=Math.max(maxMistShown,pc.mist||0);maxGlow=Math.max(maxGlow,pc.glow||0);if(run.boss?.alive)maxBossArrow=Math.max(maxBossArrow,pc.indicators||0);
  for(const f of v.art.shownFrames('enemies'))enemyFrames.add(f);for(const f of v.art.shownFrames('shots'))shotFrames.add(f);
  const b=v.hud?.bannerText;if(b)banners.add(b);if(v.hud?.modal==='levelup'&&v.hud.raindropHint)raindropHint=true;
 };
 // 升级选卡：优先新武器卡，否则第一张
 const pick=(run:any)=>{const i=run.offer?run.offer.findIndex((c:any)=>c.kind==='weapon'&&c.isNew):-1;return i>=0?i:0};
 // 真实时间跑 seconds 秒（until 满足时提前结束）：每帧注入脚本输入、自动选卡、采样；keepAlive 时回满血量。
 const runFor=async(v:any,seconds:number,keepAlive:boolean,each:()=>void=()=>{},until:()=>boolean=()=>false)=>{
  const st=new Set<string>(),t0=performance.now();let held=0;
  while(performance.now()-t0<seconds*1000){
   const run=v.run;if(!run)break;st.add(run.state);
   if(run.state==='levelup'){
    // 本阶段第一次升级：等卡片滑入解锁后保持 0.6 秒，期间逐帧记模态帧 DrawCall
    if(held>=0&&v.hud.modal==='levelup'&&v.hud.unlocked){const dc=(director.root as any)?.device?.numDrawCalls||0;if(held>0){maxModalDrawCalls=Math.max(maxModalDrawCalls,dc);modalSamples++}held+=1}
    if(held<0||performance.now()-t0>seconds*1000-500||held>36){run.choose(pick(run));held=-1}
   }
   if(keepAlive&&run.player)run.player.hp=run.player.maxHp;
   each();await frame();sample(v);st.add(v.run?.state||'');
   if(until())break;
  }
  return st;
 };
 // 调试快进：逐步推进逻辑直到 done()，期间自动选卡、回满血量（事件经 tap 记录后丢弃）
 const fastForward=(run:any,done:()=>boolean,maxSteps:number)=>{
  for(let i=0;i<maxSteps&&!done();i++){if(run.state==='levelup')run.choose(pick(run));run.player.hp=run.player.maxHp;run.step()}
  while(run.state==='levelup')run.choose(pick(run));
  run.drainEvents();
 };
 try{
  const v=host.survivor;check(!!v,'survivor view created by PinePilot');
  for(let i=0;i<600&&!v.art.ready;i++)await frame();
  check(v.art.ready,'survivor bundle and battle atlas loaded');check(v.screen==='camp','camp page shown before battle');
  v.startRun();await frame();check(v.screen==='battle'&&v.run?.state==='playing','start run from camp');tap(v.run);
  // 脚本输入：替换摇杆读数为绕圈向量，不依赖真实触摸
  const input=v.input,original=input.vector.bind(input);let angle=0;
  input.vector=(dt:number)=>{original(dt);angle+=dt*.8;return {x:Math.cos(angle),y:Math.sin(angle)}};
  // 阶段 1：30 秒
  const run=v.run,startTime=run.time,startX=run.player.x,startY=run.player.y;
  const s1=await runFor(v,30,true);
  check(run.time-startTime>=20,'logic clock advanced '+(run.time-startTime).toFixed(1)+'s in 30s real time');
  check(Math.hypot(run.player.x-startX,run.player.y-startY)>1,'scripted input moves the traveler');
  check(run.purified>0,'spore_shot purified enemies ('+run.purified+')');
  check(s1.has('playing'),'phase 1 states: '+Array.from(s1).join(','));
  const newWeapons=run.weapons.map((w:any)=>w.id).filter((id:string)=>id!=='spore_shot');
  const rendered=newWeapons.filter((id:string)=>shotFrames.has(WEAPON_FRAME[id]));
  check(newWeapons.length>0&&rendered.length>0,'new weapon on field: '+newWeapons.join(',')+' (rendered '+rendered.map((id:string)=>WEAPON_FRAME[id]).join(',')+')');
  const slots=(tag:string)=>{const r=v.run,h=v.hud.slotsShown,w=Math.min(4,r.weapons.length),p=Math.min(4,Object.keys(r.passives).length);check(h.weapons===w&&h.passives===p,tag+' HUD slots '+h.weapons+'/'+h.passives+' = run '+w+'/'+p)};
  slots('phase 1');
  // 阶段 2：快进过 2:30 包围圈 + 满屏 10 秒
  const target=Math.max(run.time,165);
  fastForward(run,()=>run.time>=target,60*200);check(run.state==='playing'&&run.time>=target-.1,'fast-forward to '+run.time.toFixed(1)+'s');
  check(run.spawner.nextEvent>=1,'2:30 ring event fired (nextEvent '+run.spawner.nextEvent+')');
  const fill=()=>fillScreen(v,FILL);
  fill();v.update(0);sample(v);check(run.enemies.count>=FILL,'enemy pool filled to '+run.enemies.count);
  const s2=await runFor(v,10,true,fill);
  check(maxEnemies>=FILL,'full-screen enemies sustained (max '+maxEnemies+')');
  check(s2.has('playing')&&['playing','levelup'].includes(run.state),'phase 2 states: '+Array.from(s2).join(',')+' → '+run.state);
  check(banners.has(STRINGS.bannerEventRing),'ring event banner shown');
  slots('phase 2');
  // 阶段 3：快进到 5:30（菌灵波段，过 4:30 灰蛾横穿），真实时间 6 秒
  fastForward(run,()=>run.time>=330,60*200);check(run.state==='playing'&&run.time>=329.9,'fast-forward to '+run.time.toFixed(1)+'s');
  await runFor(v,6,true);
  const kinds=['sporeling','moth','snail'].filter(k=>enemyFrames.has(k));
  check(kinds.length===3,'new enemies rendered: '+kinds.join(','));
  check(maxMist>0&&maxMistShown>0,'mist bubbles fired (logic max '+maxMist+', rendered max '+maxMistShown+')');
  check(banners.has(STRINGS.bannerEventCross),'cross event banner shown');
  slots('phase 3');
  // 阶段 4：快进到 Boss 出现（7:00），真实时间 3 秒
  const bossAt=420;
  fastForward(run,()=>!!run.boss,60*300);check(!!run.boss&&run.boss.alive&&run.time>=bossAt-.1,'fast-forward to boss at '+run.time.toFixed(1)+'s');
  const s4=await runFor(v,3,true);
  check(s4.has('playing')&&v.hud.bossBarVisible&&(enemyFrames.has('boss')||maxBossArrow>0),'boss bar visible, boss '+(enemyFrames.has('boss')?'on screen':'off-screen indicator'));
  slots('phase 4');
  // 阶段 5：Boss 生命置 0 → cleansing → extract → 走进撤离点 → won
  while(run.state==='levelup')run.choose(pick(run));
  check(!!run.bossEnemy,'boss entity alive before defeat');run.bossEnemy.hp=0;
  await runFor(v,4,true,()=>{},()=>run.state==='extract');
  check(states.has('cleansing')&&seen.has('cleansing')&&seen.has('bossDefeated'),'boss defeated → cleansing');
  check(banners.has(STRINGS.bannerCleansing)&&maxGlow>0,'cleansing banner and glow shown');
  check(run.state==='extract'&&!!run.extraction&&run.enemies.count===0&&run.mistBubbles.count===0,'cleansing cleared the field → extract open');
  const ex=run.extraction;
  await runFor(v,5,true,()=>{run.player.x=ex.x;run.player.y=ex.y},()=>v.hud.modal==='result');
  check(run.state==='won'&&seen.has('won'),'standing in extraction point → won');
  check(v.hud.modal==='result'&&v.result?.won===true&&v.result.bossDefeated,'victory result shown (boss defeated)');
  // 结算页停留 0.5 秒采样模态帧 DrawCall（BUG-S2-03）
  await runFor(v,.5,false);
  // 阶段 6：再来一局 → 接触致死 → 失败结算
  v.startRun();await frame();const r2=v.run;check(r2&&r2!==run&&r2.state==='playing','start another run from result');tap(r2);
  r2.player.hp=1;r2.spawner._spawnOne(r2,'beetle',0,{x:r2.player.x,y:r2.player.y});
  await runFor(v,4,false,()=>{},()=>v.hud.modal==='result');
  check(r2.state==='lost'&&seen.has('lost')&&r2.summary().killer==='beetle','contact damage → lost (killer '+r2.summary().killer+')');
  check(v.hud.modal==='result'&&v.result?.won===false,'defeat result shown');
  await runFor(v,.5,false);
  // BUG-S2-03：胜利 / 失败结算模态帧 DrawCall ≤ 25
  for(const k of ['won/result','lost/result'])check((dcByState[k]||0)>0&&dcByState[k]<=DRAWCALL_BUDGET,'result modal draw calls '+k+' = '+dcByState[k]+' ≤ '+DRAWCALL_BUDGET);
  check(modalSamples>0&&maxModalDrawCalls<=DRAWCALL_BUDGET,'level-up modal draw calls max '+maxModalDrawCalls+' ≤ '+DRAWCALL_BUDGET+' ('+modalSamples+' frames)');
  check(maxNodes>0&&maxNodes<=NODE_BUDGET,'battle active nodes max '+maxNodes+' ≤ '+NODE_BUDGET);
  check(maxDrawCalls>0&&maxDrawCalls<=DRAWCALL_BUDGET,'battle-frame draw calls max '+maxDrawCalls+' ≤ '+DRAWCALL_BUDGET);
  // 离开视图后恢复 375×812
  host.survivor.destroy();host.survivor=null;await frame();
  const d=view.getDesignResolutionSize();check(d.width===375&&d.height===812,'design resolution restored to '+d.width+'×'+d.height);
  check(errors.length===0,'no console errors or uncaught exceptions');
  report(true);
 }catch(e){report(false,String(e))}
 finally{console.error=consoleError;window.removeEventListener('error',onError);window.removeEventListener('unhandledrejection',onRejection)}
 function report(ok:boolean,error=''){
  const data={type:'survivor-smoke',ok,results,errors,metrics:{raindropHint,maxNodes,maxDrawCalls,maxModalDrawCalls,maxEnemies,maxMist,maxMistShown,states:Array.from(states),events:Array.from(seen),dcByState,dcHist},error};
  (window as any).__survivorSmoke=data;console.log('[survivor-smoke]',ok?'PASS':'FAIL',JSON.stringify(data));
  if(window.parent!==window)window.parent.postMessage(data,window.location.origin);
 }
}
