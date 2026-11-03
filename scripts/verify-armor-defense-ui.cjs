// Compiled Cocos UI with isolated in-memory inventory; never reads user saves.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { chromium } = require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'reports/armor-dual-defense-2026-11-01');
(async () => {
 const server = createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, bytes) => {
   if (error) return res.writeHead(404).end();
   res.setHeader('Content-Type', ({ '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.css':'text/css' })[path.extname(file)] || 'application/octet-stream');
   res.end(bytes);
  });
 });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 let browser;
 const report = { cases: [], errors: [] };
 try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  for (const viewport of [{width:844,height:390},{width:1280,height:720}]) {
   const context = await browser.newContext({ viewport });
   const page = await context.newPage();
   page.on('pageerror', e => report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(() => window.__towerTest?.host?.menu && !window.__towerTest.host.transitioning);
   await page.evaluate(async () => {
    const h = window.__towerTest.host;
    h.campElapsed = -100000;
    window.qaWalk = n => [n, ...n.children.flatMap(window.qaWalk)];
    window.qaText = () => window.qaWalk(h.root).filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.Label')?.string || '').join('\n');
    const {createFixedEquipment} = await import('/js/xianxia/TowerEquipment.js');
    const {ARMORS} = await import('/js/xianxia/TowerEquipment.js');
    const {checksum} = await import('/js/xianxia/Checksum.js');
    let raw = null;
    const disk = { getItem:()=>raw, setItem:(_,v)=>{raw=v;} }, Store = h.store.constructor, fresh = new Store(disk,0);
    fresh.act({type:'sync'},0);
    const envelope = JSON.parse(raw), state = JSON.parse(envelope.data);
    const d = ARMORS.find(d=>d.tier==='fa' && d.quality===1 && d.role==='recovery');
    state.xp=6601;state.equipmentSequence=1;
    state.equipment['gear-1']=createFixedEquipment(d.id,'gear-1');
    state.loadouts[0].armorId='gear-1';
    const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)});
    h.store=new Store(disk,0);
    if(h.store.readOnly || !h.store.state.equipment['gear-1']) throw Error('UI fixture rejected: '+h.store.error);
    h.goto('hall');h.menu.render(h.store.state,'hall','');
    h.menu.showInventory(h.store.state);h.menu.backpack.select('gear-1');h.menu.showInventory(h.store.state);
   });
   const text = await page.evaluate(()=>window.qaText());
   assert.match(text,/物理防御/);assert.match(text,/法术防御/);assert.match(text,/主动功法冷却缩短0.3%/);
   assert.doesNotMatch(text,/受到伤害减少/);
   await page.waitForFunction(()=>{
    let root=window.__towerTest.host.root;while(root.parent)root=root.parent;
    return !window.qaWalk(root).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy);
   });
   await page.screenshot({path:path.join(out,`armor-detail-${viewport.width}.png`)});
   await page.evaluate(()=>{
    const m=window.__towerTest.host.menu;
    m.dismissInventory();m.showCharacterInfo();
   });
   const stats = await page.evaluate(()=>{
    const nodes=window.qaWalk(window.__towerTest.host.root);
    const value=label=>nodes.find(n=>n.name==='角色数值-'+label)?.getComponent('cc.Label')?.string;
    const scroll=nodes.find(n=>n.name==='角色详细属性视口')?.getComponent('cc.ScrollView');
    if(scroll) scroll.scrollToOffset({x:0,y:520},0);
    return {physical:value('物理防御'),magic:value('法术防御'),physicalReduction:value('物理伤害减免'),magicReduction:value('法术伤害减免'),cooldown:value('主动功法冷却缩减')};
   });
   assert.ok(parseFloat(stats.physical)>0);assert.ok(parseFloat(stats.magic)>parseFloat(stats.physical));
   assert.ok(parseFloat(stats.magicReduction)>parseFloat(stats.physicalReduction));
   assert.ok(parseFloat(stats.cooldown)>=.3);
   await page.waitForFunction(()=>{
    let root=window.__towerTest.host.root;while(root.parent)root=root.parent;
    return !window.qaWalk(root).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy);
   });
   await page.waitForTimeout(150);
   await page.screenshot({path:path.join(out,`character-defense-${viewport.width}.png`)});
   report.cases.push({viewport,stats});await context.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status='passed';
 } catch (error) {report.status='failed';report.failure=error.stack;process.exitCode=1;}
 finally {
  fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify(report,null,2));
 }
})();
