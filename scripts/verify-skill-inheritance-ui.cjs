const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/skill-inheritance-2026-11-01/ui');fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu);
   for(const [id,parent,cost] of [['evo_wanjian','sj_yujian',2],['evo_wuwo','sj_wanjian',4],['evo_tiandi','sj_line',2],['evo_sixiang','sj_formation',4]]){
    const setup=await page.evaluate(({id,parent})=>{
     const h=window.__towerTest.host;h.campElapsed=-100000;
     const state=JSON.parse(JSON.stringify(h.store.state));Object.assign(state,{xp:10920,clearedFloor:9,researchPurchases:3,spiritStones:20000,skillsInitialized:true,skills:{sj_arc:1},evolutionRanks:{},evolutions:[],books:[],activeRun:null});h.store._state=state;
     const saved=h.store.act({type:'sync'},Date.now());if(!saved.ok)throw Error(JSON.stringify(saved));
     h.menu.libraryArea='skills';h.screen='camp';h.goto('library');h.menu.openDetails(id);
     const walk=n=>[n,...n.children.flatMap(walk)],all=walk(h.root),pane=all.find(n=>n.name==='技能详情固定栏');
     const button=all.find(n=>n.name==='learnSkill-'+id),text=n=>walk(n).map(n=>n.getComponent('cc.Label')?.string||'').join('\n');
     return {text:text(pane),enabled:button?.getComponent('cc.Button')?.interactable,denied:h.store.act({type:'learnSkill',id},Date.now())};
    },{id,parent});
    assert.equal(setup.enabled,false);assert.equal(setup.denied.reason,'parent-required');
    const purchased=await page.evaluate(({id,parent})=>{
     const h=window.__towerTest.host,results=[];
     for(const skill of [parent,id])results.push(h.store.act({type:'learnSkill',id:skill},Date.now()));
     h.goto('library');h.menu.openDetails(id);
     const walk=n=>[n,...n.children.flatMap(walk)],text=walk(h.root).map(n=>n.getComponent('cc.Label')?.string||'').join('\n');
     return {results,text,rejected:h.store.act({type:'decreaseSkill',id:parent},Date.now())};
    },{id,parent});
    assert(purchased.results.every(r=>r.ok),JSON.stringify(purchased.results));assert.match(purchased.text.replace(/\s/g,''),/继承基础修炼/);assert.match(purchased.text,/1级/);assert.equal(purchased.rejected.reason,'dependent-evolution');assert.doesNotMatch(purchased.text,/独立使用10级|原功法点数可返还/);
    await page.screenshot({path:path.join(out,`${viewport.width}-${id}.png`)});
    const raised=await page.evaluate(({id,parent})=>{
     const h=window.__towerTest.host,r=h.store.act({type:'learnSkill',id:parent},Date.now());h.goto('library');h.menu.openDetails(id);
     const walk=n=>[n,...n.children.flatMap(walk)];return {r,text:walk(h.root).map(n=>n.getComponent('cc.Label')?.string||'').join('\n')};
    },{id,parent});assert.equal(raised.r.ok,true);assert.match(raised.text.replace(/\s/g,''),/继承基础修炼.{2,8}2级/);
    checks.push({viewport,id,cost,setup,purchased,raised});
   }
   await context.close();
  }
  assert.deepEqual(errors,[]);console.log(`PASS: ${checks.length} landscape inheritance UI cases`);
 }finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors},null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
