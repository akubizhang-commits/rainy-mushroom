'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,process.env.LIANGYI_QA_DIR||'design/xianxia-liangyi-monochrome-2026-11-02/browser',process.env.QA_ATTEMPT||'attempt-01');
const BUILD=process.env.LIANGYI_BUILD_ROOT;
async function main(){
 assert.ok(BUILD);fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(BUILD,'.'+new URL(req.url,'http://local').pathname);
  if(!file.startsWith(BUILD+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(e,data)=>{
   if(e){res.writeHead(404).end();return}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data);
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const report={status:'RUNNING',cases:[],errors:[]};let browser,page;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport,recordVideo:{dir:OUT,size:viewport}});
   page=await context.newPage();
   await installFixture(page,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
   await page.addScriptTag({path:path.join(ROOT,'design/xianxia-liangyi-integration-2026-10-30/qa/liangyi-observer.js')});
   await page.evaluate(()=>window.installLiangyiIntegrationObserver());
   for(const rank of [1,10]){
    await page.evaluate(rank=>{
     window.__prepareLiangyiIntegration({rank});
     const h=window.__towerTest.host;h.run._playtestAssist=false;
     for(let n=0;n<75;n++)window.__stepLiangyiIntegration();
     if(h.overlay)h.overlay.active=false;
    },rank);
    await page.waitForFunction(()=>window.__towerTest.host.formationArt.ready);
    await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading?.blocked,{},{timeout:60000});
    const still=await page.evaluate(()=>{
     const h=window.__towerTest.host;h.draw();
     const q=window.__liangyiIntegration, view=q.read(),pixels=q.pixels(),before=JSON.stringify(h.run.state);
     h.draw();const frozen=pixels===q.pixels(),readonly=before===JSON.stringify(h.run.state);
     const slot=h.formationArt.slots.find(s=>s.track);
     return {view,frozen,readonly,png:slot.surfaces.ground.canvas.toDataURL()};
    });
    assert.ok(still.frozen&&still.readonly&&still.view.ready&&still.view.runMethodsUnchanged);
    assert.equal(still.view.inspection.eyes.length,2);
    if(process.env.LIANGYI_EXPECT_ROTATION){
     const view=still.view.inspection;
     assert.ok(Math.abs(view.baseRotation-view.age*Math.PI*2/20)<1e-8);
     assert.ok(view.baseRotation>0);
     for(const [i,eye] of view.eyes.entries()){
      const y=i?.354:-.48;
      assert.ok(Math.abs(eye.x+Math.sin(view.baseRotation)*y*view.radius)<1e-6);
      assert.ok(Math.abs(eye.y+Math.cos(view.baseRotation)*y*view.radius)<1e-6);
     }
    }
    fs.writeFileSync(path.join(OUT,`ground-${viewport.width}-rank${rank}.png`),Buffer.from(still.png.split(',')[1],'base64'));
    await page.screenshot({path:path.join(OUT,`still-${viewport.width}-rank${rank}.png`)});
    const rain=await page.evaluate(()=>{
     for(let n=0;n<150;n++){
      const view=window.__stepLiangyiIntegration();
      if(view.inspection?.swordRain.phase==='anticipation'&&view.inspection.swordRain.progress>.75)
       return view.inspection.swordRain;
     }
     throw Error('No real sword rain observed');
    });
    if(process.env.LIANGYI_EXPECT_MONO_RAIN){
     assert.ok(rain.tones.every(t=>t==='black'||t==='white'));
     assert.equal(rain.tones.length,rain.points.length);
    }
    assert.equal(rain.points.length,5);
    assert.equal(new Set(rain.landingOffsets.map(x=>x.toFixed(2))).size,5);
    assert.ok(new Set(rain.swords.map(x=>x.progress)).size>1,'staggered descent');
    await page.screenshot({path:path.join(OUT,`rain-${viewport.width}-rank${rank}.png`)});
    // Record actual host advancement and observe real pulse events.
    await page.evaluate(rank=>{
     window.__prepareLiangyiIntegration({rank});
     const h=window.__towerTest.host;h.run._playtestAssist=false;
     if(h.overlay)h.overlay.active=false;
    },rank);
    await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading?.blocked,{},{timeout:60000});
    await page.evaluate(()=>window.__towerTest.host.run.resume());
    // Recording can slow headless frame delivery; wait for simulation completion.
    await page.waitForFunction(()=>window.__towerTest.host.run.state.time>=6.15,{},{timeout:30000});
    const end=await page.evaluate(()=>{
     const h=window.__towerTest.host,q=window.__liangyiIntegration;
     h.run.pause();
     const out={pulses:q.pulses,hits:q.hits,view:q.read()};
     h.run.state.player.hp=0;h.draw();
     out.deathClean=h.formationArt.slots.every(s=>!s.track&&!s.ground?.node.active&&!s.air?.node.active);
     h.withdraw();
     out.storageUnchanged=JSON.stringify(localStorage)===window.__lineInitial.storage;
     out.writes=window.__lineWrites;
     return out;
    });
    report.cases.push({viewport,rank,rain,frozen:still.frozen,readonly:still.readonly,still:still.view,...end});
    assert.equal(end.pulses.length,rank===10?7:6,'real pulse count');
    assert.ok(end.hits.length>0&&end.deathClean&&end.storageUnchanged);
    assert.deepEqual(end.writes,[]);
   }
   const video=page.video();await context.close();
   await video.saveAs(path.join(OUT,`realtime-${viewport.width}.webm`));
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){
  report.status='FAIL';report.error=e.stack;process.exitCode=1;
  await page?.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{});
 }finally{
  await browser?.close();await new Promise(r=>server.close(r));
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
  console.log(report.status,report.cases.length,report.error||'');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
