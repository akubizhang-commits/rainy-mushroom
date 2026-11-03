// Read-only smoke fixtures using the compiled Cocos renderer, never live saves.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'design/xianxia-centipede-humanoid-2026-11-02/game-review');

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
 const report={fixture:'Compiled engine, smoke memory storage. Authored centipede prototypes in a presentation fixture; not a floor roster change.',viewports:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const specimen of [{id:'centipede_boss',rank:5,size:220},{id:'centipede_elite',rank:4,size:86.016},{id:'centipede_normal_r4',rank:4,size:76.8}]) for(const floor of [6]) for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const page=await browser.newPage({viewport});
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>!!window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked);
   const authored=await page.evaluate(({floor,specimen})=>{
    const h=window.__towerTest.host;
    h.enterTraining();
    const Run=h.run.constructor;
    h.run=new Run({attemptId:1,floor,seed:17,hp:100,xp:0,arenaVersion:1,loadout:h.run.state.loadout});
    const run=h.run;run.setPlaytestAssist(true);
    const e=run._enemy({id:'centipede-art-boss',archetype:specimen.id,x:155,y:0});
    const result={wave:run.state.wave,floor:run.state.floor,rank:e.rank,name:e.name,skills:e.mechanic?.skills||[]};
    run.pause();
    window.__centipedeBossActual=e;
    // Clear other presentation objects for an unoccluded, paused art fixture.
    const s=run.state;s.player.x=0;s.player.y=0;
    s.player.hp=s.player.maxHp;
    Object.assign(e,{x:155,y:0});
    s.enemies=[e];s.pending=[];s.reserved=[];s.projectiles=[];s.effects=[];s.zones=[];s.drops=[];
    if(s.monsterMechanics)s.monsterMechanics.zones=[];
    h.camera={x:0,y:0};h.attackTargetId=e.id;h.draw();
    return result;
   },{floor,specimen});
   console.log('Fixture',specimen.id,authored);
   assert.equal(authored.floor,floor); assert.equal(authored.rank,specimen.rank);
   await page.waitForFunction(()=>[...window.__towerTest.host.monsterArt.actors.values()].some(a=>a.family==='centipede-humanoid'&&a.sprite.spriteFrame)).catch(async error=>{console.error('DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>{const h=window.__towerTest.host;return {actors:[...h.monsterArt.actors.entries()].map(([id,a])=>({id,family:a.family,frame:!!a.sprite.spriteFrame})),enemies:h.run.state.enemies.map(e=>({id:e.id,archetype:e.archetype,family:e.family,hp:e.hp})),loading:{blocked:h.host.assetLoading?.blocked}};})));await page.screenshot({path:path.join(OUT,'failure.png')});throw error;});
   const record=await page.evaluate(()=>{
    const h=window.__towerTest.host,a=[...h.monsterArt.actors.values()].find(a=>a.family==='centipede-humanoid');
    const e=window.__centipedeBossActual;
    return {size:a.transform.width,texture:[a.sprite.spriteFrame.texture.width,a.sprite.spriteFrame.texture.height],
     frame:[a.sprite.spriteFrame.rect.width,a.sprite.spriteFrame.rect.height],
     source:a.sprite.spriteFrame.texture.image?.url||'GPU texture (CPU image released)',top:h.monsterArt.top(e.id),
     labels:[h.bossLabel?.string,...h.labels.filter(l=>l.node.active).map(l=>l.string)].filter(Boolean)};
   });
   assert.ok(Math.abs(record.size-specimen.size)<.01);
   assert.deepEqual(record.frame,[512,512]);
   assert.ok(record.labels.some(s=>s.includes(authored.name)));
   await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading?.blocked);
   await page.screenshot({path:path.join(OUT,`${specimen.id}-${viewport.width}.png`)});
   const paused=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));
   await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),paused);

   // Actual death of the authored five-rank enemy must release its portrait.
   const died=await page.evaluate(()=>{
    const h=window.__towerTest.host,e=window.__centipedeBossActual;
    h.run.state.enemies=[e];
    h.draw();
    h.run.resume();
    h.run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});
    h.run.advance(.1);h.run.pause();h.draw();
    return {removed:!h.monsterArt.actors.has(e.id),kills:h.run.state.killLedger.filter(k=>k.id===e.id).length};
   });
   assert.deepEqual(died,{removed:true,kills:1});
   report.viewports.push({specimen,viewport,authored,record,paused:true,died});
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
