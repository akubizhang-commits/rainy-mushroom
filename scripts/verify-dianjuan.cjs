const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/dianjuan-2026-11-03');
(async()=>{fs.mkdirSync(out,{recursive:true});const server=createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(root+'/'))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={cases:[],errors:[]};
try{browser=await chromium.launch({headless:true,channel:'chrome'});for(const viewport of [{width:844,height:390},{width:1280,height:720},{width:960,height:360}]){
 const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu);
 await page.evaluate(()=>{window.walk=n=>[n,...n.children.flatMap(window.walk)];window.find=name=>window.walk(window.__towerTest.host.root).find(n=>n.name===name&&n.activeInHierarchy);});
 const layout=[];
 await page.evaluate(async()=>{const h=window.__towerTest.host,{checksum}=await import('/js/xianxia/Checksum.js');let raw;const disk={getItem:()=>raw||null,setItem:(_,v)=>{raw=v;}};let store=new h.store.constructor(disk,Date.now());store.act({type:'sync'},Date.now());const env=JSON.parse(raw),state=JSON.parse(env.data);state.contribution=3000;env.data=JSON.stringify(state);env.checksum=checksum(env.data);raw=JSON.stringify(env);h.store=new h.store.constructor(disk,Date.now());h.goto('hall');h.menu.mixedOpen=true;h.menu.render(h.store.state,'hall');});
 await page.waitForFunction(()=>!window.walk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy),{},{timeout:60000});
 async function click(name){const p=await page.evaluate(name=>{const n=window.find(name);if(!n)throw Error('Missing '+name);const cam=window.walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=cam.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);assert.ok(p.x>0&&p.x<viewport.width&&p.y>0&&p.y<viewport.height);await page.mouse.click(p.x,p.y);await page.waitForTimeout(160);}
 await page.waitForTimeout(350);
 const text=await page.evaluate(()=>window.walk(window.find('机缘抽奖页')).map(n=>n.getComponent('cc.Label')?.string||'').join(' '));assert.match(text,/点眷 3000/);assert.match(text,/十连 · 1000点眷/);assert.doesNotMatch(text,/试玩|贡献/);
 await page.screenshot({path:path.join(out,`draw-${viewport.width}.png`)});
 for(let i=1;i<=3;i++){
  await click('十连 · 1000点眷');
  const after=await page.evaluate(()=>({balance:window.__towerTest.host.store.state.contribution,receipt:window.__towerTest.host.store.state.mixedDraw.receipts.at(-1)}));assert.equal(after.balance,3000-i*1000);assert.equal(after.receipt.rewards.length,10);layout.push(after.balance);
  await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.mixedResultView='closed';h.menu.render(h.store.state,'hall');});await page.waitForTimeout(750);
 }
 await click('单抽 · 100点眷');assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.mixedDraw.sequence),3);
 await page.screenshot({path:path.join(out,`empty-${viewport.width}.png`)});
 report.cases.push({viewport,layout,status:'PASS'});await context.close();
}assert.deepEqual(report.errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));}finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
