'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{createServer}=require('node:http');const{pathToFileURL}=require('node:url');
const{chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/forge-draw-menu');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const{TowerCampaignStore,TOWER_CAMPAIGN_KEY}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/TowerCampaign.js')));
 const{checksum}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/Checksum.js')));
 function seed(xp){const map=new Map(),store=new TowerCampaignStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},Date.now());store.act({type:'sync'},Date.now());const env=JSON.parse(map.get(TOWER_CAMPAIGN_KEY)),state=JSON.parse(env.data);state.xp=xp;state.spiritStones=10000;state.contribution=10000;env.data=JSON.stringify(state);env.checksum=checksum(env.data);return JSON.stringify(env);}
 const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={status:'RUNNING',cases:[],errors:[]};
 try{browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 async function open(viewport,xp){const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu);await page.evaluate(({key,data})=>{const h=window.__towerTest.host;h.platform.storage.setItem(key,data);h.store=new h.store.constructor(h.platform.storage,Date.now());h.render();},{key:TOWER_CAMPAIGN_KEY,data:seed(xp)});return{context,page};}
 async function click(page,name){const p=await page.evaluate(name=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],n=walk(h.root).find(n=>n.name===name);if(!n)throw Error('missing '+name);const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);await page.mouse.click(p.x,p.y);await page.waitForTimeout(100);}
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const {context,page}=await open(viewport,10920);
 await page.evaluate(()=>window.__towerTest.host.goto('hall'));
 await click(page,'宗门入口-炼器峰');
 await page.waitForFunction(()=>window.__towerTest.host.menu.towerImages.get('sect-scene/forge-courtyard')?.frame);
 await page.screenshot({path:path.join(OUT,`forge-${viewport.width}.png`)});
 const initial=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.store.state));
 await click(page,'炼器炉');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.store.state)),initial);
 await page.screenshot({path:path.join(OUT,`choice-${viewport.width}.png`)});
 const made=[];
 for(const category of ['武器','防具']){
  await click(page,'黄阶'+category+'抽取十次');
  const result=await page.evaluate(()=>{const h=window.__towerTest.host;return{mode:h.menu.forgeDialog,category:h.menu.forgeResult?.category,item:h.menu.forgeResult?.item}});
  assert.equal(result.mode,'result');assert.ok(result.item);made.push(result.category);
  await page.screenshot({path:path.join(OUT,`result-${category}-${viewport.width}.png`)});
  await click(page,'返回炼器峰-左');if(category!=='防具')await click(page,'炼器炉');
 }
 assert.equal(made[0],'weapon');assert.ok(['armor','ring'].includes(made[1]));
 await click(page,'← 宗门');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'hall');
 await click(page,'宗门入口-炼器峰');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.forgeDialog),'closed');
 report.cases.push({viewport,made});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}}
main();
