// 2026-11-09 skill unlock rebalance, real compiled Cocos web build in both landscape viewports.
// Uses an in-memory campaign store, so the user's saves are never read or written.
// For every moved skill: its tree row sits in the new realm lane, one level below the gate the
// detail pane reports "需角色N级" and learning is refused, at the gate learning succeeds, and the
// learned skill then fires in training (real TowerRun simulation, hits on a dummy target).
// Usage: node scripts/verify-skill-unlock-rebalance.cjs   (after npm run cocos:build)
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/skill-unlock-rebalance-2026-11-09/browser');
fs.mkdirSync(out,{recursive:true});
// [id, stage, learn level, prerequisite ranks, cooldown key to trigger, hit sources that count as a cast]
const CASES=[
 ['sj_mark','lianqi-peak',7,{},'sj_arc',['sj_mark']],
 ['sj_moon_triple','zhuji-early',11,{},'sj_moon_triple',['sj_moon_triple']],
 ['sj_cross','zhuji-middle',14,{},'sj_cross',['sj_cross']],
 ['sj_line','jindan-early',21,{},'sj_line',['sj_line']],
 ['evo_wuwo','jindan-early',21,{sj_wanjian:1},'sj_wanjian',['evo_wuwo','sj_wanjian']],
 ['evo_tiandi','jindan-middle',24,{sj_line:1},'sj_line',['evo_tiandi']],
];
(async()=>{
 const server=createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(b)});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;const report={cases:[],errors:[],console:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')report.console.push(m.text())});
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   // Scene changes raise the loading screen (PinePilot.assetLoading) until that scene's art is ready.
   const sceneReady=()=>page.waitForFunction(()=>{const h=window.__towerTest?.host;return !!h&&!h.host.assetLoading?.blocked},undefined,{timeout:120000});
   await page.waitForFunction(()=>window.__towerTest?.host?.menu,undefined,{timeout:120000});await sceneReady();
   const storage=await page.evaluate(()=>JSON.stringify(localStorage));
   await page.evaluate(()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;
    let record=null;const disk={getItem:()=>record,setItem:(_,v)=>{record=v}};
    h.store=new h.store.constructor(disk,0);h.store.act({type:'sync'},0);
    window.qaBase=JSON.parse(JSON.stringify(h.store.state));
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    window.qaFind=name=>window.qaWalk(window.__towerTest.host.menu.root).find(n=>n.name===name);
   });
   for(const [id,stage,level,parents,trigger,sources] of CASES){
    // One level below the gate: placed in the new lane, gate text, learning refused.
    const below=await page.evaluate(async({id,level,parents})=>{
     const h=window.__towerTest.host,{cultivationLevelXp}=await import('/js/xianxia/TowerProfile.js');
     h.store._state={...JSON.parse(JSON.stringify(window.qaBase)),xp:cultivationLevelXp(level)-1,spiritStones:100000,
      skills:{sj_arc:1,...parents},books:Object.keys(parents).filter(k=>k==='sj_line')};
     h.screen='camp';h.menu.libraryArea='skills';h.goto('library');
     const m=h.menu;m.openDetails(id);
     const labels=window.qaWalk(m.root).filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.Label')?.string||'').filter(Boolean);
     m.changeSkill({id},'learnSkill');
     const s=h.store.state;
     return {labels,rank:(s.skills[id]||0)+(s.evolutionRanks?.[id]||0)};
    },{id,level,parents});
    assert.equal(below.rank,0,`${id} refused below Lv${level}`);
    assert.ok(below.labels.some(t=>t.includes(`需角色${level}级`)),`${id} gate text: ${below.labels.filter(t=>t.includes('需角色')).join('|')}`);
    // At the gate: learn, then check lane placement and take a screenshot of the row with its details.
    const at=await page.evaluate(async({id,stage,level,parents})=>{
     const h=window.__towerTest.host,{cultivationLevelXp}=await import('/js/xianxia/TowerProfile.js');
     h.store._state={...JSON.parse(JSON.stringify(window.qaBase)),xp:cultivationLevelXp(level),spiritStones:100000,
      skills:{sj_arc:1,...parents},books:Object.keys(parents).filter(k=>k==='sj_line')};
     h.screen='camp';h.menu.libraryArea='skills';h.goto('library');
     const m=h.menu;m.openDetails(id);m.changeSkill({id},'learnSkill');
     const s=h.store.state,rank=(s.skills[id]||0)+(s.evolutionRanks?.[id]||0);
     m.openDetails(id);
     const lane=window.qaFind(`功法泳道-${stage}`),row=window.qaFind(`功法行-${id}`);
     const lh=lane.getComponent('cc.UITransform').height*lane.worldScale.y;
     const inLane=row.worldPosition.y<=lane.worldPosition.y+lh/2+1e-6&&row.worldPosition.y>=lane.worldPosition.y-lh/2-1e-6;
     const lanes=window.qaWalk(m.root).filter(n=>n.name.startsWith('功法泳道-')).filter(n=>{
      const hh=n.getComponent('cc.UITransform').height*n.worldScale.y;return row.worldPosition.y<=n.worldPosition.y+hh/2&&row.worldPosition.y>=n.worldPosition.y-hh/2}).map(n=>n.name);
     // Scroll the row into view for the screenshot.
     const cc=window.cc||await window.System.import('cc');const tree=window.qaFind('境界功法树内容'),vp=window.qaFind('功法树二维卷轴');
     let p=row,pos={x:0,y:0};while(p&&p!==tree){pos.x+=p.position.x;pos.y+=p.position.y;p=p.parent}
     const size=vp.getComponent('cc.UITransform'),content=tree.getComponent('cc.UITransform');
     m.scroll.scrollToOffset(new cc.Vec2(Math.max(0,Math.min(content.width-size.width,pos.x-size.width/2)),Math.max(0,Math.min(content.height-size.height,-pos.y-size.height/2))),0);
     const labels=window.qaWalk(m.root).filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.Label')?.string||'').filter(Boolean);
     return {rank,inLane,lanes,labels:labels.filter(t=>/境界|角色|需|级/.test(t)).slice(0,40)};
    },{id,stage,level,parents});
    assert.equal(at.rank,1,`${id} learned at Lv${level}`);
    assert.ok(at.inLane,`${id} row in ${stage}, found ${at.lanes}`);
    await sceneReady();await page.waitForTimeout(250);
    await page.screenshot({path:path.join(out,`${id}-tree-${viewport.width}x${viewport.height}.png`)});
    // Training: the learned skill fires on a stationary dummy through the real simulation.
    // Enter first and wait for the training field to finish loading, so the cast is drawn on screen.
    await page.evaluate(()=>{const h=window.__towerTest.host;h.enterTraining();h.run.pause();});
    await sceneReady();await page.waitForTimeout(300);
    const cast=await page.evaluate(({id,trigger,sources})=>{
     const h=window.__towerTest.host;const run=h.run;run.pause();const s=run.state;
     if(h.screen!=='battle'||!h.training)throw new Error(`not in training: ${h.screen}`);
     s.player.hp=s.player.maxHp=1e7;s.player.invulnerableUntil=1e9;
     s.enemies=[];s.pending=[];s.reserved=[];s.effects=[];s.projectiles=[];s.zones=[];
     const e=run._enemy({id:'qa-dummy',archetype:'tiger_normal_r4',x:s.player.x+100,y:s.player.y});
     e.hp=e.maxHp=1e9;e.moveSpeed=0;e.ai.graceUntil=1e9;s.enemies=[e];
     for(const k of Object.keys(s.cooldowns))s.cooldowns[k]=999;s.cooldowns[trigger]=0;
     run.resume();const seen=new Set(),hits=[];let marked=false,screenshotAt=null;
     for(let i=0;i<240;i++){
      for(const en of s.enemies)en.ai.graceUntil=1e9;
      run.advance(1/60);h.draw();
      for(const fx of s.effects)if(fx.kind==='hit'&&!fx.hostile&&!seen.has(fx.id)){seen.add(fx.id);hits.push({source:fx.source,damage:fx.damage,impact:fx.impact?.skill||null})}
      if(e.qingping||e.scarDebuff)marked=true;
      if(screenshotAt===null&&hits.some(x=>sources.includes(x.source)||sources.includes(x.impact)))screenshotAt=i;
      if(screenshotAt!==null&&i>=screenshotAt+6)break;
     }
     run.pause();h.draw();
     return {hits,marked,loadout:{active:run.state.loadout.active,passive:run.state.loadout.passive,evolutions:run.state.loadout.evolutions}};
    },{id,trigger,sources});
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>!!window.__towerTest.host.host.assetLoading?.blocked),false,`${id} cast screenshot not covered by the loading screen`);
    await page.screenshot({path:path.join(out,`${id}-cast-${viewport.width}x${viewport.height}.png`)});
    await page.evaluate(()=>{const h=window.__towerTest.host;h.run.abandon();h.finish();});
    const fired=id==='sj_mark'?cast.marked:cast.hits.some(x=>sources.includes(x.source));
    assert.ok(fired,`${id} fired in training: ${JSON.stringify(cast.hits.slice(0,8))}`);
    report.cases.push({viewport,id,stage,level,belowRefused:true,gateText:`需角色${level}级`,learnedRank:at.rank,inLane:at.inLane,
     fired,hitSources:[...new Set(cast.hits.map(x=>x.source))],marked:cast.marked,loadout:cast.loadout});
    console.log(JSON.stringify({viewport:`${viewport.width}x${viewport.height}`,id,stage,level,fired}));
   }
   assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),storage,'real saves untouched');
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
  console.log('PASS: moved skills sit in their new realm lanes, gate at the new level, learn and fire in both landscapes');
 }catch(e){report.status='FAIL';report.error=String(e&&e.stack||e);throw e}
 finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
