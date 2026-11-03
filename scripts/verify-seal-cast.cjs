'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-sword-seal-cast-2026-11-01/flight-qi-fix/qa');
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
  await page.waitForFunction(()=>window.__towerTest.host.characterArt?.sealFrames?.length===36);
  const cases=[['sj_yujian',1,false],['sj_formation',-1,false],['sj_yujian',1,true],['evo_sixiang',-1,true]];
  for(const skill of ['sj_arc','sj_cross','sj_line','evo_tiandi'])
   for(const face of [1,-1])for(const flying of [false,true])cases.push([skill,face,flying]);
  for(const [skill,face,flying] of cases){
   const data=await page.evaluate(({skill,face,flying})=>{
    const h=window.__towerTest.host,s=h.run.state;
    s.phase='paused';s.time=10.3;s.player.hp=100;s.player.faceX=face;
    s.loadout.passive={...s.loadout.passive,sj_flight:flying?1:0};
    s.actions={current:{skill,startedAt:10,releaseAt:10.3,endsAt:10.5,dirX:face,dirY:0},basic:null};
    h.draw();
    const a=h.characterArt,f=a.body.spriteFrame;
    const clip=flying?a.atlas.clips.flightSlash:a.atlas.clips.slash;
    const releaseIndex=a.frames.indexOf(f);
    s.time=10.1;h.draw();const windupIndex=a.frames.indexOf(a.body.spriteFrame);
    s.time=10.3;h.draw();
    return {skill,face,flying,sealFrame:a.sealFrames.indexOf(f),baseFrame:releaseIndex,
      windupIndex,slashMatch:clip.frames.includes(releaseIndex)&&clip.frames.includes(windupIndex)&&releaseIndex!==windupIndex,
      scaleX:a.root.scale.x,waist:a.waistPosition,time:s.time};
   },{skill,face,flying});
   if(['sj_arc','sj_cross','sj_line','evo_tiandi'].includes(skill))assert.ok(data.slashMatch,JSON.stringify(data));
   else {assert.ok(data.sealFrame>=0);assert.ok(data.scaleX>0)}
   await page.screenshot({path:path.join(OUT,`${skill}-${face}-${flying?'flight':'ground'}.png`)});
   report.cases.push(data);
  }
  const frozen=await page.evaluate(()=>{const h=window.__towerTest.host;return {time:h.run.state.time,frame:h.characterArt.body.spriteFrame.rect}});
  await page.waitForTimeout(180);
  assert.deepEqual(await page.evaluate(()=>{const h=window.__towerTest.host;return {time:h.run.state.time,frame:h.characterArt.body.spriteFrame.rect}}),frozen);
  await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.player.hp=0;h.draw()});
  assert.equal(await page.evaluate(()=>window.__towerTest.host.characterArt.root.active),false);
  report.live=await page.evaluate(()=>{
   const h=window.__towerTest.host;h.enterTraining();
   const s=h.run.state,a=h.characterArt,p=s.player,template=s.pending[0];
   s.loadout.growthVersion=1;s.loadout.active={sj_formation:1,sj_arc:1};s.loadout.passive={sj_flight:1};
   s.loadout.evolutions=[];s.loadout.evolutionLevels={};s.cooldowns={sj_formation:0,sj_arc:0};
   const e=h.run._enemy({...template,id:'seal-review-target',x:p.x+100,y:p.y});
   e.hp=e.maxHp=1e8;e.moveSpeed=0;e.ai.readyAt=e.ai.graceUntil=e.ai.entryUntil=1e8;
   s.enemies=[e];s.pending=[];s.reserved=[];s.wavePlanned=1;s.waveKilled=0;
   const start=p.x,seen=[],events=[];h.run.setInput(.3,0);
   for(let i=0;i<180;i++){
    const before=a.sample(s);h.run.advance(1/60,event=>{events.push(event.skill);a.observeCast(event)});
    a.observe(before,s);h.draw();
    const live=s.actions?.current;
    if(live)seen.push({skill:live.skill,seal:a.sealFrames.indexOf(a.body.spriteFrame),base:a.frames.indexOf(a.body.spriteFrame)});
   }
   h.run.pause();h.draw();
   return {moved:p.x-start,events,sealSamples:seen.filter(x=>x.skill==='sj_formation'&&x.seal>=0).length,
    slashSamples:seen.filter(x=>x.skill==='sj_arc'&&a.atlas.clips.flightSlash.frames.includes(x.base)).length};
  });
  assert.ok(report.live.moved>0,'casting must retain movement');
  assert.ok(report.live.sealSamples>0,'real formation action must render seal');
  assert.ok(report.live.slashSamples>0,'real qi action must retain slash');
  assert.deepEqual(report.errors,[]);
  report.status='PASS';report.note='Real Cocos renderer in training arena: controlled pause snapshots plus live moving formation/qi casts.';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;
  if(page)await page.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{})}
 finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length)}
}
main();
