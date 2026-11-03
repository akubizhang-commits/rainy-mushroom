// Read-only smoke fixtures using the compiled Cocos renderer, never live saves.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'design/xianxia-boar-humanoid-2026-11-02/game-review');

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
 const report={fixture:'Compiled engine, smoke memory storage. Authored four-rank boar normal prototype in a presentation fixture; not a floor roster change.',viewports:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const floor of [6]) for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const page=await browser.newPage({viewport});
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>!!window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked);
   const authored=await page.evaluate((floor)=>{
    const h=window.__towerTest.host;
    h.enterTraining();
    const Run=h.run.constructor;
    h.run=new Run({attemptId:1,floor,seed:17,hp:100,xp:0,arenaVersion:1,loadout:h.run.state.loadout});
    const run=h.run;run.setPlaytestAssist(true);
    const e=run._enemy({id:'boar-art-normal',archetype:'boar_normal_r4',x:155,y:0});
    const result={wave:run.state.wave,floor:run.state.floor,rank:e.rank,name:e.name,skills:e.mechanic?.skills||[]};
    run.pause();
    window.__boarActual=e;
    // Clear other presentation objects for an unoccluded, paused art fixture.
    const s=run.state;s.player.x=0;s.player.y=0;
    s.player.hp=s.player.maxHp;
    Object.assign(e,{x:155,y:0});
    s.enemies=[e];s.pending=[];s.reserved=[];s.projectiles=[];s.effects=[];s.zones=[];s.drops=[];
    if(s.monsterMechanics)s.monsterMechanics.zones=[];
    h.camera={x:0,y:0};h.attackTargetId=e.id;h.draw();
    return result;
   },floor);
   assert.equal(authored.floor,floor); assert.equal(authored.rank,4);
   await page.waitForFunction(()=>[...window.__towerTest.host.monsterArt.actors.values()].some(a=>a.family==='boar-humanoid'&&a.sprite.spriteFrame));
   const record=await page.evaluate(()=>{
    const h=window.__towerTest.host,a=[...h.monsterArt.actors.values()].find(a=>a.family==='boar-humanoid');
    const e=window.__boarActual;
    return {size:a.transform.width,texture:[a.sprite.spriteFrame.texture.width,a.sprite.spriteFrame.texture.height],
     frame:[a.sprite.spriteFrame.rect.width,a.sprite.spriteFrame.rect.height],
     source:a.sprite.spriteFrame.texture.image?.url||'GPU texture (CPU image released)',top:h.monsterArt.top(e.id),
     labels:[h.bossLabel?.string,...h.labels.filter(l=>l.node.active).map(l=>l.string)].filter(Boolean)};
   });
   assert.ok(Math.abs(record.size-83.2)<.01);
   assert.deepEqual(record.frame,[256,256]);
   assert.equal(authored.name,'赤鬃猪妖');
   await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading?.blocked);
   await page.screenshot({path:path.join(OUT,`${floor}-${viewport.width}.png`)});
   const paused=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));
   await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),paused);

   // Actual death of the authored four-rank enemy must release its portrait.
   const died=await page.evaluate(()=>{
    const h=window.__towerTest.host,e=window.__boarActual;
    h.run.state.enemies=[e];
    h.draw();
    h.run.resume();
    h.run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});
    h.run.advance(.1);h.run.pause();h.draw();
    return {removed:!h.monsterArt.actors.has(e.id),kills:h.run.state.killLedger.filter(k=>k.id===e.id).length};
   });
   assert.deepEqual(died,{removed:true,kills:1});
   report.viewports.push({viewport,authored,record,paused:true,died});
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
