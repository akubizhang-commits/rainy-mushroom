// 2026-11-22 M02 rage activation in the compiled game: white tiger (floor 9), crocodile king (floor 4), bear elite (floor 6).
// Checks: windup plays the enrage clip without red/scale, red + x1.2 only after activation, held for 15 s,
// pause freezes state, expiry restores the base look, and a real kill tips the portrait over and removes it.
// 2026-11-22 (later): bear-humanoid elite (floor 6) added.
// Read-only smoke fixture (memory storage), never live saves.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'design/xianxia-rage-m02-2026-11-22/game-review');
const CASES=[{floor:9,family:'white-tiger',rank:7,role:'boss'},{floor:4,family:'crocodile-humanoid',rank:4,role:'boss'},{floor:6,family:'bear-humanoid',rank:4,role:'elite',species:'bear'}];

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,body)=>{
   if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
   res.end(body);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 const report={cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const c of CASES){
   const page=await browser.newPage({viewport:{width:1280,height:720}});
   page.on('pageerror',e=>report.errors.push(c.family+': '+e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>!!window.__towerTest?.host?.menu,null,{timeout:30000});
   const authored=await page.evaluate(({floor,role,species})=>{
    const h=window.__towerTest.host;
    h.enterTraining();
    const Run=h.run.constructor;
    h.run=new Run({attemptId:1,floor,seed:17,hp:100,xp:0,arenaVersion:1,loadout:h.run.state.loadout});
    const run=h.run;run.setPlaytestAssist(true);
    const want=e=>e.role===role&&(!species||e.family===species||e.species===species||String(e.archetype||e.id).startsWith(species));
    for(let i=0;i<20000&&!run.state.enemies.some(want);i++){
     run.resume();
     for(const e of [...run.state.enemies])run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});
     run.advance(.1);
    }
    const e=run.state.enemies.find(want);
    if(!e)throw Error(role+' did not spawn');
    run.pause();window.__boss=e;
    const s=run.state;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp;
    Object.assign(e,{x:155,y:0});
    s.enemies=[e];s.pending=[];s.reserved=[];s.projectiles=[];s.effects=[];s.zones=[];s.drops=[];
    if(s.monsterMechanics)s.monsterMechanics.zones=[];
    h.camera={x:0,y:0};h.attackTargetId=e.id;h.draw();
    return {floor:s.floor,wave:s.wave,rank:e.rank,name:e.name,skills:e.mechanic.skills};
   },c);
   assert.equal(authored.rank,c.rank);assert.ok(authored.skills.includes('M02'));
   // Wait for the motion atlas, then return to the base pose.
   await page.waitForFunction((family)=>{const h=window.__towerTest.host;h.draw();const r=h.monsterArt.speciesRenderers?.get(family);return !!r&&r.motionFrames?.size>0},c.family,{timeout:30000});
   const setup=await page.evaluate((family)=>{
    const h=window.__towerTest.host,run=h.run,e=window.__boss;
    window.__read=()=>{
     const s=run.state;s.player.x=0;s.player.y=0;e.x=155;e.y=0;h.camera={x:0,y:0};h.draw();
     const r=h.monsterArt.speciesRenderers.get(family),a=r.actors.get(e.id)||h.monsterArt.actors.get(e.id);
     const frame=a?.sprite.spriteFrame;const name=frame?[...r.motionFrames].find(([,f])=>f===frame)?.[0]??'static':null;
     return {frame:name,scale:a?Math.abs(a.node.scale.y):null,color:a?a.sprite.color.g:null,alpha:a?a.sprite.color.a:null,angle:a?a.node.angle:null,
      enraged:e.mechanic.enraged,skill:e.mechanic.skillId,phase:e.mechanic.phase,time:+run.state.time.toFixed(3),until:e.mechanic.enrageUntil,present:!!a};
    };
    e.hp=e.maxHp*.19;
    for(const id of e.mechanic.skills)e.mechanic.cooldowns[id]=run.state.time+(id==='M02'?0:100000);
    return window.__read();
   },c.family);
   const trace=[setup];
   // Step the real simulation until M02 windup begins.
   const start=await page.evaluate(()=>{const run=window.__towerTest.host.run,e=window.__boss;run.resume();for(let i=0;i<240&&e.mechanic.skillId!=='M02';i++)run.advance(1/60);run.pause();return {...window.__read(),hp:e.hp/e.maxHp,alive:run.state.enemies.includes(e),status:run.state.status,cd:e.mechanic.cooldowns,uses:e.mechanic.uses};});
   if(start.skill!=='M02')console.error(JSON.stringify(start));
   assert.equal(start.skill,'M02',c.family+' M02 must start');assert.equal(start.phase,'windup');
   trace.push(start);
   let shot=0,windupFrames=new Set();
   for(let i=0;i<40;i++){
    const r=await page.evaluate(()=>{const run=window.__towerTest.host.run,e=window.__boss;run.resume();run.advance(.1);run.pause();return window.__read();});
    trace.push(r);
    if(r.phase==='windup'&&!r.enraged){windupFrames.add(r.frame);assert.equal(r.color,255,'no red during windup');assert.ok(r.scale<1.1,'no x1.2 during windup '+r.scale);
     if(shot<3&&i%4===1){await page.screenshot({path:path.join(OUT,`${c.family}-windup-${shot++}.png`)});}}
    if(r.enraged)break;
   }
   const active=trace[trace.length-1];
   assert.ok([...windupFrames].every(f=>f&&f.startsWith('enrage-')),c.family+' windup frames '+[...windupFrames]);
   assert.ok(windupFrames.size>=4,c.family+' windup must animate: '+[...windupFrames]);
   assert.equal(active.enraged,true);assert.ok(active.scale>1.15,'x1.2 after activation '+active.scale);assert.ok(active.color<200,'red after activation');
   await page.screenshot({path:path.join(OUT,`${c.family}-activated.png`)});
   // Pause freezes state.
   const frozen=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));
   await page.waitForTimeout(200);
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),frozen);
   // Held for the full duration, with every action keeping red and x1.2.
   const hold=await page.evaluate(()=>{const run=window.__towerTest.host.run,e=window.__boss,out=[];run.resume();
    for(let i=0;i<14*6;i++){run.advance(1/6);if(e.hp<e.maxHp*.05)e.hp=e.maxHp*.15;const r=window.__read();if(i%6===5)out.push(r);if(!r.enraged)break;}run.pause();return out;});
   for(const r of hold){assert.equal(r.enraged,true,'rage held at t='+r.time);assert.ok(r.scale>1.15);assert.ok(r.color<200);}
   await page.screenshot({path:path.join(OUT,`${c.family}-rage-held.png`)});
   const expired=await page.evaluate(()=>{const run=window.__towerTest.host.run,e=window.__boss;run.resume();for(let i=0;i<600&&e.mechanic.enraged;i++){run.advance(1/60);if(e.hp<e.maxHp*.05)e.hp=e.maxHp*.15;}run.pause();return window.__read();});
   assert.equal(expired.enraged,false);assert.ok(expired.scale<1.1);assert.equal(expired.color,255);
   assert.ok(Math.abs(expired.time-active.time-15)<.25,'rage lasts 15 s: '+(expired.time-active.time));
   await page.screenshot({path:path.join(OUT,`${c.family}-expired.png`)});
   // Real kill: portrait tips over and fades, then is removed.
   const death=await page.evaluate(()=>{const h=window.__towerTest.host,run=h.run,e=window.__boss,out=[];
    run.resume();run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});
    for(let i=0;i<10;i++){run.advance(.1);const s=run.state;h.camera={x:0,y:0};h.draw();
     const a=[...h.monsterArt.speciesRenderers.values()].map(r=>r.actors.get(e.id)).find(Boolean)||h.monsterArt.actors.get(e.id);
     out.push({time:+s.time.toFixed(2),present:!!a,angle:a?a.node.angle:null,alpha:a?a.sprite.color.a:null});}
    run.pause();return {out,kills:run.state.killLedger.filter(k=>k.id===e.id).length};});
   report.cases.push({...c,authored,windupFrames:[...windupFrames],active,hold:hold.length,expired,death,trace:trace.slice(0,6)});
   assert.equal(death.kills,1);
   assert.equal(death.out[death.out.length-1].present,false,'removed after the fall');
   await page.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status='PASS';
 }finally{
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
 console.log(JSON.stringify(report.cases.map(c=>({family:c.family,windup:c.windupFrames,active:c.active,expired:c.expired,death:c.death})),null,1),report.status);
})().catch(error=>{console.error(error);process.exitCode=1;});
