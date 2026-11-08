const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.resolve(ROOT,process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'reports/monster-attributes-2026-11-05/browser');
const BUILD=process.argv.find(a=>a.startsWith('--build='))?.slice(8)||'cocos-pilot/build/web-mobile';
(async()=>{
 const {createFixedWeapon}=await import('../js/xianxia/TowerWeapons.js');
 const bleedWeapon=createFixedWeapon('eq_sword_lingxi','browser-prediction-probe');
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 const report={results:[],errors:[]};
 try{
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const page=await browser.newPage({viewport});
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/${BUILD}/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
   const result=await page.evaluate(bleedWeapon=>{
    const h=window.__towerTest.host;
    h.enterTraining();h.run.pause();
    const r=h.run,s=r.state;
    s.floor=7;s.player.x=0;s.player.y=0;s.effects=[];s.zones=[];s.projectiles=[];
    s.loadout.passive={sj_mark:1};s.scarReadyAt=0;
    s.enemies=['wolf_normal','rhino_boss','snake_normal'].map((archetype,i)=>
     r._enemy({id:`attribute-probe-${i}`,archetype,x:(i-1)*200,y:80}));
    r._random=()=>1;
    const records=s.enemies.map(e=>{
     const before=e.hp;
     r._damageEnemy({target:e.id,source:'sj_shadow',damage:2,damageParts:{physical:1,magic:1},direct:true,scaled:true});
     return {family:e.family,hp:e.maxHp,damage:e.damage,moveSpeed:e.moveSpeed,
      physicalDefense:e.physicalDefense,magicDefense:e.magicDefense,attackInterval:e.attackInterval,controlResistance:e.controlResistance,
      received:before-e.hp,expected:500/(500+e.physicalDefense)+500/(500+e.magicDefense)};
    });
    const wolf=s.enemies[0];
    r._damageEnemy({target:wolf.id,source:'sj_yujian',damage:.01,direct:true});
    const target=s.enemies[2],loadout={...s.loadout,passive:{},weapon:bleedWeapon,
     weaponId:bleedWeapon.id,weaponQuality:bleedWeapon.quality,weaponRefine:bleedWeapon.refine};
    const predicted=r._yujianDamage(target,100,loadout),hp=target.hp;
    r._damageEnemy({target:target.id,source:'sj_yujian',damage:100,
     damageParts:{physical:100,magic:0},direct:true,castContext:{loadout,xp:s.player.xp}});
    const prediction={predicted,actual:hp-target.hp};
    h.camera={x:0,y:0};h.draw();
    return {records,armorBreak:wolf.armorBreak,scar:wolf.scarDebuff,prediction,paused:s.phase};
   },bleedWeapon);
   for(const row of result.records){
    assert.ok(Math.abs(row.received-row.expected)<1e-6);
    for(const k of ['hp','damage','moveSpeed','physicalDefense','magicDefense','attackInterval','controlResistance'])assert.ok(Number.isFinite(row[k]),k);
   }
   assert.equal(result.armorBreak.fraction,.2);assert.equal(result.scar.vulnerability,.2);
   assert.ok(result.prediction.actual>0);
   assert.ok(Math.abs(result.prediction.predicted-result.prediction.actual)<1e-6,'built game must reserve only direct damage');
   assert.equal(result.paused,'paused');
   await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    window.__towerTest.host.draw();resolve();
   }))));
   const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));
   await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
   await page.screenshot({path:path.join(OUT,`attributes-${viewport.width}.png`)});
   report.results.push({viewport,...result,pausedStateStable:true});await page.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=String(e);throw e;}
 finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}
 console.log('PASS: Cocos seven-attribute actors, mixed damage, armor break and pause in both landscape sizes');
})().catch(e=>{console.error(e);process.exitCode=1;});
