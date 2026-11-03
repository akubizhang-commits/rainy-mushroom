'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'docs/xianxia/reports/tower-portrait-hud-2026-10-28');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const report={status:'RUNNING',layouts:[],errors:[]};let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 const url=`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`;
 for(const viewport of [{width:1280,height:720},{width:844,height:390},{width:1024,height:768}]){
 const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.__towerTest?.host?.menu);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1);h.run.pause();window.qaFind=name=>{const visit=n=>n.name===name?n:n.children.map(visit).find(Boolean);return visit(h.root);};});
 // Real pointer pause/resume and skills entry against the normal run before any fixture mutations.
 async function clickNode(name){const point=await page.evaluate(name=>{const n=window.qaFind(name);const walk=n=>[n,...n.children.flatMap(walk)];const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);const v=camera.worldToScreen(n.worldPosition);const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);await page.mouse.click(point.x,point.y);}
 await clickNode('HUD.Pause');await page.waitForFunction(()=>!!window.__towerTest.host.overlay);
 await clickNode('继续挑战');await page.waitForFunction(()=>window.__towerTest.host.run.state.phase==='playing');
 await clickNode('HUD.Skills');await page.waitForFunction(()=>window.__towerTest.host.screen==='skills');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.run.state.phase),'paused');
 await page.evaluate(()=>{const h=window.__towerTest.host;h.resume();h.run.pause();const s=h.run.state,p=s.player;p.hp=p.maxHp*.2;s.wave=7;
 s.enemies=[{id:'hud-normal',family:'boar',name:'铁鬃妖猪',rank:1,role:'normal',radius:18,hp:100,maxHp:100,x:p.x-210,y:p.y+60},{id:'hud-elite',family:'wolf',name:'青风妖狼',rank:2,role:'elite',radius:24,hp:70,maxHp:100,x:p.x+210,y:p.y+90},{id:'hud-boss',family:'bear',name:'岩背妖熊王',rank:3,role:'boss',radius:34,hp:280,maxHp:400,x:p.x+260,y:p.y-90}];s.zones=[];s.effects=[];s.drops=[];s.reserved=[];s.projectiles=[];window.qaSnapshot=JSON.stringify(s);h.draw();});
 await page.waitForFunction(()=>window.__towerTest.host.monsterArt.actors.size>=3);
 const data=await page.evaluate(()=>{const h=window.__towerTest.host;h.draw();const names=['HUD.PlayerVitals','HUD.FloorWave','HUD.Boss','HUD.Minimap','HUD.Skills','HUD.Pause'];const rects=names.map(name=>{const n=window.qaFind(name),t=n.getComponent("cc.UITransform");return{name,x:n.position.x,y:n.position.y,w:t.width,h:t.height,active:n.active};});return{rects,W:h.width,H:h.height,hp:h.hpLabel.string,wave:h.title.string,boss:h.bossLabel.string,notice:h.noticePanel.active,labels:h.labels.filter(l=>l.node.active).map(l=>l.string),unchanged:window.qaSnapshot===JSON.stringify(h.run.state),landscape:h.landscape};});
 assert.ok(data.landscape&&data.unchanged);assert.match(data.hp,/^\d+\/\d+$/);assert.match(data.wave,/7\/20/);assert.match(data.boss,/岩背妖熊王/);assert.equal(data.notice,false);assert.ok(data.labels.every(l=>!l.includes('铁鬃妖猪')));
 for(const r of data.rects){assert.ok(r.x-r.w/2>=-data.W/2&&r.x+r.w/2<=data.W/2,`${r.name} x`);assert.ok(r.y-r.h/2>=-data.H/2&&r.y+r.h/2<=data.H/2,`${r.name} y`);}
 for(let i=0;i<data.rects.length;i++)for(let j=i+1;j<data.rects.length;j++){const a=data.rects[i],b=data.rects[j];assert.ok(Math.abs(a.x-b.x)>=(a.w+b.w)/2||Math.abs(a.y-b.y)>=(a.h+b.h)/2,`${a.name}/${b.name} overlap`);}
 await page.screenshot({path:path.join(OUT,`hud-${viewport.width}x${viewport.height}.png`)});report.layouts.push({viewport,...data});await context.close();}
 // Rotation test uses an unmodified real campaign/run and a fresh isolated memory profile.
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.__towerTest?.host?.orientationBlocked);
 assert.equal(await page.evaluate(()=>window.__towerTest.host.rotationOverlay.active),true);await page.screenshot({path:path.join(OUT,'rotate-390x844.png')});
 await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>!window.__towerTest.host.orientationBlocked&&!!window.__towerTest.host.menu);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1);});await page.waitForTimeout(150);
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>window.__towerTest.host.orientationBlocked&&window.__towerTest.host.run.state.phase==='paused');
 const frozen=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.snapshot()));await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.snapshot())),frozen);
 assert.equal(await page.evaluate(()=>window.__towerTest.state().activeRun.snapshot.phase),'paused');await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>!window.__towerTest.host.orientationBlocked);assert.equal(await page.evaluate(()=>window.__towerTest.host.run.state.phase),'paused');
 report.rotation={portraitBootBlocked:true,pausedAndSaved:true,frozen:true,manualResumeRequired:true};await ctx.close();assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||`${report.layouts.length} layouts and rotation`);}}
main();
