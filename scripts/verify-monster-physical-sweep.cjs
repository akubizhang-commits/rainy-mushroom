const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(ROOT,process.env.SWEEP_REVIEW_OUT||'design/xianxia-monster-physical-sweep-2026-11-04/game-review');
const SERVER_ROOT=process.env.SWEEP_SERVER_ROOT||ROOT;
(async()=>{fs.mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{const file=path.resolve(SERVER_ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(SERVER_ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});const report={results:[],errors:[]};
try{for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))report.errors.push(`${r.status()} ${r.url()}`)});page.on('console',m=>{if(m.type()==='error')console.error(m.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
 for(const archetype of (process.env.SWEEP_ONLY_M08?[]:['crocodile_normal','crocodile_elite','crocodile_boss','crocodile_elite_rank4','crocodile_normal_r4','centipede_normal','centipede_elite','centipede_boss','centipede_normal_r4']))for(const direction of [-1,1]){
 const info=await page.evaluate(({archetype,direction})=>{
 const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
 s.floor=9;s.arenaVersion=1;s.time=10;s.ticks=600;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=100000;s.effects=[];s.drops=[];s.pending=[];s.reserved=[];s.zones=[];s.projectiles=[];s.enemies=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:999};
 const e=h.run._enemy({id:'sweep-review',archetype,x:-direction*100,y:0});e.hp=e.maxHp=100000;for(const id of Object.keys(e.mechanic?.cooldowns||{}))e.mechanic.cooldowns[id]=999;
 s.enemies=[e];const spec=h.run._attackSpec(e,100);h.run._newAttack(e,spec);h.camera={x:0,y:0};h.draw();return{family:e.family,role:e.role,kind:e.ai.attack.kind};},{archetype,direction});
 assert.ok(['crocodile','centipede'].includes(info.family));assert.equal(info.kind,'sweep');
 await page.waitForFunction(()=>window.__towerTest.host.monsterMechanics[window.__towerTest.host.run.state.enemies[0].family+'SweepArt'].frame&&!window.__towerTest.host.host.assetLoading?.blocked);
 assert.equal(await page.evaluate(()=>window.__towerTest.host.monsterMechanics[window.__towerTest.host.run.state.enemies[0].family+'SweepArt'].plumes.size),0);
 const record=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;h.run.resume();for(let i=0;i<180&&s.enemies[0].ai.mode!=='active';i++)h.run.advance(1/60);h.run.pause();h.draw();const e=s.enemies[0],p=[...h.monsterMechanics[s.enemies[0].family+'SweepArt'].plumes.values()][0];const renderer=h.monsterArt.speciesRenderers.get('crocodile'),actor=renderer?.actors.get('sweep-review')||h.monsterArt.actors.get('sweep-review');return{actorFamily:actor?.family,actorFrame:actor?[actor.sprite.spriteFrame.rect.width,actor.sprite.spriteFrame.rect.height]:null,color:p?[p.sprite.color.r,p.sprite.color.g,p.sprite.color.b]:null,time:s.time,paused:s.paused,status:s.status,mode:e.ai.mode,range:e.ai.attack.range,angle:p?.node.angle,width:p?.transform.width,height:p?.transform.height,frame:p?[p.sprite.spriteFrame.rect.width,p.sprite.spriteFrame.rect.height]:null};});
 assert.equal(record.mode,'active');assert.deepEqual(record.frame,[768,288]);assert.ok(Math.abs(record.width-record.range*(info.family==='crocodile'?.8:.7))<.001);assert.ok(Math.abs(Math.abs(record.angle)-(direction<0?180:0))<.001);
 if(record.actorFamily==='crocodile')assert.deepEqual(record.actorFrame,[480,480],'existing low-rank sweep animation remains active');
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
 await page.screenshot({path:path.join(OUT,`${archetype}-${direction}-${viewport.width}.png`)});
 const active=await page.evaluate(()=>JSON.parse(JSON.stringify(window.__towerTest.host.run.state)));
 const recovery=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.resume();h.run.advance(.22);h.run.pause();h.draw();return h.monsterMechanics[h.run.state.enemies[0].family+'SweepArt'].plumes.size;});assert.equal(recovery,0);
 await page.evaluate(state=>{window.__towerTest.host.run.state=state;window.__towerTest.host.draw();},active);
 assert.equal(await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.enemies[0].hp=0;h.draw();return h.monsterMechanics[h.run.state.enemies[0].family+'SweepArt'].plumes.size;}),0);
 report.results.push({viewport,archetype,direction,recovery,...info,...record});
 }
 await page.evaluate(()=>{
  const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
  s.floor=4;s.arenaVersion=1;s.time=10;s.ticks=600;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=100000;
  s.effects=[];s.drops=[];s.pending=[];s.reserved=[];s.zones=[];s.projectiles=[];s.enemies=[];
  s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:0};
  const e=h.run._enemy({id:'m08-isolation',archetype:'crocodile_boss',x:160,y:0});e.maxHp=100000;e.hp=40000;
  for(const id of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[id]=999;
  e.mechanic.cooldowns.M08=10;s.enemies=[e];h.camera={x:0,y:0};h.draw();
 });
 await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading?.blocked);
 const m08=await page.evaluate(()=>{
  const h=window.__towerTest.host,s=h.run.state,e=s.enemies[0];h.run.resume();
  // M08's owner immediately recovers; its separate zone stays active for 0.2s.
  for(let i=0;i<480&&!s.monsterMechanics.zones.some(z=>z.skillId==='M08'&&z.phase==='active');i++)h.run.advance(1/60);
  h.run.pause();h.draw();const zone=s.monsterMechanics.zones.find(z=>z.skillId==='M08'&&z.phase==='active');
  return{time:s.time,skill:zone?.skillId,phase:zone?.phase,ownerPhase:e.mechanic.phase,ordinaryAttack:e.ai.attack,
   crocodileArc:h.monsterMechanics.crocodileSweepArt.plumes.size,centipedeArc:h.monsterMechanics.centipedeSweepArt.plumes.size};
 });
 (report.m08Isolation||=[]).push({viewport,...m08});
 assert.equal(m08.skill,'M08');assert.equal(m08.phase,'active');assert.equal(m08.ordinaryAttack,null);
 assert.equal(m08.crocodileArc,0);assert.equal(m08.centipedeArc,0);
 await page.close();
 }assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}console.log('PASS: crocodile and centipede, nine form/role combinations, both headings, preserved crocodile animation, pause/death/recovery, two landscapes');
})().catch(e=>{console.error(e);process.exitCode=1});
