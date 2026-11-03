// Read-only smoke fixtures using the compiled Cocos renderer, never live saves.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'reports/rank-role-rebalance-2026-11-01/actors-review');

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
 const report={fixture:'Compiled engine, smoke memory storage. Authored floor 7/8 wave 20 bosses.',viewports:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const scenario of [{floor:6,role:'normal',rank:4},{floor:9,role:'normal',rank:4},{floor:9,role:'elite',rank:6},{floor:8,role:'elite',rank:6},{floor:3,role:'boss',rank:4},{floor:9,role:'boss',rank:7}]) for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const page=await browser.newPage({viewport});
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>!!window.__towerTest?.host?.menu);
   const floor=scenario.floor;
   const authored=await page.evaluate((scenario)=>{
    const {floor,role,rank}=scenario;
    const h=window.__towerTest.host;
    h.enterTraining();
    const Run=h.run.constructor;
    h.run=new Run({attemptId:1,floor,seed:17,hp:100,xp:0,arenaVersion:1,loadout:h.run.state.loadout});
    const run=h.run;run.setPlaytestAssist(true);
    for(let i=0;i<20000&&!run.state.enemies.some(e=>e.role===role&&e.rank===rank);i++){
     run.resume();
     for(const e of [...run.state.enemies])run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});
     run.advance(.1);
    }
    const e=run.state.enemies.find(e=>e.role===role&&e.rank===rank);
    if(!e)throw Error('Authored Chixiao did not spawn');
    const result={wave:run.state.wave,floor:run.state.floor,rank:e.rank,name:e.name,skills:e.mechanic?.skills??[]};
    run.pause();
    window.__chixiaoActual=e;
    // Clear other presentation objects for an unoccluded, paused art fixture.
    const s=run.state;s.player.x=0;s.player.y=0;
    s.player.hp=s.player.maxHp;
    Object.assign(e,{x:155,y:0});
    s.enemies=[e];s.pending=[];s.reserved=[];s.projectiles=[];s.effects=[];s.zones=[];s.drops=[];
    if(s.monsterMechanics)s.monsterMechanics.zones=[];
    h.camera={x:0,y:0};h.attackTargetId=e.id;h.draw();
    return result;
   },scenario);
   assert.equal(authored.floor,floor); assert.equal(authored.rank,scenario.rank);
   await page.waitForFunction(()=>[...window.__towerTest.host.monsterArt.actors.values()].some(a=>a.seen&&a.sprite.spriteFrame));
   const record=await page.evaluate(()=>{
    const h=window.__towerTest.host,a=[...h.monsterArt.actors.values()].find(a=>a.seen);
    const e=window.__chixiaoActual;
    return {size:a.transform.width,texture:[a.sprite.spriteFrame.texture.width,a.sprite.spriteFrame.texture.height],
     frame:[a.sprite.spriteFrame.rect.width,a.sprite.spriteFrame.rect.height],
     source:a.sprite.spriteFrame.texture.image?.url||'GPU texture (CPU image released)',top:h.monsterArt.top(e.id),
     labels:[h.bossLabel?.string,...h.labels.filter(l=>l.node.active).map(l=>l.string)].filter(Boolean)};
   });
   assert.ok(record.size>=64&&record.size<=275);
   if(scenario.role==='boss')assert.equal(record.size,220);
   if(scenario.role==='normal')assert.ok(record.size<=110);
   assert.deepEqual(record.frame,[256,256]);
   assert.ok(record.labels.some(s=>s.includes(authored.name)));
   await page.screenshot({path:path.join(OUT,`${floor}-${scenario.role}-${scenario.rank}-${viewport.width}.png`)});
   const paused=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));
   await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),paused);

   // Actual death of the authored six-rank enemy must release its portrait.
   const died=await page.evaluate(()=>{
    const h=window.__towerTest.host,e=window.__chixiaoActual;
    h.run.state.enemies=[e];
    h.run.resume();
    h.run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});
    h.run.advance(.1);h.run.pause();h.draw();
    return {removed:!h.monsterArt.actors.has(e.id),kills:h.run.state.killLedger.filter(k=>k.id===e.id).length};
   });
   assert.deepEqual(died,{removed:true,kills:1});
   report.viewports.push({viewport,scenario,authored,record,paused:true,died});
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
