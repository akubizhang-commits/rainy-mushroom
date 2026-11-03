// Actual Cocos pointer paths + read-only scene observation.
// No user browser/profile connection; no UI/runtime files changed.
// Run ONLY after the coordinator confirms a new build:
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright node scripts/verify-tower-growth-ui.cjs --build-ready
// --check validates fixture construction with source modules, WITHOUT opening a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {createHash} = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/xianxia/reports/tower-growth-2026-10-28');
const URL = process.env.PREVIEW_URL ||
 'http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1';
const sizes = [{width:390,height:844},{width:360,height:640},{width:1280,height:800}];
const clone = v => JSON.parse(JSON.stringify(v));
const digest = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const args = new Set(process.argv.slice(2));
const runTag=process.env.UI_RUN_TAG||'verification';
assert.match(runTag,/^[a-zA-Z0-9-]+$/);
const reportName=`ui-browser-${runTag}.json`;
const selectedCases=(process.env.UI_CASES||'').split(',').filter(Boolean);
const selectedSizes=(process.env.UI_SIZES||'').split(',').filter(Boolean);
const write = (name, value) => {
 assert.match(name, /^ui-[a-zA-Z0-9.-]+$/);
 fs.mkdirSync(OUT, {recursive:true});
 fs.writeFileSync(path.join(OUT, name), typeof value === 'string' ? value : JSON.stringify(value,null,2)+'\n');
};
async function modules() {
 const load = file => import(pathToFileURL(path.join(ROOT,file)).href);
 const [campaign,growth,profile,save,playtest,run] = await Promise.all([
  load('js/xianxia/TowerCampaign.js'), load('js/xianxia/TowerGrowth.js'),
  load('js/xianxia/TowerProfile.js'), load('js/xianxia/Checksum.js'),
  load('js/xianxia/TowerPlaytest.js'),load('js/xianxia/TowerRun.js'),
 ]);
 return {...campaign,...growth,...profile,...playtest,...run,checksum:save.checksum};
}

// Explicit ARTIFICIAL high-progress source, never represented as earned rewards.
// Only camp source fields are seeded; skill/book/research purchases use store.act.
// No snapshots, monsters, kill receipts, HP damage or cooldowns are fabricated.
function fixture(rt,{floor=9,research=0,passives=0,evolution=false,recoveryGap=0}={}) {
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 const now=Date.now(), transactions=[];
 let store=new rt.TowerCampaignStore(storage,now);
 assert.ok(store.act({type:'sync'},now).ok);
 const envelope=JSON.parse(memory.get(rt.TOWER_CAMPAIGN_KEY));
 const state=JSON.parse(envelope.data);
 const sources={xp:rt.TOWER_XP_CAP,clearedFloor:floor,cores:2000,tutorialWaves:3,
  hp:rt.cultivationAt(rt.TOWER_XP_CAP).maxHp-recoveryGap};
 Object.assign(state,sources,{skills:rt.giftSkills(3),books:[],evolutions:[],
  evolutionRanks:{},researchPurchases:0});
 envelope.data=JSON.stringify(state);envelope.checksum=rt.checksum(envelope.data);
 memory.set(rt.TOWER_CAMPAIGN_KEY,JSON.stringify(envelope));
 store=new rt.TowerCampaignStore(storage,now);
 assert.equal(store.readOnly,false,`fixture validation: ${store.error}`);
 function act(action) {
  const result=store.act(action,now);transactions.push({action,result});
  assert.ok(result.ok,JSON.stringify({action,result}));return result;
 }
 for(let i=0;i<research;i++)act({type:'researchPoint'});
 for(const id of ['sj_heart','vajra','magnet','sj_mark','sj_bone','sj_gate'].slice(0,passives))
  act({type:'learnSkill',id});
 if(evolution){
  const evo=rt.GROWTH_EVOLUTIONS.find(e=>e.id==='evo_wanjian'),req=evo.rankRequirements[0];
  for(const [id,rank] of [[evo.parent,req.parentLevel],[evo.passive,req.passiveLevel]])
   while((store.state.skills[id]||0)<rank)act({type:'learnSkill',id});
  act({type:'learnSkill',id:evo.id});
 }
 // Roundtrip through the store; do not inject a preassembled battle snapshot.
 store=new rt.TowerCampaignStore(storage,now);
 assert.equal(store.readOnly,false);
 return {raw:memory.get(rt.TOWER_CAMPAIGN_KEY),state:clone(store.state),sources,transactions,
  kind:'ARTIFICIAL VALIDATED CAMP FIXTURE — NOT NATURAL PROGRESSION'};
}

// Scene inspection runs in page context. Buttons are still activated with real pointer input.
function inspectScene() {
 const walk=n=>[n,...n.children.flatMap(walk)];
 const host=window.towerQA, canvas=document.querySelector('canvas');
 const rect=canvas.getBoundingClientRect();
 const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);
 const xy=p=>{const v=camera.worldToScreen(p);return {
  x:rect.x+v.x/canvas.width*rect.width,y:rect.y+(1-v.y/canvas.height)*rect.height};};
 const box=n=>{
  const t=n.getComponent('cc.UITransform');if(!t)return null;
  const corners=[[-t.anchorX,-t.anchorY],[1-t.anchorX,1-t.anchorY]]
   .map(([x,y])=>xy(t.convertToWorldSpaceAR(new cc.Vec3(x*t.width,y*t.height,0))));
  return {left:Math.min(...corners.map(v=>v.x)),right:Math.max(...corners.map(v=>v.x)),
   top:Math.min(...corners.map(v=>v.y)),bottom:Math.max(...corners.map(v=>v.y))};
 };
 return walk(host.root).filter(n=>n.activeInHierarchy).map(n=>{
  const button=n.getComponent('cc.Button'),label=n.getComponent('cc.Label');
  let clip={left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},p=n.parent;
  const ancestors=[];
  while(p){ancestors.push(p.name);if(p.getComponent('cc.Mask')){
   const b=box(p);if(b)clip={left:Math.max(clip.left,b.left),right:Math.min(clip.right,b.right),
    top:Math.max(clip.top,b.top),bottom:Math.min(clip.bottom,b.bottom)};
  }p=p.parent;}
  return {name:n.name,ancestors,button:!!button,enabled:button?.interactable??false,
   text:label?.string||'',...xy(n.worldPosition),box:box(n),clip};
 });
}
function invariants(s) {
 return {time:s.time,phase:s.phase,player:s.player,cooldowns:s.cooldowns,enemies:s.enemies,
  earned:s.earned,clearedWaves:s.clearedWaves,projectiles:s.projectiles,zones:s.zones,casts:s.casts};
}

async function main() {
 assert.ok(args.has('--check')||args.has('--build-ready'),
  '等待新 build：未提供 --build-ready，拒绝访问旧构建。可先运行 --check。');
 const rt=await modules();
 const fixtures=[fixture(rt,{evolution:true}),fixture(rt,{passives:1}),fixture(rt,{passives:6}),
  ...[0,1,2].flatMap(i=>[
   fixture(rt,{floor:(i+1)*3-1,research:i}),fixture(rt,{floor:(i+1)*3,research:i}),
  ])];
 if(args.has('--check')){
  write('ui-script-check.json',{status:'SCRIPT_CHECK_ONLY_WAITING_FOR_BUILD',
   browserExecuted:false,fixtureCount:fixtures.length,fixtures:fixtures.map(f=>({
    kind:f.kind,sources:f.sources,transactions:f.transactions,points:rt.growthSummary(f.state)}))});
  console.log('Fixture/store validation passed; browser not started. Waiting for build.');return;
 }
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
 fs.mkdirSync(OUT,{recursive:true});
 // Bundled Playwright Chromium only. Never channel:chrome, CDP, persistentContext,
 // kill/pkill, or the user's Chrome executable/profile.
 const browser=await chromium.launch({headless:true});
 const report={url:URL,status:'running',selection:{cases:selectedCases,sizes:selectedSizes},startedAt:new Date().toISOString(),results:[],
  evidencePolicy:'自然路径仅购丹/真实模拟/Store事务；高进度fixture单列，不写用户存档。光环截图需人工视觉复核。',
  sourceHashes:Object.fromEntries(['js/xianxia/TowerGrowth.js','js/xianxia/TowerCampaign.js',
   'js/xianxia/TowerRun.js','js/xianxia/TowerPlaytest.js','cocos-pilot/assets/scripts/TowerMenu.ts','cocos-pilot/assets/scripts/TowerView.ts']
   .map(file=>[file,digest(fs.readFileSync(path.join(ROOT,file)))]))};
 let failures=0;
 async function scenario(viewport,label,seedFixture,body) {
  if(selectedCases.length&&!selectedCases.some(s=>label===s||label.startsWith(s)))return;
  if(selectedSizes.length&&!selectedSizes.includes(`${viewport.width}x${viewport.height}`))return;
  const context=await browser.newContext({viewport,deviceScaleFactor:1});
  const page=await context.newPage(),prefix=`ui-${runTag}-${viewport.width}x${viewport.height}-${label}`;
  const record={viewport,label,kind:seedFixture?.kind||'NATURAL: fresh storage, paid pills, real simulation',
   fixture:seedFixture?{sources:seedFixture.sources,transactions:seedFixture.transactions}:null,
   checks:[],actions:[],screenshots:[],errors:[],consoleErrors:[],httpErrors:[],ok:false};
  report.results.push(record);
  page.on('pageerror',e=>record.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')record.consoleErrors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)record.httpErrors.push({url:r.url(),status:r.status()});});
  if(seedFixture)await context.addInitScript(({key,raw})=>{
   if(!sessionStorage.getItem('tower-growth-ui-fixture-installed')){
    localStorage.setItem(key,raw);sessionStorage.setItem('tower-growth-ui-fixture-installed','1');
   }
  },{key:rt.TOWER_CAMPAIGN_KEY,raw:seedFixture.raw});
  const load=async(target=URL,expectReadOnly=false)=>{
   await page.goto(target);
   await page.waitForFunction(()=>{
    const pilot=window.cc?.director.getScene()?.children.find(n=>n.name==='PinePilot');
    window.towerQA=pilot?.components.find(c=>c.constructor.name==='PinePilot')?.survivor;
    return window.towerQA?.store?.state;
   },null,{timeout:30000});
   assert.equal(await page.evaluate(()=>towerQA.store.readOnly),expectReadOnly,'expected store access mode');
   assert.equal(await page.evaluate(()=>Array.isArray(towerQA.store.state.books)),true,'growth build guard');
  };
  const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(towerQA.store.state)));
  const snapshot=()=>page.evaluate(()=>towerQA.run.snapshot());
  const scene=()=>page.evaluate(inspectScene);
  const shot=async name=>{
   const file=`${prefix}-${name}.png`;await page.screenshot({path:path.join(OUT,file)});
   record.screenshots.push(file);
  };
  const find=async(caption,parent,edge)=>{
   const nodes=await scene(),matches=nodes.filter(n=>n.button&&
    (caption instanceof RegExp?caption.test(n.name):n.name===caption)&&
    (!parent||n.ancestors.some(p=>p.startsWith(parent))));
   if(edge)matches.sort((a,b)=>edge==='footer'?b.y-a.y:a.y-b.y);
   return matches[0];
  };
  const click=async(caption,parent,observeOnly=false,edge)=>{
   for(let i=0;i<75;i++){
    const n=await find(caption,parent,edge);assert.ok(n,`missing pointer target ${caption} / ${parent||''}`);
    if(!observeOnly)assert.ok(n.enabled,`disabled ${n.name}`);
    const c=n.clip;
    if(n.x>c.left+2&&n.x<c.right-2&&n.y>c.top+12&&n.y<c.bottom-12){
     if(observeOnly)return n;
     await page.mouse.click(n.x,n.y);record.actions.push(edge?`${n.name} (${edge})`:n.name);
     await page.waitForTimeout(90);return;
    }
    const x=Math.max(c.left+15,Math.min(c.right-15,n.x));
    await page.mouse.move(x,(c.top+c.bottom)/2);
    await page.mouse.wheel(0,n.y<c.top?-220:220);await page.waitForTimeout(65);
   }
   throw Error(`Cannot reach ${caption} with pointer scrolling`);
  };
  const check=(name,details={})=>record.checks.push({name,passed:true,...details});
  const learn=async id=>{
   await click(`技能节点-${id}`);
   await click(/^(修习至|解锁并修习)/,'技能详情');
   await click('关闭','技能详情');
  };
  const enter=async floor=>{
   await click('锁妖塔');
   const camp=await state();
   await click(floor<=camp.clearedFloor?`重访第${floor}层`
    :floor===camp.clearedFloor+1?`继续挑战第${floor}层`:`挑战第${floor}层`);
   await page.waitForFunction(()=>towerQA.run?.state.phase==='playing',null,{timeout:10000});
  };
  // Batched REAL simulation. Stop exactly on target wave; host.pause checkpoints via Store.
  // No replacing time, state, damage, rewards, enemies, or loadout.
  const simulate=async({waves=3,die=false,maxSeconds=900}={})=>{
   let result;
   for(let batch=0;batch<Math.ceil(maxSeconds/8);batch++){
    result=await page.evaluate(({waves,die})=>{
     const r=towerQA.run;
     for(let i=0;i<480&&r.state.phase==='playing'&&(die||r.state.clearedWaves.length<waves);i++){
      const p=r.state.player,t=r.state.time*.24;
      let dx=33+490*Math.cos(t)-p.x,dy=-60+490*Math.sin(t)-p.y;
      const d=Math.max(1,Math.hypot(dx,dy));dx/=d;dy/=d;
      for(const e of r.state.enemies){const q=Math.hypot(p.x-e.x,p.y-e.y);
       if(q<135){dx+=(p.x-e.x)/Math.max(1,q)*(135-q)/45;dy+=(p.y-e.y)/Math.max(1,q)*(135-q)/45;}}
      r.setInput(die?0:dx,die?0:dy);r.advance(1/60);
     }
     const snap=r.snapshot();
     if(snap.phase==='playing'&&!die&&snap.clearedWaves.length>=waves)towerQA.pause();
     else towerQA.update(0);
     return snap;
    },{waves,die});
    if(result.phase!=='playing'||(!die&&result.clearedWaves.length>=waves))break;
   }
   record.checks.push({name:die?'真实不走位死亡模拟':'真实清波模拟',phase:result.phase,
    clearedWaves:result.clearedWaves,earned:result.earned,time:result.time,passed:die?result.phase==='lost':result.clearedWaves.length>=waves});
   assert.ok(die?result.phase==='lost':result.clearedWaves.length>=waves,
    `simulation did not reach requested boundary: ${result.phase}/${result.clearedWaves.length}`);
   return result;
  };
  try{
   await load();
   // Capture the served build identity, rather than claiming root source hashes prove it.
   record.build=await page.evaluate(()=>({scripts:[...document.scripts].map(s=>s.src).filter(Boolean),
    growthVersion:towerQA.store.state.activeRun?.snapshot?.loadout?.growthVersion??null}));
   await body({page,state,snapshot,scene,find,click,reveal:(caption,parent)=>click(caption,parent,true),
    returnToBattle:edge=>click('返回战斗','TowerMenu',false,edge),
    check,shot,load,learn,enter,simulate,record});
   assert.deepEqual(record.errors,[],'uncaught errors');
   assert.deepEqual(record.consoleErrors,[],'console errors');
   assert.deepEqual(record.httpErrors,[],'HTTP errors');
   record.ok=true;
  }catch(e){
   failures++;record.error=e.stack||String(e);
   const issue={at:new Date().toISOString(),report:reportName,viewport,label,error:record.error,
    actions:record.actions,errors:record.errors,consoleErrors:record.consoleErrors,httpErrors:record.httpErrors};
   const issuePath=path.join(OUT,'ui-issues.json');
   const issues=fs.existsSync(issuePath)?JSON.parse(fs.readFileSync(issuePath,'utf8')):[];
   issues.push(issue);write('ui-issues.json',issues);write(reportName,report);
   console.error(`FIRST-AID REPORT WRITTEN: ${label}: ${e.message}`);
   try{await shot('FAIL');record.failureScene=await scene();}catch(capture){record.captureError=String(capture);}
   if(args.has('--stop-on-failure'))throw e;
  }finally{
   await context.close();write(reportName,report);
   console.log(`${prefix}: ${record.ok?'PASS':'FAIL'}`);
  }
 }
 try{
  for(const viewport of sizes){
   await scenario(viewport,'natural',null,async q=>{
    const initial=await q.state();assert.equal(rt.growthSummary(initial).available,0);
    await q.click('藏经阁');
    const nodes=(await q.scene()).filter(n=>n.name.startsWith('技能节点-'));
    assert.deepEqual(nodes.map(n=>n.name).sort(),
     [...rt.GROWTH_SKILLS,...rt.GROWTH_EVOLUTIONS].map(s=>`技能节点-${s.id}`).sort());
    assert.ok(nodes.every(n=>n.ancestors.includes('十六技能树')),'same connected tree page');
    // Same page means one scrollable tree, not all 16 cards simultaneously legible on 360x640.
    q.check('16节点在同一技能树页面，允许纵向滚动',{nodes: nodes.map(n=>({name:n.name,box:n.box,clip:n.clip}))});
    await q.shot('tree-top');
    for(const id of ['sj_yujian','sj_arc','evo_sixiang']){
     await q.click(`技能节点-${id}`);
     const details=(await q.scene()).filter(n=>n.ancestors.includes('技能详情')||n.name==='技能详情');
     assert.ok(details.some(n=>n.text));
     const purchase=details.find(n=>n.button&&/^(修习至|解锁并修习)/.test(n.name));
     assert.ok(purchase&&!purchase.enabled,`${id} locked inspectable`);
     q.check(`锁定详情-${id}`,{texts:details.filter(n=>n.text).map(n=>n.text)});
     await q.shot(`locked-${id}`);await q.click('关闭','技能详情');
    }
    await q.click('宗门');await q.click('丹鼎阁');
    await q.click('购买一颗 · 20贡献','培元丹');await q.click('服用一颗','培元丹');
    let s=await q.state();assert.equal(s.xp,initial.xp+50);assert.equal(s.contribution,initial.contribution-20);
    q.check('真实购丹服用获得修为',{before:initial,after:s});
    await q.click('宗门');await q.enter(1);
    await q.simulate({waves:1});
    s=await q.state();assert.equal(s.tutorialWaves,1);assert.equal(s.skills.sj_arc,1);
    assert.equal(s.skills.sj_wanjian||0,0);
    await q.shot('tutorial-wave1');
    const buttons=(await q.scene()).filter(n=>n.button&&n.ancestors.includes('对话面板'));
    assert.equal(buttons.length,4);
    const ordered=['继续挑战',`技能树 · 可用${rt.growthSummary(s).available}点`,'体验工具','返回宗门']
     .map(name=>buttons.find(n=>n.name===name));
    assert.ok(ordered.every(Boolean));
    assert.ok(ordered.every((n,i)=>!i||ordered[i-1].y<n.y));
    assert.ok(ordered.every(n=>Math.abs(n.x-ordered[0].x)<2));
    assert.ok(ordered.every(n=>n.box.top>=0&&n.box.bottom<=viewport.height));
    q.check('暂停四按钮竖排且在视口内',{buttons:ordered});
    const before=await q.snapshot();
    await q.click(/^技能树 · 可用/);
    assert.equal(await q.page.evaluate(()=>towerQA.screen),'skills');
    const inTowerNodes=await q.scene();
    const returns=inTowerNodes.filter(n=>n.button&&n.name==='返回战斗'
     &&n.ancestors.includes('TowerMenu')).sort((a,b)=>a.y-b.y);
    assert.equal(returns.length,2,'header and footer resume buttons');
    assert.ok(returns.every(n=>n.enabled)&&returns[0].y<returns[1].y);
    const forbidden=/^(宗门|锁妖塔|武器|藏经阁|天工坊|丹鼎阁|洞府|研习一次|三次研习已完成|查看全洗退款明细|购买|服用|寻器|强化)/;
    assert.ok(!inTowerNodes.some(n=>n.button&&n.ancestors.includes('TowerMenu')&&forbidden.test(n.name)),
     'camp navigation/consumption must be hidden in tower skill menu');
    q.check('塔内仅技能修习，header/footer均有返回战斗，场外消费入口隐藏');
    await q.learn('sj_yujian');
    const after=await q.snapshot();
    assert.deepEqual(invariants(after),invariants(before),'pause upgrade preserves full combat state');
    assert.equal((await q.state()).skills.sj_yujian,2);
    assert.equal(after.loadout.active.sj_yujian,2);
    await q.page.waitForTimeout(300);assert.deepEqual(invariants(await q.snapshot()),invariants(after));
    q.check('暂停store提交并restore，HP/位置/时间/冷却/敌人/在途技能不重置');
    await q.click('技能节点-sj_shadow');
    const towerSpecial=await q.find(/^解锁并修习/,'技能详情');
    assert.ok(towerSpecial&&!towerSpecial.enabled,'special skill must remain library-only');
    q.check('塔内秘传只可查看不可购买');
    await q.shot('tower-special-locked');await q.click('关闭','技能详情');
    await q.shot('pause-upgraded');
    await q.load();
    assert.deepEqual(invariants(await q.snapshot()),invariants(after),'refresh preserves paused state');
    assert.equal((await q.state()).skills.sj_yujian,2);
    q.check('刷新保留等级与完整暂停快照');
    await q.click('继续挑战');
    await q.simulate({waves:3});
    s=await q.state();assert.equal(s.tutorialWaves,3);assert.equal(s.skills.sj_wanjian,1);
    q.check('真实第3波教学自动解锁',{skills:s.skills,earned:(await q.snapshot()).earned});
    await q.shot('tutorial-wave3');
    await q.click(/^技能树 · 可用/);
    const paused=await q.snapshot();
    await q.returnToBattle('header');
    const resumed=await q.snapshot();
    assert.equal(resumed.phase,'playing');
    assert.ok(resumed.time>=paused.time&&resumed.time-paused.time<1,'resume retains elapsed timeline');
    assert.equal(resumed.floor,paused.floor);assert.equal(resumed.wave,paused.wave);
    q.check('header返回战斗继续原层原波，完整不重置由暂停升级/刷新比较证明');
    await q.click('暂停');await q.click(/^技能树 · 可用/);
    const beforeFooter=await q.snapshot();
    await q.returnToBattle('footer');
    const afterFooter=await q.snapshot();
    assert.equal(afterFooter.phase,'playing');
    assert.equal(afterFooter.floor,beforeFooter.floor);assert.equal(afterFooter.wave,beforeFooter.wave);
    assert.ok(afterFooter.time>=beforeFooter.time&&afterFooter.time-beforeFooter.time<1);
    q.check('footer返回战斗继续原层原波');
    await q.click('暂停');await q.click('返回宗门');await q.click('返回宗门');
    await q.click('武器');
    const weaponNodes=await q.scene();
    assert.equal(weaponNodes.filter(n=>n.button&&/^[123]号(?: · 出战|配装)$/.test(n.name)).length,3);
    assert.equal(rt.WEAPONS.length,3);
    for(const weapon of rt.WEAPONS)assert.ok(weaponNodes.some(n=>n.name===weapon.name),'weapon card '+weapon.name);
    assert.ok(!weaponNodes.some(n=>n.button&&/加入此配装|移出此配装|取消出战|装备功法|装备心法/.test(n.name)));
    assert.ok(!weaponNodes.some(n=>n.text&&/只有出战的技能生效|至少保留1种出战功法|功法\d\/4|心法\d\/4/.test(n.text)));
    q.check('武器配装无技能出战开关或旧槽位文案');await q.shot('weapon-only');
    const beforeSwitch=await q.state();
    await q.click('2号配装');await q.click('使用这套配装出战');
    assert.equal((await q.state()).selectedLoadout,1);
    await q.click('1号配装');await q.click('使用这套配装出战');
    const afterSwitch=await q.state();assert.equal(afterSwitch.selectedLoadout,0);
    for(const key of ['skills','books','evolutionRanks'])assert.deepEqual(afterSwitch[key],beforeSwitch[key]);
    assert.deepEqual(rt.combatLoadout(afterSwitch),rt.combatLoadout(beforeSwitch));
    q.check('三套武器配装真实切换，全部已学战斗技能不受切换影响');
   });
   await scenario(viewport,'library-fixture',fixture(rt,{evolution:true}),async q=>{
    await q.click('藏经阁');
    await q.learn('sj_yujian');
    const before=await q.state(),quote=rt.skillRequirement(before,'sj_shadow');
    assert.equal(quote.ok,true);assert.ok(quote.bookCost>0);
    await q.learn('sj_shadow');
    let s=await q.state();assert.equal(s.cores,before.cores-quote.bookCost);
    assert.ok(s.books.includes('sj_shadow'));
    q.check('场外秘传经卷与技能点原子扣除',{quote,before:rt.growthSummary(before),after:rt.growthSummary(s)});
    await q.shot('special-book');
    const saved=clone(s);assert.ok(Object.keys(saved.evolutionRanks).length>0);
    await q.load();s=await q.state();
    for(const key of ['skills','books','evolutionRanks','researchPurchases'])assert.deepEqual(s[key],saved[key]);
    await q.click('藏经阁');const spent=rt.growthSummary(s).spent;
    await q.click('查看全洗退款明细');await q.shot('respec-preview');
    await q.click(new RegExp(`^确认初始化 · 返还${spent}点`));
    s=await q.state();assert.equal(rt.growthSummary(s).spent,0);
    assert.deepEqual(s.skills,rt.giftSkills(s.tutorialWaves));assert.deepEqual(s.books,saved.books);
    assert.deepEqual(s.evolutionRanks,{});assert.deepEqual(s.evolutions,[]);
    assert.equal(rt.growthSummary(s).available,rt.growthSummary(saved).available+spent);
    assert.equal(s.cores,saved.cores);
    q.check('重修只退实际SP，教学与经卷保留');
    await q.load();assert.equal(rt.growthSummary(await q.state()).spent,0);
   });
   for(const passiveCount of [1,6]){
    await scenario(viewport,`aura${passiveCount}-fixture`,fixture(rt,{passives:passiveCount}),async q=>{
     // High-progress fixtures can idle-clear floor 1. Use the legally unlocked
     // final floor for actual death pressure; never force HP or a terminal state.
     await q.enter(9);
     await q.page.waitForFunction(()=>towerQA.run.state.time>.7);
     assert.equal(Object.keys((await q.snapshot()).loadout.passive).length,passiveCount);
     await q.shot('playing');await q.click('暂停');
     const paused=await q.snapshot();await q.shot('paused-a');
     await q.page.waitForTimeout(400);assert.deepEqual(await q.snapshot(),paused);
     await q.shot('paused-b');
     q.check('暂停快照完全静止',{passiveCount});
     // The two screenshots allow visual review; state count alone is NOT aura rendering proof.
     q.record.visualReview={status:'REQUIRES_IMAGE_REVIEW',expectedRings:passiveCount,
      checks:['实际显示对应1/6种光环','暂停光环不动','真实死亡后光环消失']};
     await q.click('继续挑战');const dead=await q.simulate({die:true,maxSeconds:1200});
     assert.equal(dead.player.hp,0);
     assert.equal((await q.state()).activeRun,null,'natural death is settled by host');
     q.record.visualReview.deathEvidence='宿主真实死亡后立即返回结算页；此截图只能证明结算页无残留光环，不声称捕获了独立死亡战斗帧。';
     await q.shot('dead');
    });
   }
   await scenario(viewport,'startup-isolation',null,async q=>{
    await q.click('丹鼎阁');await q.click('购买一颗 · 20贡献','培元丹');
    // Fault only the isolated playtest seed write, before Cocos starts. Ordinary
    // read/write is not intercepted, so an accidental writable fallback is detectable.
    await q.page.addInitScript(({normalKey,playtestKey})=>{
     const original=Storage.prototype.setItem;
     window.__growthSeedFailure={enabled:true,attempts:0,baseline:localStorage.getItem(normalKey)};
     Storage.prototype.setItem=function(key,value){
      if(this===localStorage&&key===playtestKey&&window.__growthSeedFailure.enabled){
       window.__growthSeedFailure.attempts++;throw new Error('QA isolated playtest seed quota failure');
      }
      return original.call(this,key,value);
     };
    },{normalKey:rt.TOWER_CAMPAIGN_KEY,playtestKey:rt.TOWER_PLAYTEST_KEY});
    const playtestUrl=new globalThis.URL(URL);playtestUrl.searchParams.set('playtest','1');
    await q.load(playtestUrl.href,true);
    const initial=await q.page.evaluate(key=>({fault:window.__growthSeedFailure,
     raw:localStorage.getItem(key),playtest:towerQA.playtest,error:towerQA.store.error}),rt.TOWER_CAMPAIGN_KEY);
    assert.ok(initial.fault.attempts>0,'seed write failure injected');
    assert.equal(initial.playtest,true);assert.equal(initial.raw,initial.fault.baseline);
    assert.ok((await q.scene()).some(n=>n.text.includes('体验档')),'failed startup keeps experience marker');
    await q.click('丹鼎阁');
    const purchase=await q.find('购买一颗 · 20贡献','培元丹');
    assert.ok(purchase&&!purchase.enabled,'failure must not expose ordinary writable shop');
    await q.shot('readonly-seed-failure');
    // Wait beyond a real camp sync interval; do not advance or spoof host time.
    await q.page.waitForTimeout(5500);
    assert.equal(await q.page.evaluate(key=>localStorage.getItem(key),rt.TOWER_CAMPAIGN_KEY),initial.fault.baseline);
    await q.click('宗门');await q.click('体验工具');
    assert.ok(await q.find('重试打开体验档'));
    assert.ok(await q.find('切回普通档'));
    await q.page.evaluate(()=>{window.__growthSeedFailure.enabled=false;});
    await q.click('重试打开体验档');
    assert.equal(await q.page.evaluate(()=>towerQA.store.readOnly),false);
    assert.equal(await q.page.evaluate(()=>towerQA.playtest),true);
    assert.equal(await q.page.evaluate(key=>localStorage.getItem(key),rt.TOWER_CAMPAIGN_KEY),initial.fault.baseline);
    assert.ok(await q.page.evaluate(key=>localStorage.getItem(key),rt.TOWER_PLAYTEST_KEY));
    await q.click('返回宗门','对话面板');
    await q.click('丹鼎阁');const before=await q.state();
    await q.click('购买一颗 · 20贡献','培元丹');
    assert.equal((await q.state()).contribution,before.contribution-20);
    assert.equal(await q.page.evaluate(key=>localStorage.getItem(key),rt.TOWER_CAMPAIGN_KEY),initial.fault.baseline);
    q.check('playtest启动seed失败保持隔离只读，真实重试与购买仅写体验档',{faultAttempts:initial.fault.attempts});
    await q.shot('retry-isolated-success');
   });
   await scenario(viewport,'camp-recovery',fixture(rt,{recoveryGap:.04}),async q=>{
    q.record.kind='VALIDATED HIGH-PROGRESS CAMP FIXTURE + injected storage failure; NOT natural damage/progression';
    await q.click('体验工具');await q.click('进入独立体验档');
    await q.click('返回宗门','对话面板');
    const normalRaw=await q.page.evaluate(key=>localStorage.getItem(key),rt.TOWER_CAMPAIGN_KEY);
    // Exercise refreshVitals reaching full HP and rebuilding the menu with the
    // playtest marker. The small legal HP gap is explicit in fixture.sources.
    await q.page.waitForFunction(maxHp=>towerQA.menu?.state?.hp===maxHp&&towerQA.menu?.state?.playtest===true,
     rt.cultivationAt(rt.TOWER_XP_CAP).maxHp,{timeout:15000});
    assert.equal(await q.page.evaluate(()=>towerQA.menu.state.playtest),true);
    assert.ok((await q.scene()).some(n=>n.text.includes('体验档')));
    await q.shot('vitals-full-marker');
    await q.click('丹鼎阁');
    await q.page.evaluate(()=>{
     window.__growthCampStorage=towerQA.store.storage;
     window.__growthCampFaults=0;
     towerQA.store.storage={
      getItem:key=>window.__growthCampStorage.getItem(key),
      setItem(){window.__growthCampFaults++;throw new Error('QA transient camp sync write failure');},
     };
    });
    await q.page.waitForFunction(()=>towerQA.syncFailed===true,null,{timeout:15000});
    const disabled=await q.find('购买一颗 · 20贡献','培元丹');
    assert.ok(disabled&&!disabled.enabled);
    assert.equal(await q.page.evaluate(()=>towerQA.menu.state.playtest),true);
    assert.ok((await q.scene()).some(n=>n.text.includes('体验档')));
    await q.shot('sync-failed-disabled');
    await q.page.evaluate(()=>{towerQA.store.storage=window.__growthCampStorage;});
    await q.page.waitForFunction(()=>towerQA.syncFailed===false&&towerQA.menu?.state?.readOnly===false,
     null,{timeout:15000});
    // Do not navigate or force render: the automatic successful sync must restore buttons.
    const enabled=await q.find('购买一颗 · 20贡献','培元丹');
    assert.ok(enabled&&enabled.enabled,'automatic recovery must rebuild writable controls');
    assert.equal(await q.page.evaluate(()=>towerQA.menu.state.playtest),true);
    assert.ok((await q.scene()).some(n=>n.text.includes('体验档')));
    const before=await q.state();await q.click('购买一颗 · 20贡献','培元丹');
    assert.equal((await q.state()).contribution,before.contribution-20);
    assert.equal(await q.page.evaluate(key=>localStorage.getItem(key),rt.TOWER_CAMPAIGN_KEY),normalRaw);
    q.check('camp自动sync失败→恢复重新启用真实消费按钮，全程保留体验标识且普通raw不变');
    await q.shot('sync-recovered-purchase');
   });
  }
  await scenario(sizes[0],'playtest-isolation',null,async q=>{
   q.record.kind='ISOLATED ASSISTED PLAYTEST — real clock/Run/Store; NOT normal progression or balance evidence';
   const raw=key=>q.page.evaluate(key=>localStorage.getItem(key),key);
   const keys={normal:rt.TOWER_CAMPAIGN_KEY,playtest:rt.TOWER_PLAYTEST_KEY,tools:rt.TOWER_PLAYTEST_TOOLS_KEY};
   // First establish an ordinary record via a real camp purchase.
   await q.click('丹鼎阁');await q.click('购买一颗 · 20贡献','培元丹');
   await q.click('服用一颗','培元丹');await q.click('宗门');
   await q.click('体验工具');await q.shot('normal-tool-entry');
   assert.ok(await q.find('进入独立体验档'));
   const normalRaw=await raw(keys.normal);assert.ok(normalRaw);
   await q.click('进入独立体验档');
   assert.equal(await q.page.evaluate(()=>towerQA.playtest),true);
   assert.ok(q.page.url().includes('playtest=1'));
   assert.equal(await raw(keys.normal),normalRaw);
   assert.ok(await raw(keys.playtest));
   for(const speed of [1,2,3])assert.ok(await q.find(new RegExp(`^游戏速度 ×${speed}( · 当前)?$`)));
   await q.click('游戏速度 ×2');
   assert.ok(await q.find('游戏速度 ×2 · 当前'));
   await q.click('游戏速度 ×1');
   await q.click('无敌秒杀：关闭');assert.ok(await q.find('无敌秒杀：开启'));
   await q.click('返回宗门','对话面板');
   assert.ok((await q.scene()).some(n=>n.text.includes('体验档')),'camp mode marker');
   await q.enter(1);
   // Observe actual browser-driven updates against performance.now(), never advance()
   // or fake timers in the clock measurement. This intentionally fails on stalled rendering.
   async function clockSample(speed){
    const sample=await q.page.evaluate(()=>new Promise(resolve=>{
     const start={wall:performance.now(),time:towerQA.run.state.time};
     function frame(){
      const wall=performance.now();
      if(wall-start.wall<1400){requestAnimationFrame(frame);return;}
      const time=towerQA.run.state.time;
      resolve({wallSeconds:(wall-start.wall)/1000,simulationSeconds:time-start.time,
       phase:towerQA.run.state.phase});
     }requestAnimationFrame(frame);
    }));
    sample.speed=speed;sample.rate=sample.simulationSeconds/sample.wallSeconds;
    assert.equal(sample.phase,'playing');
    assert.ok(sample.rate>speed*.8&&sample.rate<speed*1.15,`actual clock ×${speed}: ${sample.rate}`);
    return sample;
   }
   const normalSpeed=await clockSample(1);
   await q.click('暂停');await q.click('体验工具','对话面板');
   await q.click('游戏速度 ×3');assert.ok(await q.find('游戏速度 ×3 · 当前'));
   await q.click('返回战斗','对话面板');
   const tripleSpeed=await clockSample(3),ratio=tripleSpeed.rate/normalSpeed.rate;
   assert.ok(ratio>2.4&&ratio<3.6,`measured ×3/×1 ratio: ${ratio}`);
   q.check('实际浏览器clock ×1/×3',{normalSpeed,tripleSpeed,ratio});
   assert.ok((await q.scene()).some(n=>/体验档 ×3.*无敌/.test(n.text)),'battle assist marker');
   await q.shot('triple-clock');
   await q.click('暂停');const paused=await q.snapshot();
   const prefs=await raw(keys.tools);assert.deepEqual(JSON.parse(prefs),{speed:3,invincible:true});
   await q.load(q.page.url()); // real reload with playtest=1, no fresh fixture reinstall
   assert.equal(await q.page.evaluate(()=>towerQA.playtest),true);
   assert.deepEqual(invariants(await q.snapshot()),invariants(paused));
   assert.equal(await raw(keys.tools),prefs);assert.equal(await raw(keys.normal),normalRaw);
   await q.click('体验工具','对话面板');
   assert.ok(await q.find('游戏速度 ×3 · 当前'));assert.ok(await q.find('无敌秒杀：开启'));
   await q.shot('reload-tools');await q.click('返回战斗','对话面板');
   q.check('URL体验直开、刷新工具与暂停快照保留、普通档raw不变');

   // Tick-by-tick assisted combat sample, separate from REAL-WALL-CLOCK measurement.
   // Approach real enemies; never inject a Boss, its HP, kills, rewards or wave completion.
   // Record first contact hit that removes a previously full-HP Boss into the real ledger.
   const evidence={bossKills:[],hpLoss:[],hazardTicks:0,steps:0};
   let finalSnapshot;
   for(let batch=0;batch<150&&!evidence.bossKills.length;batch++){
    const sample=await q.page.evaluate(()=>{
     const r=towerQA.run,out={bossKills:[],hpLoss:[],hazardTicks:0,steps:0};
     if(!r)return {error:'run-ended-before-boss-sample'};
     for(let i=0;i<480&&r.state.phase==='playing'&&!out.bossKills.length;i++){
      const s=r.state,p=s.player,bosses=s.enemies.filter(e=>e.role==='boss')
       .map(e=>({id:e.id,hp:e.hp,maxHp:e.maxHp,x:e.x,y:e.y}));
      const target=s.enemies.find(e=>e.role==='boss')||
       [...s.enemies].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
      r.setInput(target?target.x-p.x:0,target?target.y-p.y:0);
      if(s.enemies.some(e=>Math.hypot(e.x-p.x,e.y-p.y)<=e.radius+24)||
       s.zones.some(z=>z.hostile&&Math.hypot(z.x-p.x,z.y-p.y)<(z.radius||0)+24))out.hazardTicks++;
      const hp=p.hp,time=s.time;
      r.advance(1/60);out.steps++;
      if(r.state.player.hp<hp-1e-8)out.hpLoss.push({time,before:hp,after:r.state.player.hp});
      for(const boss of bosses){
       const receipt=r.state.killLedger.find(k=>k.id===boss.id);
       if(receipt)out.bossKills.push({before:boss,receipt,timeBefore:time,timeAfter:r.state.time,
        effectiveHitEffects:r.state.effects.filter(e=>e.kind==='hit'&&Math.hypot(e.x-boss.x,e.y-boss.y)<50)});
      }
     }
     const snapshot=r.snapshot();
     if(snapshot.phase==='playing'&&out.bossKills.length)towerQA.pause();
     else towerQA.update(0);
     return {...out,snapshot};
    });
    assert.ok(!sample.error,sample.error);
    evidence.steps+=sample.steps;evidence.hazardTicks+=sample.hazardTicks;
    evidence.bossKills.push(...sample.bossKills);evidence.hpLoss.push(...sample.hpLoss);
    finalSnapshot=sample.snapshot;
    if(finalSnapshot.phase!=='playing')break;
   }
   q.record.assistSample={...evidence,snapshot:finalSnapshot,
    note:'真实逐tick模拟抽样，非自然养成、非实际clock测量；未改统计/敌人/血量/奖励。'};
   assert.deepEqual(evidence.hpLoss,[],'assist blocks sampled incoming damage');
   assert.ok(evidence.hazardTicks>0,'sample includes contact/hazard exposure');
   assert.ok(evidence.bossKills.length,'must reach actual Boss, not infer from toggle');
   const kill=evidence.bossKills.find(k=>k.before.hp===k.before.maxHp);
   assert.ok(kill,'full-HP Boss killed within one actual simulation tick');
   assert.ok(kill.effectiveHitEffects.some(e=>e.damage===kill.before.hp),'effective hit equals remaining Boss HP');
   assert.ok(rt.validateTowerSnapshot(finalSnapshot),'real assisted snapshot remains valid');
   assert.equal(await raw(keys.normal),normalRaw);
   q.check('无伤与真实满血Boss秒杀抽样，快照校验通过',{bossKills:evidence.bossKills,hazardTicks:evidence.hazardTicks});
   await q.shot('boss-sample');
   const experienceRaw=await raw(keys.playtest);
   // If the sampled kill ended the floor, return through the actual result dialog.
   if(await q.page.evaluate(()=>!towerQA.run)){
    await q.click('返回宗门','对话面板');await q.click('体验工具');
   }else await q.click('体验工具','对话面板');
   const switchWallBefore=await q.page.evaluate(()=>Date.now());
   await q.click('切回普通档','对话面板');
   const switchWallAfter=await q.page.evaluate(()=>Date.now());
   assert.equal(await q.page.evaluate(()=>towerQA.playtest),false);
   assert.ok(!q.page.url().includes('playtest=1'));
   const returnedRaw=await raw(keys.normal);
   q.record.isolation={keys,ordinaryBeforeHash:digest(normalRaw),ordinaryAfterHash:digest(returnedRaw),
    ordinaryRawUnchanged:returnedRaw===normalRaw,experienceHash:digest(experienceRaw),
    prefs:JSON.parse(await raw(keys.tools))};
   if(returnedRaw!==normalRaw){
    const before=JSON.parse(JSON.parse(normalRaw).data),after=JSON.parse(JSON.parse(returnedRaw).data);
    q.record.isolation.changedOrdinaryFields=Object.keys({...before,...after})
     .filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key]));
   }
   // User clarified: ordinary camp recovery resumes on return. Only HP/restAt
   // may change, at real wall-clock 1% maxHP/min; playtest speed must not scale it.
   const normalBefore=JSON.parse(JSON.parse(normalRaw).data);
   const normalAfter=JSON.parse(JSON.parse(returnedRaw).data);
   const withoutRecovery=s=>Object.fromEntries(Object.entries(s).filter(([key])=>!['hp','restAt'].includes(key)));
   assert.deepEqual(withoutRecovery(normalAfter),withoutRecovery(normalBefore),
    'ordinary XP/resources/skills/research/equipment/progress/ledger must not change');
   assert.ok(normalAfter.restAt>=switchWallBefore&&normalAfter.restAt<=switchWallAfter,
    'recovery timestamp is actual return wall clock');
   const maxHp=rt.cultivationAt(normalBefore.xp).maxHp;
   const expectedHp=Math.min(maxHp,normalBefore.hp+
    maxHp*.01*Math.max(0,normalAfter.restAt-normalBefore.restAt)/60000);
   const upperHp=Math.min(maxHp,normalBefore.hp+
    maxHp*.01*Math.max(0,switchWallAfter-normalBefore.restAt)/60000);
   assert.ok(Math.abs(normalAfter.hp-expectedHp)<1e-8,'exact real-time camp recovery');
   assert.ok(normalAfter.hp<=upperHp+1e-8,'×3 must not accelerate ordinary recovery');
   q.record.isolation.recovery={switchWallBefore,switchWallAfter,baselineRestAt:normalBefore.restAt,
    returnedRestAt:normalAfter.restAt,beforeHp:normalBefore.hp,afterHp:normalAfter.hp,maxHp,expectedHp,upperHp,
    otherFieldsUnchanged:true,policy:'raw immutable during experience/reload; real-wall-clock HP/restAt on return'};
   assert.ok(!(await q.scene()).some(n=>n.text.includes('体验档')),'normal marker restored');
   await q.shot('returned-normal');
   q.check('普通↔体验隔离；返回仅真实墙钟1%maxHP/min恢复，其余字段不变',q.record.isolation.recovery);
  });
  // Explicit floor-gate fixtures on one viewport: no changing progress within a scenario.
  for(let i=0;i<3;i++){
   for(const unlocked of [false,true]){
    const floor=(i+1)*3-(unlocked?0:1),cost=(i+1)*80;
    await scenario(sizes[0],`research${i+1}-${unlocked?'open':'locked'}-fixture`,
     fixture(rt,{floor,research:i}),async q=>{
      await q.click('藏经阁');const before=await q.state();
      const target=await q.find(`研习一次 · ${cost}妖丹换1点`);
      assert.ok(target);assert.equal(target.enabled,unlocked);
      if(unlocked){
       await q.click(target.name);const after=await q.state();
       assert.equal(after.researchPurchases,i+1);assert.equal(after.cores,before.cores-cost);
       assert.equal(rt.growthSummary(after).available,rt.growthSummary(before).available+1);
       await q.load();assert.equal((await q.state()).researchPurchases,i+1);
       await q.click('藏经阁');
       if(i===2){const capped=await q.find('三次研习已完成');assert.ok(capped&&!capped.enabled);}
      }
      q.check('research场外3/6/9通层条件与80/160/240扣费',{floor,cost,unlocked});
      await q.reveal(unlocked?(i===2?'三次研习已完成':`研习一次 · ${(i+2)*80}妖丹换1点`):target.name);
      await q.shot('condition');
     });
   }
  }
  report.status=failures?'FAILED':'AUTOMATED_CHECKS_PASSED_VISUAL_REVIEW_PENDING';
 }finally{
  if(failures)report.status='FAILED';
  report.finishedAt=new Date().toISOString();report.failures=failures;
  write(reportName,report);
  await browser.close();
 }
 if(failures)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
