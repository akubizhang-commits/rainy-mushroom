// Compiled Cocos UI with isolated in-memory inventory; never reads user saves.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { chromium } = require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'reports/attribute-rules-2026-11-02');
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
    state.skills.sj_heart=1;state.skills.sj_spirit=3;
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
   await page.waitForFunction(()=>window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='角色全身形象')?.getComponent('cc.Sprite')?.spriteFrame);
   const layout=await page.evaluate(()=>{
    const nodes=window.qaWalk(window.__towerTest.host.root), get=name=>nodes.find(n=>n.name===name);
    const names=nodes.filter(n=>n.name.startsWith('角色属性-'));
    return {identity:get('角色境界').getComponent('cc.Label').string,experience:get('角色修为').getComponent('cc.Label').string, labelsLeft:names.every(n=>n.getComponent('cc.Label').horizontalAlign===0), valuesRight:nodes.filter(n=>n.name.startsWith('角色数值-')||['角色攻击力','角色气血上限','角色移动速度','角色当前气血'].includes(n.name)).every(n=>n.getComponent('cc.Label').horizontalAlign===2)};
   });
   assert.match(layout.identity,/剑修/);assert.match(layout.experience,/经验/);assert.ok(layout.labelsLeft&&layout.valuesRight);
   await page.screenshot({path:path.join(out,`character-${viewport.width}.png`)});
   const labels=await page.evaluate(()=>window.qaText());
   assert.ok(labels.includes('每3秒恢复气血'));
   for(const old of ['受击恢复比例','受击恢复延迟','受击恢复冷却','每层恢复上限']) assert.ok(!labels.includes(old),old);
   const regen=await page.evaluate(()=>{
    const nodes=window.qaWalk(window.__towerTest.host.root);
    return nodes.find(n=>n.name==='角色数值-每3秒恢复气血').getComponent('cc.Label').string;
   });
   const expectedRegen=await page.evaluate(async()=>{
    const state=window.__towerTest.host.store.state;
    const {combatLoadout,campaignMaxHp}=await import('/js/xianxia/TowerCampaign.js');
    const {regenerationAmount}=await import('/js/xianxia/TowerAttributeRules.js');
    return Math.round(regenerationAmount(campaignMaxHp(state),combatLoadout(state))*100)/100;
   });
   assert.equal(Number(regen),expectedRegen);
   const castRate=await page.evaluate(()=>window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='角色数值-施法速度').getComponent('cc.Label').string);
   assert.equal(castRate,'130%');
   const attackRate=await page.evaluate(()=>window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='角色数值-攻击速度').getComponent('cc.Label').string);
   assert.equal(attackRate,'1.04次/秒');
   const order=await page.evaluate(()=>{
    const detail=window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='角色详细属性内容');
    return detail.children.filter(n=>n.name.startsWith('角色属性-')).map(n=>n.getComponent('cc.Label').string);
   });
   assert.equal(order[order.indexOf('攻击速度')+1],'移动速度');
   assert.ok(order.indexOf('功法伤害增加')<order.indexOf('气血上限'));
   assert.ok(order.indexOf('附加伤害')<order.indexOf('气血上限'));
   assert.ok(!labels.includes('物理伤害增加')&&!labels.includes('法术伤害增加')&&!labels.includes('武器附加伤害'));
   const headings=await page.evaluate(()=>window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='角色详细属性内容').children.filter(n=>n.name.endsWith('标题')).map(n=>n.getComponent('cc.Label').string));
   assert.deepEqual(headings,[]);
   for(const removed of ['当前气血','当前配装','拾取范围','蚀骨剑意伤害转化','剑罡爆裂附加伤害','恢复比例与每层','防御减伤＝'])assert.ok(!labels.includes(removed),removed);
   for(const name of ['攻击速度','施法速度','功法冷却缩减','物理暴击率','法术暴击率','物理暴击倍率','法术暴击倍率','伤害增加','功法伤害增加','附加伤害']) assert.ok(labels.includes(name),name);
   for(const name of ['会心触发','会心一击率','会心附加伤害','直接攻击暴击率','基础暴击额外伤害','戒指暴击额外伤害','心法伤害加成','未激活','暴击基础额外伤害按']) assert.ok(!labels.includes(name),name);
   for(const [name,offset] of [['defense',500],['special',800]]){
    await page.evaluate(offset=>window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='角色详细属性视口').getComponent('cc.ScrollView').scrollToOffset({x:0,y:offset},0),offset);
    await page.waitForTimeout(100);
    await page.screenshot({path:path.join(out,`${name}-${viewport.width}.png`)});
   }
   const stats = await page.evaluate(()=>{
    const nodes=window.qaWalk(window.__towerTest.host.root);
    const value=label=>nodes.find(n=>n.name==='角色数值-'+label)?.getComponent('cc.Label')?.string;
    const scroll=nodes.find(n=>n.name==='角色详细属性视口')?.getComponent('cc.ScrollView');
    if(scroll) scroll.scrollToOffset({x:0,y:520},0);
    return {physical:value('物理防御'),magic:value('法术防御'),physicalReduction:value('物理伤害减免'),magicReduction:value('法术伤害减免'),cooldown:value('功法冷却缩减')};
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
   report.cases.push({viewport,layout,order,headings,stats});await context.close();
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
