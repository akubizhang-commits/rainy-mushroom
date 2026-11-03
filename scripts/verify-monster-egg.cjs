const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-monster-egg-2026-11-03/game-review');
(async()=>{fs.mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});const report={results:[],errors:[]};
try{for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
 const data=await page.evaluate(()=>{
 const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
 s.floor=3;s.arenaVersion=1;s.time=10;s.ticks=600;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=10000;s.effects=[];s.drops=[];s.pending=[];s.reserved=[];s.zones=[];s.projectiles=[];s.killLedger=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:0};
 s.loadout.active={};s.loadout.passive={};
 const e=h.run._enemy({id:'egg-owner',archetype:'spider_boss',x:200,y:0});e.maxHp=10000;e.hp=4000;for(const id of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[id]=999;e.mechanic.cooldowns.M22=10;s.enemies=[e];h.camera={x:0,y:0};h.run.resume();
 for(let i=0;i<300&&!s.enemies.some(e=>e.temporary?.kind==='egg');i++)h.run.advance(1/60);
 h.run.pause();h.draw();return{eggs:s.enemies.filter(e=>e.temporary?.kind==='egg').map(e=>({id:e.id,x:e.x,y:e.y,expires:e.temporary.expiresAt})),uses:e.mechanic.uses.M22};});
 assert.equal(data.eggs.length,2);assert.equal(data.uses,1);
 await page.waitForFunction(()=>window.__towerTest.host.monsterMechanics?.eggArt?.frame&&!window.__towerTest.host.host.assetLoading?.blocked);
 const record=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.resume();h.run.advance(.35);h.run.pause();h.draw();return [...h.monsterMechanics.eggArt.eggs.values()].map(a=>({frame:[a.sprite.spriteFrame.rect.width,a.sprite.spriteFrame.rect.height],size:a.transform.height,x:a.node.position.x,foot:a.node.position.y-a.transform.height*240/512+h.camera.y,depth:a.node.towerGroundY,parent:a.node.parent===h.monsterLayer}));});
 assert.equal(record.length,2);for(let i=0;i<2;i++){assert.deepEqual(record[i].frame,[512,512]);assert.ok(record[i].parent);assert.ok(Math.abs(record[i].foot-data.eggs[i].y)<.01);}
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
 await page.screenshot({path:path.join(OUT,`eggs-${viewport.width}.png`)});
 const killed=await page.evaluate(id=>{const h=window.__towerTest.host;h.run._damageEnemy({target:id,damage:999999,scaled:true,source:'sj_yujian'});h.run.resume();h.run.advance(1/60);h.run.pause();h.draw();return !h.monsterMechanics.eggArt.eggs.has(id);},data.eggs[0].id);assert.ok(killed);
 const hatched=await page.evaluate(expires=>{const h=window.__towerTest.host;for(const e of h.run.state.enemies)if(e.temporary?.kind==='egg')e.hp=e.maxHp=1000000;
 h.run.resume();for(let i=0;i<600&&h.run.state.time<=expires+.1;i++)h.run.advance(1/60);h.run.pause();h.draw();return{eggs:h.monsterMechanics.eggArt.eggs.size,young:h.run.state.enemies.filter(e=>e.temporary?.kind==='hatchling').length};},data.eggs[1].expires);assert.equal(hatched.eggs,0);assert.equal(hatched.young,2);
 await page.screenshot({path:path.join(OUT,`hatched-${viewport.width}.png`)});report.results.push({viewport,record,paused:true,killed,hatched});await page.close();
 }assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}console.log('PASS: real M22 eggs, foot anchoring, pause, kill and hatching, two landscape sizes');
})().catch(e=>{console.error(e);process.exitCode=1});
