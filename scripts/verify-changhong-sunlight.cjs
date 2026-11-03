'use strict';
// Real Cocos training releases, with the existing fixture selecting only loadout
// and target placement. Production update() drives the final recording.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||
 '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {installFixture,cleanup,assertCleanup,CASES}=require('./verify-sword-line.cjs');
const ROOT=path.resolve(__dirname,'..');
const SERVE_ROOT=process.env.CHANGHONG_PREVIEW_ROOT||ROOT;
const OUT=path.join(ROOT,'design/xianxia-changhong-sunlight-2026-11-02/qa-02');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(SERVE_ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(SERVE_ROOT+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,bytes)=>{
   if(error){res.writeHead(404).end();return}
   const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'};
   res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const report={status:'RUNNING',cases:[],errors:[]};let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.UI_CHROMIUM_EXECUTABLE||
   '/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport,recordVideo:{dir:OUT,size:viewport}});
   const page=await context.newPage();
   await installFixture(page,`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
   for(const fixture of CASES){
    await page.evaluate(f=>window.__prepareLine(f),fixture);
    await page.waitForFunction(()=>{const a=window.__towerTest.host.lineArt;return a.ready&&a.swordFrame});
    await page.waitForFunction(()=>!!window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
    const result=await page.evaluate(()=>{
     const h=window.__towerTest.host;
     const before=JSON.stringify(h.run.state);
     h.draw();const readOnly=before===JSON.stringify(h.run.state);
     const samples=[];
     for(let i=0;i<120;i++){
      window.__stepLine();
      for(const [id,a] of h.lineArt.actors){
       const t=h.lineArt.tracks.get(id),s=a.sword;
       samples.push({id,time:h.run.state.time,age:h.run.state.time-t.started,length:Math.hypot(t.toX-t.x,t.toY-t.y),
        hasSword:!!s,lift:t.lift,hitCount:t.hits.length,
        angle:a.node.angle,expectedAngle:Math.atan2(t.toY-t.y,t.toX-t.x)*180/Math.PI,
        x:s?.node.position.x,y:s?.node.position.y,width:s?.ui.width,active:s?.node.active,alpha:s?.sprite.color.a});
      }
     }
     return {readOnly,samples,effects:Array.from(window.__lineRealEffects.values()),remaining:h.lineArt.actors.size,targetHp:h.run.state.enemies[0]?.hp};
    });
    assert.ok(result.readOnly);assert.equal(result.effects.length,fixture.pulses);assert.equal(result.remaining,0);
    const positions=new Map();
    for(const s of result.samples){
     assert.ok(Math.abs(s.angle-s.expectedAngle)<1e-4);
     if(!s.hasSword)continue;
     const angle=s.angle*Math.PI/180;
     assert.ok(Math.abs(s.y-s.lift*Math.cos(angle))<1e-4,'chest offset must stay world vertical');
     const axial=s.x-s.lift*Math.sin(angle);
     if(!s.active)continue;
     assert.ok(axial>=s.width*248/544-1e-4);
     assert.ok(axial+s.width*248/544<=s.length+1e-4);
     assert.ok(axial>=(positions.get(s.id)??-Infinity)-1e-4);positions.set(s.id,axial);
    }
    assert.ok(result.samples.some(s=>s.active&&s.age>.5&&s.alpha>0&&s.alpha<255),'sunlight must fade after combat expires');
    assert.equal(positions.size,1,'even a three-pulse cast must fly exactly one sword');
    if(!fixture.clipped)assert.ok(result.targetHp<1e8,'real settled damage remains intact');
    report.cases.push({viewport,fixture,result});
   }
   // Freeze actual early/mid/late cast frames for visual inspection.
   await page.evaluate(f=>window.__prepareLine(f),CASES[0]);
   for(const [name,ticks] of [['launch',2],['flight',6],['arrival',14],['afterglow',11],['end',20]]){
    await page.evaluate(n=>{
     const h=window.__towerTest.host;
     if(!window.__lineRealEffects.size)for(let i=0;i<90&&!window.__lineRealEffects.size;i++)window.__stepLine();
     for(let i=0;i<n;i++)window.__stepLine();
     if(h.overlay)h.overlay.active=false;
    },ticks);
    await page.waitForTimeout(70);
    await page.screenshot({path:path.join(OUT,`${name}-${viewport.width}.png`)});
   }
   // Last segment: a still lead-in then one real-time cast (one sword, three qi).
   await page.evaluate(f=>{
    window.__prepareLine(f);
    const h=window.__towerTest.host;if(h.overlay)h.overlay.active=false;
   },CASES[5]);
   await page.waitForTimeout(400);
   await page.evaluate(()=>window.__towerTest.host.run.resume());
   await page.waitForTimeout(2600);
   assertCleanup(await cleanup(page));
   const video=page.video();await context.close();
   await video.saveAs(path.join(OUT,`runtime-raw-${viewport.width}.webm`));
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1}
 finally{
  await browser?.close();await new Promise(r=>server.close(r));
  fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`${report.status}: ${report.cases.length} real combat cases`);
  if(report.error)console.error(report.error);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
