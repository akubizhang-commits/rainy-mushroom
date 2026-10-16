import {Node,director,view} from 'cc';
// 生存玩法浏览器冒烟（03 §2.2 / §10、04 §L5）：`?survivor&smoke=1`。
// 阶段 1：脚本输入（绕圈摇杆）真实时间跑 30 秒，升级自动选第一张卡；
// 阶段 2：调试钩子快进逻辑时间（S1 计时胜利前 15 秒）并把敌人池铺满视口，再真实时间跑 10 秒；
// 结束后销毁视图，断言设计分辨率恢复 375×812。
// 断言：无 console.error / 未捕获异常；战斗层激活节点 ≤ 600；战斗帧 DrawCall ≤ 25（模态帧另记）；run.state 正常推进。
// 结果经 postMessage('survivor-smoke') 发给父页，同时写到 window.__survivorSmoke 供无头浏览器读取。
// 调试钩子（血量回满、直接生成敌人）只在冒烟里使用；冒烟存档为内存存储（PinePilot 注入），不写正式存档。
const NODE_BUDGET=600,DRAWCALL_BUDGET=25,FILL=200;
export async function runSurvivorSmoke(host:any){
 const results:string[]=[],errors:string[]=[],check=(v:boolean,n:string)=>{if(!v)throw Error(n);results.push(n)};
 const onError=(e:ErrorEvent)=>{errors.push('error: '+(e.message||String(e.error)))},onRejection=(e:PromiseRejectionEvent)=>{errors.push('unhandledrejection: '+String(e.reason))};
 const consoleError=console.error;console.error=(...args:any[])=>{errors.push('console.error: '+args.map(String).join(' '));consoleError.apply(console,args)};
 window.addEventListener('error',onError);window.addEventListener('unhandledrejection',onRejection);
 const frame=()=>new Promise<void>(r=>host.scheduleOnce(r,0));
 let maxNodes=0,maxDrawCalls=0,maxEnemies=0;const dcByState:Record<string,number>={},dcHist:Record<number,number>={};
 const countActive=(n:Node):number=>{if(!n.active)return 0;let c=1;for(const ch of n.children)c+=countActive(ch);return c};
 const sample=(v:any)=>{
  const battle=v.art.root as Node,nodes=battle.active?countActive(battle):0,dc=(director.root as any)?.device?.numDrawCalls||0;
  maxNodes=Math.max(maxNodes,nodes);const st=(v.run?.state||'')+'/'+(v.hud?.modal||'');dcByState[st]=Math.max(dcByState[st]||0,dc);dcHist[dc]=(dcHist[dc]||0)+1;
  // 预算针对战斗帧（playing 且无模态框）；升级卡等模态帧单独记录在 dcByState，供 UI 评估
  if(st==='playing/')maxDrawCalls=Math.max(maxDrawCalls,dc);maxEnemies=Math.max(maxEnemies,v.run?.enemies.count||0);
 };
 // 真实时间跑 seconds 秒：每帧注入脚本输入、自动选卡、采样；keepAlive 时回满血量。
 const runFor=async(v:any,seconds:number,keepAlive:boolean,each:()=>void=()=>{})=>{
  const states=new Set<string>(),t0=performance.now();
  while(performance.now()-t0<seconds*1000){
   const run=v.run;if(!run)break;states.add(run.state);
   if(run.state==='levelup')run.choose(0);
   if(keepAlive&&run.player)run.player.hp=run.player.maxHp;
   each();await frame();sample(v);
  }
  return states;
 };
 try{
  const v=host.survivor;check(!!v,'survivor view created by PinePilot');
  for(let i=0;i<600&&!v.art.ready;i++)await frame();
  check(v.art.ready,'survivor bundle and battle atlas loaded');check(v.screen==='camp','camp page shown before battle');
  v.startRun();await frame();check(v.screen==='battle'&&v.run?.state==='playing','start run from camp');
  // 脚本输入：替换摇杆读数为绕圈向量，不依赖真实触摸
  const input=v.input,original=input.vector.bind(input);let angle=0;
  input.vector=(dt:number)=>{original(dt);angle+=dt*.8;return {x:Math.cos(angle),y:Math.sin(angle)}};
  // 阶段 1：30 秒
  const startTime=v.run.time,startX=v.run.player.x,startY=v.run.player.y;
  const s1=await runFor(v,30,true);
  check(v.run.time-startTime>=20,'logic clock advanced '+(v.run.time-startTime).toFixed(1)+'s in 30s real time');
  check(Math.hypot(v.run.player.x-startX,v.run.player.y-startY)>1,'scripted input moves the traveler');
  check(v.run.purified>0,'spore_shot purified enemies ('+v.run.purified+')');
  check(s1.has('playing'),'phase 1 states: '+Array.from(s1).join(','));
  // 阶段 2：快进 + 满屏 10 秒
  const run=v.run,target=Math.max(run.time,165);
  for(let i=0;i<60*200&&run.time<target;i++){if(run.state==='levelup')run.choose(0);run.player.hp=run.player.maxHp;run.step()}
  run.drainEvents();check(run.state==='playing'&&run.time>=target-.1,'fast-forward to '+run.time.toFixed(1)+'s');
  const fill=()=>{
   const minute=run.time/60,w=v.width,h=v.height;
   while(run.enemies.count<FILL){
    const before=run.enemies.count;run.spawner._spawnOne(run,run.enemies.count%3?'gnat':'beetle',minute);if(run.enemies.count===before)break;
    const e=run.enemies.active[run.enemies.count-1];e.x=run.player.x+(Math.random()-.5)*w;e.y=run.player.y+(Math.random()-.5)*h;
   }
  };
  fill();v.update(0);sample(v);check(run.enemies.count>=FILL,'enemy pool filled to '+run.enemies.count);
  const s2=await runFor(v,10,true,fill);
  check(maxEnemies>=FILL,'full-screen enemies sustained (max '+maxEnemies+')');
  check(s2.has('playing')&&['playing','levelup','won'].includes(v.run.state),'phase 2 states: '+Array.from(s2).join(',')+' → '+v.run.state);
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
  const data={type:'survivor-smoke',ok,results,errors,metrics:{maxNodes,maxDrawCalls,maxEnemies,dcByState,dcHist},error};
  (window as any).__survivorSmoke=data;console.log('[survivor-smoke]',ok?'PASS':'FAIL',JSON.stringify(data));
  if(window.parent!==window)window.parent.postMessage(data,window.location.origin);
 }
}
