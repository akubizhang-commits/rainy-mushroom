const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/xianxia/reports/realm-only-skills-2026-10-30');
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
   const result=await page.evaluate(()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;
    const state=JSON.parse(JSON.stringify(h.store.state));
    state.xp=10920;state.spiritStones=10000;state.clearedFloor=0;
    h.store._state=state;
    const saved=h.store.act({type:'sync'},Date.now());if(!saved.ok)throw Error(JSON.stringify(saved));
    h.goto('skills');h.menu.openDetails('evo_tiandi');
    const walk=n=>[n,...n.children.flatMap(walk)];
    const pane=walk(h.root).find(n=>n.name==='技能详情固定栏');
    const text=walk(pane).map(n=>n.getComponent('cc.Label')?.string||'').join('\n');
    const button=walk(pane).find(n=>n.name==='learnSkill-evo_tiandi');
    return {text,canLearn:button?.getComponent('cc.Button')?.interactable,baseLearned:!!state.skills.sj_line,clearedFloor:state.clearedFloor};
   });
   assert.equal(result.canLearn,true);assert.equal(result.baseLearned,false);assert.equal(result.clearedFloor,0);
   assert.doesNotMatch(result.text,/通关第|第\d+波|剑破虚空\s*\d+级/);assert.match(result.text,/金丹/);
   await page.screenshot({path:path.join(out,`independent-skill-${viewport.width}.png`)});
   const purchase=await page.evaluate(()=>{
    const h=window.__towerTest.host;const r=h.store.act({type:'learnSkill',id:'evo_tiandi'},Date.now());
    h.goto('skills');h.menu.openDetails('evo_tiandi');
    return {ok:r.ok,rank:h.store.state.evolutionRanks.evo_tiandi,baseLearned:!!h.store.state.skills.sj_line};
   });
   assert.equal(purchase.ok,true);assert.equal(purchase.rank,1);assert.equal(purchase.baseLearned,false);
   report.cases.push({viewport,...result,purchase});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;throw e}
 finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
