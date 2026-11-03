// Real built Cocos UI, isolated in-memory fixtures; never reads a player's save.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const buildRoot=process.env.FORGING_BUILD_ROOT||'/cocos-pilot/build/web-mobile';
const root=path.resolve(__dirname,'..'),out=path.join(root,process.env.FORGING_REPORT_DIR||'reports/fixed-equipment-2026-11-01/ui');
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
   await page.evaluate(()=>{
    const m=window.__towerTest.host.menu;
    m.gearCategory='all';if(m.commerceEntries('gear').some(e=>e.recipe.tier==='fan'))throw Error('fan shown in forge');m.gearCategory='weapon';
    m.alchemyCategory='all';m.alchemyMode='buy';const shop=m.commerceEntries('alchemy').map(e=>e.key);
    if(shop.length!==7||['xuming','ningqi','yangyuan','zifu','ningyuan','jiuzhuan'].some(id=>shop.includes(id)))throw Error('advanced pills sold');
    m.alchemyMode='craft';m.alchemyOnlyAvailable=false;if(m.commerceEntries('alchemy').length!==13)throw Error('missing pill recipes');
   });
   const text=()=>page.evaluate(()=>window.qaText());
   const click=async name=>{
    const point=await page.evaluate(name=>{const n=window.qaFind(name);if(!n)throw Error('missing '+name);const camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);const v=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();return {x:r.x+v.x/canvas.width*r.width,y:r.y+(1-v.y/canvas.height)*r.height};},name);
    assert.ok(point.x>=0&&point.x<=viewport.width&&point.y>=0&&point.y<=viewport.height,`offscreen ${name}`);await page.mouse.click(point.x,point.y);
   };
   const shot=tag=>page.screenshot({path:path.join(out,`${tag}-${viewport.width}.png`)});
   assert.match(await text(),/归燕剑/);assert.match(await text(),/基础攻击/);assert.doesNotMatch(await text(),/装备抽奖/);await shot('craft-pool');
   assert.doesNotMatch(await text(),/设为心愿|取消心愿|第三次必得/);
   await click('开始炼制');await click('开始炼制');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.forgeSequence),1,'double click spends once');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.pills.forge_xuantie),998);await shot('crafted');
   await click('极品');assert.match(await text(),/照胆剑/);assert.match(await text(),/定岳剑/);
   assert.match(await text(),/寒魄器心/);await shot('top-pool');
   await page.evaluate(()=>window.qaFind('炼器配方详情').getComponent('cc.ScrollView').scrollToBottom(0));
   await page.waitForTimeout(120);await shot('top-materials');
   await page.waitForTimeout(750);await click('开始炼制');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.pills.forge_core_fa),98);
   assert.match(await text(),/已获得：法器极品/);await shot('top-result');
   await click('关闭炼器工坊');await click('炼器主殿');assert.match(await text(),/素问剑/);assert.doesNotMatch(await text(),/照胆剑|装备抽奖/);await shot('fan-shop');
   await page.waitForTimeout(750);await click('购买装备');assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.forgeSequence),3);
   await click('前往背包');await shot('bag');
   await page.evaluate(async()=>{
    window.qaSeed({xp:6601,clearedFloor:1,forgeBossPity:{fa:4,bao:0,ling:0}});
    const store=window.__towerTest.host.store;
    if(!store.act({type:'startFloor',floor:2,seed:91},0).ok)throw Error('compiled start failed');
    const {TowerRun}=await import('/js/xianxia/TowerRun.js');const run=TowerRun.restore(store.state.activeRun.snapshot);run.resume();
    for(let i=0;i<100000&&run.state.phase==='playing';i++){
     run.state.player.hp=run.state.player.maxHp;
     for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=run.state.time+10;}
     run.advance(1/30);
    }
    if(run.state.phase!=='won')throw Error('fixture did not finish');
    const result=store.act({type:'finishFloor',snapshot:run.snapshot()},0);
    if(!result.ok)throw Error('compiled settlement failed: '+result.reason);
    const rare=store.state.lastResult.materials.find(r=>r.id==='forge_core_fa');
    if(rare?.count!==1||store.state.pills.forge_core_fa!==1)throw Error('compiled material summary missing rare item');
   });
   report.cases.push({viewport,craft:true,doubleClick:true,buy:true,materials:true,topPool:true,wish:true,oldDrawRemoved:true,compiledSettlement:true});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e;}
 finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
