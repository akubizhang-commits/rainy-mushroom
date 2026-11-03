'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-flight-stance-2026-11-01/browser');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});const dir=process.env.FLIGHT_QA_BUILD||path.join(ROOT,'cocos-pilot/build/web-mobile');
 const server=createServer((req,res)=>{const f=path.resolve(dir,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(dir+path.sep)){res.writeHead(403).end();return}fs.readFile(f,(e,data)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(data)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const report={status:'RUNNING',cases:[],errors:[]};let browser,page;
 try{
 browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const context=await browser.newContext({viewport,recordVideo:{dir:OUT,size:viewport}});page=await context.newPage();
 await installFixture(page,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
 await page.evaluate(()=>{window.__prepareLine({rank:1,angle:0,reach:400,origin:{x:-140,y:-80}});const h=window.__towerTest.host,s=h.run.state;s.loadout.active={};s.loadout.passive={sj_flight:1,sj_spirit:1,sj_bone:1,vajra:1,sj_heart:1};s.effects=[];s.projectiles=[];s.zones=[];s.enemies[0].x=s.player.x+250;h.run._playtestAssist=false;h.draw();if(h.overlay)h.overlay.active=false});
 await page.waitForFunction(()=>window.__towerTest.host.flightSwordArt.ready&&window.__towerTest.host.characterArt.frames.length>0);
 const retired=await page.evaluate(()=>{const h=window.__towerTest.host;return ['ningshen','jiangu','bumie','jianxin'].every(n=>!h[n+'Layer']&&!h[n+'Art'].requested&&!h[n+'Art'].node)});assert.ok(retired,'retired rings neither loaded nor displayed');
 const result=await page.evaluate(()=>{
  const h=window.__towerTest.host,s=h.run.state;h.draw();
  const before=JSON.stringify(s);h.draw();const readonly=before===JSON.stringify(s);
  const tailDisabled=!h.flightArt.requested&&!h.flightArt.node;
  const planted=h.characterArt.body.spriteFrame===h.characterArt.frames[1];
  h.characterArt.observeCast({skill:'sj_arc',startedAt:s.time,releaseAt:s.time+.3,dirX:-1,dirY:0});h.draw();
  const plantedCasting=h.characterArt.body.spriteFrame===h.characterArt.frames[1];
  const frame=h.characterArt.body.spriteFrame,position=h.characterArt.root.position.clone();h.draw();
  const frozen=frame===h.characterArt.body.spriteFrame&&position.y===h.characterArt.root.position.y;
  s.player.hp=0;h.draw();const deadHidden=!h.flightSwordArt.root.active;s.player.hp=s.player.maxHp;
  s.loadout.passive={};h.draw();const unlearnedHidden=!h.flightSwordArt.root.active;
  s.loadout.passive={sj_flight:1,sj_heart:1,sj_bone:1,vajra:1,sj_spirit:1};h.draw();
  return {readonly,tailDisabled,planted,plantedCasting,frozen,deadHidden,unlearnedHidden};
 });
 for(const [key,value] of Object.entries(result))assert.ok(value,key);
 for(const [name,dx,dy] of [['right',1,0],['up',0,1],['left',-1,0],['down',0,-1]]){
  await page.evaluate(({dx,dy})=>{const h=window.__towerTest.host;h.touch=-999;h.stick.dx=dx;h.stick.dy=dy;h.run.resume()},{dx,dy});await page.waitForTimeout(1600);
  const check=await page.evaluate(()=>{const h=window.__towerTest.host;return h.flightSwordArt.node.name==='流泉剑原画'&&h.flightSwordArt.node.angle===(h.characterArt.visibleFacing<0?180:0)&&h.characterArt.body.spriteFrame===h.characterArt.frames[1]&&!h.flightArt.requested});assert.ok(check,'facing and planted pose '+name);
  await page.screenshot({path:path.join(OUT,`${name}-${viewport.width}.png`)});
 }
 await page.evaluate(()=>{const h=window.__towerTest.host;h.stick.dx=0;h.stick.dy=0});await page.waitForTimeout(1200);
 const cleanup=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.pause();h.withdraw();return {node:h.flightArt.node===null&&h.flightSwordArt.node===null,writes:window.__lineWrites,unchanged:JSON.stringify(localStorage)===window.__lineInitial.storage}});
 assert.ok(cleanup.node&&cleanup.unchanged);assert.deepEqual(cleanup.writes,[]);report.cases.push({viewport,...result,cleanup});
 const video=page.video();await context.close();await video.saveAs(path.join(OUT,`raw-${viewport.width}.webm`));
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await page?.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{})}
 finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.cases.length,report.error||'')}
}
main().catch(e=>{console.error(e);process.exitCode=1});
