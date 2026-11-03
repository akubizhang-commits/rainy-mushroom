// Built Cocos UI with an isolated in-memory campaign; no player save access.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/opening-weapon-2026-11-03');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning,{},{timeout:90000});
   await page.evaluate(async()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;window.walk=n=>[n,...n.children.flatMap(window.walk)];window.uiText=()=>window.walk(h.root).filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.Label')?.string||'').join('\n');
    const {checksum}=await import('/js/xianxia/Checksum.js');
    window.seedShop=xp=>{let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>raw=v},Store=h.store.constructor,store=new Store(disk,0);store.act({type:'sync'},0);const e=JSON.parse(raw);e.data=JSON.stringify({...store.state,xp});e.checksum=checksum(e.data);raw=JSON.stringify(e);h.store=new Store(disk,0);if(h.store.readOnly)throw Error('invalid fixture');h.goto('forge');Object.assign(h.menu,{gearOpen:true,gearMode:'buy',gearCategory:'weapon',gearSelection:'weapon:fan:q2',commerceDialog:'',commerceNotice:'',gearCount:1,gearLastSubmit:0,gearRequest:null});h.menu.render(h.store.state,'forge','')};window.seedShop(0);
   });
   await page.waitForFunction(()=>{let r=window.__towerTest.host.root;while(r.parent)r=r.parent;return !window.walk(r).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy)});
   const click=async name=>{const point=await page.evaluate(name=>{const h=window.__towerTest.host,n=window.walk(h.root).find(n=>n.name===name&&n.activeInHierarchy);if(!n)throw Error('missing '+name);const camera=window.walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();return {x:r.x+v.x/canvas.width*r.width,y:r.y+(1-v.y/canvas.height)*r.height}},name);assert.ok(point.x>=0&&point.x<=viewport.width&&point.y>=0&&point.y<=viewport.height,name+' offscreen');await page.mouse.click(point.x,point.y)};
   assert.match(await page.evaluate(()=>window.uiText()),/青锋剑/);await click('商品卡片-weapon:fan:q2');
   assert.match(await page.evaluate(()=>window.uiText()),/需炼气二层/);
   await page.screenshot({path:path.join(out,`locked-${viewport.width}.png`)});
   await page.evaluate(()=>window.seedShop(45));await click('商品卡片-weapon:fan:q2');
   const preview=await page.evaluate(()=>window.uiText());assert.match(preview,/炼气·二层/);assert.match(preview,/72/);
   await page.screenshot({path:path.join(out,`purchase-${viewport.width}.png`)});
   await click('确认购买');
   const result=await page.evaluate(()=>{const h=window.__towerTest.host;const entries=h.menu.commerceEntries('gear');h.menu.gearMode='craft';h.menu.gearCraftTier='fan';const craft=h.menu.commerceEntries('gear');h.menu.gearMode='buy';return {stones:h.store.state.spiritStones,items:Object.values(h.store.state.weapons).filter(w=>w.definitionId==='eq_sword_qingfeng').length,shopCount:entries.length,craftCount:craft.length}});
   assert.equal(result.stones,428);assert.equal(result.items,1);assert.equal(result.shopCount,2);assert.equal(result.craftCount,0);
   await page.screenshot({path:path.join(out,`bought-${viewport.width}.png`)});report.cases.push({viewport,...result});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.ok=true;
 }finally{fs.writeFileSync(path.join(out,'ui-report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r))}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
