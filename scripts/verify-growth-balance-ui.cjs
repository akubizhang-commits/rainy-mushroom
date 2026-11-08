// Compiled UI and isolated in-memory saves; does not access player saves.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/growth-balance-integration-2026-11-04');
(async()=>{
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data)});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/reports/growth-balance-integration-2026-11-04/ui-build/index.html?tower=1&smoke=1&ruleset=xianxia`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning,{},{timeout:90000});
   await page.evaluate(async()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    const {checksum}=await import('/js/xianxia/Checksum.js');let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>raw=v},Store=h.store.constructor,fresh=new Store(disk,0);fresh.act({type:'sync'},0);
    const envelope=JSON.parse(raw),state=JSON.parse(envelope.data);state.xp=14400;state.clearedFloor=8;
    const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)});h.store=new Store(disk,0);if(h.store.readOnly)throw Error(h.store.error);h.goto('tower');h.menu.render(h.store.state,'tower','');
   });
   await page.waitForFunction(()=>{let r=window.__towerTest.host.root;while(r.parent)r=r.parent;return !window.qaWalk(r).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy)});
   for(const [floor,text] of [[2,'寒魄器心 ×1'],[5,'赤曜器心 ×1'],[8,'紫宸器心 ×1']]){
    const labels=await page.evaluate(floor=>{const h=window.__towerTest.host,row=window.qaWalk(h.root).find(n=>n.name===`塔层-${floor}`);h.menu.scroll.scrollToPercentVertical((floor-1)/8,0);return window.qaWalk(row).flatMap(n=>{const l=n.getComponent('cc.Label');return l?[l.string]:[]})},floor);
    assert.ok(labels.includes(text),JSON.stringify(labels));report.cases.push({viewport,floor,labels});await page.waitForTimeout(100);await page.screenshot({path:path.join(out,`core-floor${floor}-${viewport.width}.png`)});
   }
   for(const [tier,cost,counts] of [['fa',1200,[32,16,16,28,1]],['bao',2400,[64,32,32,40,1]],['ling',4800,[128,64,64,56,2]]]){
    const result=await page.evaluate(tier=>{const h=window.__towerTest.host,m=h.menu;h.goto('forge');m.gearOpen=true;m.gearMode='craft';m.gearCraftTier=tier;m.gearSelection=`weapon:${tier}:q4`;m.render(h.store.state,'forge','');const e=m.commerceEntries('gear').find(e=>e.key===m.gearSelection);return {quote:m.commerceQuote('gear',e,1),counts:e.recipe.ingredients.map(a=>a.count),labels:window.qaWalk(h.root).filter(n=>n.activeInHierarchy).flatMap(n=>{const l=n.getComponent('cc.Label');return l?[l.string]:[]})}},tier);
    assert.equal(result.quote.stones,cost);assert.deepEqual(result.counts,counts);assert.ok(result.labels.some(s=>s.endsWith('/'+cost)));report.cases.push({viewport,tier,...result});
    await page.evaluate(()=>{const n=window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='炼制详情');if(!n)throw Error('missing crafting scroll');n.getComponent('cc.ScrollView').scrollToBottom(0)});await page.waitForTimeout(100);await page.screenshot({path:path.join(out,`forge-${tier}-${viewport.width}.png`)});
   }
   await context.close();
  }
  assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2)+'\n');console.log(`PASS ${report.cases.length} compiled UI cases`);
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
