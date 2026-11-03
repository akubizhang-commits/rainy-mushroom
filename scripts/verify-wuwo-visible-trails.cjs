'use strict';
// Observe the native production renderer in an isolated memory training session.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http'),{execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..'),BUILD=path.resolve(process.env.WUWO_BUILD_ROOT||'cocos-pilot/build/web-mobile');
const {installFixture,cleanup,assertCleanup}=require(path.join(ROOT,'scripts/verify-sword-line.cjs'));
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const near=(a,b,m)=>assert.ok(Math.abs(a-b)<1e-4,`${m}: ${a} != ${b}`);
const sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(d,e.name)):[path.join(d,e.name)]);
let forms,pose;
async function setup(page,url,errors){
 await installFixture(page,url,errors);
 await page.evaluate(forms=>{
  const h=window.__towerTest.host;
  window.__wuwo={
   read(){
    const s=h.run.state,a=h.orbitArt;
    return {time:s.time,player:{x:s.player.x,y:s.player.y},camera:{...h.camera},waist:{...h.characterArt.waistPosition},
     ring:a.flowNode?{x:a.flowNode.position.x,y:a.flowNode.position.y,active:a.flowNode.active,alpha:a.flowSprite.color.a}:null,rank:s.loadout.evolutionLevels.evo_wuwo||0,ready:a.ready,failed:a.failed,pool:a.actors.map(x=>x.node.uuid),
     history:a.historyCount,flow:!!a.flowNode?.active,characterSibling:h.characterLayer.getSiblingIndex(),
     actors:a.actors.filter(x=>x.node.active).map(x=>({id:x.node.uuid,x:x.node.position.x,y:x.node.position.y,
      aura:!!x.auraNode?.active,angle:x.node.angle,width:x.ui.width,depth:x.node.towerGroundY,sibling:x.node.getSiblingIndex(),
      trails:x.lastTrail.map(t=>({...t,points:t.points.map(p=>({...p}))}))})),
     hits:s.effects.filter(e=>e.kind==='hit'&&e.source==='evo_wuwo').map(e=>({...e}))};
   },
   prepare(rank,flying=false){
    if(h.run)h.withdraw();h.campElapsed=0;h.enterTraining();h.run.pause();
    const s=h.run.state,p=s.player,template=s.pending[0];
    s.arenaVersion=1;s.loadout.growthVersion=1;s.loadout.active={sj_wanjian:10};
    s.loadout.passive=flying?{sj_flight:1}:{};s.loadout.evolutions=rank?['evo_wuwo']:[];
    s.loadout.evolutionLevels=rank?{evo_wuwo:rank}:{};s.cooldowns={sj_wanjian:0};s.orbitUntil=1e8;
    p.x=33;p.y=-60;p.hp=p.maxHp;p.faceX=1;p.faceY=0;
    s.casts=[];s.zones=[];s.effects=[];s.projectiles=[];s.drops=[];s.reserved=[];
    s.enemies=[[-100,0],[105,8],[0,-90]].map(([x,y],i)=>{
     const e=h.run._enemy({...template,id:`wuwo-qa-${i}`,x:p.x+x,y:p.y+y});
     e.hp=e.maxHp=1e8;e.moveSpeed=0;e.ai.readyAt=e.ai.graceUntil=e.ai.entryUntil=1e8;e.orbitNextAt=0;return e;
    });
    s.pending=[];s.wavePlanned=3;s.waveKilled=0;h.keys.clear();h.touch=null;h.stick.dx=h.stick.dy=0;
    h.characterArt.reset();h.draw();
   },
   step(dx=0,dy=0){
    const s=h.run.state,before=h.characterArt.sample(s);
    h.run.resume();h.run.setInput(dx,dy);h.run.advance(1/60,e=>h.characterArt.observeCast(e));h.run.pause();
    h.characterArt.observe(before,s);h.draw();return this.read();
   },
   scan(){
    const s=h.run.state,before=JSON.stringify(s),g=h.world,e=h.skillEffects,blade=e.blade,blades=[];
    e.blade=function(...a){blades.push(a.slice(1));return blade.apply(this,a)};
    try{h.draw()}finally{e.blade=blade}
    return {readonly:before===JSON.stringify(s),blades,view:this.read()};
   }
  };
  window.__wuwo.prepare(1);
 },forms);
 await page.waitForFunction(()=>{
  const h=window.__towerTest.host;h.draw();
  return h.characterArt.waistPosition&&h.environmentArt.nodes.get('floor')?.active;
 });
}
function check(v,fallback=false){
 const form=forms[v.rank],waist=v.waist;
 assert.ok(v.waist.y-(v.player.y-v.camera.y)>45,'anchor above feet at belt');
 if(fallback){assert.equal(v.actors.length,0);assert.equal(v.ready,false);return}
 assert.equal(v.actors.length,form.swords);
 assert.ok(v.history>0&&v.history<=64);
 if(v.rank&&v.ring?.active){near(v.ring.x,v.player.x-v.camera.x,'ring ground X');near(v.ring.y,v.player.y-v.camera.y,'ring ground Y');assert.ok(v.actors.every(a=>!a.aura),'blade light is removed')}
 for(const [i,a] of v.actors.entries()){
  const p=pose(form,v.time,i);
  near(a.x,waist.x+p.x,'waist X');near(a.y,waist.y+p.y,'waist Y');
  near(a.angle,p.angle*180/Math.PI,'tangent heading');near(a.width*496/544,p.length??form.bladeLength,'sword span');
  near(a.depth,v.player.y+(p.depthY??p.y),'unlifted depth');
  const depth=p.depthY??p.y;
  if(depth>1e-5)assert.ok(a.sibling<v.characterSibling,'back sword occluded');
  if(depth< -1e-5)assert.ok(a.sibling>v.characterSibling,'front sword visible');
  for(const t of a.trails)assert.ok(v.time-t.points[0].time<=(v.rank?.900001:.180001));
 }
}
async function prepare(page,rank,fallback=false,flying=false){
 await page.evaluate(({rank,flying})=>window.__wuwo.prepare(rank,flying),{rank,flying});
 await page.waitForFunction(fallback=>{
  const h=window.__towerTest.host;h.draw();
  return fallback?h.orbitArt.failed:h.orbitArt.ready&&(!h.run.state.loadout.evolutionLevels.evo_wuwo||!!h.orbitArt.flowFrame);
 },fallback);
 const scan=await page.evaluate(()=>window.__wuwo.scan());
 assert.ok(scan.readonly);check(scan.view,fallback);
 assert.equal(scan.blades.length,fallback?forms[rank].swords:0);
 if(fallback)for(const [i,b] of scan.blades.entries()){
  const p=pose(forms[rank],scan.view.time,i),w=scan.view.waist;
  near(b[0],w.x+p.baseX,'fallback base X');near(b[1],w.y+p.baseY,'fallback base Y');
 }
 return scan.view;
}
async function record(page,rank,moving,out){
 const initial=await prepare(page,rank);
 const result=await page.evaluate(async moving=>{
  const h=window.__towerTest.host,q=window.__wuwo,run=h.run,samples=[],hits=new Map();
  const stream=document.querySelector('#GameCanvas').captureStream(30),chunks=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6000000});
  const stopped=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=resolve});
  const start=run.state.time,timer=setInterval(()=>{
   const v=q.read();samples.push(v);for(const e of v.hits)hits.set(e.id,e);
  },40),timers=[];
  if(moving){
   h.touch=991;h.stick.dx=-.4;h.stick.dy=0;
   timers.push(setTimeout(()=>{h.stick.dx=.4},1200),setTimeout(()=>{h.stick.dx=0;h.stick.dy=.3},2400));
  }
  recorder.start();run.resume();await new Promise(resolve=>setTimeout(resolve,6500));
  h.touch=null;h.stick.dx=h.stick.dy=0;timers.forEach(clearTimeout);run.pause();h.draw();
  clearInterval(timer);recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
  const data=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(new Blob(chunks,{type:'video/webm'}))});
  return {data,samples,hits:[...hits.values()],elapsed:run.state.time-start};
 },moving);
 const name=`wuwo-rank-${rank}${moving?'-moving':''}`;
 fs.writeFileSync(path.join(out,name+'.webm'),Buffer.from(result.data.split(',')[1],'base64'));delete result.data;
 fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({initial,...result},null,2));
 assert.ok(result.elapsed>5.8&&result.elapsed<7.2,'native speed');
 for(const v of result.samples){check(v);assert.deepEqual(v.pool,initial.pool,'no per-frame node creation')}
 assert.ok(result.hits.length>0,'real combat hit observed');
 for(const e of result.hits)assert.ok(e.damage>0&&e.targetRadius>0&&e.targetId);
 for(const id of new Set(result.hits.map(e=>e.targetId))){
  const hits=result.hits.filter(e=>e.targetId===id).sort((a,b)=>a.startedAt-b.startedAt);
  for(let i=1;i<hits.length;i++)assert.ok(hits[i].startedAt-hits[i-1].startedAt>=.6-1e-6,'shared contact interval');
 }
 const ff='/opt/homebrew/bin/ffmpeg';
 execFileSync(ff,['-v','error','-i',path.join(out,name+'.webm'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',path.join(out,name+'.mp4')]);
 execFileSync(ff,['-v','error','-ss','1','-i',path.join(out,name+'.mp4'),'-frames:v','1',path.join(out,name+'.png')]);
 return {name,framesObserved:result.samples.length,hits:result.hits.length,seconds:result.elapsed};
}
async function lifecycle(page){
 await prepare(page,2);
 const movement=await page.evaluate(()=>{
  const q=window.__wuwo;let v;for(let i=0;i<40;i++)v=q.step(.4,0);
  const h=window.__towerTest.host,before=q.read(),state=JSON.stringify(h.run.state);
  h.orbitArt.clearBindings();h.draw();const after=q.read();
  return {before,after,readonly:state===JSON.stringify(h.run.state)};
 });
 check(movement.before);check(movement.after);assert.ok(movement.readonly);
 assert.deepEqual(movement.after.actors.map(a=>a.trails),movement.before.actors.map(a=>a.trails),'pause rebuild retains sampled path');
 const normal=await prepare(page,2,false,false),flying=await prepare(page,2,false,true);
 assert.ok(Number.isFinite(flying.waist.y),'flight waist remains valid');
 await prepare(page,0);await page.evaluate(()=>window.__wuwo.step());const base=await page.evaluate(()=>window.__wuwo.read());check(base);assert.equal(base.flow,false);
 const dead=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.player.hp=0;h.draw();return window.__wuwo.read()});
 assert.equal(dead.actors.length,0);assert.equal(dead.flow,false);
 return {movingRebuild:true,flightLift:flying.waist.y-normal.waist.y,baseCount:base.actors.length,deathHidden:true};
}
async function main(){
 const shared=await import(pathToFileURL(path.join(ROOT,'js/xianxia/TowerSkillForms.js')));
 pose=shared.orbitSwordPose;forms={0:shared.skillForm('sj_wanjian',10),1:shared.skillForm('evo_wuwo',1,10),2:shared.skillForm('evo_wuwo',2,10)};
 let out,n=1;do{out=path.join(ROOT,'design/xianxia-wuwo-visible-trails-2026-11-02/browser',`attempt-${String(n++).padStart(2,'0')}`)}while(fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
 fs.copyFileSync(__filename,path.join(out,'verify-wuwo.snapshot.cjs'));
 const sourceFiles=['js/xianxia/WuwoMotion.js','js/xianxia/TowerSkillForms.js','js/xianxia/TowerRun.js','cocos-pilot/assets/scripts/OrbitSwordArt.ts','cocos-pilot/assets/scripts/TowerCharacterArt.ts','cocos-pilot/assets/scripts/TowerSkillEffects.ts','cocos-pilot/assets/scripts/TowerView.ts'];
 const fingerprint=()=>Object.fromEntries(sourceFiles.map(f=>[f,sha(path.join(ROOT,f))]));
 const report={status:'RUNNING',build:BUILD,sourceBefore:fingerprint(),forms,recordings:[],errors:[],generationCalls:0};
 const sword=sha(path.join(ROOT,'cocos-pilot/assets/resources/tower-skill-fx/orbit-sword-v1.png'));
 const uuid=JSON.parse(fs.readFileSync(path.join(ROOT,'cocos-pilot/assets/resources/tower-skill-fx/orbit-sword-v1.png.meta'))).uuid;
 const native=files(BUILD).filter(f=>path.basename(f).startsWith(uuid+'.')&&f.endsWith('.png')&&sha(f)===sword);assert.equal(native.length,1);
 const blockedPath='/'+path.relative(BUILD,native[0]);
 const server=createServer((req,res)=>{
  const file=path.resolve(BUILD,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(BUILD+path.sep))return res.writeHead(403).end();
  const type={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'};
  fs.readFile(file,(error,b)=>{if(error)return res.writeHead(404).end();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',type[path.extname(file)]||'application/octet-stream');res.end(b)});
 });
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`;
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();
  await setup(page,url,report.errors);
  if(!process.env.WUWO_COMPACT_ONLY)
   for(const [rank,moving] of [[1,false],[2,false],[2,true]]){console.log('Record',rank,moving);report.recordings.push(await record(page,rank,moving,out))}
  report.lifecycle=await lifecycle(page);
  await page.setViewportSize({width:844,height:390});
  await page.waitForFunction(()=>document.querySelector('#GameCanvas')?.clientWidth<=844);
  if(process.env.WUWO_COMPACT_ONLY)
   for(const rank of [1,2])report.recordings.push(await record(page,rank,false,out));
  await prepare(page,2);
  const small=await page.evaluate(()=>{for(let i=0;i<50;i++)window.__wuwo.step();return window.__wuwo.read()});
  check(small);await page.screenshot({path:path.join(out,'wuwo-small-landscape.png')});
  report.smallLandscape={viewport:{width:844,height:390},view:small};
  report.cleanup=await cleanup(page);assertCleanup(report.cleanup);await context.close();
  const failContext=await browser.newContext({viewport:{width:1280,height:720}}),blocked=[];
  await failContext.route('**/*',r=>{
   if(new URL(r.request().url()).pathname===blockedPath){blocked.push(r.request().url());return r.fulfill({status:404,body:''})}return r.continue();
  });
  const failPage=await failContext.newPage();await setup(failPage,url,report.errors);
  // Current resource queue holds gameplay until failed assets can be retried.
  // It intentionally does not call the old renderer error callback.
  await failPage.waitForFunction(()=>window.__towerTest.host.host.assetQueue.state.failed>0);
  const failed=await failPage.evaluate(()=>{
   const h=window.__towerTest.host;
   return {blocked:h.host.assetLoading.blocked,ready:h.orbitArt.ready,time:h.run.state.time};
  });
  assert.ok(blocked.length&&failed.blocked&&!failed.ready);
  await failPage.waitForTimeout(200);
  assert.equal(await failPage.evaluate(()=>window.__towerTest.host.run.state.time),failed.time);
  await failContext.unroute('**/*');
  await failPage.evaluate(()=>window.__towerTest.host.host.assetQueue.retryFailed());
  await failPage.waitForFunction(()=>{
   const h=window.__towerTest.host;h.draw();
   return h.orbitArt.ready&&h.orbitArt.flowFrame&&!h.host.assetLoading.blocked;
  });
  const recovered=await prepare(failPage,2);check(recovered);
  report.fallback={blocked:blocked.length,loadingHeld:true,retryRecovered:true};
  report.fallback.cleanup=await cleanup(failPage);assertCleanup(report.fallback.cleanup);
  await failContext.close();assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;console.error(e.stack)}
 finally{
  report.sourceAfter=fingerprint();report.sourceUnchanged=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);
  if(!report.sourceUnchanged){report.status='FAIL';process.exitCode=1}
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));
  if(browser)await browser.close();server.close();console.log(report.status,out);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
