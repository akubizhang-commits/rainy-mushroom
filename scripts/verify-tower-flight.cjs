'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{createServer}=require('node:http');const{pathToFileURL}=require('node:url');
const{chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'docs/xianxia/reports/tower-flight-2026-10-28');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const{TowerCampaignStore,TOWER_CAMPAIGN_KEY}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/TowerCampaign.js')));
 const{checksum}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/Checksum.js')));
 function seed(xp){const map=new Map(),store=new TowerCampaignStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},Date.now());store.act({type:'sync'},Date.now());const env=JSON.parse(map.get(TOWER_CAMPAIGN_KEY)),state=JSON.parse(env.data);state.xp=xp;env.data=JSON.stringify(state);env.checksum=checksum(env.data);return JSON.stringify(env);}
 const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={status:'RUNNING',cases:[],errors:[]};
 try{browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 async function open(viewport,xp){const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu);await page.evaluate(({key,data})=>{const h=window.__towerTest.host;h.platform.storage.setItem(key,data);h.store=new h.store.constructor(h.platform.storage,Date.now());h.render();},{key:TOWER_CAMPAIGN_KEY,data:seed(xp)});return{context,page};}
 async function click(page,name){const p=await page.evaluate(name=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],n=walk(h.root).find(n=>n.name===name);if(!n)throw Error('missing '+name);const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);await page.mouse.click(p.x,p.y);await page.waitForTimeout(100);}
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const{context,page}=await open(viewport,1485);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.goto('library');h.menu.openDetails('sj_flight');});
 await page.screenshot({path:path.join(OUT,`skill-${viewport.width}.png`)});
 await click(page,'learnSkill-sj_flight');assert.equal(await page.evaluate(()=>window.__towerTest.state().skills.sj_flight),1);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1);h.run.pause();h.draw();});
 assert.equal(await page.evaluate(()=>window.__towerTest.host.run.state.player.moveSpeed),275);
 await page.screenshot({path:path.join(OUT,`flight-${viewport.width}.png`)});
 const layout=await page.evaluate(()=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],nodes=walk(h.root),p=nodes.find(n=>n.name==='HUD.Portrait'),x=nodes.find(n=>n.name==='HUD.XPBar');return{portraitRight:p.position.x+p.getComponent('cc.UITransform').width/2,xpLeft:x.position.x-x.getComponent('cc.UITransform').width/2,stage:h.stats.string};});assert.ok(layout.xpLeft>layout.portraitRight);assert.equal(layout.stage,'筑基 · 初期');
 await page.evaluate(()=>{const h=window.__towerTest.host;h.withdraw();h.goto('library');h.menu.openDetails('sj_flight');});await click(page,'decreaseSkill-sj_flight');
 await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1);h.run.pause();h.draw();});assert.equal(await page.evaluate(()=>window.__towerTest.host.run.state.player.moveSpeed),220);
 await page.screenshot({path:path.join(OUT,`walk-${viewport.width}.png`)});report.cases.push({viewport,learn:true,refund:true,speed:[220,275],layout});await context.close();}
 for(const[xp,major]of[[44,false],[1484,true]]){const{page,context}=await open({width:1280,height:720},xp);
 const event=await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1);h.update(0);for(let i=0;i<40&&!h.run.state.enemies.length;i++)h.update(.1);h.run.state.enemies[0].hp=0;h.update(.1);h.run.pause();h.run.state.time+=.35;h.draw();return h.levelEffects;});assert.equal(event.length,1);assert.equal(event[0].major,major);await page.screenshot({path:path.join(OUT,major?'major.png':'minor.png')});const frozen=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.levelEffects));await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.levelEffects)),frozen);report.cases.push({xp,major,event});await context.close();}
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}}
main();
