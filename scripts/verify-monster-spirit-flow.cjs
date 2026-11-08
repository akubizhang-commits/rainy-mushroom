const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(ROOT,process.env.FLOW_REVIEW_OUT||'design/xianxia-monster-spirit-flow-2026-11-04/game-review'),SERVER_ROOT=process.env.FLOW_SERVER_ROOT||ROOT;
(async()=>{fs.mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{const file=path.resolve(SERVER_ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(SERVER_ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});const report={results:[],errors:[]};
try{for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
 const data=await page.evaluate(()=>{
 const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
 s.floor=5;s.arenaVersion=1;s.time=10;s.ticks=600;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=10000;s.effects=[];s.drops=[];s.pending=[];s.reserved=[];s.zones=[];s.projectiles=[];s.killLedger=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:0};
 s.loadout.active={};s.loadout.passive={};
 const e=h.run._enemy({id:'core-owner',archetype:'snake_boss',x:200,y:0});e.maxHp=10000;e.hp=4000;for(const id of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[id]=999;e.mechanic.cooldowns.M03=10;s.enemies=[e];h.camera={x:0,y:0};h.run.resume();
 for(let i=0;i<300&&!s.enemies.some(e=>e.temporary?.kind==='core');i++)h.run.advance(1/60);
 h.run.pause();h.draw();return{cores:s.enemies.filter(e=>e.temporary?.kind==='core').map(e=>({id:e.id,x:e.x,y:e.y,expires:e.temporary.expiresAt})),uses:e.mechanic.uses.M03};});
 assert.equal(data.cores.length,1);assert.equal(data.uses,1);
 await page.waitForFunction(()=>window.__towerTest.host.monsterMechanics?.coreArt?.frame&&window.__towerTest.host.monsterMechanics?.spiritFlowArt?.frame&&!window.__towerTest.host.host.assetLoading?.blocked);
 const record=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.resume();h.run.advance(.35);h.run.pause();h.draw();return [...h.monsterMechanics.coreArt.cores.values()].map(a=>({frame:[a.sprite.spriteFrame.rect.width,a.sprite.spriteFrame.rect.height],size:a.transform.height,x:a.node.position.x,foot:a.node.position.y-a.transform.height*224/512+h.camera.y,depth:a.node.towerGroundY,parent:a.node.parent===h.monsterLayer}));});
 assert.equal(record.length,1);for(let i=0;i<1;i++){assert.deepEqual(record[i].frame,[512,512]);assert.ok(record[i].parent);assert.ok(Math.abs(record[i].foot-data.cores[i].y)<.01);}
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
 await page.screenshot({path:path.join(OUT,`cores-${viewport.width}.png`)});
 const healing=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,b=s.enemies.find(e=>e.id==='core-owner'),c=s.enemies.find(e=>e.temporary?.kind==='core');c.hp=c.maxHp=1000000;const before=b.mechanic.healed;h.run.resume();h.run.advance(.5);h.run.pause();h.draw();window.coreSnapshot=JSON.parse(JSON.stringify(s));return{flow:h.monsterMechanics.spiritFlowArt.plumes.size,before,after:b.mechanic.healed};});assert.ok(healing.after>healing.before);assert.equal(healing.flow,1);
 const outcome=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,c=s.enemies.find(e=>e.temporary?.kind==='core'),b=s.enemies.find(e=>e.id==='core-owner');h.run._damageEnemy({target:c.id,damage:999999999,scaled:true,source:'sj_yujian'});h.run.resume();h.run.advance(1/60);h.run.pause();h.draw();const healed=b.mechanic.healed;h.run.resume();h.run.advance(.5);h.run.pause();h.draw();return{flow:h.monsterMechanics.spiritFlowArt.plumes.size,remaining:h.monsterMechanics.coreArt.cores.size,vulnerable:b.mechanic.vulnerableUntil>s.time,armor:b.mechanic.armor,skill:b.mechanic.skillId,healed,after:b.mechanic.healed};});
 assert.equal(outcome.remaining,0);assert.equal(outcome.flow,0);assert.ok(outcome.vulnerable);assert.equal(outcome.armor,0);assert.equal(outcome.skill,'M23');assert.equal(outcome.healed,outcome.after);
 await page.screenshot({path:path.join(OUT,`broken-${viewport.width}.png`)});
 const cleanup=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state=JSON.parse(JSON.stringify(window.coreSnapshot));let s=h.run.state;s.enemies.find(e=>e.id==='core-owner').hp=0;h.draw();const death=h.monsterMechanics.coreArt.cores.size;
 h.run.state=JSON.parse(JSON.stringify(window.coreSnapshot));s=h.run.state;s.time=s.enemies.find(e=>e.temporary?.kind==='core').temporary.expiresAt;h.draw();const expiry=h.monsterMechanics.coreArt.cores.size;return{death,expiry};});assert.equal(cleanup.death,0);assert.equal(cleanup.expiry,0);
 report.results.push({viewport,record,paused:true,healing,outcome,cleanup});await page.close();
 }assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}console.log('PASS: real M03 core, foot anchoring, pause, actual core break and healing interruption, owner death and expiry, two landscape sizes');
})().catch(e=>{console.error(e);process.exitCode=1});
