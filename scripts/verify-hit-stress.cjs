'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('node:http');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-game-feel-upgrade-2026-10-31/stress');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});const snapshot=fs.mkdtempSync('/tmp/hit-stress-');const approved=JSON.parse(fs.readFileSync(path.join(ROOT,'design/xianxia-game-feel-upgrade-2026-10-31/browser-02/report.json'),'utf8')).snapshot;fs.cpSync(approved,snapshot,{recursive:true});
 const server=createServer((req,res)=>{const f=path.resolve(snapshot,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!f.startsWith(snapshot+path.sep)){res.writeHead(403).end();return}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(d)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const report={errors:[],status:'RUNNING'};let browser,page;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:OUT,size:{width:1280,height:720}}});page=await context.newPage();
  await installFixture(page,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
  await page.evaluate(()=>{
   window.__prepareLine({rank:10,angle:0,reach:510,origin:{x:-160,y:-70}});const h=window.__towerTest.host,s=h.run.state,p=s.player,template=s.enemies[0];
   s.loadout.active={sj_yujian:10,sj_arc:10,sj_cross:10,sj_wanjian:10,sj_formation:10,sj_line:10,sj_shadow:10};s.loadout.evolutions=['evo_wuwo','evo_sixiang','evo_tiandi'];s.loadout.evolutionLevels={evo_wuwo:2,evo_sixiang:2,evo_tiandi:2};s.cooldowns={};
   s.enemies=Array.from({length:40},(_,i)=>{const e=JSON.parse(JSON.stringify(template));e.id=`stress-${i}`;const a=i*2*Math.PI/40;e.x=p.x+Math.cos(a)*(90+i%3*45);e.y=p.y+Math.sin(a)*(90+i%3*45);e.hp=e.maxHp=1e8;e.orbitNextAt=0;return e});h.draw();if(h.overlay)h.overlay.active=false;
   window.__stress={maxPoses:0,frames:0,bodyFrames:0,ids:new Set(),samples:[]};const draw=h.draw;h.draw=function(){draw.call(this);const q=window.__stress;if(!this.run)return;q.frames++;q.maxPoses=Math.max(q.maxPoses,this.hitArt.poses.length);if(this.hitArt.bodies.size)q.bodyFrames++;for(const p of this.hitArt.poses)q.ids.add(p.skill)};
  });
  await page.waitForFunction(()=>{const h=window.__towerTest.host;h.draw();return h.monsterArt.actors.size===40&&h.environmentArt.nodes.get('floor')?.active});
  const start=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.resume();return {x:h.run.state.player.x,y:h.run.state.player.y,time:h.run.state.time}});
  await page.locator('canvas').click({position:{x:700,y:350}});await page.keyboard.down('ArrowUp');await page.waitForTimeout(80);report.inputAtDown=await page.evaluate(()=>{const h=window.__towerTest.host;return {keys:Array.from(h.keys),input:h.run.state.input,speed:h.run.state.player.moveSpeed,blocked:h.orientationBlocked,touch:h.touch}});await page.waitForTimeout(800);await page.keyboard.up('ArrowUp');await page.waitForTimeout(1200);await page.screenshot({path:path.join(OUT,'mixed-combat.png')});await page.waitForTimeout(2100);
  report.mixed=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,q=window.__stress;h.run.pause();return {player:{x:s.player.x,y:s.player.y,time:s.time},frames:q.frames,maxPoses:q.maxPoses,bodyFrames:q.bodyFrames,skills:Array.from(q.ids)}});
  assert.ok(report.mixed.player.y>start.y+10,'keyboard movement continues during real hit feedback');assert.ok(report.mixed.player.time>start.time+1);assert.ok(report.mixed.maxPoses<=24);assert.ok(report.mixed.bodyFrames>0);assert.equal(report.mixed.skills.length,7);
  // Let a real shadow zone lock, then move its target out before the first slash.
  report.miss=await page.evaluate(()=>{
   window.__prepareLine({rank:1,angle:0,reach:500,origin:{x:-160,y:-70}});const h=window.__towerTest.host,s=h.run.state;
   s.loadout.active={sj_shadow:10};s.cooldowns={sj_shadow:0};
   let locked=false,slashes=0,hit=false,poses=false;const seen=new Set();
   for(let i=0;i<170;i++){
    window.__stepLine();
    if(!locked&&s.zones.some(z=>z.kind==='shadow')){locked=true;for(const e of s.enemies){e.x=-800;e.y=-650}s.cooldowns.sj_shadow=1e9}
    for(const e of s.effects){if(e.kind==='shadow')seen.add(e.id);if(e.kind==='hit'&&e.damage>0)hit=true}
    if(h.hitArt.poses.length)poses=true;
   }
   return {locked,slashes:seen.size,hit,poses};
  });assert.ok(report.miss.locked&&report.miss.slashes===4);assert.ok(!report.miss.hit&&!report.miss.poses);
  report.cleanup=await page.evaluate(()=>{const h=window.__towerTest.host;h.withdraw();return {poses:h.hitArt.poses.length,bodies:h.hitArt.bodies.size,writes:window.__lineWrites,storage:JSON.stringify(localStorage)===window.__lineInitial.storage}});
  assert.equal(report.cleanup.poses,0);assert.equal(report.cleanup.bodies,0);assert.deepEqual(report.cleanup.writes,[]);assert.ok(report.cleanup.storage);assert.deepEqual(report.errors,[]);
  const video=page.video();await context.close();await video.saveAs(path.join(OUT,'stress.webm'));report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await page?.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{})}
 finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||'')}
}
main().catch(e=>{console.error(e);process.exitCode=1});
