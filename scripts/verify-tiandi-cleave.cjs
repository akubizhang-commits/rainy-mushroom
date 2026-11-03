'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {installFixture}=require('./verify-sword-line.cjs');
const {installTelemetry,CASES}=require('./verify-sword-tiandi.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-tiandi-cleave-v2-2026-10-31');
async function main(){
 const preview=fs.mkdtempSync('/tmp/tiandi-cleave-preview-');
 fs.cpSync(path.join(ROOT,'cocos-pilot/build/web-mobile'),preview,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(preview,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(preview+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(err,bytes)=>{
   if(err){res.writeHead(404).end();return}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(bytes);
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser,activePage;const report={status:'RUNNING',cases:[],errors:[],consoleErrors:[],preview};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport,recordVideo:{dir:OUT,size:viewport}});
   const page=await context.newPage();
   activePage=page;page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});
   await installFixture(page,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
   await installTelemetry(page);
   for(const c of CASES){
    await page.evaluate(c=>window.__prepareTiandi(c),c);
    await page.waitForFunction(()=>window.__towerTest.host.tiandiArt.ready&&window.__towerTest.host.tiandiArt.bladeFrame);
    const result=await page.evaluate(()=>{
     const h=window.__towerTest.host,samples=[];
     for(let i=0;i<95;i++){
      window.__stepTiandi();
      for(const b of h.tiandiArt.blades.values())samples.push({time:h.run.state.time,id:b.id,strike:b.strike,released:b.released,
       x:b.x,y:b.y,lift:b.lift,pivotX:b.pivotX,pivotY:b.pivotY,tipX:b.tipX,tipY:b.tipY,toX:b.toX,toY:b.toY,ratio:b.ui?.width/b.ui?.height,
       hitWidth:b.width,hit:b.hit,alpha:b.sprite?.color.a});
     }
     return {samples,remaining:h.tiandiArt.blades.size,hits:window.__tiandiQA.hits,effects:[...window.__tiandiQA.effects.values()]};
    });
    report.cases.push({viewport,fixture:c,...result});
    assert.equal(result.effects.length,1);assert.equal(new Set(result.samples.map(s=>s.id)).size,1,'one gathered sword becomes one heavy strike');
    assert.ok(result.samples.some(s=>s.time<s.strike-.15&&s.tipY>s.pivotY+80),'visible overhead gather');
    for(const s of result.samples){
     const length=Math.hypot(s.toX-s.x,s.toY-s.y);
     assert.ok(Math.abs(Math.hypot(s.pivotX-s.x,s.pivotY-s.y-s.lift)-Math.min(96,length*.3))<1e-4,'sword moves forward one body in every direction');
     assert.ok(Math.abs(s.ratio-1280/224)<1e-4,'gather and swing preserve proportions');
    }
    for(const s of result.samples.filter(s=>s.released)){
     assert.ok(Math.abs(s.tipX-s.toX)<1e-4&&Math.abs(s.tipY-s.toY)<1e-4,'landed tip matches actual clipped endpoint');
     assert.ok(Math.abs(s.ratio-1280/224)<1e-4,'blade proportions remain constant');
    }
    assert.equal(result.remaining,0);
   }
   await page.waitForFunction(()=>!!window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
   // Real cast samples, paused only for close inspection.
   await page.evaluate(c=>window.__prepareTiandi(c),CASES[0]);
   for(const [label,ticks] of [['gather',16],['swing',10],['impact',3],['tail',9]]){
    await page.evaluate(n=>{for(let i=0;i<n;i++)window.__stepTiandi();const h=window.__towerTest.host;if(h.overlay)h.overlay.active=false},ticks);
    await page.waitForTimeout(70);await page.screenshot({path:path.join(OUT,`${label}-${viewport.width}.png`)});
   }
   // End of raw capture: two ranks, each in an uninterrupted production update loop.
   for(const c of [CASES[0],CASES[3]]){
    await page.evaluate(c=>{window.__prepareTiandi(c);const h=window.__towerTest.host;if(h.overlay)h.overlay.active=false},c);
    await page.waitForTimeout(300);await page.evaluate(()=>window.__towerTest.host.run.resume());
    await page.waitForTimeout(2300);await page.evaluate(()=>window.__towerTest.host.run.pause());
   }
   const cleanup=await page.evaluate(()=>{
    const h=window.__towerTest.host;h.withdraw();
    return {blades:h.tiandiArt.blades.size,tracks:h.tiandiArt.tracks.size,writes:window.__lineWrites,
     unchanged:JSON.stringify(localStorage)===window.__lineInitial.storage};
   });
   assert.equal(cleanup.blades,0);assert.equal(cleanup.tracks,0);assert.deepEqual(cleanup.writes,[]);assert.ok(cleanup.unchanged);
   const video=page.video();await context.close();await video.saveAs(path.join(OUT,`raw-${viewport.width}.webm`));
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await activePage?.screenshot({path:path.join(OUT,`failure-${Date.now()}.png`)})}
 finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(report.status,report.cases.length);if(report.error)console.error(report.error)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
