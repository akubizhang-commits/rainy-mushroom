// Real built Cocos UI, isolated in-memory fixtures; never reads a player's save.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const buildRoot=process.env.FORGING_BUILD_ROOT||'/cocos-pilot/build/web-mobile';
const root=path.resolve(__dirname,'..'),out=path.join(root,process.env.FORGING_REPORT_DIR||'reports/mixed-draw-history-2026-11-02/ui');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser,page;const report={method:'Actual compiled Cocos mouse interaction, independent memory save. Seeded resources for UI cases, not natural progression.',cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport});page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}${buildRoot}/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning);
   await page.evaluate(async()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    window.qaFind=name=>window.qaWalk(h.root).find(n=>n.name===name&&n.activeInHierarchy&&n.getComponent('cc.Button'))
      ||window.qaWalk(h.root).find(n=>n.name===name&&n.activeInHierarchy);
    window.qaText=()=>window.qaWalk(h.root).filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.Label')?.string||'').join('\n');
    const {checksum}=await import('/js/xianxia/Checksum.js');
    window.qaSeed=(patch={})=>{
     let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>{raw=v}},Store=h.store.constructor,s=new Store(disk,0);s.act({type:'sync'},0);
     const env=JSON.parse(raw),state={...s.state,...patch,pills:{...s.state.pills,...patch.pills}};
     const data=JSON.stringify(state);raw=JSON.stringify({...env,data,checksum:checksum(data)});
     h.menu.dismissInventory();h.store=new Store(disk,0);if(h.store.readOnly)throw Error(h.store.error);
     h.goto('forge');h.menu.gearOpen=true;h.menu.forgeDialog='closed';h.menu.gearMode='craft';h.menu.gearCategory='weapon';h.menu.gearQuality=1;h.menu.gearSelection='weapon:fa:q1';h.menu.gearCount=1;h.menu.gearLastSubmit=0;h.menu.gearRequest=null;h.menu.gearAvailable=false;h.menu.gearNotice='';h.menu.render(h.store.state,'forge','');
    };
    window.qaSeed({xp:6601,spiritStones:100000,contribution:100000,pills:{forge_xuantie:1000,forge_lingmu:1000,forge_lingyu:1000,forge_hanjingsha:1000,forge_core_fa:100,forge_ninglingjing:100}});
   });
   const text=()=>page.evaluate(()=>window.qaText());
   const click=async name=>{
    const point=await page.evaluate(name=>{const n=window.qaFind(name);if(!n)throw Error('missing '+name);const camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);const v=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();return {x:r.x+v.x/canvas.width*r.width,y:r.y+(1-v.y/canvas.height)*r.height};},name);
    assert.ok(point.x>=0&&point.x<=viewport.width&&point.y>=0&&point.y<=viewport.height,`offscreen ${name}`);await page.mouse.click(point.x,point.y);
   };
   const shot=tag=>page.screenshot({path:path.join(out,`${tag}-${viewport.width}.png`)});
   await page.evaluate(()=>{const h=window.__towerTest.host;window.qaSeed();h.menu.gearOpen=false;h.menu.render(h.store.state,'forge','');if(window.qaFind('机缘抽奖'))throw Error('old forge entry remains');h.goto('hall');});
   await page.waitForFunction(()=>window.qaFind('灵石素材-ui_chest-sect-chest')?.activeInHierarchy);await shot('home-chest');
   await click('机缘抽奖');await shot('initial');
   assert.match(await text(),/抽奖券 0/);
   assert.doesNotMatch(await text(),/当前概率|每抽1券|基础极品概率|抽取结果/);
   const historyPosition=await page.evaluate(()=>{const n=window.qaFind('抽取历史');return {x:n.position.x,y:n.position.y}});
   assert.ok(historyPosition.x<0&&historyPosition.y<0,'history button at bottom left');
   await click('抽取历史');assert.match(await text(),/尚无抽取记录/);
   await click('领取10张试玩券');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.mixedDraw.tickets),10);
   const target=await page.evaluate(async()=>{const {mixedTopItems}=await import('/js/xianxia/TowerMixedDraw.js');return mixedTopItems('fa')[1]});
   await click(target.name);await shot('empty-history');
   await click('十连 · 10券');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.mixedDraw.sequence),1);
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.mixedDraw.tickets),0);
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.mixedDraw.receipts[0].rewards.length),10);
   assert.match(await text(),/第1次 · 法器池 · 十连/);await shot('ten-history');await click('返回首页');await click('机缘抽奖');await click('抽取历史');assert.match(await text(),/第1次 · 法器池 · 十连/);
   assert.match(await text(),/试玩券已领取/);
   await page.evaluate(async id=>{const h=window.__towerTest.host;const {freshMixedDraw}=await import('/js/xianxia/TowerMixedDraw.js');const m=freshMixedDraw(42);m.tickets=20;m.pools.fa={dry:39,targetId:id,miss:true};window.qaSeed({mixedDraw:m});h.menu.gearOpen=false;h.menu.mixedOpen=true;h.menu.mixedTier='fa';h.menu.mixedView='history';h.menu.mixedText='';h.menu.mixedLastSubmit=-1000;h.goto('hall');h.menu.mixedOpen=true;h.menu.render(h.store.state,'hall','');},target.id);
   assert.match(await text(),/尚无抽取记录/);await shot('forced-wish');await click('单抽 · 1券');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.mixedDraw.receipts[0].rewards[0].id),target.id);
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.mixedDraw.tickets),19);await shot('wish-result');
   await page.evaluate(()=>window.__towerTest.host.menu.mixedLastSubmit=0);await click('单抽 · 1券');
   const history=await text();assert.ok(history.indexOf('第2次 · 法器池 · 单抽')<history.indexOf('第1次 · 法器池 · 单抽'));
   const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.store.state.mixedDraw));
   await click('抽取历史');await click('抽取历史');
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.store.state.mixedDraw)),before);
   await shot('multiple-history');
   report.cases.push({viewport,trialOnce:true,tenDraw:true,persistedResults:true,wishGuaranteed:true,historyNewestFirst:true,historyReadOnly:true,removedRuleTabs:true});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e;}
 finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
