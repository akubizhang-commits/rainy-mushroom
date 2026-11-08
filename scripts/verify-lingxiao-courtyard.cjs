'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{createServer}=require('node:http');
const{chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/lingxiao-courtyard');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={status:'RUNNING',cases:[],errors:[]};
 try{browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 async function open(viewport){const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1&playtest=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu);return{context,page};}
 async function click(page,name){const p=await page.evaluate(name=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],n=walk(h.root).find(n=>n.name===name);if(!n)throw Error('missing '+name);const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);await page.mouse.click(p.x,p.y);await page.waitForTimeout(100);}
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const {context,page}=await open(viewport);
 await click(page,'宗门入口-凌霄剑峰');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'swordPeak');
 await page.waitForFunction(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return !!walk(window.__towerTest.host.root).find(n=>n.name==='sect-scene/lingxiao-courtyard')?.getComponent('cc.Sprite')?.spriteFrame;});
 await page.screenshot({path:path.join(OUT,`courtyard-${viewport.width}.png`)});
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.store.state));
 await click(page,'剑峰传承剑碑');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'library');
 await page.screenshot({path:path.join(OUT,`skills-${viewport.width}.png`)});
 await click(page,'← 凌霄剑峰');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'swordPeak');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.store.state)),before);
 await click(page,'← 宗门');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'hall');
 await click(page,'宗门入口-霁云主峰');
 await click(page,'主峰建筑-藏经阁');
 await page.evaluate(()=>window.__towerTest.host.menu.go('librarySkills'));
 await click(page,'← 藏经阁');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.libraryArea),'room');
 const boosted={};const loaded={};
 report.cases.push({viewport,boosted,loaded});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}}
main();
