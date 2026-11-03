// Compiled Cocos UI with isolated in-memory inventory; never reads user saves.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { chromium } = require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'reports/equipment-detail-standard-2026-11-02');
(async () => {
 fs.mkdirSync(out,{recursive:true});
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
  for (const viewport of [{width:844,height:390},{width:1280,height:720},{width:1024,height:768}]) {
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
    const {ARMORS,RINGS} = await import('/js/xianxia/TowerEquipment.js');
    const {createFixedWeapon}=await import('/js/xianxia/TowerWeapons.js');
    const {checksum} = await import('/js/xianxia/Checksum.js');
    let raw = null;
    const disk = { getItem:()=>raw, setItem:(_,v)=>{raw=v;} }, Store = h.store.constructor, fresh = new Store(disk,0);
    fresh.act({type:'sync'},0);
    const envelope = JSON.parse(raw), state = JSON.parse(envelope.data);
    const d = ARMORS.find(d=>d.tier==='fa' && d.quality===1 && d.role==='recovery');
    state.xp=6601;state.equipmentSequence=1;
    state.equipment['gear-1']=createFixedEquipment(d.id,'gear-1');
    state.loadouts[0].armorId='gear-1';
    state.weapons['weapon-1']=createFixedWeapon('eq_sword_guiyan','weapon-1');state.weaponSequence=1;state.weaponCounters['weapon-1']=0;
    state.loadouts[0].weaponId='weapon-1';
    const ring=RINGS.find(r=>r.tier==='ling'&&r.quality===4);
    state.equipment['gear-2']=createFixedEquipment(ring.id,'gear-2');state.equipmentSequence=2;
    state.equipmentCounters['gear-2']=0;state.loadouts[0].ringId='gear-2';
    state.skills.sj_heart=1;
    const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)});
    h.store=new Store(disk,0);
    if(h.store.readOnly || !h.store.state.equipment['gear-1']) throw Error('UI fixture rejected: '+h.store.error);
    h.goto('hall');h.menu.render(h.store.state,'hall','');
    h.menu.showInventory(h.store.state);h.menu.backpack.select('gear-1');h.menu.showInventory(h.store.state);
   });

   await page.waitForFunction(()=>{let root=window.__towerTest.host.root;while(root.parent)root=root.parent;return !window.qaWalk(root).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy);});
   const cards=[];
   for(const id of ['iron','basic-armor','basic-ring','weapon-1','gear-1','gear-2']){
    await page.evaluate(id=>{const h=window.__towerTest.host;h.menu.backpack.remember();h.menu.backpack.select(id);h.menu.showInventory(h.store.state);},id);
    await page.waitForTimeout(150);
    const detail=await page.evaluate(()=>{
     const nodes=window.qaWalk(window.__towerTest.host.root), card=nodes.find(n=>n.name==='背包详情区'&&n.activeInHierarchy),current=nodes.find(n=>n.name==='已装备对比卡'&&n.activeInHierarchy);
     const size=n=>{const t=n.getComponent('cc.UITransform');return {width:t.width,height:t.height,x:n.position.x,y:n.position.y};};
     const labels=window.qaWalk(card).flatMap(n=>{const l=n.getComponent('cc.Label');return l?[{name:n.name,text:l.string,font:l.fontFamily,size:l.fontSize,lineHeight:l.lineHeight,height:n.getComponent('cc.UITransform').height}]:[];});
     return {card:size(card),current:current?size(current):null,labels};
    });
    assert.ok(detail.labels.every(l=>l.font==='sans-serif'));
    const stats=detail.labels.find(l=>l.name==='装备基础属性');assert.equal(stats.size,24);
    assert.doesNotMatch(stats.text,/[：:；;（）＋]|冷却缩短|不缩短|独立判定|锋锐|灵蕴/);
    assert.ok(detail.labels.some(l=>l.text==='装备属性'));
    for(const l of detail.labels)assert.ok(l.text.split('\n').length*l.lineHeight<=l.height+1,`Clipping ${id}: ${l.text}`);
    if(detail.current){assert.equal(detail.card.width,detail.current.width);assert.equal(detail.card.height,detail.current.height);}
    cards.push({id,...detail});
    await page.screenshot({path:path.join(out,`${id}-${viewport.width}.png`)});
    await page.evaluate(()=>{const n=window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='背包详情视口'&&n.activeInHierarchy);n.getComponent('cc.ScrollView').scrollToBottom(0);});
    await page.waitForTimeout(80);
    await page.screenshot({path:path.join(out,`${id}-bottom-${viewport.width}.png`)});
   }
   assert.equal(new Set(cards.map(c=>`${c.card.width}x${c.card.height}`)).size,1);
   // Longest weapon identity exercises wrapping without a tiny font.
   await page.evaluate(async()=>{const h=window.__towerTest.host,{WEAPONS,createFixedWeapon,weaponDescription}=await import('/js/xianxia/TowerWeapons.js');const d=WEAPONS.filter(d=>d.quality).reduce((a,b)=>Math.max(...weaponDescription(createFixedWeapon(a.id,'preview')).map(s=>s.length))>=Math.max(...weaponDescription(createFixedWeapon(b.id,'preview')).map(s=>s.length))?a:b);h.store._state=JSON.parse(JSON.stringify(h.store.state));h.store._state.weapons['weapon-2']=createFixedWeapon(d.id,'weapon-2');h.menu.backpack.remember();h.menu.backpack.select('weapon-2');h.menu.showInventory(h.store.state);});
   await page.waitForTimeout(100);await page.screenshot({path:path.join(out,`long-weapon-${viewport.width}.png`)});
   report.cases.push({viewport,cards});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}
 finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,cases:report.cases.map(c=>({viewport:c.viewport,cards:c.cards.length})),error:report.error,errors:report.errors},null,2));}
})();
