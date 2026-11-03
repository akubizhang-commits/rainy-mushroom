'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {pathToFileURL}=require('node:url');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/resource-pickup-2026-11-02');
async function makeFixture(){
 const {TowerCampaignStore}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/TowerCampaign.js')));
 const {TowerRun,validateTowerSnapshot}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/TowerRun.js')));
 const disk={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v}},store=new TowerCampaignStore(disk,0);
 const result=store.act({type:'startFloor',floor:1,seed:123},0);assert.ok(result.ok);
 const run=TowerRun.restore(result.snapshot);run.setPlaytestAssist(true);
 for(let i=0;i<80000&&!(run.state.drops.some(d=>d.kind==='core')&&run.state.drops.some(d=>d.kind==='material'));i++){
  for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=run.state.time+10}
  run.advance(1/60);
 }
 run.pause();const snapshot=run.snapshot();assert.ok(validateTowerSnapshot(snapshot));
 fs.writeFileSync(path.join(OUT,'game-fixture.json'),JSON.stringify(snapshot));return snapshot;
}
async function main(){
 const dir=path.join(ROOT,'cocos-pilot/build/web-mobile'),report={status:'RUNNING',cases:[],errors:[]};
 const fixture=await makeFixture();
 const server=createServer((req,res)=>{
  const file=path.resolve(dir,'.'+new URL(req.url,'http://local').pathname);
  if(!file.startsWith(dir+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data)});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport}),p=page=await context.newPage();
   await installFixture(p,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
   await p.waitForSelector('#tower-boot-loading',{state:'hidden'});
   await p.evaluate(snapshot=>{
    const h=window.__towerTest.host;h.enterTraining();h.run.pause();
    h.run=h.run.constructor.restore(snapshot);h.run.pause();h.clearBattleFeedback();
    const s=h.run.state;s.player.x=-140;s.player.y=-110;
    s.enemies.forEach(e=>{e.x=700;e.y=500});
    // Existing real reward receipts are repositioned only to inspect camera-space readability.
    let i=0;for(const d of s.drops)if(d.receipts){d.x=s.player.x+180+i*50;d.y=s.player.y-12+i*35;d.bornAt=s.time;d.readyAt=s.time+.5;d.attracting=false;i++}
    window.__pickupStep=(count=1)=>{for(let i=0;i<count;i++){s.time+=1/60;h.run._drops();s.effects=s.effects.filter(e=>e.expiresAt>s.time)}h.draw()};
    h.draw();if(h.overlay)h.overlay.active=false;
   },fixture);
   await p.waitForFunction(()=>{
    const h=window.__towerTest.host;
    return [...h.stoneArt.bindings.values()].filter(b=>b.node.name.includes(':material')).length===2
     &&[...h.stoneArt.bindings.values()].filter(b=>b.node.name.includes(':material')).every(b=>b.node.active);
   });
   const result=await p.evaluate(()=>{
    const h=window.__towerTest.host,s=h.run.state,before=JSON.stringify(s);
    h.draw();const readOnly=before===JSON.stringify(s);h.update(1);const paused=before===JSON.stringify(s);
    window.__pickupStep(150);
    return {readOnly,paused,groundCount:s.drops.filter(d=>d.receipts).length,
     materialIcons:[...h.stoneArt.bindings.values()].filter(b=>b.node.name.includes(':material')).map(b=>({name:b.node.name,visible:b.node.active}))};
   });
   assert.ok(result.readOnly&&result.paused);assert.equal(result.groundCount,3);
   await p.waitForFunction(()=>!window.__towerTest.host.host.assetLoading?.blocked);
   await p.screenshot({path:path.join(OUT,`ground-${viewport.width}.png`)});
   const flight=await p.evaluate(()=>{
    const h=window.__towerTest.host,s=h.run.state,d=s.drops.find(d=>d.kind==='core');
    s.player.x=d.x-100;s.player.y=d.y;
    const x=d.x,receipts=s.pickups.collected.length;window.__pickupStep();
    return {moved:d.x<x,remaining:s.drops.includes(d),attracting:d.attracting,uncredited:s.pickups.collected.length===receipts};
   });
   assert.ok(flight.moved&&flight.remaining&&flight.attracting&&flight.uncredited);
   await p.waitForFunction(()=>!window.__towerTest.host.host.assetLoading?.blocked);
   await p.screenshot({path:path.join(OUT,`flight-${viewport.width}.png`)});
   const arrival=await p.evaluate(()=>{
    const h=window.__towerTest.host,s=h.run.state;window.__pickupStep(16);
    return {removed:!s.drops.some(d=>d.kind==='core'),feedback:s.effects.filter(e=>e.kind==='resource_pickup').length,
     labels:h.labels.filter(l=>l.node.active).map(l=>l.string)};
   });
   assert.ok(arrival.removed&&arrival.feedback>0);assert.ok(arrival.labels.some(t=>t.includes('灵石 +60')));
   await p.waitForFunction(()=>!window.__towerTest.host.host.assetLoading?.blocked);
   await p.screenshot({path:path.join(OUT,`arrival-${viewport.width}.png`)});
   const review=await p.evaluate(()=>{
    const h=window.__towerTest.host,s=h.run.state;
    h.pickupFeedback.reset();h.draw();
    const noReplay=!h.labels.some(l=>l.node.active&&l.string.includes('灵石 +'));
    // View stress only: repeat art at 97 visible positions; no persistence or reward simulation.
    const saved=s.drops,savedEffects=s.effects;
    const template=saved.find(d=>d.kind==='material');
    s.drops=Array.from({length:97},(_,i)=>({...template,id:`ui-stress-${i}`,x:s.player.x-200+(i%12)*35,y:s.player.y-160+Math.floor(i/12)*35}));
    s.effects=[];h.run._effect('resource_pickup',s.player.x,s.player.y,0,{lootKind:'core',amount:1,expiresAt:s.time+.85});
    h.draw();
    const quantityCount=h.labels.filter(l=>l.node.active&&l.string===`×${template.amount}`).length;
    const feedbackVisible=h.labels.some(l=>l.node.active&&l.string==='灵石 +10');
    const pool=h.labels.length;s.drops=saved;s.effects=savedEffects;h.draw();
    return {noReplay,quantityCount,feedbackVisible,pool};
   });
   assert.ok(review.noReplay&&review.feedbackVisible);assert.equal(review.quantityCount,97);assert.ok(review.pool>=104);
   const end=await p.evaluate(()=>{
    const h=window.__towerTest.host,s=h.run.state;
    s.player.hp=s.player.maxHp-20;
    const hp=s.player.hp;s.drops.push({id:'heal-qa',kind:'heal',x:s.player.x+60,y:s.player.y,radius:9,amount:10,expiresAt:s.time+45});
    window.__pickupStep();const farHeal=s.player.hp===hp;
    s.drops.find(d=>d.id==='heal-qa').x=s.player.x+45;window.__pickupStep();
    const nearHeal=s.player.hp===hp+10;
    h.run.abandon();h.draw();
    return {farHeal,nearHeal,remaining:s.drops.filter(d=>d.receipts).length,
     writes:window.__lineWrites,storageUnchanged:JSON.stringify(localStorage)===window.__lineInitial.storage};
   });
   assert.ok(end.farHeal&&end.nearHeal&&end.storageUnchanged);assert.equal(end.remaining,0);assert.deepEqual(end.writes,[]);
   report.cases.push({viewport,...result,flight,arrival,review,end});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await page?.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{})}
 finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
