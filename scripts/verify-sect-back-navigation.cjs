'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{createServer}=require('node:http');
const{chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'docs/xianxia/reports/sect-back-navigation');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={status:'RUNNING',cases:[],errors:[]};
 try{browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 async function open(viewport){const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1&playtest=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu);return{context,page};}
 async function click(page,name){const p=await page.evaluate(name=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],n=walk(h.root).find(n=>n.name===name);if(!n)throw Error('missing '+name);const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);await page.mouse.click(p.x,p.y);await page.waitForTimeout(100);}
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const {context,page}=await open(viewport);
 for(const target of ['inventory','library','forge','pills','loadouts','training','home','gate','tutorial','tower']) {
  await page.evaluate(target=>window.__towerTest.host.goto(target),target);
  const back=await page.evaluate(()=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)];const n=walk(h.root).find(n=>n.name==='← 宗门'&&n.getComponent('cc.Button'));return {x:n.position.x,y:n.position.y,graphics:!!n.getComponent('cc.Graphics'),width:h.menu.designWidth,height:h.menu.designHeight};});
  assert.equal(back.graphics,false);assert.equal(back.x,-back.width/2+92);assert.equal(back.y,back.height/2-52);
  await page.waitForTimeout(150);
  await page.screenshot({path:path.join(OUT,`${target}-${viewport.width}.png`)});
  await click(page,'← 宗门');assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'hall');
 }
 const initial=await page.evaluate(()=>{const h=window.__towerTest.host;return{stones:h.store.state.spiritStones,contribution:h.store.state.contribution,normal:h.platform.storage.getItem('xianxia.sect-tower.campaign.v1')}});
 await page.evaluate(()=>window.__towerTest.host.showTools());await click(page,'资源与成长');
 await page.screenshot({path:path.join(OUT,`tools-${viewport.width}.png`)});
 await click(page,'灵石补给');await click(page,'+99,999极品灵石');
 await click(page,'返回资源工具');await click(page,'+99,999宗门贡献');await click(page,'升至金丹巅峰（27级，仅场外）');
 const boosted=await page.evaluate(()=>{const h=window.__towerTest.host;return{stones:h.store.state.spiritStones,contribution:h.store.state.contribution,xp:h.store.state.xp,normal:h.platform.storage.getItem('xianxia.sect-tower.campaign.v1')}});
 assert.equal(boosted.stones-initial.stones,99999*1000000);assert.equal(boosted.contribution-initial.contribution,99999);assert.equal(boosted.normal,initial.normal);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.render();for(let i=0;i<6;i++){h.action({type:'drawWeapon',tier:'xuan'});h.action({type:'drawEquipment',category:i%2?'ring':'armor',tier:'xuan'});}h.goto('inventory');});
 await page.waitForFunction(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return !!walk(window.__towerTest.host.root).find(n=>n.name==='tower-character/inventory-body')?.getComponent('cc.Sprite')?.spriteFrame;});
 await page.screenshot({path:path.join(OUT,`inventory-${viewport.width}.png`)});
 const item=await page.evaluate(()=>{const h=window.__towerTest.host;return Object.values(h.store.state.weapons).filter(x=>x.tier==='xuan').at(-1).id});
 await click(page,'背包物品-'+item);await page.screenshot({path:path.join(OUT,`item-${viewport.width}.png`)});
 await click(page,'穿戴');
 assert.equal(await page.evaluate(id=>window.__towerTest.host.store.state.loadouts[0].weaponId===id,item),true);
 assert.equal(await page.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(window.__towerTest.host.root).some(n=>n.name==='分解')}),false);
 await click(page,'解除');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.loadouts[0].weaponId),'');
 await click(page,'锁定');assert.equal(await page.evaluate(id=>window.__towerTest.host.store.state.weapons[id].locked,item),true);
 assert.equal(await page.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(window.__towerTest.host.root).find(n=>n.name==='分解').getComponent('cc.Button').interactable}),false);
 await click(page,'解锁');await click(page,'分解');await page.screenshot({path:path.join(OUT,`dismantle-${viewport.width}.png`)});await click(page,'确认分解');
 assert.equal(await page.evaluate(id=>!!window.__towerTest.host.store.state.weapons[id],item),false);
 await click(page,'← 宗门');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'hall');
 await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1);});
 await click(page,'HUD.Inventory');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'inventory');
 await page.screenshot({path:path.join(OUT,`battle-inventory-${viewport.width}.png`)});
 await click(page,'返回战斗');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.screen),'battle');
 const loaded={};
 report.cases.push({viewport,boosted,loaded});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}}
main();
