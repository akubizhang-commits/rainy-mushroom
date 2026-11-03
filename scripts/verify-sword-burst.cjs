'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(process.env.BURST_OUT||path.join(ROOT,'design/xianxia-sword-burst-2026-10-31/browser'));
async function main(){
 fs.mkdirSync(OUT,{recursive:true});const snapshot=fs.mkdtempSync('/tmp/aftershock-preview-');fs.cpSync(path.join(ROOT,'cocos-pilot/build/web-mobile'),snapshot,{recursive:true});
 const server=createServer((req,res)=>{const f=path.resolve(snapshot,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(snapshot+path.sep)){res.writeHead(403).end();return}fs.readFile(f,(e,data)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(data)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const report={status:'RUNNING',snapshot,cases:[],errors:[],consoleErrors:[],recordings:[]};let browser,page;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport,recordVideo:{dir:OUT,size:viewport}});page=await context.newPage();page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});
   await installFixture(page,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
   await page.evaluate(()=>{
    window.__prepareAftershock=(rank,kill=true)=>{
     window.__prepareLine({rank:1,angle:0,reach:400,origin:{x:-140,y:-80}});
     const h=window.__towerTest.host,s=h.run.state,p=s.player,template=s.enemies[0];
     s.loadout.active={sj_yujian:1};s.loadout.passive={sj_gate:kill?rank:0};s.cooldowns={sj_yujian:0};s.gateEntries=[];s.gateReadyAt=0;
     p.attack=200;p.hp=p.maxHp;
     s.enemies=Array.from({length:5},(_,i)=>{const e=JSON.parse(JSON.stringify(template));e.id=`aftershock-${i}`;
      e.x=p.x+140+(i===0?0:i===4?220:35);e.y=p.y+(i===0||i===4?0:(i-2)*22);
      e.hp=e.maxHp=1e8;return e});
     s.wavePlanned=5;s.waveKilled=0;h.draw();if(h.overlay)h.overlay.active=false;
    };
   });
   for(const rank of [1,4]){
    await page.evaluate(rank=>window.__prepareAftershock(rank),rank);await page.waitForFunction(()=>{const h=window.__towerTest.host;h.draw();return h.monsterArt.actors.size>0});
    const result=await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state,bursts=new Map(),hits=new Map();let stable=true,readonly=true,peak=0,maxStacks=0,maxSwords=0,oldGate=0;
     for(let i=0;i<240;i++){
      window.__stepLine();maxStacks=Math.max(maxStacks,...s.enemies.map(e=>e.swordBurst?.stacks||0));maxSwords=Math.max(maxSwords,h.burstArt.actors.size);oldGate+=s.effects.filter(e=>e.kind==='gate').length;for(const e of s.effects){if(e.kind==='sword_burst')bursts.set(e.id,{...e});if(e.kind==='hit'&&e.source==='sword_burst')hits.set(e.id,{...e})}
      peak=Math.max(peak,h.burstArt.bursts.size);
      if(h.burstArt.bursts.size){const before=JSON.stringify(s),tracks=JSON.stringify(Array.from(h.burstArt.bursts));h.draw();readonly&&=before===JSON.stringify(s);stable&&=tracks===JSON.stringify(Array.from(h.burstArt.bursts))}
     }
     return {maxStacks,maxSwords,oldGate,bursts:Array.from(bursts.values()),hits:Array.from(hits.values()),peak,stable,readonly,remaining:h.burstArt.bursts.size,kills:s.waveKilled};
    });
    assert.ok(result.bursts.length>=1);assert.equal(result.bursts[0].radius,rank===1?80:110);assert.equal(result.hits.length,result.bursts.length*4);assert.ok(result.hits.every(h=>h.damage>0&&h.targetId!=='aftershock-4'));assert.ok(result.stable&&result.readonly);assert.equal(result.oldGate,0);assert.equal(result.maxStacks,0);assert.ok(result.maxSwords>=4);
    report.cases.push({viewport,rank,...result});
   }
   await page.evaluate(()=>window.__prepareAftershock(4,false));const noKill=await page.evaluate(()=>{const h=window.__towerTest.host;let bursts=0;for(let i=0;i<120;i++){window.__stepLine();bursts+=h.run.state.effects.filter(e=>e.kind==='sword_burst').length}return bursts});assert.equal(noKill,0);
   await page.waitForFunction(()=>window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
   await page.locator('canvas').click({position:{x:500,y:240}});
   await page.evaluate(()=>{window.__prepareAftershock(4);const label=document.createElement('div');label.style.cssText='position:fixed;left:50%;bottom:26px;transform:translateX(-50%);padding:8px 18px;background:#102d2ddd;color:#eaffff;font:20px sans-serif;border-radius:6px;pointer-events:none';label.textContent='剑罡爆裂 · 一次起手 / 四剑连刺 / 白金爆裂';document.body.appendChild(label)});
   await page.waitForTimeout(250);
   await page.evaluate(()=>{const a=window.__towerTest.host.burstArt;window.__burstAudioPlayed=0;if(a.sound){const original=a.sound.play.bind(a.sound);a.sound.play=()=>{window.__burstAudioPlayed++;return original()}}});
   const start=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.resume();return {time:h.run.state.time,wall:performance.now()}});
   await page.waitForTimeout(4400);
   const end=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.pause();return {time:h.run.state.time,wall:performance.now()}});
   const audio=await page.evaluate(()=>({plays:window.__burstAudioPlayed,loaded:!!window.__towerTest.host.burstArt.clip}));assert.ok(audio.loaded);assert.ok(audio.plays>0);report.recordings.push({viewport,start,end,audio});
   const cleanup=await page.evaluate(()=>{const h=window.__towerTest.host;h.withdraw();return {tracks:h.burstArt?.bursts.size||0,writes:window.__lineWrites,unchanged:JSON.stringify(localStorage)===window.__lineInitial.storage}});
   assert.equal(cleanup.tracks,0);assert.deepEqual(cleanup.writes,[]);assert.ok(cleanup.unchanged);
   const video=page.video();await context.close();await video.saveAs(path.join(OUT,`raw-${viewport.width}.webm`));
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await page?.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{})}
 finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.cases.length);if(report.error)console.error(report.error)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
