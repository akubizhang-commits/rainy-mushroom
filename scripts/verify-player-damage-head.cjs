'use strict';
// Runtime check: player damage numbers sit centred above the head on both facings,
// stack upward, and stay inside the landscape viewport.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/player-damage-head-2026-11-05');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const server=createServer((req,res)=>{
  const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(data);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const report={cases:[],errors:[]};let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const ctx=await browser.newContext({viewport}),page=await ctx.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?smoke=1&playtest=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu);
   await page.evaluate(()=>{window.walk=n=>[n,...n.children.flatMap(window.walk)];window.__towerTest.host.render();});
   await page.waitForFunction(()=>!window.walk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy));
   await page.evaluate(()=>window.__towerTest.enter(1));
   await page.waitForFunction(()=>window.__towerTest.host.run?.state.phase==='playing');
   await page.waitForFunction(()=>!window.walk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy),{},{timeout:60000});
   await page.waitForTimeout(300);
   for(const face of [1,-1]){
    const result=await page.evaluate(face=>{
     const h=window.__towerTest.host,r=h.run,s=r.state;
     r._playtestAssist=false;r.pause();s.effects=[];s.player.hp=s.player.maxHp;s.hurtUntil=0;s.player.faceX=face;
     h.damageNumbers.reset();s.time+=1;
     r._effect('player_hit',s.player.x,s.player.y,24,{damage:30,hpLoss:30,maxHp:1000});
     s.time+=.3;
     r._effect('player_hit',s.player.x,s.player.y,24,{damage:128,hpLoss:128,maxHp:1000,absorbed:12});
     s.time+=.05;h.draw();
     const labels=window.walk(h.root).filter(n=>n.name==='自身受伤数字'&&n.activeInHierarchy)
      .map(n=>({text:n.getComponent(cc.Label).string,x:n.position.x,y:n.position.y}));
     return {visibleFacing:h.characterArt.visibleFacing,waist:{...h.characterArt.waistPosition},labels,logicalHeight:h.height};
    },face);
    assert.equal(result.visibleFacing,face);
    assert.equal(result.labels.length,2);
    for(const l of result.labels){
     assert.ok(Math.abs(l.x-result.waist.x)<0.5,`label centred over body: dx=${l.x-result.waist.x}`);
     assert.ok(l.y-17>result.waist.y+54,`label clears the head: ${l.y} vs waist ${result.waist.y}`);
     assert.ok(l.y+17<result.logicalHeight/2,`label inside the top edge: ${l.y}`);
    }
    // Older row floats above the newest one.
    assert.ok(result.labels[0].y>result.labels[1].y);
    await page.screenshot({path:path.join(OUT,`head-${viewport.width}-face${face>0?'right':'left'}.png`)});
    report.cases.push({viewport,face,...result});
   }
   await ctx.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.failure=e.stack;throw e;}
 finally{fs.writeFileSync(path.join(OUT,'browser-report.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
