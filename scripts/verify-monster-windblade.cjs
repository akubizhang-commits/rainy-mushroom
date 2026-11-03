const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-monster-windblade-2026-11-03/game-review');
(async()=>{fs.mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});const report={results:[],errors:[]};
try{for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
 const data=await page.evaluate(()=>{
 const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
 s.floor=6;s.arenaVersion=1;s.time=10;s.ticks=600;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=10000;s.effects=[];s.drops=[];s.pending=[];s.reserved=[];s.zones=[];s.projectiles=[];s.killLedger=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:0};
 const e=h.run._enemy({id:'web-elite',archetype:'bear_boss',x:160,y:0});e.maxHp=10000;e.hp=4000;for(const id of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[id]=999;e.mechanic.skills=['M17'];e.mechanic.uses={M17:0};e.mechanic.cooldowns={M17:10};s.enemies=[e];h.camera={x:0,y:0};h.draw();h.run.resume();
 for(let i=0;i<180&&!s.monsterMechanics.zones.some(z=>z.skillId==='M17');i++)h.run.advance(1/60);
 h.run.pause();h.draw();const z=s.monsterMechanics.zones.find(z=>z.skillId==='M17');window.webZone=z?JSON.parse(JSON.stringify(z)):null;return{zone:z,uses:e.mechanic.uses.M17};});
 assert.ok(data.zone);assert.equal(data.uses,1);
 await page.waitForFunction(()=>window.__towerTest.host.monsterMechanics?.windbladeArt?.frame&&!window.__towerTest.host.host.assetLoading?.blocked);
 for(const [stage,offset]of [['start',.04],['middle',.1],['end',.17]]){
 const record=await page.evaluate(({offset})=>{const h=window.__towerTest.host,s=h.run.state,z=window.webZone;h.run.resume();while(s.time<z.activatesAt+offset)h.run.advance(1/60);h.run.pause();h.draw();return [...h.monsterMechanics.windbladeArt.plumes.entries()].map(([id,a])=>{const q=s.monsterMechanics.zones.find(z=>z.id===id);return{frame:[a.sprite.spriteFrame.rect.width,a.sprite.spriteFrame.rect.height],width:a.transform.width,height:a.transform.height,angle:a.node.angle,expectedAngle:Math.atan2(q.toY-q.y,q.toX-q.x)*180/Math.PI,x:a.node.position.x,y:a.node.position.y,expectedX:q.x-h.camera.x,expectedY:q.y-h.camera.y,alpha:a.sprite.color.a};});},{offset});
 assert.equal(record.length,2);for(const a of record){assert.deepEqual(a.frame,[1024,128]);assert.ok(Math.abs(a.width-260)<.001);assert.equal(a.height,64);assert.equal(a.x,a.expectedX);assert.equal(a.y,a.expectedY);assert.ok(Math.abs(a.angle-a.expectedAngle)<.001);assert.ok(a.alpha>0);}
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
 await page.screenshot({path:path.join(OUT,`${stage}-${viewport.width}.png`)});report.results.push({viewport,stage,blades:record});}
 const clean=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;s.enemies[0].hp=0;h.draw();return h.monsterMechanics.windbladeArt.plumes.size;});assert.equal(clean,0);
 const expired=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;s.enemies[0].hp=10000;s.time=window.webZone.expiresAt;h.draw();return h.monsterMechanics.windbladeArt.plumes.size;});assert.equal(expired,0);await page.close();
 }assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}console.log('PASS: fixture-only M17, two bounded windblades, pause, owner death, expiry, two landscape sizes');
})().catch(e=>{console.error(e);process.exitCode=1});
