const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-monster-poison-ground-2026-11-04/game-review');
(async()=>{fs.mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});const report={results:[],errors:[]};
try{for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error(m.text())});page.on('requestfailed',r=>console.error(r.url(),r.failure()));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
 const data=await page.evaluate(()=>{
 const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
 s.floor=4;s.arenaVersion=1;s.time=10;s.ticks=600;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=10000;s.effects=[];s.drops=[];s.pending=[];s.reserved=[];s.zones=[];s.projectiles=[];s.killLedger=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:0};
 const e=h.run._enemy({id:'web-elite',archetype:'crocodile_boss',x:160,y:0});e.maxHp=10000;e.hp=4000;for(const id of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[id]=999;e.mechanic.cooldowns.M12=10;s.enemies=[e];h.camera={x:0,y:0};h.draw();h.run.resume();
 for(let i=0;i<180&&!s.monsterMechanics.zones.some(z=>z.skillId==='M12'&&z.damage>0);i++)h.run.advance(1/60);
 h.run.pause();h.draw();const z=s.monsterMechanics.zones.find(z=>z.skillId==='M12'&&z.damage>0);window.webZone=z?JSON.parse(JSON.stringify(z)):null;return{zone:z,uses:e.mechanic.uses.M12};});
 assert.ok(data.zone);assert.equal(data.uses,1);
 await page.waitForFunction(()=>window.__towerTest.host.monsterMechanics?.miasmaArt?.frame&&!window.__towerTest.host.host.assetLoading?.blocked);
 const records=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,seen=new Map();h.run.resume();
 for(let i=0;i<360;i++){const poison=s.monsterMechanics.zones.filter(z=>z.skillId==='M12'&&z.damage>0);for(const z of poison)if(!seen.has(z.id)){seen.set(z.id,{id:z.id,x:z.x,y:z.y,activatesAt:z.activatesAt,expiresAt:z.expiresAt,startedAt:z.startedAt});s.player.y=seen.size%2?90:-90;s.player.x=-80*seen.size;}if(seen.size===3&&s.time>[...seen.values()][2].activatesAt+.1)break;h.run.advance(1/60);}
 h.run.pause();h.draw();window.poisonSnapshot=JSON.parse(JSON.stringify(s));window.poisonZones=[...seen.values()];return{zones:window.poisonZones,art:[...h.monsterMechanics.miasmaArt.patches.values()].map(a=>({frame:[a.sprite.spriteFrame.rect.width,a.sprite.spriteFrame.rect.height],size:a.transform.width,belowActors:a.node.parent.getSiblingIndex()<h.monsterLayer.getSiblingIndex()}))};});
 assert.equal(records.zones.length,3);assert.equal(records.art.length,3);for(const z of records.zones){assert.ok(Math.abs(z.activatesAt-z.startedAt-1)<.001);assert.ok(Math.abs(z.expiresAt-z.activatesAt-5)<.001);}for(const a of records.art){assert.deepEqual(a.frame,[512,512]);assert.ok(Math.abs(a.size*480/512-96)<.01);assert.ok(a.belowActors);}
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
 await page.screenshot({path:path.join(OUT,`three-patches-${viewport.width}.png`)});
 const expiry=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;h.run.resume();while(s.time<window.poisonZones[0].expiresAt+.02)h.run.advance(1/60);h.run.pause();h.draw();return h.monsterMechanics.miasmaArt.patches.size;});assert.equal(expiry,2);
 report.results.push({viewport,records,paused:true,firstExpiredRemaining:expiry});
 const clean=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;s.enemies[0].hp=0;h.draw();return h.monsterMechanics.miasmaArt.patches.size;});assert.equal(clean,0);
 const expired=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;s.enemies[0].hp=10000;s.time=Math.max(...window.poisonZones.map(z=>z.expiresAt));h.draw();return h.monsterMechanics.miasmaArt.patches.size;});assert.equal(expired,0);await page.close();
 }assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}console.log('PASS: real M12, three real ground pulses, first expiry, pause, owner death, expiry, two landscape sizes');
})().catch(e=>{console.error(e);process.exitCode=1});
