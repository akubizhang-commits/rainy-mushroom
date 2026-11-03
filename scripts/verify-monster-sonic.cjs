const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-monster-sonic-2026-11-03/game-review');
(async()=>{fs.mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});const report={results:[],errors:[]};
try{for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
 await page.evaluate(()=>window.__towerTest.host.enterTraining());
 for(const side of [-1,1]){
 const shot=await page.evaluate(side=>{
 const h=window.__towerTest.host;h.run.pause();const s=h.run.state;h.projectileArt.clearBindings();h.monsterArt.clearBindings();
 s.arenaVersion=1;s.time=10;s.ticks=600;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=10000;s.effects=[];s.drops=[];s.pending=[];s.reserved=[];s.zones=[];s.projectiles=[];s.killLedger=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:0};
 const e=h.run._enemy({id:'sonic-bat',archetype:'bat_normal',x:side*220,y:0});e.hp=e.maxHp=10000;s.enemies=[e];h.camera={x:0,y:0};h.draw();h.run.resume();
 for(let i=0;i<600&&!s.projectiles.some(p=>p.hostile&&p.element==='sonic');i++)h.run.advance(1/60);
 h.run.pause();h.draw();const p=s.projectiles.find(p=>p.hostile&&p.element==='sonic');return p?{id:p.id,vx:p.vx,vy:p.vy}:null;},side);
 assert.ok(shot,'authored bat must shoot a sonic');
 await page.waitForFunction(()=>!!window.__towerTest.host.projectileArt.sonicArt.frame&&!window.__towerTest.host.host.assetLoading?.blocked);
 const record=await page.evaluate(id=>{const h=window.__towerTest.host;h.run.resume();h.run.advance(.22);h.run.pause();h.draw();const a=h.projectileArt.actors.get(`sonic-${id}`);return{angle:a.node.angle,size:[a.size.width,a.size.height],rect:[a.body.spriteFrame.rect.width,a.body.spriteFrame.rect.height],texture:[a.body.spriteFrame.texture.width,a.body.spriteFrame.texture.height],position:{x:a.node.position.x,y:a.node.position.y}};},shot.id);
 assert.deepEqual(record.rect,[512,512]);assert.deepEqual(record.size,[52,52]);assert.ok(Math.abs(record.angle-Math.atan2(shot.vy,shot.vx)*180/Math.PI)<.01);
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
 await page.screenshot({path:path.join(OUT,`sonic-${side}-${viewport.width}.png`)});
 const removed=await page.evaluate(id=>{const h=window.__towerTest.host;h.run.resume();h.run.advance(3);h.run.pause();h.draw();return!h.projectileArt.actors.has(`sonic-${id}`);},shot.id);assert.ok(removed);
 report.results.push({viewport,side,shot,record,paused:true,removed});
 }await page.close();
 }assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}console.log('PASS: real bat projectiles, both directions, pause and removal, two landscape sizes');
})().catch(e=>{console.error(e);process.exitCode=1});
