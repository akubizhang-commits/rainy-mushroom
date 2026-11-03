'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(process.env.MARK_OUT||path.join(ROOT,'design/xianxia-qingping-feel-2026-10-31/browser'));
async function main(){
 fs.mkdirSync(OUT,{recursive:true});const snapshot=fs.mkdtempSync('/tmp/qingping-preview-');fs.cpSync(path.join(ROOT,'cocos-pilot/build/web-mobile'),snapshot,{recursive:true});
 const server=createServer((req,res)=>{const f=path.resolve(snapshot,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(snapshot+path.sep)){res.writeHead(403).end();return}fs.readFile(f,(e,data)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(data)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const report={status:'RUNNING',snapshot,cases:[],errors:[],consoleErrors:[],recordings:[]};let browser,page;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport,recordVideo:{dir:OUT,size:viewport}});page=await context.newPage();page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});
   await installFixture(page,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
   await page.evaluate(()=>{
    window.__prepareMark=(rank,kill=true)=>{
     window.__prepareLine({rank:1,angle:0,reach:400,origin:{x:-140,y:-80}});
     const h=window.__towerTest.host,s=h.run.state,p=s.player,template=s.enemies[0];
     s.loadout.active={sj_yujian:1};s.loadout.passive={sj_mark:kill?rank:0};s.cooldowns={sj_yujian:0};s.gateEntries=[];s.gateReadyAt=0;
     p.attack=200;p.hp=p.maxHp;
     s.enemies=Array.from({length:1},(_,i)=>{const e=JSON.parse(JSON.stringify(template));e.id=`aftershock-${i}`;
      e.x=p.x+140+(i===0?0:i===4?220:35);e.y=p.y+(i===0||i===4?0:(i-2)*22);
      e.hp=e.maxHp=300;return e});
     const run=h.run,originalDamage=run._damageEnemy.bind(run);window.__markDirectHits=0;
     run._damageEnemy=(hit)=>{originalDamage(hit);if(hit.direct&&!hit.scaled){window.__markDirectHits++;s.cooldowns.sj_yujian=9999;s.casts=[];s.projectiles=s.projectiles.filter(p=>p.hostile)}};
     s.wavePlanned=1;s.waveKilled=0;h.draw();if(h.overlay)h.overlay.active=false;
    };
   });
   for(const rank of [1,4]){
    await page.evaluate(rank=>window.__prepareMark(rank),rank);
    const result=await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state;let readonly=true,peak=0,damage=0,pendingClean=true,maxRecoil=0;const hits=new Set(),contacts=new Map();
     for(let i=0;i<240;i++){
      window.__stepLine();
      if(i===60){s.cooldowns.sj_yujian=9999;s.projectiles=s.projectiles.filter(p=>p.hostile)}
      pendingClean&&=s.enemies.every(e=>!e.qingping||e.qingping.applied||e.woundBudget===0);
      for(const pose of h.hitArt.poses)if(pose.skill==='sj_mark')maxRecoil=Math.max(maxRecoil,Math.hypot(pose.x,pose.y));
      for(const event of s.effects)if(event.impact?.skill==='sj_mark')contacts.set(event.id,event);
      peak=Math.max(peak,s.enemies.filter(e=>e.woundBudget>0).length);
      const before=JSON.stringify(s);h.draw();readonly&&=before===JSON.stringify(s);
      for(const e of s.effects)if(e.kind==='hit'&&e.source==='wound'&&!hits.has(e.id)){hits.add(e.id);damage+=e.damage}
     }
     return {pendingClean,maxRecoil,contacts:Array.from(contacts.values()),directHits:window.__markDirectHits,readonly,peak,damage,remaining:s.enemies.filter(e=>e.woundBudget>1e-8).length};
    });
    assert.ok(result.pendingClean);assert.equal(result.contacts.length,1);assert.ok(result.maxRecoil>0&&result.maxRecoil<6);assert.equal(result.directHits,1);assert.ok(result.readonly&&result.peak>0&&result.damage>0);assert.equal(result.remaining,0);report.cases.push({viewport,rank,...result});
   }
   await page.waitForFunction(()=>window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
   await page.locator('canvas').click({position:{x:500,y:240}});
   await page.evaluate(()=>{window.__prepareMark(4);const label=document.createElement('div');label.style.cssText='position:fixed;left:50%;bottom:26px;transform:translateX(-50%);padding:8px 18px;background:#102d2ddd;color:#eaffff;font:20px sans-serif;border-radius:6px;pointer-events:none';label.textContent='青萍剑意 · 落剑生效 / 短促顿挫 / 一剑留痕';document.body.appendChild(label)});
   await page.waitForTimeout(250);
   await page.waitForFunction(()=>window.__towerTest.host.qingpingAudio.clips.size===2);
   await page.evaluate(()=>{window.__qingpingSoundEvents=[];const a=window.__towerTest.host.qingpingAudio,original=a.sources.set.bind(a.sources);a.sources.set=(name,source)=>{source.node.on("started",played=>{if(played===source)window.__qingpingSoundEvents.push({name,wall:performance.now(),time:window.__towerTest.host.run.state.time})});return original(name,source)}});
   const start=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.resume();return {time:h.run.state.time,wall:performance.now()}});
   await page.waitForTimeout(1200);
   await page.evaluate(()=>{const s=window.__towerTest.host.run.state;s.cooldowns.sj_yujian=9999;s.projectiles=s.projectiles.filter(p=>p.hostile)});
   await page.waitForTimeout(3200);
   const end=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.pause();return {time:h.run.state.time,wall:performance.now()}});
   const audio=await page.evaluate(()=>window.__qingpingSoundEvents);report.recordings.push({viewport,start,end,audio});assert.deepEqual(audio.map(e=>e.name),["swoosh","impact"]);
   const cleanup=await page.evaluate(()=>{const h=window.__towerTest.host;h.withdraw();return {audioSources:h.qingpingAudio.sources.size,tracks:h.burstArt?.bursts.size||0,writes:window.__lineWrites,unchanged:JSON.stringify(localStorage)===window.__lineInitial.storage}});
   assert.equal(cleanup.audioSources,0);assert.equal(cleanup.tracks,0);assert.deepEqual(cleanup.writes,[]);assert.ok(cleanup.unchanged);
   const video=page.video();await context.close();await video.saveAs(path.join(OUT,`raw-${viewport.width}.webm`));
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await page?.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{})}
 finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.cases.length);if(report.error)console.error(report.error)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
