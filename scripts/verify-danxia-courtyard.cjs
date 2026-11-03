'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{createServer}=require('node:http');const{pathToFileURL}=require('node:url');
const{chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'docs/xianxia/reports/danxia-courtyard');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const{TowerCampaignStore,TOWER_CAMPAIGN_KEY}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/TowerCampaign.js')));
 const{checksum}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/Checksum.js')));
 function seed(xp){const map=new Map(),store=new TowerCampaignStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},Date.now());store.act({type:'sync'},Date.now());const env=JSON.parse(map.get(TOWER_CAMPAIGN_KEY)),state=JSON.parse(env.data);state.xp=xp;env.data=JSON.stringify(state);env.checksum=checksum(env.data);return JSON.stringify(env);}
 const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={status:'RUNNING',cases:[],errors:[]};
 try{browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 async function open(viewport,xp){const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1`);await page.waitForFunction(()=>{if(!window.cc?.director?.getScene())return false;const walk=n=>[n,...n.children.flatMap(walk)],host=walk(cc.director.getScene()).map(n=>n.getComponent('PinePilot')?.survivor).find(Boolean);if(!host?.menu)return false;window.__towerTest={host};return true;});await page.evaluate(({key,data})=>{const h=window.__towerTest.host;h.platform.storage.setItem(key,data);h.store=new h.store.constructor(h.platform.storage,Date.now());h.render();},{key:TOWER_CAMPAIGN_KEY,data:seed(xp)});return{context,page};}
 async function click(page,name,prefix=null){const p=await page.evaluate(({name,prefix})=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],scope=prefix?walk(h.root).find(n=>n.name.startsWith(prefix)):h.root,n=walk(scope).find(n=>n.name===name);if(!n)throw Error('missing '+name);const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},{name,prefix});await page.mouse.click(p.x,p.y);await page.waitForTimeout(100);}
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const {context,page}=await open(viewport,10920);
 await page.evaluate(()=>window.__towerTest.host.goto('hall'));
 await click(page,'宗门入口-丹霞峰');
 await page.waitForFunction(()=>window.__towerTest.host.menu.towerImages.get('sect-scene/danxia-courtyard')?.frame);
 await page.screenshot({path:path.join(OUT,`courtyard-${viewport.width}.png`)});
 const before=await page.evaluate(()=>JSON.parse(JSON.stringify(window.__towerTest.host.store.state)));
 await click(page,'丹霞主殿');
 assert.deepEqual(await page.evaluate(()=>window.__towerTest.host.store.state.pills),before.pills);
 await page.waitForTimeout(150);
 await page.screenshot({path:path.join(OUT,`shop-${viewport.width}.png`)});
 await click(page,'丹药图标-huichun');
 assert.equal(await page.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)],nodes=walk(window.__towerTest.host.root);return nodes.some(n=>n.name==='背包详情区')&&!nodes.some(n=>n.name==='购买物品面板'||n.name==='物品操作区');}),true);
 await page.screenshot({path:path.join(OUT,`detail-${viewport.width}.png`)});
 await click(page,'关闭丹药详情');
 for(const id of ['huichun','peiyuan']){
  await click(page,`丹药商品-${id}`);
  for(const count of [1,5]){
   for(let i=1;i<count;i++)await click(page,'+');
   await page.screenshot({path:path.join(OUT,`purchase-${id}-${viewport.width}.png`)});
   await click(page,'购买');
  }
  assert.equal(await page.evaluate(id=>window.__towerTest.host.store.state.pills[id],id),before.pills[id]+6);
  await click(page,'关闭购买物品');
 }
 const bought=await page.evaluate(()=>({pills:window.__towerTest.host.store.state.pills,contribution:window.__towerTest.host.store.state.contribution}));
 await page.screenshot({path:path.join(OUT,`purchased-${viewport.width}.png`)});
 await click(page,'关闭丹药菜单');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.apothecaryOpen),false);
 await click(page,'← 宗门');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'hall');
 await click(page,'宗门入口-丹霞峰');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.apothecaryOpen),false);
 await page.reload();await page.waitForFunction(()=>{if(!window.cc?.director?.getScene())return false;const walk=n=>[n,...n.children.flatMap(walk)],host=walk(cc.director.getScene()).map(n=>n.getComponent('PinePilot')?.survivor).find(Boolean);if(!host?.menu)return false;window.__towerTest={host};return true;});
 assert.deepEqual(await page.evaluate(()=>({pills:window.__towerTest.host.store.state.pills,contribution:window.__towerTest.host.store.state.contribution})),bought);
 report.cases.push({viewport,bought,reload:true});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}}
main();
