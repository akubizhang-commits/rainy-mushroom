const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/xianxia/reports/balance-optimization-2026-10-30');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b)})
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;const report={cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu);
   await page.waitForFunction(()=>!window.__towerTest.host.transitioning);
   await page.evaluate(()=>window.__towerTest.host.goto('library'));
   await page.waitForFunction(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(window.__towerTest.host.root).some(n=>n.name==='技能详情固定栏')});
   for(const id of ['sj_arc','sj_heart','vajra','evo_wanjian','evo_wuwo','evo_tiandi','evo_sixiang']) {
    const result=await page.evaluate(id=>{
     const h=window.__towerTest.host;h.campElapsed=-100000;
     const state=JSON.parse(JSON.stringify(h.store.state));state.xp=10920;
     state.skills={sj_arc:3,sj_heart:8,vajra:8};state.evolutionRanks={};
     h.menu.render(state,'library','');h.menu.openDetails(id);
     const walk=n=>[n,...n.children.flatMap(walk)];
     const nodes=walk(h.root),sc=nodes.find(n=>n.name==='技能详情独立卷轴').getComponent('cc.ScrollView');
     sc.scrollToTop(0);
     return {text:nodes.map(n=>n.getComponent('cc.Label')?.string||'').join('\n'),contentHeight:sc.content.getComponent('cc.UITransform').height};
    },id);
    assert.match(result.text,/境界与技能等级/);
    if(id==='sj_arc')for(const line of ['1–3级：炼气 · 初期','4–6级：炼气 · 中期','7–9级：炼气 · 巅峰','10级：筑基 · 初期'])assert.ok(result.text.includes(line),line);
    if(id==='sj_heart')assert.match(result.text,/28%/);
    if(id.startsWith('evo_'))assert.ok(result.text.replace(/\s/g,'').includes('原功法点数可返还'));
    if(id==='vajra'){assert.ok(result.text.includes('7–8级：筑基 · 初期'));assert.match(result.text,/15%/);}
    await page.waitForTimeout(100);
    await page.screenshot({path:path.join(out,`${id}-${viewport.width}.png`)});
    report.cases.push({viewport,id,...result});
   }
   const frames=await page.evaluate(()=>new Promise(resolve=>{
    const times=[];let previous;
    const frame=now=>{if(previous!==undefined)times.push(now-previous);previous=now;
     if(times.length<120)requestAnimationFrame(frame);else{times.sort((a,b)=>a-b);resolve({median:times[60],p95:times[114]})}};
    requestAnimationFrame(frame);
   }));
   report.cases.push({viewport,uiFrameIntervalsMs:frames});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;throw e}
 finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
