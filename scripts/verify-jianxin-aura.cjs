'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-jianxin-2026-11-01/browser');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});const dir=path.join(ROOT,'cocos-pilot/build/web-mobile');
 const server=createServer((req,res)=>{const f=path.resolve(dir,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(dir+path.sep)){res.writeHead(403).end();return}fs.readFile(f,(e,data)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(data)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const report={status:'RUNNING',cases:[],errors:[]};let browser,page;
 try{
 browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const context=await browser.newContext({viewport,recordVideo:{dir:OUT,size:viewport}});page=await context.newPage();
 await installFixture(page,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
 await page.evaluate(()=>{window.__prepareLine({rank:1,angle:0,reach:400,origin:{x:-140,y:-80}});const h=window.__towerTest.host,s=h.run.state;s.loadout.active={};s.loadout.passive={sj_heart:1};s.effects=[];s.projectiles=[];s.zones=[];s.enemies=[];h.draw();if(h.overlay)h.overlay.active=false});
 await page.waitForFunction(()=>window.__towerTest.host.jianxinArt.frames.length===16);
 const result=await page.evaluate(()=>{
  const h=window.__towerTest.host,s=h.run.state,a=h.jianxinArt;h.draw();
  const before=JSON.stringify(s),first=a.node.position.clone(),frame=a.sprite.spriteFrame,alpha=a.sprite.color.a;
  h.draw();const frozen=frame===a.sprite.spriteFrame&&alpha===a.sprite.color.a;
  const readonly=before===JSON.stringify(s);
  const other={...h.camera,x:h.camera.x-30};a.syncTower(h.jianxinLayer,s,other);const follows=Math.abs(a.node.position.x-first.x-30)<.01;
  s.effects.push({kind:'hit',critical:true,damage:5,startedAt:s.time});h.draw();const flash=a.sprite.color.a>alpha;
  s.effects=[];s.time+=.7;h.draw();const faded=a.sprite.color.a===alpha;
  s.player.hp=0;h.draw();const deadHidden=!a.node.active;s.player.hp=s.player.maxHp;
  s.loadout.passive={};h.draw();const unlearnedHidden=!a.node.active;
  s.loadout.passive={sj_heart:1};h.draw();
  return {readonly,frozen,follows,flash,faded,deadHidden,unlearnedHidden,frames:a.frames.length,width:a.node.getComponent('cc.UITransform').width};
 });
 for(const key of ['readonly','frozen','follows','flash','faded','deadHidden','unlearnedHidden'])assert.ok(result[key],key);
 await page.screenshot({path:path.join(OUT,`game-${viewport.width}.png`)});
 await page.evaluate(()=>{const h=window.__towerTest.host;h.run.resume()});await page.waitForTimeout(1200);
 await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;s.effects.push({kind:'hit',critical:true,damage:5,startedAt:s.time,x:s.player.x+100,y:s.player.y,expiresAt:s.time+.25})});await page.waitForTimeout(3300);
 const cleanup=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.pause();h.withdraw();return {node:h.jianxinArt.node===null,writes:window.__lineWrites,unchanged:JSON.stringify(localStorage)===window.__lineInitial.storage}});
 assert.ok(cleanup.node&&cleanup.unchanged);assert.deepEqual(cleanup.writes,[]);report.cases.push({viewport,...result,cleanup});
 const video=page.video();await context.close();await video.saveAs(path.join(OUT,`raw-${viewport.width}.webm`));
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await page?.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{})}
 finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.cases.length,report.error||'')}
}
main().catch(e=>{console.error(e);process.exitCode=1});
