const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-monster-pillar-2026-11-03/game-review');
(async()=>{fs.mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});const report={results:[],errors:[]};
try{for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
 const data=await page.evaluate(()=>{
 const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
 s.floor=7;s.arenaVersion=1;s.time=10;s.ticks=600;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=10000;s.effects=[];s.drops=[];s.pending=[];s.reserved=[];s.zones=[];s.projectiles=[];s.killLedger=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:0};
 s.loadout.active={};s.loadout.passive={};
 const e=h.run._enemy({id:'pillar-owner',archetype:'rhino_boss',x:200,y:0});e.maxHp=10000;e.hp=4000;for(const id of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[id]=999;e.mechanic.cooldowns.M20=10;s.enemies=[e];h.camera={x:0,y:0};h.run.resume();
 for(let i=0;i<300&&!s.enemies.some(e=>e.temporary?.kind==='pillar');i++)h.run.advance(1/60);
 h.run.pause();h.draw();return{pillars:s.enemies.filter(e=>e.temporary?.kind==='pillar').map(e=>({id:e.id,x:e.x,y:e.y,expires:e.temporary.expiresAt})),uses:e.mechanic.uses.M20};});
 assert.equal(data.pillars.length,1);assert.equal(data.uses,1);
 await page.waitForFunction(()=>window.__towerTest.host.monsterMechanics?.pillarArt?.frame&&!window.__towerTest.host.host.assetLoading?.blocked);
 const record=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.resume();h.run.advance(.35);h.run.pause();h.draw();return [...h.monsterMechanics.pillarArt.pillars.values()].map(a=>({frame:[a.sprite.spriteFrame.rect.width,a.sprite.spriteFrame.rect.height],size:a.transform.height,x:a.node.position.x,foot:a.node.position.y-a.transform.height*240/512+h.camera.y,depth:a.node.towerGroundY,parent:a.node.parent===h.monsterLayer}));});
 assert.equal(record.length,1);for(let i=0;i<1;i++){assert.deepEqual(record[i].frame,[512,512]);assert.ok(record[i].parent);assert.ok(Math.abs(record[i].foot-data.pillars[i].y)<.01);}
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
 await page.screenshot({path:path.join(OUT,`pillars-${viewport.width}.png`)});
 const outcome=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,p=s.enemies.find(e=>e.temporary?.kind==='pillar'),boss=s.enemies.find(e=>e.id==='pillar-owner');
 // Position the player along the real boss-to-pillar line during the setup window.
 const dx=p.x-boss.x,dy=p.y-boss.y,d=Math.hypot(dx,dy);s.player.x=p.x+dx/d*65;s.player.y=p.y+dy/d*65;
 window.pillarSnapshot=JSON.parse(JSON.stringify(s));
 h.run.resume();for(let i=0;i<360&&s.enemies.some(e=>e.temporary?.kind==='pillar');i++)h.run.advance(1/60);h.run.pause();h.draw();return{remaining:h.monsterMechanics.pillarArt.pillars.size,vulnerable:boss.mechanic.vulnerableUntil>s.time,armor:boss.mechanic.armor,skill:boss.mechanic.skillId};});
 assert.equal(outcome.remaining,0);assert.ok(outcome.vulnerable);assert.equal(outcome.armor,0);
 await page.screenshot({path:path.join(OUT,`collision-${viewport.width}.png`)});
 const cleanup=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state=JSON.parse(JSON.stringify(window.pillarSnapshot));let s=h.run.state;s.enemies.find(e=>e.id==='pillar-owner').hp=0;h.draw();const death=h.monsterMechanics.pillarArt.pillars.size;
 h.run.state=JSON.parse(JSON.stringify(window.pillarSnapshot));s=h.run.state;s.time=s.enemies.find(e=>e.temporary?.kind==='pillar').temporary.expiresAt;h.draw();const expiry=h.monsterMechanics.pillarArt.pillars.size;return{death,expiry};});assert.equal(cleanup.death,0);assert.equal(cleanup.expiry,0);
 report.results.push({viewport,record,paused:true,outcome,cleanup});await page.close();
 }assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}console.log('PASS: real M20 pillar, foot anchoring, pause, actual charge collision, owner death and expiry, two landscape sizes');
})().catch(e=>{console.error(e);process.exitCode=1});
