const { chromium } = require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 const out = 'reports/library-catalog'; fs.mkdirSync(out, { recursive: true });
 try {
  for (const viewport of [{width:1280,height:720},{width:844,height:390},{width:1280,height:900}]) {
   const context = await browser.newContext({ viewport }); const page = await context.newPage();
   const errors=[];page.on('pageerror', e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1');
   await page.waitForFunction(()=>window.__towerTest?.host?.menu);
   const ready=()=>page.waitForFunction(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return !walk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy);}, {}, {timeout:120000});
   await ready();
   await page.evaluate(()=>{const h=__towerTest.host;h.campElapsed=-100000;h.goto('library');window.lib=()=>h.menu.libraryPanel;window.walk=n=>[n,...n.children.flatMap(walk)];});
   const click=async name=>{
    await ready();await page.waitForTimeout(100);
    const point=await page.evaluate(name=>{const n=walk(lib().root).find(n=>n.name===name&&n.getComponent('cc.Button'));if(!n)throw Error('Missing button '+name);const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);const s=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+s.x/c.width*r.width,y:r.y+(1-s.y/c.height)*r.height};},name);
    await page.mouse.click(point.x,point.y);
   };
   const count=async n=>assert.match(await page.evaluate(()=>lib().countLabel.string),new RegExp(`^共 ${n} 条`));
   await click('打开材料录');await count(24);
   for (const [chapter,n] of [['炼丹材料篇',9],['炼器材料篇',13],['突破灵材篇',2],['全部',24]]) {await click(chapter);await count(n);}
   const labels=await page.evaluate(()=>{const edit=lib().search;return walk(edit.node).filter(n=>n.getComponent('cc.Label')).map(n=>({text:n.getComponent('cc.Label').string,color:n.getComponent('cc.Label').color.toHEX(),x:n.position.x,y:n.position.y}));});
   assert.equal(labels.length,2);assert.equal(labels.filter(l=>l.text==='搜索名称或类别').length,1);assert.ok(labels.every(l=>l.color!=='ffffff'&&l.x===0&&l.y===0));
   await page.evaluate(()=>lib().search.focus());await page.locator('input:visible,textarea:visible').last().fill('玄铁');await count(1);
   await page.evaluate(()=>lib().search.blur());await click('清空');await count(24);
   await click('突破灵材篇');await click('赤鳞金髓');await click('目录');await count(24);
   await click('返回书页');assert.equal(await page.evaluate(()=>lib().entryId),'pill_chilin');
   await click('目录');await click('丹药录');await count(13);await click('材料录');await count(24);
   await page.evaluate(()=>lib().showRoom());await click('打开材料录');await count(24);
   await ready();await page.waitForTimeout(150);await page.screenshot({path:`${out}/materials-${viewport.width}x${viewport.height}.png`});
   assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}x${viewport.height}: entry, all 24, chapters 9/13/2, search, return, switch, remembered entry, single styled placeholder`);
   await context.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
