const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/xianxia/reports/manual-learning-2026-10-30');
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
   const result=await page.evaluate(()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;
    const walk=n=>[n,...n.children.flatMap(walk)];
    return {skills:h.store.state.skills,xp:h.store.state.xp,text:walk(h.root).map(n=>n.getComponent('cc.Label')?.string||'').join('\n')};
   });
   assert.deepEqual(result.skills,{sj_arc:1});assert.equal(result.xp,0);
   assert.match(result.text,/弦月斩/);assert.match(result.text,/1\/10级/);
   await page.screenshot({path:path.join(out,`starter-arc-${viewport.width}.png`)});
   await page.evaluate(()=>window.__towerTest.host.goto('tower'));
   await page.waitForFunction(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(window.__towerTest.host.root).some(n=>n.name==='塔层-1')});
   const rewardText=await page.evaluate(()=>{
    const h=window.__towerTest.host;
    const walk=n=>[n,...n.children.flatMap(walk)];
    return walk(h.root).map(n=>n.getComponent('cc.Label')?.string||'').join('\n');
   });
   assert.match(rewardText,/\+1技能点/);
   await page.waitForTimeout(800);
   await page.screenshot({path:path.join(out,`first-clear-${viewport.width}.png`)});
   report.cases.push({viewport,...result,rewardText});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;throw e}
 finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
