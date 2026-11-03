// Real built Cocos UI, isolated in-memory fixtures; never reads a player's save.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const buildRoot=process.env.FORGING_BUILD_ROOT||'/reports/forging-2026-10-31/build/web-mobile';
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/forging-2026-10-31/ui');
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
     h.goto('forge');h.menu.gearOpen=true;h.menu.forgeDialog='closed';h.menu.gearMode='craft';h.menu.gearCategory='weapon';h.menu.gearQuality=1;h.menu.gearSelection='eq_sword_caiyun:q1';h.menu.gearCount=1;h.menu.gearLastSubmit=0;h.menu.gearRequest=null;h.menu.gearAvailable=false;h.menu.gearNotice='';h.menu.render(h.store.state,'forge','');
    };
    window.qaSeed({pills:{forge_xuantie:100,forge_lingmu:100,forge_lingyu:100,forge_tiejing:100}});
   });
   const text=()=>page.evaluate(()=>window.qaText());
   const click=async name=>{
    const point=await page.evaluate(name=>{const n=window.qaFind(name);if(!n)throw Error('missing '+name);const camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);const v=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();return {x:r.x+v.x/canvas.width*r.width,y:r.y+(1-v.y/canvas.height)*r.height};},name);
    assert.ok(point.x>=0&&point.x<=viewport.width&&point.y>=0&&point.y<=viewport.height,`offscreen ${name}`);await page.mouse.click(point.x,point.y);
   };
   const shot=tag=>page.screenshot({path:path.join(out,`${tag}-${viewport.width}.png`)});
   assert.match(await text(),/裁云剑/);assert.match(await text(),/基础攻击/);await shot('craft');
   await click('开始炼制');await click('开始炼制');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.forgeSequence),1,'double click spends once');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.pills.forge_xuantie),94);await shot('crafted');
   await click('购器');assert.doesNotMatch(await text(),/裁云剑/);await shot('shop');
   await page.waitForTimeout(750);await click('购买装备');assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.forgeSequence),2);
   await click('前往背包');await shot('bag');
   await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.backpack.select('forge_xuantie');h.menu.showInventory(h.store.state);});
   assert.match(await text(),/炼器材料/);assert.match(await text(),/裁云剑/);assert.doesNotMatch(await text(),/\[object Set\]|炼丹材料不可直接服用/);await shot('material');
   await page.evaluate(()=>window.qaSeed());
   await page.evaluate(()=>window.qaFind('炼器配方详情').getComponent('cc.ScrollView').scrollToBottom(0));
   await page.waitForTimeout(100);await shot('source');
   await click('第1层精英和首领妖兽掉落');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.page),'tower');assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.activeRun),null);
   await page.evaluate(()=>window.qaSeed());await click('抽奖');assert.match(await text(),/装备抽奖/);await shot('draw');
   report.cases.push({viewport,craft:true,doubleClick:true,buy:true,materials:true,source:true,draw:true});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e;}
 finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
