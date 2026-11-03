'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'cocos-pilot/build/web-mobile'),out=path.join(root,'reports/runtime-loading-fix-2026-11-03');
const server=createServer((req,res)=>{
 const file=path.resolve(dir,'.'+new URL(req.url,'http://local').pathname);
 if(!file.startsWith(dir+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});const report={cases:[],errors:[]};let browser;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/index.html?smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.host?.assetLoading&&!window.__towerTest.host.host.assetLoading.blocked,{},{timeout:90000});
   await page.evaluate(()=>window.__towerTest.enter(1));
   await page.waitForFunction(()=>window.__towerTest.host.run&&!window.__towerTest.host.host.assetLoading.blocked,{},{timeout:90000});
   await page.evaluate(()=>{
    const v=window.__towerTest.host,l=v.host.assetLoading,q=l.queue;
    const transport=q.transport;q.transport=(path,type,done)=>{
     if(path==='test/runtime-failure'){setTimeout(()=>done(Error('injected offline')),100);return;}
     if(path==='tower-monsters/rhino'){setTimeout(()=>transport(path,type,done),900);return;}
     transport(path,type,done);
    };
    window.__loadingProbe={frames:0,flashes:0,start:v.run.state.time,done:false,stopped:false};
    const probe=()=>{const p=window.__loadingProbe;if(p.stopped)return;p.frames++;if(l.blocked)p.flashes++;requestAnimationFrame(probe);};probe();
    q.load('tower-monsters/rhino',l.image.constructor,()=>window.__loadingProbe.done=true);
    q.load('test/runtime-failure',l.image.constructor,()=>{});
   });
   await page.waitForFunction(()=>window.__loadingProbe.done,{},{timeout:15000});
   await page.waitForTimeout(2000);
   const result=await page.evaluate(()=>{const p=window.__loadingProbe;p.stopped=true;return {...p,end:window.__towerTest.host.run.state.time,blocked:window.__towerTest.host.host.assetLoading.blocked};});
   assert.equal(result.flashes,0);assert.equal(result.blocked,false);assert.ok(result.end>result.start+1);assert.ok(result.frames>20);
   await page.screenshot({path:path.join(out,`battle-${viewport.width}.png`)});
   await page.evaluate(()=>window.__towerTest.host.withdraw());
   await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading.blocked,{},{timeout:30000});
   const camp=await page.evaluate(()=>window.__towerTest.host.screen);assert.equal(camp,'camp');
   report.cases.push({viewport,...result,returnedToCamp:camp});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);}
 finally{fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify(report,null,2));await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));console.log(JSON.stringify(report));}
})();
