const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});const out='reports/library-pages';fs.mkdirSync(out,{recursive:true});
try{for(const viewport of [{width:1280,height:720},{width:844,height:390},{width:1280,height:900}]){
 const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];const ready=()=>page.waitForFunction(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return !walk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy);},{},{timeout:120000});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1');await page.waitForFunction(()=>window.__towerTest?.host?.menu);
 await ready();
 await page.evaluate(()=>{const h=__towerTest.host;h.campElapsed=-100000;h.goto('library');});
 await ready();
 await page.waitForTimeout(250);
 const materialPoint=await page.evaluate(()=>{
  const walk=n=>[n,...n.children.flatMap(walk)];
  const node=walk(__towerTest.host.menu.libraryPanel.root).find(n=>n.name==='打开材料录');
  const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);
  const screen=camera.worldToScreen(node.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
  return {x:r.x+screen.x/canvas.width*r.width,y:r.y+(1-screen.y/canvas.height)*r.height};
 });
 await page.mouse.click(materialPoint.x,materialPoint.y);
 await page.waitForFunction(()=>__towerTest.host.menu.libraryPanel.volume==='materials');
 assert.equal(await page.evaluate(()=>__towerTest.host.menu.libraryPanel.volume),'materials');
 await page.evaluate(()=>__towerTest.host.menu.libraryPanel.search.focus());
 await page.locator('input:visible,textarea:visible').last().fill('玄铁');
 assert.equal(await page.evaluate(()=>__towerTest.host.menu.libraryPanel.filter().query),'玄铁');
 assert.deepEqual(await page.evaluate(async()=>{const {libraryEntries}=await import('/js/xianxia/TowerLibrary.js');const p=__towerTest.host.menu.libraryPanel;return libraryEntries(p.volume,p.filter().query,p.filter().chapter).map(e=>e.id);}),['pill_forge_xuantie']);
 await ready();
 await page.screenshot({path:`${out}/materials-catalog-${viewport.width}x${viewport.height}.png`});
 await page.keyboard.press('Escape');
 await page.locator('canvas').focus();
 const report=await page.evaluate(async()=>{
 const {LIBRARY_ENTRIES,libraryDetails}=await import('/js/xianxia/TowerLibrary.js');const h=__towerTest.host;h.campElapsed=-100000;window.lib=()=>h.menu.libraryPanel;window.walk=n=>[n,...n.children.flatMap(walk)];const before=JSON.stringify(h.store.state);let spreads=0;const failures=[];
 for(const entry of LIBRARY_ENTRIES)for(const quality of entry.qualities){lib().quality=quality;lib().showEntry(entry.id);const pages=lib().readingPages;let content='';
 for(let i=0;i<pages;i++){lib().readingPage=i;lib().render();spreads++;
 if(lib().scrolls.length)failures.push('reader scroll '+entry.id);
 for(const name of ['物品介绍卷页','功用说明卷页']){const pane=walk(lib().root).find(n=>n.name===name);const ps=pane.getComponent('cc.UITransform').contentSize;
 for(const node of pane.children){const size=node.getComponent('cc.UITransform')?.contentSize;if(!size)continue;
 if(node.position.y-size.height/2 < -ps.height/2-1 || node.position.y+size.height/2 > ps.height/2+1)failures.push(entry.id+' '+quality+' '+i+' overflow '+node.name);
 }
 if(name==='功用说明卷页')content+=pane.children.filter(n=>(n.getComponent('cc.Label')?.string||'').replace(/\s/g,'') !== libraryDetails(entry.id, quality).requirement.replace(/\s/g,'')).map(n=>n.getComponent('cc.Label')?.string||'').join('');
 }
 }
 const detail=libraryDetails(entry.id,quality);const normalize=s=>s.replace(/\s/g,'');
 for(const text of (detail.sections?detail.sections.flatMap(s=>[s.title,...s.lines]):[...detail.effects,...detail.conditions,...detail.tips,detail.source,detail.note]).filter(Boolean))if(!normalize(content).includes(normalize(text)))failures.push('missing '+entry.id+' '+text);
 }
 if(JSON.stringify(h.store.state)!==before)failures.push('profile changed');return{spreads,failures,entries:LIBRARY_ENTRIES.length};});
 assert.deepEqual(report.failures,[]);console.log(viewport,report.entries,report.spreads,'all content fits without scrolling');
 for(const id of ['eq_sword_ningshuang','eq_ring_wenpo','pill_huichun','pill_forge_xuantie','pill_forge_tiejing','pill_huichuncao','pill_xiaoyue']){
 await page.evaluate(id=>{lib().quality=4;lib().showEntry(id);},id);
 await page.waitForFunction(id=>walk(lib().root).some(n=>n.name==='tower-library-items/'+id&&n.getComponent('cc.Sprite')?.spriteFrame),id);
 await ready();
 await page.screenshot({path:`${out}/${id}-${viewport.width}x${viewport.height}.png`});
 const count=await page.evaluate(()=>lib().readingPages);
 const clickNode=async(name)=>{
  await ready();await page.waitForTimeout(80);
  const p=await page.evaluate(name=>{const node=walk(lib().root).find(n=>n.name===name);const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);const screen=camera.worldToScreen(node.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();return{x:r.x+screen.x/canvas.width*r.width,y:r.y+(1-screen.y/canvas.height)*r.height};},name);
  await page.mouse.click(p.x,p.y);
 };
 for(let i=1;i<count;i++){await clickNode('下一页');assert.equal(await page.evaluate(()=>lib().entryId),id);assert.equal(await page.evaluate(()=>lib().readingPage),i);}
 await page.evaluate(()=>lib().openCatalog());await clickNode('返回书页');assert.equal(await page.evaluate(()=>lib().readingPage),count-1);
 if(count>1){await clickNode('上一页');assert.equal(await page.evaluate(()=>lib().readingPage),count-2);}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report-${viewport.width}x${viewport.height}.json`,JSON.stringify(report,null,2));await context.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
