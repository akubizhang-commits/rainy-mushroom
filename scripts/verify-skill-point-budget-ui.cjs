const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/skill-point-budget-2026-10-31/ui-single-reward');fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu);
   for(const rank of [0,1,2]){
    const data=await page.evaluate(rank=>{
     const h=window.__towerTest.host;h.campElapsed=-100000;const s=JSON.parse(JSON.stringify(h.store.state));
     Object.assign(s,{xp:10920,clearedFloor:9,spiritStones:10000,skillsInitialized:true,skills:{sj_arc:1},evolutionRanks:rank?{evo_sixiang:rank}:{},evolutions:rank?['evo_sixiang']:[],books:rank?['evo_sixiang']:[]});h.store._state=s;
     h.menu.libraryArea='skills';h.screen='camp';h.goto('library');h.menu.openDetails('evo_sixiang');
     const walk=n=>[n,...n.children.flatMap(walk)],all=walk(h.root),pane=all.find(n=>n.name==='技能详情固定栏');h.menu.skillPaneScroll?.scrollToBottom(0);
     const text=n=>walk(n).map(n=>n.getComponent('cc.Label')?.string||'').join('\n');return {text:text(pane),button:text(all.find(n=>n.name==='learnSkill-evo_sixiang'))};
    },rank);
    assert(!data.text.includes('境界与技能等级'));assert(!/技能点\s+\d/.test(data.text));
    assert.equal(data.text.includes('学习条件'),rank===0);assert.equal(data.text.includes('升级条件'),rank===1);
    assert(data.button.includes(rank===0?'学习 · 36点':rank===1?'升至2级 · 12点':'已满级'));
    await page.screenshot({path:path.join(out,`${viewport.width}-rank-${rank}.png`)});checks.push({viewport,rank,...data});
   }
   const tower=await page.evaluate(()=>{const h=window.__towerTest.host;h.goto('tower');const walk=n=>[n,...n.children.flatMap(walk)];const all=walk(h.root);return Array.from({length:9},(_,i)=>{const row=all.find(n=>n.name===`塔层-${i+1}`);return walk(row).map(n=>n.getComponent('cc.Label')?.string||'').filter(Boolean).join(' ')});});
   const expected=['技能点 ×4','宗门贡献 ×100','下品灵石 ×100','技能点 ×7','宗门贡献 ×150','中品灵石 ×3','技能点 ×9','宗门贡献 ×200','中品灵石 ×4'];
   tower.forEach((text,i)=>{assert(!/\+\d+技能点/.test(text));const [name,amount]=expected[i].split(' ');assert(text.includes(name)&&text.includes(amount),text);});
   checks.push({viewport,tower});await page.screenshot({path:path.join(out,`${viewport.width}-tower.png`)});
   await page.evaluate(()=>window.__towerTest.host.goto('library'));
   const research=await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.libraryArea='skills';h.menu.showLearningTools=true;h.menu.render(h.store.state,'library','');const walk=n=>[n,...n.children.flatMap(walk)];return walk(h.root).map(n=>n.getComponent('cc.Label')?.string||'').join('').replace(/\s/g,'')});
   assert(research.includes('共12点'));assert(research.includes('换4点'));checks.push({viewport,research});await page.screenshot({path:path.join(out,`${viewport.width}-research.png`)});await context.close();
  }
  assert.deepEqual(errors,[]);console.log(`PASS: ${checks.length} landscape UI checks`);
 }finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors},null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
