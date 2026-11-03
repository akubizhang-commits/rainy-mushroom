const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-spider-web-2026-11-03/game-review');
(async()=>{fs.mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});const report={results:[],errors:[]};
try{for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
 const data=await page.evaluate(()=>{
 const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
 s.arenaVersion=1;s.time=10;s.ticks=600;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=10000;s.effects=[];s.drops=[];s.pending=[];s.reserved=[];s.zones=[];s.projectiles=[];s.killLedger=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:0};
 const e=h.run._enemy({id:'web-elite',archetype:'spider_elite',x:160,y:0});e.hp=e.maxHp=10000;e.mechanic.cooldowns.M10=10;s.enemies=[e];h.camera={x:0,y:0};h.draw();h.run.resume();
 for(let i=0;i<180&&!s.monsterMechanics.zones.some(z=>z.skillId==='M10');i++)h.run.advance(1/60);
 h.run.pause();h.draw();const z=s.monsterMechanics.zones.find(z=>z.skillId==='M10');window.webZone=z?JSON.parse(JSON.stringify(z)):null;return{zone:z,uses:e.mechanic.uses.M10};});
 assert.ok(data.zone);assert.equal(data.uses,1);
 await page.waitForFunction(()=>window.__towerTest.host.monsterMechanics?.webArt?.frame&&!window.__towerTest.host.host.assetLoading?.blocked);
 for(const [stage,offset]of [['flight',-.18],['expanded',0],['fade',.1]]){
 const record=await page.evaluate(({offset})=>{const h=window.__towerTest.host,s=h.run.state,z=window.webZone;s.time=z.activatesAt+offset;for(const zone of s.monsterMechanics.zones)zone.phase=offset>=0?'active':'windup';h.draw();const art=h.monsterMechanics.webArt,w=[...art.webs.values()][0];return{time:s.time,size:w.transform.width,position:{x:w.node.position.x,y:w.node.position.y},alpha:w.sprite.color.a,texture:[w.sprite.spriteFrame.texture.width,w.sprite.spriteFrame.texture.height],frame:[w.sprite.spriteFrame.rect.width,w.sprite.spriteFrame.rect.height],radius:z.radius,labels:h.monsterMechanics.labels.filter(l=>l.node.active).map(l=>l.string)};},{offset});
 assert.deepEqual(record.frame,[512,512]);assert.ok(record.texture[0]>=512);assert.ok(record.alpha>0);if(stage==='expanded')assert.ok(Math.abs(record.size*1254/1536-data.zone.radius*2)<.01);
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
 await page.screenshot({path:path.join(OUT,`${stage}-${viewport.width}.png`)});report.results.push({viewport,stage,...record});}
 const clean=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;s.enemies[0].hp=0;h.draw();return h.monsterMechanics.webArt.webs.size;});assert.equal(clean,0);
 const expired=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;s.enemies[0].hp=10000;s.time=window.webZone.expiresAt;h.draw();return h.monsterMechanics.webArt.webs.size;});assert.equal(expired,0);await page.close();
 }assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}console.log('PASS: real M10, flight/expansion/fade, pause, owner death, expiry, two landscape sizes');
})().catch(e=>{console.error(e);process.exitCode=1});
