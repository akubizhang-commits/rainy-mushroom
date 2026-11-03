'use strict';
// Compiled Cocos scene, isolated in-memory smoke session. No production save writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-sword-arc-2026-10-30/review');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,bytes)=>{
   if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');
   res.end(bytes);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const report={status:'RUNNING',fixture:'paused smoke=1 memory session; actual built Cocos renderer',cases:[],errors:[]};
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   await context.addInitScript(()=>{
    window.__writes=[];
    for(const name of ['setItem','removeItem','clear']){
     const old=Storage.prototype[name];
     Storage.prototype[name]=function(...args){window.__writes.push({name,key:args[0]});return old.apply(this,args);};
    }
   });
   page.on('pageerror',error=>report.errors.push(error.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>!!window.__towerTest?.host?.menu);
   await page.evaluate(()=>{
    const h=window.__towerTest.host;
    h.enterTraining();h.run.pause();
    const s=h.run.state,p=s.player;
    s.time=10;s.enemies=[];s.reserved=[];s.pending=[];s.drops=[];s.zones=[];s.projectiles=[];
    s.effects=[
     {id:'qa-arc-right',kind:'arc',shape:'sector',x:p.x-230,y:p.y,radius:140,angle:90,faceX:1,faceY:0,expiresAt:10.25,hostile:false},
     {id:'qa-arc-up',kind:'arc',shape:'sector',x:p.x+100,y:p.y-40,radius:190,angle:90,faceX:0,faceY:1,expiresAt:10.25,hostile:false},
    ];
    window.__arcQA={snapshot:JSON.stringify(s),store:JSON.stringify(window.__towerTest.state()),writes:window.__writes.slice()};
    window.__writes=[];h.draw();
   });
   await page.waitForFunction(()=>window.__towerTest.host.arcArt?.ready&&window.__towerTest.host.arcArt.actors.size===2);
   const info=await page.evaluate(()=>{
    const h=window.__towerTest.host,art=h.arcArt,s=h.run.state;
    h.draw();h.draw();
    const actors=Array.from(art.actors.values()).map(a=>({
     name:a.node.name,x:a.node.position.x,y:a.node.position.y,angle:a.node.angle,
     width:a.ui.width,height:a.ui.height,frame:{x:a.sprite.spriteFrame.rect.x,y:a.sprite.spriteFrame.rect.y},
     loaded:!!a.sprite.spriteFrame.texture,image:a.sprite.spriteFrame.texture.image.url,
    }));
    const frames=art.frames.map(f=>({x:f.rect.x,y:f.rect.y,w:f.rect.width,h:f.rect.height}));
    return {actors,frames,layerNames:h.battle.children.map(n=>n.name),snapshotUnchanged:JSON.stringify(s)===window.__arcQA.snapshot};
   });
   assert.equal(info.actors.length,2);assert.ok(info.snapshotUnchanged);
   assert.deepEqual(info.actors.map(a=>a.angle),[0,90]);
   assert.equal(info.frames.length,16);assert.equal(new Set(info.frames.map(f=>`${f.x},${f.y}`)).size,16);
   assert.ok(info.frames.every(f=>f.w===256&&f.h===256));
   const layer=info.layerNames.indexOf('弦月斩特效层');
   assert.ok(layer>=0&&layer<info.layerNames.indexOf('攻击预警')&&layer<info.layerNames.indexOf('妖兽静态素材'));
   await page.screenshot({path:path.join(OUT,`tower-${viewport.width}-frame0.png`)});
   const frozenBefore=await page.evaluate(()=>Array.from(window.__towerTest.host.arcArt.actors.values()).map(a=>({name:a.node.name,rect:a.sprite.spriteFrame.rect,x:a.node.position.x,y:a.node.position.y})));
   await page.waitForTimeout(150);
   const frozenAfter=await page.evaluate(()=>Array.from(window.__towerTest.host.arcArt.actors.values()).map(a=>({name:a.node.name,rect:a.sprite.spriteFrame.rect,x:a.node.position.x,y:a.node.position.y})));
   assert.deepEqual(frozenAfter,frozenBefore);
   await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.time=10.125;h.draw();});
   await page.screenshot({path:path.join(OUT,`tower-${viewport.width}-frame4.png`)});
   const tail=await page.evaluate(()=>{
    const h=window.__towerTest.host;h.run.state.time=10.3;h.run.state.effects=[];h.draw();
    const result={actors:h.arcArt.actors.size,frame:h.arcArt.actors.get('qa-arc-right').sprite.spriteFrame.rect};
    h.run.state.time=10.5;h.draw();result.expired=h.arcArt.actors.size;result.tracks=h.arcArt.tracks.size;
    return result;
   });
   assert.equal(tail.actors,2);assert.equal(tail.expired,0);assert.equal(tail.tracks,0);
   await page.evaluate(()=>{
    const h=window.__towerTest.host,s=h.run.state,p=s.player;
    s.effects=[{id:'qa-arc-left',kind:'arc',shape:'sector',x:p.x,y:p.y,radius:140,angle:90,faceX:-1,faceY:0,expiresAt:s.time+.25}];h.draw();
   });
   const cleanup=await page.evaluate(()=>{
    const h=window.__towerTest.host,art=h.arcArt,actor=art.actors.get('qa-arc-left');
    const angle=actor.node.angle;
    h.withdraw();
    return {angle,actors:art.actors.size,tracks:art.tracks.size,bindings:!!h.arcLayer,
     storeUnchanged:JSON.stringify(window.__towerTest.state())===window.__arcQA.store,writes:window.__writes};
   });
   assert.equal(Math.abs(cleanup.angle),180);assert.equal(cleanup.actors,0);assert.equal(cleanup.tracks,0);
   assert.equal(cleanup.bindings,false);assert.ok(cleanup.storeUnchanged);assert.deepEqual(cleanup.writes,[]);
   report.cases.push({viewport,info,tail,cleanup,paused:true});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(error){report.status='FAIL';report.error=error.stack;process.exitCode=1;}
 finally{
  await browser?.close();await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log(report.status,report.error||`${report.cases.length} landscape viewports`);
 }
}
main();
