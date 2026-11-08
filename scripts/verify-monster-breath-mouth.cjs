const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(ROOT,process.env.BREATH_REVIEW_OUT||'design/xianxia-monster-breath-mouth-2026-11-04/game-review'),SERVER_ROOT=process.env.BREATH_SERVER_ROOT||ROOT;
(async()=>{fs.mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{const file=path.resolve(SERVER_ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(SERVER_ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});const report={results:[],errors:[]};
try{for(const viewport of [{width:1280,height:720},{width:844,height:390}])for(const side of (process.env.BREATH_SIDE?[Number(process.env.BREATH_SIDE)]:[1,-1])){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))report.errors.push(`${r.status()} ${r.url()}`)});
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
 const data=await page.evaluate(side=>{
 const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
 s.floor=5;s.arenaVersion=1;s.time=10;s.ticks=600;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=10000;s.effects=[];s.drops=[];s.pending=[];s.reserved=[];s.zones=[];s.projectiles=[];s.killLedger=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:0};
 const e=h.run._enemy({id:'web-elite',archetype:'snake_boss',x:160*side,y:0});e.maxHp=10000;e.hp=4000;for(const id of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[id]=999;e.mechanic.cooldowns.M16=10;s.enemies=[e];h.camera={x:0,y:0};h.draw();h.run.resume();
 for(let i=0;i<180&&!s.monsterMechanics.zones.some(z=>z.skillId==='M16');i++)h.run.advance(1/60);
 h.run.pause();h.draw();const z=s.monsterMechanics.zones.find(z=>z.skillId==='M16');window.webZone=z?JSON.parse(JSON.stringify(z)):null;return{zone:z,uses:e.mechanic.uses.M16};},side);
 assert.ok(data.zone);assert.equal(data.uses,1);
 await page.waitForFunction(()=>window.__towerTest.host.monsterMechanics?.breathArt?.frame&&!window.__towerTest.host.host.assetLoading?.blocked);
 assert.equal(await page.evaluate(()=>window.__towerTest.host.monsterMechanics.breathArt.plumes.size),0,'windup must not emit the mouth jet');
 for(const [stage,offset]of [['start',.04],['middle',1.5],['end',2.85]]){
 const record=await page.evaluate(({offset})=>{const h=window.__towerTest.host,s=h.run.state,z=window.webZone;h.run.resume();while(s.time<z.activatesAt+offset)h.run.advance(1/60);h.run.pause();h.draw();const art=h.monsterMechanics.breathArt,w=[...art.plumes.values()][0];return{jet:w.jet?{x:w.jet.node.position.x,y:w.jet.node.position.y,angle:w.jet.node.angle,width:w.jet.transform.width}:null,mouth:h.monsterArt.mouthPosition(s.enemies[0].id),angle:w.node.angle,expectedAngle:Math.atan2(s.monsterMechanics.zones.find(q=>q.id===z.id).faceY,s.monsterMechanics.zones.find(q=>q.id===z.id).faceX)*180/Math.PI,time:s.time,size:w.transform.height,position:{x:w.node.position.x,y:w.node.position.y},alpha:w.sprite.color.a,texture:[w.sprite.spriteFrame.texture.width,w.sprite.spriteFrame.texture.height],frame:[w.sprite.spriteFrame.rect.width,w.sprite.spriteFrame.rect.height],radius:z.radius,labels:h.monsterMechanics.labels.filter(l=>l.node.active).map(l=>l.string)};},{offset});
 assert.deepEqual(record.frame,[512,768]);assert.ok(record.texture[0]>=512);assert.ok(record.alpha>0);assert.ok(Math.abs(record.angle-record.expectedAngle)<.001);assert.ok(Math.abs(record.size-data.zone.radius*.7*768/480)<.001);assert.ok(record.jet);assert.ok(Math.abs(record.jet.x-record.mouth.x)<.001);assert.ok(Math.abs(record.jet.y-record.mouth.y)<.001);
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
 const cameraCheck=await page.evaluate(()=>{
  const h=window.__towerTest.host,s=h.run.state,art=h.monsterMechanics.breathArt;
  const p=[...art.plumes.values()][0],before={x:p.jet.node.position.x,y:p.jet.node.position.y},player={x:s.player.x,y:s.player.y};
  const stateBefore=JSON.stringify(s);
  // TowerView derives its camera from the player on every draw.
  s.player.x=player.x+31;s.player.y=player.y-17;h.draw();
  const shifted={x:p.jet.node.position.x-before.x,y:p.jet.node.position.y-before.y};
  s.player.x=player.x;s.player.y=player.y;h.draw();
  return{...shifted,unchanged:stateBefore===JSON.stringify(s)};
 });assert.ok(Math.abs(cameraCheck.x+31)<.001);assert.ok(Math.abs(cameraCheck.y-17)<.001);assert.ok(cameraCheck.unchanged);
 await page.screenshot({path:path.join(OUT,`${side===1?'left':'right'}-${stage}-${viewport.width}.png`)});report.results.push({viewport,side,stage,...record,cameraCheck});}
 const clean=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;s.enemies[0].hp=0;h.draw();return h.monsterMechanics.breathArt.plumes.size;});assert.equal(clean,0);
 const expired=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;s.enemies[0].hp=10000;s.time=window.webZone.expiresAt;h.draw();return h.monsterMechanics.breathArt.plumes.size;});assert.equal(expired,0);await page.close();
 }assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}console.log('PASS: configured M16, simulation-driven sweep, pause, owner death, expiry, two landscape sizes');
})().catch(e=>{console.error(e);process.exitCode=1});
