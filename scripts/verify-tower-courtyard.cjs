'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{createServer}=require('node:http');const{pathToFileURL}=require('node:url');
const{chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'docs/xianxia/reports/tower-courtyard');
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
 const {context,page}=await open(viewport,0);
 await page.evaluate(()=>window.__towerTest.host.goto('hall'));
 await click(page,'宗门入口-锁妖塔');
 await page.waitForFunction(()=>[...window.__towerTest.host.menu.towerImages.entries()].some(([key,value])=>key.startsWith('sect-scene/tower-courtyard')&&value.frame));
 const stateBefore=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.store.state));
 const layout=await page.evaluate(()=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],nodes=walk(h.root),image=nodes.find(n=>n.name.startsWith('sect-scene/tower-courtyard')),size=image.getComponent('cc.UITransform').contentSize;return {sourceWidth:image.name.endsWith('-wide')?2196:1671,panelAlpha:nodes.find(n=>n.name==='层主传闻').getComponent(cc.Graphics).fillColor.a,rowAlpha:nodes.find(n=>n.name==='塔层-1').getComponent(cc.Graphics).fillColor.a,w:size.width,h:size.height,screenW:h.menu.designWidth,screenH:h.menu.designHeight,layers:nodes.filter(n=>/^塔层-[1-9]$/.test(n.name)).length,locked:nodes.find(n=>n.name==='塔层-9').getComponent(cc.Button).interactable};});
 assert.equal(layout.panelAlpha,153);assert.equal(layout.rowAlpha,168);assert.equal(layout.layers,9);assert.equal(layout.locked,false);
 assert.ok(Math.abs(layout.w/layout.h-layout.sourceWidth/941)<0.00001);
 assert.ok(layout.w>=layout.screenW-.01&&layout.h>=layout.screenH-.01);
 await click(page,'塔层-1');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.store.state)),stateBefore);
 await page.screenshot({path:path.join(OUT,`tower-${viewport.width}.png`)});
 await click(page,'← 宗门');assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'hall');
 await click(page,'宗门入口-锁妖塔');await click(page,'入场');
 await page.waitForFunction(()=>!!window.__towerTest.host.store.state.activeRun);
 assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.activeRun.floor),1);
 report.cases.push({viewport,layout,enteredFloor:1});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}}
main();
