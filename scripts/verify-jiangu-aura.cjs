'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-jiangu-2026-11-01/browser');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});const dir=path.join(ROOT,'cocos-pilot/build/web-mobile');
 const server=createServer((req,res)=>{const f=path.resolve(dir,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(dir+path.sep)){res.writeHead(403).end();return}fs.readFile(f,(e,data)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(data)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const report={status:'RUNNING',cases:[],errors:[]};let browser,page;
 try{
 browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const context=await browser.newContext({viewport,recordVideo:{dir:OUT,size:viewport}});page=await context.newPage();
 await installFixture(page,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
 await page.evaluate(()=>{window.__prepareLine({rank:1,angle:0,reach:400,origin:{x:-140,y:-80}});const h=window.__towerTest.host,s=h.run.state;s.loadout.active={};s.loadout.passive={sj_bone:1,vajra:1,sj_heart:1};s.effects=[];s.projectiles=[];s.zones=[];s.enemies[0].x=s.player.x+250;h.run._playtestAssist=false;h.draw();if(h.overlay)h.overlay.active=false});
 await page.waitForFunction(()=>window.__towerTest.host.jianguArt.frames.length===32);
 const result=await page.evaluate(()=>{
  const h=window.__towerTest.host,s=h.run.state,a=h.jianguArt;h.draw();
  const before=JSON.stringify(s),frame=a.sprite.spriteFrame,pose=JSON.stringify(a.model.sample(s));
  h.draw();const frozen=frame===a.sprite.spriteFrame&&pose===JSON.stringify(a.model.sample(s)),readonly=before===JSON.stringify(s);
  const initialX=s.player.x;h.run.resume();h.run.setInput(1,0);h.run.pause();for(let i=0;i<20;i++)window.__stepLine();
  const moved=s.player.x>initialX,tail=a.model.sample(s).trail.length>0;
  const frozenTrail=JSON.stringify(a.model.sample(s));h.draw();const pausedTail=frozenTrail===JSON.stringify(a.model.sample(s));
  const actual=a.node.position;const follows=Math.abs(actual.x-(s.player.x-h.camera.x))<.01;
  h.run.resume();h.run.setInput(0,0);h.run.pause();for(let i=0;i<20;i++)window.__stepLine();const stopped=a.model.sample(s).trail.length===0;
  s.player.hp=0;h.draw();const deadHidden=!a.node.active;s.player.hp=s.player.maxHp;
  s.loadout.passive={};h.draw();const unlearnedHidden=!a.node.active;
  s.loadout.passive={sj_bone:1,vajra:1,sj_heart:1};h.draw();
  return {readonly,frozen,moved,tail,pausedTail,follows,stopped,deadHidden,unlearnedHidden,frames:a.frames.length};
 });
 for(const key of ['readonly','frozen','moved','tail','pausedTail','follows','stopped','deadHidden','unlearnedHidden'])assert.ok(result[key],key);
 await page.screenshot({path:path.join(OUT,`game-${viewport.width}.png`)});
 await page.evaluate(()=>{const h=window.__towerTest.host;delete h.run.state.loadout.passive.sj_heart;delete h.run.state.loadout.passive.vajra;h.draw()});await page.screenshot({path:path.join(OUT,`silver-only-${viewport.width}.png`)});
 await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.loadout.passive.sj_heart=1;h.run.state.loadout.passive.vajra=1;h.draw()});
 await page.evaluate(()=>{const h=window.__towerTest.host;h.touch=-999;h.stick.dx=-1;window.__jianguStartX=h.run.state.player.x;h.run.resume()});await page.waitForTimeout(1600);
 const realtime=await page.evaluate(()=>{const h=window.__towerTest.host;return {moved:h.run.state.player.x<window.__jianguStartX-20,tail:h.jianguArt.model.sample(h.run.state).trail.length}});assert.ok(realtime.moved&&realtime.tail>0,'real-time motion and trail');result.realtime=realtime;
 await page.screenshot({path:path.join(OUT,`moving-${viewport.width}.png`)});
 await page.evaluate(()=>{const h=window.__towerTest.host;h.stick.dx=0;h.stick.dy=1});await page.waitForTimeout(1000);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.stick.dy=0});await page.waitForTimeout(1500);
 const cleanup=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.pause();h.withdraw();return {node:h.jianguArt.node===null&&h.jianguArt.trailNode===null,writes:window.__lineWrites,unchanged:JSON.stringify(localStorage)===window.__lineInitial.storage}});
 assert.ok(cleanup.node&&cleanup.unchanged);assert.deepEqual(cleanup.writes,[]);report.cases.push({viewport,...result,cleanup});
 const video=page.video();await context.close();await video.saveAs(path.join(OUT,`raw-${viewport.width}.webm`));
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await page?.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{})}
 finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.cases.length,report.error||'')}
}
main().catch(e=>{console.error(e);process.exitCode=1});
