'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'docs/xianxia/reports/tower-pause-menu-2026-11-01');

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
 await page.evaluate(()=>{
  window.toolQAInitial=JSON.stringify(localStorage);
  window.qaFind=name=>{const visit=n=>n.name===name?n:n.children.map(visit).find(Boolean);return visit(window.__towerTest.host.root);};
  const h=window.__towerTest.host;h.enterFloor(1);h.update(0);h.run.setPlaytestAssist(true);
  for(let frame=0;frame<80000&&h.run.state.wave<6&&h.run.state.phase==='playing';frame++){
   for(const enemy of h.run.state.enemies){enemy.x=h.run.state.player.x+60;enemy.y=h.run.state.player.y;}
   h.run.advance(1/30);
  }
  if(h.run.state.wave<6)throw Error('Expected real combat loot before pausing');
  h.pause();
 });
 async function click(name){const p=await page.evaluate(name=>{const n=window.qaFind(name);if(!n)throw Error('Missing '+name);const walk=n=>[n,...n.children.flatMap(walk)];const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);const v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);await page.mouse.click(p.x,p.y);await page.waitForTimeout(80);}
 const inspect=()=>page.evaluate(()=>{
  const o=window.__towerTest.host.overlay;
  const walk=n=>[n,...n.children.flatMap(walk)];const nodes=walk(o);
  return {buttons:nodes.filter(n=>n.getComponent('cc.Button')).map(n=>n.name),
   positions:nodes.filter(n=>n.getComponent('cc.Button')).map(n=>({x:n.position.x,y:n.position.y})),
   labels:nodes.map(n=>n.getComponent('cc.Label')?.string).filter(Boolean)};
 });
 for(const training of [false,true]){
  if(training)await page.evaluate(()=>{const h=window.__towerTest.host;h.enterTraining();h.pause();});
  const menu=await inspect();
  assert.deepEqual(menu.buttons,['继续挑战','返回宗门','开发者工具']);
  assert.ok(menu.positions.every(p=>p.x===0),'buttons centered in one column');
  assert.ok(menu.positions[0].y>menu.positions[1].y&&menu.positions[1].y>menu.positions[2].y,'buttons ordered top to bottom');
  assert.deepEqual(menu.labels,[training?'演武暂停':'塔内暂停','继续挑战','返回宗门','开发者工具']);
  await page.screenshot({path:path.join(OUT,`pause-${training?'training':'tower'}-${viewport.width}x${viewport.height}.png`)});
  await click('开发者工具');
  assert.equal(await page.evaluate(()=>window.__towerTest.host.overlay.name),'开发者工具遮罩');
  await click('关闭开发者工具');assert.deepEqual((await inspect()).buttons,menu.buttons);
  await click('继续挑战');assert.equal(await page.evaluate(()=>window.__towerTest.host.run.state.phase),'playing');
  await page.evaluate(()=>window.__towerTest.host.pause());
  await click('返回宗门');assert.equal(await page.evaluate(()=>window.__towerTest.host.screen),'camp');
  if(!training){
   const result=(await inspect()).labels.join('\n');
   assert.match(result,/实际入账/);
   assert.match(result,/药材：/);
   await page.screenshot({path:path.join(OUT,`withdraw-${viewport.width}x${viewport.height}.png`)});
  }
  report.cases.push({viewport,training,buttons:menu.buttons,resume:true,tools:true,withdraw:true});
 }
 const completed=await page.evaluate(()=>{
  const h=window.__towerTest.host;h.enterFloor(1);h.update(0);h.run.setPlaytestAssist(true);
  for(let frame=0;frame<100000&&h.run.state.phase==='playing';frame++){
   for(const enemy of h.run.state.enemies){enemy.x=h.run.state.player.x+60;enemy.y=h.run.state.player.y;}
   h.run.advance(1/30);
  }
  const phase=h.run.state.phase;if(phase==='won')h.finish();return phase;
 });
 assert.equal(completed,'won');
 const settlement=(await inspect()).labels.join('\n');
 assert.match(settlement,/第1层已通关/);assert.match(settlement,/实际入账/);assert.match(settlement,/药材：/);
 await page.screenshot({path:path.join(OUT,`floor-clear-${viewport.width}x${viewport.height}.png`)});
 report.cases.push({viewport,floorClear:true,rewardsVisible:true});
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)===window.toolQAInitial),true);
 await context.close();}
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}}
main();
