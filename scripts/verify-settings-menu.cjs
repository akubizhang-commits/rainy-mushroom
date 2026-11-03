// Exercise real Cocos hit targets using isolated, in-memory smoke-mode saves.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'docs/xianxia/reports/settings-menu-level-2026-11-03');
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(data);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const report={status:'RUNNING',cases:[],errors:[]};let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1&playtest=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu);
   await page.evaluate(()=>{
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    window.qaFind=name=>window.qaWalk(window.__towerTest.host.root).find(n=>n.name===name&&n.activeInHierarchy);
    window.__towerTest.host.campElapsed=-100000;
   });
   await page.waitForFunction(()=>!window.qaWalk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy));
   const click=async name=>{
    if(name==='开发者工具'){
     await page.evaluate(()=>window.qaWalk(window.__towerTest.host.root).forEach(n=>n.getComponent('cc.ScrollView')?.scrollToBottom(0)));
     await page.waitForTimeout(100);
    }
    const point=await page.evaluate(name=>{
     const n=window.qaFind(name);if(!n)throw Error('Missing '+name);
     const camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);
     const v=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
     return{x:r.x+v.x/canvas.width*r.width,y:r.y+(1-v.y/canvas.height)*r.height};
    },name);
    await page.mouse.click(point.x,point.y);await page.waitForTimeout(100);
   };
   const read=()=>page.evaluate(()=>window.__towerTest.state());
   const buttons=()=>page.evaluate(()=>window.qaWalk(window.__towerTest.host.overlay).filter(n=>n.activeInHierarchy&&n.getComponent('cc.Button')).map(n=>n.name));
   // Startup may display tools automatically; return to the courtyard first.
   await page.evaluate(()=>window.__towerTest.host.render());
   await click('设置');
   await page.screenshot({path:path.join(OUT,`settings-${viewport.width}.png`)});
   await click('开发者工具');
   assert.deepEqual(await buttons(),['返回设置','关闭开发者工具','游戏速度 ×1','无敌：关闭','+999灵石、贡献','+999功法点','提升一小境界','重置游戏进度']);
   await click('返回设置');
   assert.equal(await page.evaluate(()=>!!window.qaFind('宗门设置遮罩')),true);
   assert.equal(await page.evaluate(()=>window.qaWalk(window.qaFind('宗门设置遮罩')).some(n=>n.getComponent('cc.Label')?.string==='落云宗')),false);
   await click('开发者工具');
   const before=await read();
   await click('+999灵石、贡献');await click('+999灵石、贡献');
   assert.equal((await read()).spiritStones,before.spiritStones+1998000000);
   assert.equal((await read()).contribution,before.contribution+1998);
   await click('提升一小境界');
   assert.equal((await read()).xp,45);
   await page.screenshot({path:path.join(OUT,`tools-${viewport.width}.png`)});
   await click('游戏速度 ×1');await click('游戏速度 ×2');await click('游戏速度 ×3');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.tools.speed),1);
   await click('无敌：关闭');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.tools.invincible),true);
   await click('关闭开发者工具');
   await page.evaluate(()=>window.__towerTest.host.enterFloor(1));
   await page.waitForFunction(()=>window.__towerTest.host.run?.state.phase==='playing');
   await page.waitForFunction(()=>!window.qaWalk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy));
   await click('HUD.Pause');await click('开发者工具');
   await click('返回设置');await click('开发者工具');
   const balance=(await read()).spiritStones;
   await click('+999灵石、贡献');
   assert.equal((await read()).spiritStones,balance+999000000);
   assert.equal(await page.evaluate(()=>window.__towerTest.host.run.state.phase),'paused');
   await click('提升一小境界');
   assert.equal((await read()).xp,120);
   await page.screenshot({path:path.join(OUT,`battle-tools-${viewport.width}.png`)});
   await click('关闭开发者工具');await click('继续挑战');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.run.state.phase),'playing');
   report.cases.push({viewport,repeatGrant:true,singleSave:true,speedCycle:true,battleGrant:true});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}
 finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases);}
})();
