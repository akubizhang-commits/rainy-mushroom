'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'docs/xianxia/reports/tower-playtest-tools-2026-10-28');

async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const report={status:'RUNNING',cases:[],errors:[]};let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&playtest=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu);
 await page.evaluate(()=>{window.toolQAInitial=JSON.stringify(localStorage);window.qaFind=name=>{const visit=n=>n.name===name?n:n.children.map(visit).find(Boolean);return visit(window.__towerTest.host.root);};window.__towerTest.host.showTools();});
 async function click(name){const p=await page.evaluate(name=>{const n=window.qaFind(name);if(!n)throw Error('Missing '+name);const walk=n=>[n,...n.children.flatMap(walk)];const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);const v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);await page.mouse.click(p.x,p.y);await page.waitForTimeout(80);}
 await click('剩余技能点设为999');
 assert.equal(await page.evaluate(()=>window.__towerTest.state().playtestSkillPoints),999);
 await page.screenshot({path:path.join(OUT,`tools-${viewport.width}x${viewport.height}.png`)});
 await click('返回宗门');await page.evaluate(()=>window.__towerTest.host.goto('library'));
 await click('learnSkill-sj_yujian');
 assert.equal(await page.evaluate(()=>window.__towerTest.state().skills.sj_yujian),2);
 await page.evaluate(()=>window.__towerTest.host.showTools());
 await click('剩余技能点设为999');
 const bonus=await page.evaluate(()=>window.__towerTest.state().playtestSkillPoints);assert.ok(bonus>999,'spent point included so remaining is999');
 await click('重新开始');await click('取消');assert.equal(await page.evaluate(()=>window.__towerTest.state().skills.sj_yujian),2);
 await click('重新开始');await click('确认重新开始');
 const state=await page.evaluate(()=>window.__towerTest.state());assert.equal(state.xp,0);assert.deepEqual(state.skills,{sj_yujian:1});assert.equal(state.activeRun,null);assert.equal(state.playtestSkillPoints,undefined);
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)===window.toolQAInitial),true);
 report.cases.push({viewport,grant999:true,realUpgrade:true,repeatedGrantRemaining999:true,cancelPreserves:true,resetInitial:true,persistentStorageUntouched:true});await context.close();}
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}}
main();
