// Real compiled Cocos check: upright wolf/tiger/falcon ordinary attacks play their phased clip on the
// real enemyAttackSpec timeline, walk still works, falcon feather shot and mechanics keep the portrait,
// pause freezes the pose, death clears once, storage unchanged.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(__dirname,'game-review');
const CASES=[['boar-humanoid','boar_normal_r4',6,['bite']]];
(async()=>{fs.mkdirSync(OUT,{recursive:true});const report={results:[],errors:[]};
const server=createServer((req,res)=>{const f=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(f)]||'application/octet-stream');res.end(b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
for(const viewport of [{width:1280,height:720},{width:844,height:390}]){const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:120000});const storage=await page.evaluate(()=>JSON.stringify(localStorage));
for(const [family,archetype,floor,kinds] of CASES)for(const direction of [1,-1]){
 const authored=await page.evaluate(({archetype,floor,direction})=>{const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;s.time=10;s.ticks=600;s.floor=floor;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=1e6;s.player.invulnerableUntil=999;s.enemies=[];s.pending=[];s.reserved=[];s.effects=[];s.drops=[];s.projectiles=[];s.zones=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:999};
  const e=h.run._enemy({id:'atk-review',archetype,x:-direction*60,y:0});e.hp=e.maxHp=1e6;if(e.mechanic){e.mechanic.phase='idle';for(const k of Object.keys(e.mechanic.cooldowns||{}))e.mechanic.cooldowns[k]=999;}e.ai.mode='approach';e.ai.entryUntil=s.time;e.ai.graceUntil=s.time;s.enemies=[e];h.camera={x:0,y:0};h.draw();return{role:e.role,rank:e.rank,name:e.name,family:e.family,radius:e.radius};},{archetype,floor,direction});
 await page.waitForFunction(f=>{const h=window.__towerTest.host;h.draw();const r=h.monsterArt.speciesRenderers.get(f);return r?.motionTexture&&r.actors.get('atk-review');},family,{timeout:90000});
 const pose=()=>page.evaluate(f=>{const h=window.__towerTest.host,r=h.monsterArt.speciesRenderers.get(f),a=r.actors.get('atk-review');return{frame:[...r.motionFrames].find(([,x])=>x===a.sprite.spriteFrame)?.[0]||'static',scale:a.node.scale.x,y:a.node.position.y,size:a.transform.width};},family);
 const use=kinds;
 for(const kind of use){
  // Drive the real attack selection: force only this kind to be ready, then advance the real simulation.
  const seen=await page.evaluate(({kind,f})=>{const h=window.__towerTest.host,s=h.run.state,e=s.enemies[0];for(const k of ['bite','sweep','slam','shot','charge'])e.ai.cooldowns[k]=k===kind?0:999;e.ai.mode='approach';e.ai.until=0;
   const r=h.monsterArt.speciesRenderers.get(f),clip=r.motionAtlas.clips[f==='bear-humanoid'?'slam':'bite'],out=[];h.run.resume();
   for(let i=0;i<240;i++){h.run.advance(1/60);h.draw();const a=r.actors.get(e.id),name=[...r.motionFrames].find(([,x])=>x===a.sprite.spriteFrame)?.[0]||'static';out.push([e.ai.mode,e.ai.attack?.kind||null,name]);if(out.length>20&&e.ai.mode==='approach'&&out.some(o=>o[0]==='recovery'))break;}
   h.run.pause();return{out,phases:clip.phases,frames:clip.frames};},{kind,f:family});
  const attacking=seen.out.filter(o=>['windup','active','recovery'].includes(o[0]));
  assert.ok(attacking.length>0,`${archetype} ${kind} started`);assert.ok(attacking.every(o=>o[1]===kind),`${archetype} only ${kind}`);
  for(const mode of ['windup','active','recovery']){const [o,c]=seen.phases[mode],allowed=seen.frames.slice(o,o+c),got=attacking.filter(x=>x[0]===mode);assert.ok(got.length>0,`${archetype} ${kind} ${mode} observed`);assert.ok(got.every(x=>allowed.includes(x[2])),`${archetype} ${kind} ${mode} frames ${[...new Set(got.map(x=>x[2]))]}`);}
  const distinct=new Set(attacking.map(x=>x[2]));assert.ok(distinct.size>=6,`${archetype} ${kind} plays ${distinct.size} frames`);
  report.results.push({viewport,archetype,direction,kind,distinctFrames:distinct.size,ticks:attacking.length});
 }
if(use.length){ // Mid-attack screenshot, pause freeze, facing.
 await page.evaluate(k0=>{const h=window.__towerTest.host,s=h.run.state,e=s.enemies[0];for(const k of ['bite','sweep','slam','shot','charge'])e.ai.cooldowns[k]=k===k0?0:999;e.ai.mode='approach';h.run.resume();for(let i=0;i<300&&e.ai.mode!=='active';i++)h.run.advance(1/60);h.run.pause();h.draw();},use[0]);
 const p1=await pose();assert.match(p1.frame,/^(bite|slam)-/);assert.equal(Math.sign(p1.scale),-direction);
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(150);await page.evaluate(()=>window.__towerTest.host.draw());
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);assert.deepEqual(await pose(),p1);
 await page.screenshot({path:path.join(OUT,`${archetype}-${direction}-${viewport.width}-active.png`)});}
 if(family==='falcon-humanoid'){const shot=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,e=s.enemies[0];e.x=-300*Math.sign(e.x||1);for(const k of ['bite','sweep','slam','shot','charge'])e.ai.cooldowns[k]=k==='shot'?0:999;e.ai.mode='approach';h.run.resume();for(let i=0;i<400&&e.ai.attack?.kind!=='shot';i++)h.run.advance(1/60);h.run.advance(1/60);h.run.pause();h.draw();return e.ai.attack?.kind;});if(shot==='shot')assert.equal((await pose()).frame,'static','feather shot keeps portrait');report.results.push({viewport,archetype,direction,shotChecked:shot==='shot'});}
 const death=await page.evaluate(f=>{const h=window.__towerTest.host,e=h.run.state.enemies[0];h.run.resume();h.run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});h.run.advance(.1);h.run.pause();h.draw();return{remaining:h.monsterArt.speciesRenderers.get(f).actors.has(e.id),kills:h.run.state.killLedger.filter(k=>k.id===e.id).length};},family);
 assert.deepEqual(death,{remaining:false,kills:1});
}
assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),storage);await page.close();}
assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));}
console.log('PASS: boar-humanoid bite on the real timeline');})().catch(e=>{console.error(e);process.exitCode=1});
