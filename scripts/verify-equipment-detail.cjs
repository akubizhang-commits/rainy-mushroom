const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/equipment-comparison-cards');
(async()=>{fs.mkdirSync(OUT,{recursive:true});const server=createServer((req,res)=>{const p=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!p.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(p,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(p)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={status:'RUNNING',cases:[],errors:[]};
try{browser=await chromium.launch({headless:true,channel:'chrome'});
for(const viewport of [{width:1280,height:720},{width:844,height:390}]){const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu);
await page.evaluate(async()=>{const h=window.__towerTest.host,{rollWeapon}=await import('/js/xianxia/TowerWeapons.js');const {rollEquipment}=await import('/js/xianxia/TowerEquipment.js');h.campElapsed=-100000; h.store._state=JSON.parse(JSON.stringify(h.store.state));
// Isolated browser + smoke state, valid fixture items; no player storage involved.
h.store.state.weapons['weapon-1']=rollWeapon('huang',1,()=>0,'weapon-1');h.store.state.weapons['weapon-2']=rollWeapon('huang',1,()=>.4,'weapon-2');h.store.state.weaponCounters['weapon-1']=0;h.store.state.weaponCounters['weapon-2']=0;for(const [n,q,r] of [[3,1,.8],[4,2,0],[5,2,.4],[6,2,.8],[7,3,0],[8,3,.4]]){const id='weapon-'+n;h.store.state.weapons[id]=rollWeapon('huang',q,()=>r,id);h.store.state.weaponCounters[id]=0;}h.store.state.weaponSequence=8;h.store.state.equipment['gear-1']=rollEquipment('armor','huang',1,()=>0,'gear-1');h.store.state.equipmentSequence=1;const saved=h.store.act({type:'sync'},Date.now());if(!saved.ok)throw Error(JSON.stringify(saved));h.goto('inventory');window.artWalk=n=>[n,...n.children.flatMap(window.artWalk)];});
const check=async()=>{try{await page.waitForFunction(()=>{const ns=window.artWalk(window.__towerTest.host.root);return ['eq_sword_iron','eq_sword_suwen','eq_sword_songfeng','eq_ring_basic','eq_armor_basic','eq_armor_qingma','eq_sword_shoushan','eq_sword_guiyan','eq_sword_caiyun','eq_sword_panxi','eq_sword_liuquan','eq_sword_ningshuang'].every(id=>ns.some(n=>n.name==='tower-equipment/'+id&&n.getComponent('cc.Sprite')?.spriteFrame));});}catch(e){await page.screenshot({path:path.join(OUT,'failure.png')}); console.log(await page.evaluate(()=>({items:window.__towerTest.host.store.state.weapons,nodes:window.artWalk(window.__towerTest.host.root).filter(n=>n.name.includes('图标')||n.name.includes('tower-equipment')).map(n=>({name:n.name,frame:!!n.getComponent('cc.Sprite')?.spriteFrame})),cache:[...window.__towerTest.host.menu.towerImages].map(([key,v])=>({key,loaded:!!v.frame}))})));throw e;}};await check();
const click=async name=>{const pos=await page.evaluate(name=>{const ns=window.artWalk(window.__towerTest.host.root),n=ns.find(n=>n.name===name&&n.activeInHierarchy);if(!n)throw Error(name);const camera=window.artWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),p=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return {x:r.x+p.x/c.width*r.width,y:r.y+(1-p.y/c.height)*r.height};},name);await page.mouse.click(pos.x,pos.y);await page.waitForTimeout(120);};
await page.screenshot({path:path.join(OUT,`inventory-${viewport.width}.png`)});
for(const [clickName,id] of [['装备槽-weapon','iron'],['背包物品-weapon-1','weapon-1'],['背包物品-weapon-2','weapon-2'],['装备槽-ring','basic-ring'],['装备槽-armor','basic-armor'],['背包物品-gear-1','gear-1'],...[3,4,5,6,7,8].map(n=>['背包物品-weapon-'+n,'weapon-'+n])]){await click(clickName);await page.waitForFunction(id=>window.artWalk(window.__towerTest.host.root).some(n=>n.name==='背包详情图标-'+id&&n.children.some(c=>c.getComponent('cc.Sprite')?.spriteFrame)),id);const geometry=await page.evaluate(()=>{const h=window.__towerTest.host,ns=window.artWalk(h.root),selected=ns.find(n=>n.name==='背包详情区'),current=ns.find(n=>n.name==='已装备对比卡'),actions=ns.find(n=>n.name==='物品操作区');const box=n=>({x:n.position.x,y:n.position.y,width:n.getComponent('cc.UITransform').width,height:n.getComponent('cc.UITransform').height});return {selected:box(selected),current:current?box(current):null,actions:box(actions),close:ns.some(n=>n.name==='关闭详情')};});
assert.ok(geometry.selected.width<=400);assert.equal(geometry.close,false);
assert.ok(geometry.selected.x+geometry.selected.width/2<geometry.actions.x-geometry.actions.width/2);
assert.equal(geometry.selected.y+geometry.selected.height/2,geometry.actions.y+geometry.actions.height/2);
if(geometry.current)assert.ok(geometry.current.x+geometry.current.width/2<geometry.selected.x-geometry.selected.width/2);
await click('分享物品-'+id);
assert.equal(await page.evaluate(()=>window.artWalk(window.__towerTest.host.root).some(n=>n.name==='背包详情区')),true);
await page.screenshot({path:path.join(OUT,`detail-${id}-${viewport.width}.png`)});await page.mouse.click(12,12);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.artWalk(window.__towerTest.host.root).some(n=>n.name==='背包详情区')),false);assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.inventoryOpen),true);}

await page.evaluate(()=>{const h=window.__towerTest.host;h.store._state=JSON.parse(JSON.stringify(h.store.state));h.store.state.pills={huichun:3,peiyuan:3};const result=h.store.act({type:'sync'},Date.now());if(!result.ok)throw Error(JSON.stringify(result));h.goto('inventory');});
for(const id of ['huichun','peiyuan']){
 await click('背包物品-'+id);
 const labels=await page.evaluate(()=>window.artWalk(window.__towerTest.host.root).flatMap(n=>{const l=n.getComponent('cc.Label');return l?[l.string]:[];}));
 for(const value of ['消耗品','无法出售','基本信息','使用'])assert.ok(labels.includes(value),value);
 assert.ok(labels.some(t=>t.includes('只能在非战斗状态使用该道具')));
 assert.ok(labels.some(t=>t.startsWith('一瓶')));
 await page.screenshot({path:path.join(OUT,`pill-${id}-${viewport.width}.png`)});
 await page.evaluate(()=>window.artWalk(window.__towerTest.host.root).find(n=>n.name==='背包详情视口').getComponent('cc.ScrollView').scrollToBottom(0));
 await page.waitForTimeout(100);
 await page.screenshot({path:path.join(OUT,`pill-${id}-lore-${viewport.width}.png`)});
 await page.mouse.click(12,12);await page.waitForTimeout(120);
}
await page.evaluate(async()=>{const h=window.__towerTest.host;const {rollEquipment}=await import('/js/xianxia/TowerEquipment.js');h.store._state=JSON.parse(JSON.stringify(h.store.state));h.store.state.equipmentSequence=2;h.store.state.equipmentCounters['gear-2']=0;h.store.state.equipment['gear-2']=rollEquipment('ring','xuan',4,()=>0,'gear-2');h.store.state.xp=0;const result=h.store.act({type:'sync'},Date.now());if(!result.ok)throw Error(JSON.stringify(result));h.goto('inventory');});
for(const fulfilled of [false,true]){
 if(fulfilled)await page.evaluate(()=>{const h=window.__towerTest.host;h.store._state=JSON.parse(JSON.stringify(h.store.state));h.store.state.xp=10920;const result=h.store.act({type:'sync'},Date.now());if(!result.ok)throw Error(JSON.stringify(result));h.goto('inventory');});
 await click('背包物品-gear-2');
 const result=await page.evaluate(()=>{const ns=window.artWalk(window.__towerTest.host.root);const panel=ns.find(n=>n.name==='背包详情区');const labels=window.artWalk(panel).flatMap(n=>{const l=n.getComponent('cc.Label');return l?[{name:n.name,text:l.string,color:[l.color.r,l.color.g,l.color.b],height:n.getComponent('cc.UITransform').height,lineHeight:l.lineHeight}]:[]});return labels;});
 const realm=result.find(l=>l.text.includes('境界要求'));
 assert.equal(realm.text,'境界要求：金丹初期');
 assert.deepEqual(realm.color,fulfilled?[38,63,57]:[151,66,47]);
 assert.ok(result.some(l=>l.text==='效果'));
 assert.ok(result.some(l=>l.text.includes('会心')));
 assert.ok(result.some(l=>l.name==='装备描述'));
 for(const label of result)assert.ok(label.text.split('\n').length*label.lineHeight<=label.height+1,`Clipped label: ${label.text}`);
 await page.screenshot({path:path.join(OUT,`ring-${fulfilled?'eligible':'locked'}-${viewport.width}.png`)});
 await page.evaluate(()=>{const n=window.artWalk(window.__towerTest.host.root).find(n=>n.name==='背包详情视口');n.getComponent('cc.ScrollView').scrollToBottom(0);});
 await page.waitForTimeout(100);
 await page.screenshot({path:path.join(OUT,`ring-description-${fulfilled}-${viewport.width}.png`)});
 await page.mouse.click(12,12);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.artWalk(window.__towerTest.host.root).some(n=>n.name==='背包详情区')),false);assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.inventoryOpen),true);
}

for(const [id,slot] of [['weapon-1','weapon'],['gear-1','armor'],['gear-2','ring']]){
 await click('背包物品-'+id);
 const names=await page.evaluate(()=>window.artWalk(window.__towerTest.host.root).map(n=>n.name));
 assert.ok(!names.includes('锁定')&&!names.includes('解锁'));
 await click('穿戴');
 const result=await page.evaluate(slot=>{const h=window.__towerTest.host;return {selected:h.store.state.loadouts[h.store.state.selectedLoadout][slot+'Id'],detail:window.artWalk(h.root).some(n=>n.name==='背包详情区')};},slot);
 assert.equal(result.selected,id);assert.equal(result.detail,false);
}
await page.screenshot({path:path.join(OUT,`after-equip-${viewport.width}.png`)});
for(let i=0;i<3;i++){

await click('关闭背包');await page.evaluate(()=>window.__towerTest.host.goto('inventory'));await check();}
report.cases.push({viewport,icons:12,details:12,realmStates:2,equipCloseCategories:3,reopenCycles:3});await context.close();}
assert.deepEqual(report.errors,[]);report.status='PASS';}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}})();
