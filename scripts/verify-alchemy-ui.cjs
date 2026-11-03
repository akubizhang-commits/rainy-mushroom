// Real built Cocos UI, isolated in-memory fixtures; never reads a player's save.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/alchemy-2026-10-31/ui');
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
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
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
     h.goto('pills');h.menu.apothecaryOpen=true;h.menu.alchemyMode='craft';h.menu.alchemyCategory='all';h.menu.alchemyOnlyAvailable=false;
     h.menu.apothecarySelection='huichun';h.menu.apothecaryQuantity=1;h.menu.alchemyLastSubmit=0;h.menu.alchemyRequest=null;h.menu.alchemyConfirmed=false;h.menu.render(h.store.state,'pills','');
    };
    window.qaSeed({hp:20,pills:{huichuncao:20,bailuhua:20,linglu:20}});
   });
   const text=()=>page.evaluate(()=>window.qaText());
   const stock=id=>page.evaluate(id=>window.__towerTest.host.store.state.pills[id],id);
   const click=async name=>{
    const point=await page.evaluate(name=>{
     const n=window.qaFind(name);if(!n)throw Error('Missing '+name);
     const camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);
     const v=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
     return {x:r.x+v.x/canvas.width*r.width,y:r.y+(1-v.y/canvas.height)*r.height};
    },name);
    assert.ok(point.x>=0&&point.x<=viewport.width&&point.y>=0&&point.y<=viewport.height,`offscreen ${name}: ${JSON.stringify(point)}`);
    await page.mouse.click(point.x,point.y);
   };
   const shot=tag=>page.screenshot({path:path.join(out,`${tag}-${viewport.width}.png`)});
   assert.match(await text(),/回春草.*持有20／需要2/);
   await shot('craft');
   await click('炼制1炉');
   assert.equal(await stock('huichun'),4);assert.equal(await stock('huichuncao'),18);
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.contribution),298);
   assert.match(await text(),/炼制成功|获得/);await shot('crafted');
   await click('前往背包');assert.match(await text(),/材料/);await shot('bag');
   await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.backpack.select('huichuncao');h.menu.showInventory(h.store.state);});
   assert.match(await text(),/回春草/);await shot('material');
   await click('出售');await click('确认出售');assert.equal(await stock('huichuncao'),17);
   await page.evaluate(()=>window.qaSeed({pills:{peiyuan:6}}));
   await click('购丹');await click('修为');await click('凝气丹  45贡献');await click('购买1颗');
   assert.equal(await stock('ningqi'),0);assert.match(await text(),/多余丹药无法全部服用/);await shot('stock-confirm');
   await click('确认超额库存');assert.equal(await stock('ningqi'),1);
   await page.evaluate(()=>{window.qaSeed({xp:1780,pills:{ningqi:1}});const h=window.__towerTest.host;h.menu.apothecaryOpen=false;h.menu.backpack.select('ningqi');h.menu.showInventory(h.store.state);});
   await click('使用');assert.equal(await stock('ningqi'),1);assert.match(await text(),/70/);await shot('overflow-confirm');
   await click('确认服用');assert.equal(await stock('ningqi'),0);
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.xp),1800);
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.cultivationPillUses['炼气']),1);
   await page.evaluate(()=>window.qaSeed());await click('全部配方');assert.match(await text(),/暂无符合条件/);await shot('empty');
   await click('购丹');assert.match(await text(),/回春丹/);assert.doesNotMatch(await text(),/暂无符合条件/);await shot('buy-filter');
   await page.evaluate(()=>window.qaSeed());
   // Scroll the recipe body so its source button is a genuine visible target.
   await page.evaluate(()=>{
    const n=window.qaFind('炼丹配方详情'),s=n.getComponent('cc.ScrollView');s.scrollToBottom(0);
   });
   const source=await page.evaluate(()=>window.qaWalk(window.__towerTest.host.root).find(n=>n.activeInHierarchy&&n.name.startsWith('来源：')&&n.name.includes('3／6／9'))?.name);
   assert.ok(source);await click(source);
   assert.equal(await page.evaluate(()=>window.__towerTest.host.page),'tower');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.activeRun),null);
   await shot('source');
   report.cases.push({viewport,craft:true,sellMaterial:true,stockConfirmation:true,overflowConfirmation:true,emptyFilter:true,buyIgnoresCraftFilter:true,sourceNavigation:true});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e;}
 finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
