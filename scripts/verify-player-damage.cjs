'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/player-damage-feedback-2026-11-05');
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
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]) for(const disabled of [false,true]){
   const ctx=await browser.newContext({viewport}),page=await ctx.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?smoke=1&playtest=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu);
   await page.evaluate(()=>{window.walk=n=>[n,...n.children.flatMap(window.walk)];window.find=name=>window.walk(window.__towerTest.host.root).find(n=>n.name===name&&n.activeInHierarchy);window.__towerTest.host.render();});
   await page.waitForFunction(()=>!window.walk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy));
   await page.evaluate(()=>window.__towerTest.host.menu.showSettings());
   await page.waitForFunction(()=>window.find('自身受伤数字：开启'));
   await page.screenshot({path:path.join(OUT,`settings-${viewport.width}.png`)});
   // Invoke the real Cocos input handler, then verify refreshed UI and persisted setting.
   await page.evaluate(()=>window.find('自身受伤数字：开启').emit(cc.Button.EventType.CLICK,{stopPropagation(){}}));
   await page.waitForFunction(()=>window.find('自身受伤数字：关闭'));
   await page.evaluate(()=>window.find('自身受伤数字：关闭').emit(cc.Button.EventType.CLICK,{stopPropagation(){}}));
   await page.waitForFunction(()=>window.find('自身受伤数字：开启'));
   if(disabled)await page.evaluate(()=>window.find('自身受伤数字：开启').emit(cc.Button.EventType.CLICK));
   await page.evaluate(()=>{window.__towerTest.host.menu.dismissSettings();window.__towerTest.enter(1);});
   await page.waitForFunction(()=>window.__towerTest.host.run?.state.phase==='playing');
   await page.waitForTimeout(1200);
   await page.waitForFunction(()=>!window.walk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy),{},{timeout:60000});
   await page.waitForTimeout(100);
   // Exercise actual hostile projectile settlement before the staged visual samples.
   const settled=await page.evaluate(()=>{
    const h=window.__towerTest.host,r=h.run,s=r.state;r._playtestAssist=false;s.hurtUntil=0;
    r._projectile(s.player.x,s.player.y,0,0,10,1,true);r.advance(1/60);r.pause();h.draw();
    const e=s.effects.find(e=>e.kind==='player_hit');
    const labels=window.walk(h.root).filter(n=>n.name==='自身受伤数字'&&n.activeInHierarchy).map(n=>n.getComponent(cc.Label)?.string);
    return {loss:e?.hpLoss,labels};
   });
   assert.ok(settled.loss>0);assert.equal(settled.labels.length,disabled?0:1);
   if(!disabled){
    await page.screenshot({path:path.join(OUT,`origin-${viewport.width}.png`)});
    const backOffsets=await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state,old=s.player.faceX,offsets=[];
     for(const face of [1,-1]){
      s.player.faceX=face;h.draw();
      const label=window.walk(h.root).find(n=>n.name==='自身受伤数字'&&n.activeInHierarchy);
      offsets.push({face:h.characterArt.visibleFacing,dx:label.position.x-h.characterArt.waistPosition.x});
     }
     s.player.faceX=old;h.draw();return offsets;
    });
    assert.equal(backOffsets[0].face,1);assert.ok(backOffsets[0].dx<0);
    assert.equal(backOffsets[1].face,-1);assert.ok(backOffsets[1].dx>0);
   }
   await page.evaluate(()=>window.__towerTest.host.damageNumbers.reset());
   const inject=async()=>page.evaluate(()=>{
    const h=window.__towerTest.host,r=h.run,s=r.state;
    r.pause();s.effects=[];s.player.hp=s.player.maxHp;s.hurtUntil=0;
    s.time+=1;
    r._effect('player_hit',s.player.x,s.player.y,24,{damage:128,hpLoss:128,maxHp:1000,absorbed:12});
    r._effect('player_hit',s.player.x,s.player.y,24,{damage:0,hpLoss:0,maxHp:1000,absorbed:36});
    h.draw();
    return window.walk(h.root).filter(n=>n.name==='自身受伤数字'&&n.activeInHierarchy).map(n=>n.getComponent(cc.Label)?.string);
   });
   const labels=await inject();assert.deepEqual(labels,disabled?[]:['−128','吸收 36']);
   const mixed=await page.evaluate(()=>window.walk(window.__towerTest.host.root).filter(n=>n.name==='自身护盾吸收'&&n.activeInHierarchy).map(n=>({text:n.getComponent(cc.Label).string,color:n.getComponent(cc.Label).color.toHEX('#rrggbb')})));
   assert.equal(mixed.length,disabled?0:1);if(!disabled){assert.equal(mixed[0].text,'吸收 12');assert.equal(mixed[0].color.replace('#','').toLowerCase(),'b9e7f2');}
   await page.screenshot({path:path.join(OUT,`${disabled?'disabled':'damage'}-${viewport.width}.png`)});
   const paused=await page.evaluate(()=>{const h=window.__towerTest.host;h.draw();return window.walk(h.root).filter(n=>n.name==='自身受伤数字'&&n.activeInHierarchy).map(n=>({text:n.getComponent(cc.Label)?.string,y:n.position.y}));});
   await page.waitForTimeout(150);
   const pausedAgain=await page.evaluate(()=>{const h=window.__towerTest.host;h.draw();return window.walk(h.root).filter(n=>n.name==='自身受伤数字'&&n.activeInHierarchy).map(n=>({text:n.getComponent(cc.Label)?.string,y:n.position.y}));});
   assert.deepEqual(pausedAgain,paused);
   report.cases.push({viewport,disabled,settled,labels,mixed,pauseStable:true});
   await ctx.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.failure=e.stack;throw e;}
 finally{fs.writeFileSync(path.join(OUT,'browser-report.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
