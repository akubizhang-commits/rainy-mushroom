'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{createServer}=require('node:http');
const{chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'docs/xianxia/reports/inventory-overlay');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={status:'RUNNING',cases:[],errors:[]};
 try{browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 async function open(viewport){const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1&playtest=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu);return{context,page};}
 async function click(page,name){const p=await page.evaluate(name=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],n=walk(h.root).find(n=>n.name===name);if(!n)throw Error('missing '+name);const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);await page.mouse.click(p.x,p.y);await page.waitForTimeout(100);}
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const {context,page}=await open(viewport);
 for(const source of ['hall','forge','pills','library','tower']){
 await page.evaluate(source=>{const h=window.__towerTest.host;h.goto(source);h.__background=h.menu.root.children.slice();h.goto('inventory');},source);
 const result=await page.evaluate(()=>{const h=window.__towerTest.host,m=h.menu,walk=n=>[n,...n.children.flatMap(walk)],shade=m.root.children.find(n=>n.name==='背包遮罩'),box=walk(shade).find(n=>n.name==='背包弹窗'),size=box.getComponent('cc.UITransform').contentSize;return{page:m.currentPage,retained:h.__background.every(n=>n.isValid&&n.parent===m.root),currency:walk(shade).some(n=>n.name==='货币信息'),width:size.width,height:size.height,w:m.designWidth,h:m.designHeight};});
 assert.equal(result.page,source);assert.equal(result.retained,true);assert.equal(result.currency,false);assert.ok(result.width<result.w&&result.height<result.h);
 await page.screenshot({path:path.join(OUT,`${source}-${viewport.width}.png`)});
 await click(page,'关闭背包');assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.inventoryOpen),false);
 }
 await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1);});
 await page.waitForTimeout(150);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.__battle=h.battle;h.openInventory();});
 assert.equal(await page.evaluate(()=>{const h=window.__towerTest.host;return h.battle===h.__battle&&h.battle.isValid&&h.run.state.phase==='paused'&&h.menu.inventoryOpen;}),true);
 await page.screenshot({path:path.join(OUT,`battle-inventory-${viewport.width}.png`)});
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.run.state.phase),'playing');
 // Live display precedes a checkpoint and does not double count a committed receipt.
 const wallet=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.pause();const base=h.store.state.activeRun.base,earned=h.run.state.earned;earned.cores+=23;earned.contribution+=7;h.draw();const first=h.currencyLabels.map(l=>l.string);h.store._state={...h.store.state,spiritStones:base.spiritStones+earned.cores*10,contribution:base.contribution+earned.contribution};h.draw();return{first,second:h.currencyLabels.map(l=>l.string),stones:base.spiritStones+earned.cores*10,contribution:base.contribution+earned.contribution};});
 let remaining=wallet.stones;const values=[1000000,10000,100,1].map(unit=>{const n=Math.floor(remaining/unit);remaining%=unit;return `×${n}`;});values.push(`×${wallet.contribution}`);assert.deepEqual(wallet.first,values);assert.deepEqual(wallet.second,values);
 await page.screenshot({path:path.join(OUT,`battle-currency-${viewport.width}.png`)});
 const capped=await page.evaluate(()=>{const h=window.__towerTest.host;h.store._state=JSON.parse(JSON.stringify(h.store.state));const b=h.store.state.activeRun.base;b.spiritStones=19999999990;b.contribution=1999999999;h.run.state.earned.cores=23;h.run.state.earned.contribution=7;h.draw();return h.currencyLabels.map(l=>l.string);});
 assert.deepEqual(capped,['×20000','×0','×0','×0','×2000000000']);
 await page.screenshot({path:path.join(OUT,`currency-cap-${viewport.width}.png`)});
 const loaded={};
 report.cases.push({viewport,wallet,loaded});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}}
main();
