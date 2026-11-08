// Exercise the actual Cocos build with cold caches, delayed art and failed art.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),out=process.env.REPORT_DIR||path.join(root,'reports/loading-screen-2026-11-01');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.css':'text/css','.wasm':'application/wasm'};
let delay=1300,failArt=false,failurePath=null;
const sceneId=JSON.parse(fs.readFileSync(path.join(root,'cocos-pilot/assets/resources/sect-scene/luoyun.png.meta'))).uuid;
const loadingId=JSON.parse(fs.readFileSync(path.join(root,'cocos-pilot/assets/resources/loading/keyart.jpg.meta'))).uuid;
const server=createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const native=file.includes('/native/')&&/\.(png|jpg|jpeg)$/.test(file);
 if(failArt&&native&&file.includes(process.env.FAIL_LOADING_ART?loadingId:sceneId))failurePath=file;
 if(failArt&&file===failurePath){res.writeHead(503).end();return;}
 fs.readFile(file,(error,data)=>{
  const send=()=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);};
  const boot=file.startsWith(path.join(root,'cocos-pilot/build/web-mobile/index.'));
  if(boot||native&&delay&&!file.includes(loadingId))setTimeout(send,boot?1200:delay);else send();
 });
});
const state=()=>{
 const host=window.__towerTest?.host,loading=host?.host?.assetLoading;
 if(!host||!loading)return null;
 return {blocked:loading.blocked,queue:loading.queue.state,phase:host.run?.state.phase,time:host.run?.state.time,rootLast:loading.root.parent.children.at(-1)===loading.root};
};
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;const report={cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const url=`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?smoke=1`;
  for(const viewport of (process.env.FAIL_LOADING_ART?[]:[{width:1280,height:720},{width:844,height:390}])){
   delay=1300;const context=await browser.newContext({viewport}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   console.log(`Cold start ${viewport.width}`);
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#tower-boot-loading');
   await page.screenshot({path:path.join(out,`boot-${viewport.width}.png`)});
   await page.waitForFunction(()=>window.__towerTest?.host?.host?.assetLoading?.queue.state.pending>0);
   await page.waitForSelector('#tower-boot-loading',{state:'detached'});
   assert.equal(await page.evaluate(()=>!!window.__towerTest.host.host.assetLoading.artwork.spriteFrame),true);
   let s=await page.evaluate(state);assert.ok(s.blocked&&s.rootLast);
   await page.screenshot({path:path.join(out,`loading-${viewport.width}.png`)});
   await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading.blocked,{},{timeout:90000});
   const loaded=await page.evaluate(()=>{
    const walk=n=>[n,...n.children.flatMap(walk)],nodes=walk(window.__towerTest.host.root);
    return ['霁云宗已确认母稿','HUD.PaperArtwork','HUD.ProfessionArtwork'].map(name=>({name,ready:!!nodes.find(n=>n.name===name)?.getComponent('cc.Sprite')?.spriteFrame}));
   });
   assert.ok(loaded.every(x=>x.ready));await page.screenshot({path:path.join(out,`hall-${viewport.width}.png`)});
   await page.evaluate(()=>window.__towerTest.enter(1));
   await page.waitForFunction(()=>window.__towerTest.host.host.assetLoading.blocked);
   s=await page.evaluate(state);await page.waitForTimeout(500);const later=await page.evaluate(state);
   assert.equal(later.time,s.time,'combat must not advance beneath the loading cover');assert.ok(later.blocked);
   await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading.blocked,{},{timeout:90000});
   assert.equal((await page.evaluate(state)).phase,'playing');
   await page.screenshot({path:path.join(out,`battle-${viewport.width}.png`)});
   // Native image cache is retained when the menu is destroyed on battle entry.
   await page.evaluate(()=>window.__towerTest.host.withdraw());
   // The first result/tower page has its own new art; wait before revisiting hall.
   await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading.blocked,{},{timeout:90000});
   await page.evaluate(()=>window.__towerTest.page('hall'));
   const back=await page.evaluate(state);assert.equal(back.queue.pending,0);
   await page.evaluate(()=>window.__towerTest.page('library'));
   await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading.blocked,{},{timeout:90000});
   await page.screenshot({path:path.join(out,`library-${viewport.width}.png`)});
   const frames=await page.evaluate(()=>new Promise(resolve=>{const times=[];let last=performance.now();function frame(now){times.push(now-last);last=now;if(times.length<90)requestAnimationFrame(frame);else resolve(times.slice(5).sort((a,b)=>a-b));}requestAnimationFrame(frame);}));
   report.cases.push({viewport,loaded,combatFrozenAt:s.time,reentryPending:back.queue.pending,frameMedianMs:frames[Math.floor(frames.length*.5)],frameP95Ms:frames[Math.floor(frames.length*.95)]});
   await context.close();
  }
  delay=0;failArt=true;const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();
  console.log('Failed scene and manual retry');
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(()=>window.__towerTest?.host?.host?.assetLoading?.queue.state.failed>0,{},{timeout:120000});
  const failed=await page.evaluate(state);assert.ok(failed.blocked);assert.ok(failed.rootLast);
  await page.waitForSelector('#tower-boot-loading',{state:'detached'});
  await page.screenshot({path:path.join(out,'retry.png')});
  failArt=false;
  const retry=await page.evaluate(()=>{
   const l=window.__towerTest.host.host.assetLoading,p=l.retry.position,size=l.root.getComponent('cc.UITransform');
   return {x:window.innerWidth*(.5+p.x/size.width),y:window.innerHeight*(.5-p.y/size.height)};
  });
  await page.mouse.click(retry.x,retry.y);
  await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading.blocked,{},{timeout:90000});
  assert.equal(await page.evaluate(()=>!!window.__towerTest.host.host.assetLoading.artwork.spriteFrame),true);
  report.cases.push({failedPath:path.relative(root,failurePath),failed,manualRetryRecovered:true});
  await context.close();
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);}
 finally{report.failurePath=failurePath;fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})();
