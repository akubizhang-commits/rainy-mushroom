'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-zhoutian-waist-2026-11-02/qa-final');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const p=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!p.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
  fs.readFile(p,(e,b)=>{if(e){res.writeHead(404).end();return}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(p)]||'application/octet-stream');res.end(b)});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser,page;const report={status:'RUNNING',errors:[],consoleErrors:[],failedRequests:[],cases:[]};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  const context=await browser.newContext({viewport:{width:1280,height:720}});
  page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});
  page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),failure:r.failure()}));
  await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1&playtest=1`);
  await page.waitForFunction(()=>window.__towerTest?.host?.menu);
  await page.evaluate(()=>{const h=window.__towerTest.host;h.enterTraining();h.run.pause();h.draw()});
  await page.waitForFunction(()=>window.__towerTest.host.characterArt?.sealFrames?.length===36 && window.__towerTest.host.orbitArt.ready);
  for(const width of [1280,1560]){
   await page.setViewportSize({width,height:720});
   for(const flying of [false,true])for(const face of [1,-1]){
    const data=await page.evaluate(({flying,face})=>{
     const h=window.__towerTest.host,s=h.run.state;
     s.phase='paused';s.time=10;s.player.hp=100;s.player.faceX=face;
     s.enemies=[];s.pending=[];s.effects=[];s.projectiles=[];
     s.loadout.active={sj_wanjian:10};s.loadout.passive={sj_flight:flying?1:0};
     s.loadout.evolutions=[];s.loadout.evolutionLevels={};s.orbitUntil=100;
     s.actions={version:1,current:null,basic:null};h.draw();if(h.overlay)h.overlay.active=false;
     const a=h.orbitArt.actors.filter(a=>a.node.active),w=h.characterArt.waistPosition;
     return {flying,face,waist:w,center:{x:a.reduce((v,a)=>v+a.node.position.x,0)/a.length,y:a.reduce((v,a)=>v+a.node.position.y,0)/a.length},count:a.length};
    },{flying,face});
    assert.equal(data.count,8);assert.ok(Math.abs(data.center.x-data.waist.x)<.01);assert.ok(Math.abs(data.center.y-data.waist.y)<.01);
    await page.screenshot({path:path.join(OUT,`${width}-${face}-${flying?'flight':'ground'}.png`)});
    report.cases.push(data);
   }
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;
  if(page)await page.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{})}
 finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length)}
}
main();
