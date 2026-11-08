const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/spirit-balance-2026-11-05');
(async()=>{
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={cases:[],errors:[]};
 try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
  const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
  await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning,{},{timeout:60000});
  await page.evaluate(async()=>{
   const h=window.__towerTest.host;window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];window.qaText=()=>qaWalk(h.root).filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.Label')?.string||'').join('\n');
   const {checksum}=await import('/js/xianxia/Checksum.js');
   window.qaSeed=(mana=100)=>{const now=Date.now();let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>raw=v},Store=h.store.constructor,fresh=new Store(disk,now);fresh.act({type:'sync'},now);const envelope=JSON.parse(raw),state={...fresh.state,mana,pills:{...fresh.state.pills,huichuncao:20,linglu:20}};const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)});h.store=new Store(disk,now);if(h.store.readOnly)throw Error(h.store.error);h.campElapsed=-100000;};
   qaSeed();h.goto('pills');h.menu.apothecaryOpen=true;h.menu.alchemyMode='buy';h.menu.alchemyCategory='spirit';h.menu.apothecarySelection='huiling';h.menu.render(h.store.state,'pills','');
  });
  const text=()=>page.evaluate(()=>qaText());
  const click=async name=>{const p=await page.evaluate(name=>{const h=window.__towerTest.host,n=qaWalk(h.root).find(n=>n.name===name&&n.activeInHierarchy);if(!n)throw Error('Missing '+name);const camera=qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();return{x:r.x+v.x/canvas.width*r.width,y:r.y+(1-v.y/canvas.height)*r.height}},name);assert.ok(p.x>=0&&p.x<=viewport.width&&p.y>=0&&p.y<=viewport.height,name);await page.mouse.click(p.x,p.y)};
  const shot=async tag=>{await page.waitForFunction(()=>Array.from(window.__towerTest.host.menu?.stoneArt?.assets?.values()||[]).every(a=>a.done));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return page.screenshot({path:path.join(out,`${tag}-${viewport.width}.png`)})};
  await page.waitForFunction(()=>{let n=window.__towerTest.host.root;while(n.parent)n=n.parent;return !qaWalk(n).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy)});
  assert.match(await text(),/回灵丹/);await click('商品卡片-huiling');assert.match(await text(),/40点/);await shot('purchase');
  await click('确认购买');assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.pills.huiling),4);
  await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.alchemyMode='craft';h.menu.commerceDialog='';h.menu.apothecarySelection='huiling';h.menu.render(h.store.state,'pills','')});
  assert.match(await text(),/回灵丹/);await shot('craft');await click('开始炼制');await page.waitForFunction(()=>Date.now()-window.__towerTest.host.menu.alchemyLastSubmit>=700);await click('确认炼制');assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.pills.huiling),5);
  await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.apothecaryOpen=false;h.menu.showInventory(h.store.state);h.menu.backpack.select('huiling');h.menu.showInventory(h.store.state)});
  assert.match(await text(),/自动服用/);assert.doesNotMatch(await text(),/undefined修为/);await shot('inventory');
  await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.dismissInventory();h.goto('hall');h.menu.showCharacterInfo()});
  assert.match(await text(),/灵力值/);assert.match(await text(),/脱战3秒后/);assert.doesNotMatch(await text(),/施法与伤害不变|魔法值/);await shot('character');
  await page.evaluate(()=>{const h=window.__towerTest.host;h.goto('hall');qaSeed(0);h.enterFloor(1,true);h.run.setPlaytestAssist(true)});
  await page.waitForFunction(()=>window.__towerTest.host.run?.state.spiritState.uses.length===1);
  await page.waitForFunction(()=>qaText().includes('自动服用回灵丹'));
  const battle=await page.evaluate(()=>{const s=window.__towerTest.host.run.state;return{regen:s.player.manaRegen,cap:s.player.maxMana,used:s.spiritState.uses.length,text:qaText()}});assert.equal(battle.regen,3);assert.match(battle.text,/随后10秒每秒恢复4点/);await shot('auto-pill');
  report.cases.push({viewport,purchase:true,craft:true,inventory:true,character:true,autoPill:true,battle});await context.close();
 }
 assert.deepEqual(report.errors,[]);
 }finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r))}
 console.log('Spirit UI passed: 844x390, 1280x720; real purchase, crafting and auto-potion notice.');
})().catch(e=>{console.error(e);process.exitCode=1});
