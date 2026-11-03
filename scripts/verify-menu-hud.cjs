const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/menu-hud-2026-11-03');
(async()=>{fs.mkdirSync(out,{recursive:true});const server=createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(root+'/'))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={cases:[],errors:[]};
try{browser=await chromium.launch({headless:true,channel:'chrome'});for(const viewport of [{width:844,height:390},{width:1280,height:720},{width:960,height:360}]){
 const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu);
 await page.evaluate(()=>{window.walk=n=>[n,...n.children.flatMap(window.walk)];window.find=name=>window.walk(window.__towerTest.host.root).find(n=>n.name===name&&n.activeInHierarchy);});
 const layout=[];
 for(const destination of ['hall','home','swordPeak','tower','pills','forge','loadouts','training','gate','tutorial','inventory','library']){
  await page.evaluate(destination=>window.__towerTest.host.goto(destination),destination);
  await page.waitForFunction(()=>!window.walk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy),{},{timeout:60000});
  const visible=await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.refreshVitals(h.store.state);return {hud:!!window.find('HUD.PlayerVitals'),hp:!!window.find('HUD.HPBar'),mana:!!window.find('HUD.ManaBar'),xp:!!window.find('HUD.XPBar'),caption:!!window.find('HUD.HPCaption'),hpNumbers:!!window.find('HUD.HPLabel'),manaNumbers:!!window.find('HUD.ManaLabel')};});
  assert.equal(visible.xp,false,destination+' no experience bar');assert.equal(visible.caption,false);assert.equal(visible.hpNumbers,false);assert.equal(visible.manaNumbers,false);
  if(visible.hud){assert.equal(visible.hp,true);assert.equal(visible.mana,true);}
  layout.push({destination,...visible});
  if(['hall','loadouts'].includes(destination)){await page.waitForTimeout(200);await page.screenshot({path:path.join(out,`${destination}-${viewport.width}.png`)});}
 }
 report.cases.push({viewport,layout,status:'PASS'});await context.close();
}assert.deepEqual(report.errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));}finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
