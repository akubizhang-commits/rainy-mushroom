// Real build check for the 周天剑阵 tidy-up (2026-11-13): 4 swords, same direction, no ground ring,
// fast while a monster is inside the outer reach and slow without one, hidden after the 4 s window.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(__dirname,'game-review');
(async()=>{fs.mkdirSync(OUT,{recursive:true});const report={results:[],errors:[]};
const server=createServer((req,res)=>{const f=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(f)]||'application/octet-stream');res.end(b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
for(const viewport of [{width:1280,height:720},{width:844,height:390}]){const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:120000});
const storage=await page.evaluate(()=>JSON.stringify(localStorage));
for(const level of [1,10]){
 await page.evaluate(level=>{const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;s.time=10;s.ticks=600;s.floor=3;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=1e6;s.player.invulnerableUntil=999;
  s.enemies=[];s.pending=[];s.reserved=[];s.effects=[];s.drops=[];s.projectiles=[];s.zones=[];s.casts=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:999};
  s.loadout.active={sj_wanjian:level};for(const k of Object.keys(s.cooldowns))s.cooldowns[k]=0;delete s.orbitClock;delete s.orbitPace;s.orbitUntil=undefined;
  const e=h.run._enemy({id:'dummy',archetype:'spider_normal_r1',x:110,y:0});e.hp=e.maxHp=1e9;e.moveSpeed=0;e.ai.mode='approach';e.ai.entryUntil=999;for(const k of Object.keys(e.ai.cooldowns))e.ai.cooldowns[k]=999;s.enemies=[e];h.camera={x:0,y:0};h.draw();},level);
 // Wait for the sword texture, then run the real simulation through one window.
 await page.evaluate(()=>window.__towerTest.host.orbitArt.preload());
 await page.waitForFunction(()=>window.__towerTest.host.orbitArt.ready,null,{timeout:60000});
 const out=await page.evaluate(async()=>{const h=window.__towerTest.host,s=h.run.state,e=s.enemies[0],rows=[];h.run.resume();
  for(let i=0;i<60*5;i++){
   if(i===60*2){e.x=900;} // the monster leaves the reach at 2 s
   h.run.advance(1/60);h.draw();
   const art=h.orbitSwordArt??h.orbitArt??Object.values(h).find(v=>v&&v.constructor&&v.constructor.name==='OrbitSwordArt');
   const shown=art?art.actors.filter(a=>a.node.active).length:-1;
   rows.push({t:+s.time.toFixed(3),until:s.orbitUntil,pace:s.orbitPace,clock:s.orbitClock,shown,ring:!!(art?.flowNode?.active)});
   if(i%30===0)await new Promise(r=>setTimeout(r,0));}
  h.run.pause();return rows;});
 const active=out.filter(r=>r.until>r.t+1e-9),after=out.filter(r=>r.until!==undefined&&r.until<=r.t);
 assert.ok(active.length>200,`level ${level}: window observed (${active.length})`);
 const near=active.filter(r=>r.t<11.9),far=active.filter(r=>r.t>12.6);
 assert.ok(near.every(r=>Math.abs(r.pace-1.35)<1e-6),`level ${level}: combat pace ${[...new Set(near.map(r=>r.pace))].slice(0,3)}`);
 assert.ok(far.length&&far.every(r=>Math.abs(r.pace-.45)<1e-6),`level ${level}: idle pace`);
 const loadedAt=active.findIndex(r=>r.shown>0),shownSet=new Set(active.slice(Math.max(0,loadedAt)).map(r=>r.shown)); // ignore frames before the sword texture loads
 assert.ok(loadedAt>=0&&loadedAt<3,`level ${level}: sprites load quickly (${loadedAt})`);assert.deepEqual([...shownSet],[4],`level ${level}: 4 swords shown ${[...shownSet]}`);
 assert.ok(active.every(r=>!r.ring),`level ${level}: no ground ring`);
 assert.ok(after.length&&after.every(r=>r.shown===0),`level ${level}: hidden after the window`);
 const rate=(rows)=>(rows.at(-1).clock-rows[0].clock)/(rows.at(-1).t-rows[0].t);
 report.results.push({viewport,level,activeTicks:active.length,combatClockRate:+rate(near).toFixed(3),idleClockRate:+rate(far).toFixed(3),shown:[...shownSet],ringShown:active.some(r=>r.ring)});
 // Screenshot mid-combat.
 await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,e=s.enemies[0];e.x=110;for(const k of Object.keys(s.cooldowns))s.cooldowns[k]=0;s.orbitUntil=undefined;h.run.resume();for(let i=0;i<60*1.2;i++)h.run.advance(1/60);h.run.pause();h.draw();});
 for(let k=0;k<20;k++){await page.waitForTimeout(150);await page.evaluate(()=>window.__towerTest.host.draw());}
 await page.screenshot({path:path.join(OUT,`orbit-lv${level}-${viewport.width}.png`)});
}
assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),storage);await page.close();}
assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));}
console.log('PASS: 周天剑阵 tidy-up in the real build',JSON.stringify(report.results.map(r=>[r.viewport.width,r.level,r.combatClockRate,r.idleClockRate,r.shown])));})().catch(e=>{console.error(e);process.exitCode=1});
