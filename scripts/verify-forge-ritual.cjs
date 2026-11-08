// Real built Cocos UI, isolated in-memory fixtures; never reads a player's save.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const buildRoot=process.env.FORGING_BUILD_ROOT||'/cocos-pilot/build/web-mobile';
const root=process.cwd(),out=path.join(root,process.env.FORGING_REPORT_DIR||'reports/forge-ritual-2026-11-04/final');
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
   const context=await browser.newContext({viewport,recordVideo:{dir:path.join(out,'video'),size:viewport}});const videoStarted=Date.now();page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
   page.on('requestfailed',r=>console.error('REQUEST FAILED',r.url(),r.failure()));
   page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),r.url());});
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
    window.qaSeed({xp:6601,spiritStones:100000,contribution:100000,pills:{forge_yaopi:1000,forge_lingsi:1000,forge_xuantie:1000,forge_lingmu:1000,forge_lingyu:1000,forge_hanjingsha:1000,forge_core_fa:100,forge_ninglingjing:100}});
   });
   const click=async name=>{
    const point=await page.evaluate(name=>{const n=window.qaFind(name);if(!n)throw Error('missing '+name);const camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);const v=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();return {x:r.x+v.x/canvas.width*r.width,y:r.y+(1-v.y/canvas.height)*r.height};},name);
    assert.ok(point.x>=0&&point.x<=viewport.width&&point.y>=0&&point.y<=viewport.height,`offscreen ${name}`);await page.mouse.click(point.x,point.y);await page.waitForTimeout(180);
   };
   await page.evaluate(()=>window.qaSeed({xp:0,spiritStones:100000,contribution:100000}));
   for(const tier of ['fa','bao','ling']){
    await click('分类-'+tier);
    assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.commerceEntries('gear').length),12);
    assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.gearCraftTier),tier);
    assert.equal(await page.evaluate(()=>window.qaFind('开始炼制').getComponent('cc.Button').interactable),false);
    assert.ok(await page.evaluate(()=>{const m=window.__towerTest.host.menu;return m.commerceEntries('gear').every(e=>window.qaWalk(window.qaFind('配方卡片-'+e.key)).some(n=>n.name==='物品图-'+e.recipe.definitionIds[0]));}));
   }
   await click('分类-fa');await page.waitForTimeout(300);
   await page.screenshot({path:path.join(out,`${viewport.width}-low-realm.png`)});
   await page.evaluate(()=>window.qaSeed({xp:6601,spiritStones:100000,contribution:100000,pills:{forge_yaopi:1000,forge_lingsi:1000,forge_xuantie:1000,forge_lingmu:1000,forge_lingyu:1000,forge_hanjingsha:1000,forge_core_fa:100,forge_ninglingjing:100}}));
   await page.waitForTimeout(300);
   await page.screenshot({path:path.join(out,`${viewport.width}-lanes.png`)});
   for(const tier of ['bao','ling','fa']){
    await click('分类-'+tier);
    assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.commerceEntries('gear').length),12);
    assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.gearCraftTier),tier);
   }
   const headingsBefore=await page.evaluate(()=>['weapon','armor','ring'].map(category=>{
    const n=window.qaFind('配方列名-'+category);if(!n||n.parent.name!=='炼器页')throw Error('heading must stay outside scroller');
    return {x:n.worldPosition.x,y:n.worldPosition.y};
   }));
   assert.ok(await page.evaluate(()=>window.__towerTest.host.menu.commerceEntries('gear').every(e=>!window.qaWalk(window.qaFind('配方卡片-'+e.key)).some(n=>/^(武器|防具|戒指)$/.test(n.getComponent('cc.Label')?.string||'')))));
   await page.evaluate(()=>window.qaFind('配方列表').getComponent('cc.ScrollView').scrollToBottom(0));
   assert.deepEqual(await page.evaluate(()=>['weapon','armor','ring'].map(category=>{const n=window.qaFind('配方列名-'+category);return {x:n.worldPosition.x,y:n.worldPosition.y};})),headingsBefore);
   await page.waitForTimeout(100);await click('配方卡片-weapon:fa:q4');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.gearSelection),'weapon:fa:q4');
   const text=await page.evaluate(()=>window.qaText());assert.doesNotMatch(text,/33⅓%|50%|100%/);assert.match(text,/照胆剑/);assert.match(text,/定岳剑/);assert.doesNotMatch(text,/心愿|查看配方/);
   await page.screenshot({path:path.join(out,`${viewport.width}-top-pool.png`)});
   await click('开始炼制');
   const inspectConfirm=async()=>page.evaluate(()=>{
    const m=window.__towerTest.host.menu,p=window.qaFind('炼制确认弹窗'),nodes=window.qaWalk(p),entry=m.commerceEntries('gear').find(e=>e.key===m.gearSelection);
    const labels=nodes.map(n=>n.getComponent('cc.Label')?.string||'');
    return {title:labels.includes(entry.name),duplicate:labels.filter(s=>s==='确认炼制').length,previews:entry.recipe.definitionIds.some(id=>nodes.some(n=>n.name==='物品图-'+id)),materials:entry.recipe.ingredients.map(a=>({id:a.id,icon:nodes.some(n=>n.name==='物品图-'+a.id),amount:labels.includes('×'+a.count)}))};
   });
   let confirmation=await inspectConfirm();assert.ok(confirmation.title);assert.equal(confirmation.duplicate,1);assert.equal(confirmation.previews,false);assert.ok(confirmation.materials.every(a=>a.icon&&a.amount));
   await page.waitForTimeout(500);await page.screenshot({path:path.join(out,`${viewport.width}-confirm-top.png`)});
   await click('取消炼制');await page.evaluate(()=>window.qaFind('配方列表').getComponent('cc.ScrollView').scrollToTop(0));
   await click('配方卡片-armor:fa:q2');await click('开始炼制');
   confirmation=await inspectConfirm();assert.ok(confirmation.title);assert.equal(confirmation.previews,false);assert.ok(confirmation.materials.every(a=>a.icon&&a.amount));
   await page.waitForTimeout(500);await page.screenshot({path:path.join(out,`${viewport.width}-confirm-armor.png`)});
   const animationStart=(Date.now()-videoStarted)/1000;
   await click('确认炼制');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.commerceDialog),'forging');
   await page.screenshot({path:path.join(out,`${viewport.width}-feeding.png`)});
   await page.waitForTimeout(1300);await page.screenshot({path:path.join(out,`${viewport.width}-fire.png`)});
   await page.waitForTimeout(1050);await page.screenshot({path:path.join(out,`${viewport.width}-rays.png`)});
   await page.waitForFunction(()=>window.__towerTest.host.menu.commerceDialog==='result');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.forgeSequence),1);
   await page.screenshot({path:path.join(out,`${viewport.width}-result.png`)});
   report.cases.push({animationStart,video:await page.video().path(),viewport,tiers:3,lanes:4,slots:3,candidates:true,craft:true,lowRealmBrowse:true,firstProductIcons:true,fixedColumnHeadings:true});await context.close();
  }
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
