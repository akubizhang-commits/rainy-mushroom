// Read-only smoke fixtures using the compiled Cocos renderer, never live saves.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'design/xianxia-crocodile-humanoid-2026-11-02/game-review');

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
 const report={fixture:'Compiled engine, smoke memory storage. Authored floor 4 wave 20 bosses.',viewports:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const floor of [4]) for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const page=await browser.newPage({viewport});
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>!!window.__towerTest?.host?.menu);
   const authored=await page.evaluate((floor)=>{
    const h=window.__towerTest.host;
    h.enterTraining();
    const Run=h.run.constructor;
    h.run=new Run({attemptId:1,floor,seed:17,hp:100,xp:0,arenaVersion:1,loadout:h.run.state.loadout});
    const run=h.run;run.setPlaytestAssist(true);
    for(let i=0;i<20000&&!run.state.enemies.some(e=>e.role==='boss');i++){
     run.resume();
     for(const e of [...run.state.enemies])run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});
     run.advance(.1);
    }
    const e=run.state.enemies.find(e=>e.role==='boss');
    if(!e)throw Error('Authored Crocodile King did not spawn');
    const result={wave:run.state.wave,floor:run.state.floor,rank:e.rank,name:e.name,skills:e.mechanic.skills};
    run.pause();
    window.__crocodileActual=e;
    // Clear other presentation objects for an unoccluded, paused art fixture.
    const s=run.state;s.player.x=0;s.player.y=0;
    s.player.hp=s.player.maxHp;
    Object.assign(e,{x:155,y:0});
    s.enemies=[e];s.pending=[];s.reserved=[];s.projectiles=[];s.effects=[];s.zones=[];s.drops=[];
    if(s.monsterMechanics)s.monsterMechanics.zones=[];
    h.camera={x:0,y:0};h.attackTargetId=e.id;h.draw();
    return result;
   },floor);
   assert.equal(authored.floor,floor); assert.equal(authored.wave,20); assert.equal(authored.rank,4);
   await page.waitForFunction(()=>[...window.__towerTest.host.monsterArt.actors.values()].some(a=>a.family==='crocodile-humanoid'&&a.sprite.spriteFrame));
   const record=await page.evaluate(()=>{
    const h=window.__towerTest.host,a=[...h.monsterArt.actors.values()].find(a=>a.family==='crocodile-humanoid');
    const e=window.__crocodileActual;
    return {size:a.transform.width,texture:[a.sprite.spriteFrame.texture.width,a.sprite.spriteFrame.texture.height],
     frame:[a.sprite.spriteFrame.rect.width,a.sprite.spriteFrame.rect.height],
     source:a.sprite.spriteFrame.texture.image?.url||'GPU texture (CPU image released)',top:h.monsterArt.top(e.id),
     labels:[h.bossLabel?.string,...h.labels.filter(l=>l.node.active).map(l=>l.string)].filter(Boolean)};
   });
   assert.ok(record.size>200&&record.size<=220);
   assert.deepEqual(record.frame,[256,256]);
   assert.ok(record.labels.some(s=>s.includes(authored.name)));
   await page.screenshot({path:path.join(OUT,`${floor}-${viewport.width}.png`)});
   const paused=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));
   await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),paused);

   const rage = await page.evaluate(()=>{
    const h=window.__towerTest.host,run=h.run,e=window.__crocodileActual;
    run._damageEnemy({target:e.id,damage:e.hp*.81,direct:false,scaled:true,source:'fixture'});
    for(const id of e.mechanic.skills)e.mechanic.cooldowns[id]=run.state.time+(id==='M02'?0:100000);
    const read=()=>{h.draw();const a=h.monsterArt.actors.get(e.id);return {scale:a.node.scale.y,color:a.sprite.color.g,y:a.node.position.y,anchor:a.transform.anchorPoint.y,enraged:e.mechanic.enraged,phase:e.mechanic.phase,time:run.state.time,until:e.mechanic.enrageUntil,radius:e.radius}};
    const normal=read();
    run.resume();
    for(let i=0;i<120&&e.mechanic.skillId!=='M02';i++)run.advance(1/60);
    const windup=read();
    for(let i=0;i<180&&!e.mechanic.enraged;i++)run.advance(1/60);
    run.pause();
    // Hold position for a like-for-like foot-anchor screenshot after the real trigger.
    e.x=155;e.y=0;run.state.player.x=0;run.state.player.y=0;h.camera={x:0,y:0};
    return {normal,windup,active:read()};
   });
   assert.equal(rage.windup.enraged,false); assert.equal(rage.windup.color,255);
   assert.equal(rage.active.enraged,true); assert.equal(rage.active.scale,1.2); assert.equal(rage.active.color,115);
   assert.equal(rage.active.anchor,rage.normal.anchor);assert.equal(rage.active.y,rage.normal.y);
   assert.equal(rage.active.radius,rage.normal.radius);
   assert.ok(Math.abs(rage.active.until-rage.active.time-15)<.05);
   const frozen=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));
   await page.waitForTimeout(160);
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),frozen);
   await page.screenshot({path:path.join(OUT,`rage-${viewport.width}.png`)});
   if(viewport.width===1280){
    rage.expired=await page.evaluate(()=>{
     const h=window.__towerTest.host,run=h.run,e=window.__crocodileActual;
     run.resume();for(let i=0;i<1000&&e.mechanic.enraged;i++)run.advance(1/60);run.pause();
     e.x=155;e.y=0;run.state.player.x=0;run.state.player.y=0;h.camera={x:0,y:0};h.draw();
     const a=h.monsterArt.actors.get(e.id);return {enraged:e.mechanic.enraged,color:a.sprite.color.g,scale:a.node.scale.y,y:a.node.position.y};
    });
    assert.equal(rage.expired.enraged,false);assert.equal(rage.expired.color,255);assert.equal(rage.expired.scale,1);assert.equal(rage.expired.y,rage.normal.y);
    await page.screenshot({path:path.join(OUT,`expired-${viewport.width}.png`)});
   }
   // Actual death of the authored four-rank enemy must release its portrait.
   const died=await page.evaluate(()=>{
    const h=window.__towerTest.host,e=window.__crocodileActual;
    h.run.state.enemies=[e];
    h.run.resume();
    h.run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});
    h.run.advance(.1);h.run.pause();h.draw();
    return {removed:!h.monsterArt.actors.has(e.id),kills:h.run.state.killLedger.filter(k=>k.id===e.id).length};
   });
   assert.deepEqual(died,{removed:true,kills:1});
   const roles=[];
   for(const role of ['normal','elite']) {
    const sample=await page.evaluate(role=>{
     const h=window.__towerTest.host,e=window.__crocodileActual;
     // Presentation-only role fixture; no writes to persistent storage.
     e.id='art-role-'+role;e.archetype=role==='normal'?'crocodile_normal_r4':'crocodile_elite_rank4';
     e.role=role;e.rank=4;e.hp=e.maxHp;e.x=155;e.y=0;e.mechanic.enraged=false;
     h.run.state.enemies=[e];h.run.pause();h.draw();
     const a=h.monsterArt.actors.get(e.id);
     return {role,family:a.family,size:a.transform.width,y:a.node.position.y,scale:a.node.scale.y};
    },role);
    assert.equal(sample.family,'crocodile-humanoid');
    assert.ok(Math.abs(sample.size-(role==='normal'?96:107.52))<.01);
    assert.equal(sample.scale,1);
    await page.screenshot({path:path.join(OUT,`${role}-${viewport.width}.png`)});
    roles.push(sample);
   }
   report.viewports.push({viewport,authored,record,paused:true,rage,died,roles});
   await page.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status='PASS';
 }finally{
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
