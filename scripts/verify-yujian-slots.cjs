'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),build=path.join(root,'cocos-pilot/build/web-mobile');
const out=path.resolve(process.env.YUJIAN_OUT||path.join(root,'design/xianxia-yujian-shoulder-clusters-2026-10-31'));
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(build,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(build+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={errors:[],cases:[]};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const page=await browser.newPage({viewport});
   await installFixture(page,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
   await page.evaluate(()=>{
    window.__prepareLine({rank:1,angle:0,reach:500,origin:{x:-160,y:-70}});
    const h=window.__towerTest.host,s=h.run.state;
    s.loadout.active={sj_yujian:10};s.cooldowns={sj_yujian:999};s.enemies[0].x=s.player.x+240;
    for(let i=0;i<310;i++)window.__stepLine();h.draw();if(h.overlay)h.overlay.active=false;
   });
   await page.waitForTimeout(700);
   await page.screenshot({path:path.join(out,`hover-${viewport.width}.png`)});
   const result=await page.evaluate(()=>{
    const h=window.__towerTest.host,s=h.run.state;
    const hover=Array.from(h.projectileArt.actors.values()).filter(a=>a.node.name.includes('hover-')).map(a=>({name:a.node.name,x:a.node.position.x,y:a.node.position.y}));
    s.cooldowns.sj_yujian=0;window.__stepLine();
    const shots=s.projectiles.filter(p=>p.yujianSlot!==undefined).map(p=>({slot:p.yujianSlot,x:p.x,y:p.y,hoverX:p.hoverX,hoverY:p.hoverY}));
    const before=JSON.stringify(s);h.run.advance(1);h.draw();const paused=JSON.stringify(s)===before;
    return {hover,shots,paused};
   });
   assert.equal(result.hover.length,10);assert.equal(result.shots.length,10);assert.equal(new Set(result.shots.map(s=>s.slot)).size,10);assert.ok(result.paused);
   for(const shot of result.shots){assert.ok(Math.abs(shot.x-shot.hoverX)<1e-8);assert.ok(Math.abs(shot.y+46-shot.hoverY)<1e-8)}
   await page.evaluate(()=>{for(let i=0;i<24;i++)window.__stepLine()});
   await page.screenshot({path:path.join(out,`launch-${viewport.width}.png`)});
   report.cases.push({viewport,...result});await page.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r))}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
