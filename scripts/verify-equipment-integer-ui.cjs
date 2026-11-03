// Compiled Cocos UI, isolated browser and in-memory campaign. No user saves.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,process.env.EQUIPMENT_UI_REPORT||'reports/equipment-integer-v2-2026-11-03');
const build=process.env.EQUIPMENT_UI_BUILD||'cocos-pilot/build/web-mobile';
(async()=>{
 const server=createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(err,bytes)=>{if(err)return res.writeHead(404).end();
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(bytes)});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;const report={cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/${build}/index.html?ruleset=xianxia&tower=1&smoke=1`);
   try{
    await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning,{},{timeout:90000});
   }catch(error){
    await page.screenshot({path:path.join(out,`ui-startup-failure-${viewport.width}.png`)});
    fs.writeFileSync(path.join(out,'ui-startup-failure.json'),JSON.stringify({errors:report.errors,body:await page.locator('body').innerText()},null,2));
    throw error;
   }
   await page.evaluate(async()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    const {createFixedEquipment}=await import('/js/xianxia/TowerEquipment.js');
    const {createFixedWeapon}=await import('/js/xianxia/TowerWeapons.js');
    const {cultivationLevelXp}=await import('/js/xianxia/TowerProfile.js');
    const {checksum}=await import('/js/xianxia/Checksum.js');
    let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>{raw=v}},Store=h.store.constructor,fresh=new Store(disk,0);
    fresh.act({type:'sync'},0);const envelope=JSON.parse(raw),state=JSON.parse(envelope.data);
    state.xp=cultivationLevelXp(21);state.equipmentSequence=4;state.weaponSequence=1;
    state.equipment['gear-1']=createFixedEquipment('eq_armor_wugou','gear-1');
    state.equipment['gear-2']=createFixedEquipment('eq_armor_chengxiao','gear-2');
    state.equipment['gear-4']=createFixedEquipment('eq_ring_anxi','gear-4');state.equipmentCounters['gear-4']=0;
    state.equipment['gear-3']=createFixedEquipment('eq_ring_dingwei','gear-3');state.equipmentCounters['gear-3']=0;
    state.weapons['weapon-1']=createFixedWeapon('eq_sword_taiheng','weapon-1');state.weaponCounters['weapon-1']=0;
    state.loadouts[0].armorId='gear-1';state.loadouts[0].ringId='gear-3';state.loadouts[0].weaponId='weapon-1';
    const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)});
    h.store=new Store(disk,0);if(h.store.readOnly)throw Error(h.store.error);
    h.goto('hall');h.menu.render(h.store.state,'hall','');h.menu.showInventory(h.store.state);
   });
   await page.waitForFunction(()=>{let root=window.__towerTest.host.root;while(root.parent)root=root.parent;return !window.qaWalk(root).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy)});
   for(const id of ['gear-1','gear-2','gear-3','weapon-1','basic-ring','basic-armor','iron']){
    await page.evaluate(id=>{const h=window.__towerTest.host;h.menu.backpack.remember();h.menu.backpack.select(id);h.menu.showInventory(h.store.state)},id);
    await page.waitForTimeout(150);
    const result=await page.evaluate(()=>{
     const card=window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='背包详情区'&&n.activeInHierarchy);
     return window.qaWalk(card).flatMap(n=>{const l=n.getComponent('cc.Label');return l?[{name:n.name,text:l.string,height:n.getComponent('cc.UITransform').height,lineHeight:l.lineHeight}]:[]});
    });
    const stats=result.find(l=>l.name==='装备基础属性');
    const ordinary=result.find(l=>l.name==='装备普通效果'),special=result.find(l=>l.name==='装备特殊效果');
    const armor=['gear-1','gear-2','basic-armor'].includes(id),ring=['gear-3','basic-ring'].includes(id);
    assert.match(stats.text,armor?/物理防御/:ring?/法术防御/:/基础物理攻击/);
    if(armor)assert.doesNotMatch(stats.text,/法术防御/);
    if(ring)assert.doesNotMatch(stats.text,/物理防御/);
    if(['gear-1','gear-2','gear-3','weapon-1'].includes(id)){
     if(armor)assert.match(stats.text,/体力/);else assert.doesNotMatch(stats.text,/体力/);assert.ok(ordinary);
     assert.doesNotMatch(ordinary.text,/力量|智力|神识|体力/);
    }else {assert.equal(ordinary,undefined);assert.equal(special,undefined)}
    if(id==='weapon-1'){
     assert.match(ordinary.text,/附加伤害/);assert.match(special.text,/元素.*伤害/);
     assert.doesNotMatch(special.text,/附加伤害/);
    }else if(['gear-1','gear-2'].includes(id)){
     assert.match(special.text,/气血回复 .*\/3秒/);assert.doesNotMatch(ordinary.text,/气血回复/);
    }
    else if(id==='gear-3')assert.match(special.text,/剑阵/);else assert.equal(special,undefined);
    for(const label of result)assert.ok(label.text.split('\n').length*label.lineHeight<=label.height+1,`Clipped ${id}: ${label.text}`);
    await page.screenshot({path:path.join(out,`${id}-${viewport.width}.png`)});
    await page.evaluate(()=>{const n=window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='背包详情视口'&&n.activeInHierarchy);n.getComponent('cc.ScrollView').scrollToBottom(0)});
    await page.waitForTimeout(80);
    await page.screenshot({path:path.join(out,`${id}-bottom-${viewport.width}.png`)});
    report.cases.push({viewport,id,labels:result});
   }
   // Verify actual compiled character sheet after equipping each variant.
   for(const id of ['gear-1','gear-2']){
    const labels=await page.evaluate(id=>{
     const h=window.__towerTest.host,result=h.store.act({type:'equipEquipment',category:'armor',id},0);
     if(!result.ok)throw Error(JSON.stringify(result));
     h.menu.inventoryOpen=false;h.menu.dismissCharacterInfo();h.goto('hall');h.menu.render(h.store.state,'hall','');h.menu.showCharacterInfo();
     return window.qaWalk(h.root).filter(n=>n.activeInHierarchy).flatMap(n=>{const l=n.getComponent('cc.Label');return l?[{name:n.name,text:l.string}]:[]});
    },id);
    const get=name=>labels.find(l=>l.name===name)?.text;
    assert.ok(get('角色数值-力量')&&get('角色数值-智力'),'character attributes visible');
    assert.equal(get('角色数值-攻击速度'),id==='gear-1'?'1.26次/秒':'1.14次/秒');
    assert.ok(get('角色数值-体力'));assert.ok(get('角色数值-法术防御'));
    report.cases.push({viewport,id,sheet:labels.filter(l=>l.name.startsWith('角色数值-'))});
    await page.screenshot({path:path.join(out,`${id}-character-${viewport.width}.png`)});
   }
   const tiny=await page.evaluate(()=>{
    const h=window.__towerTest.host;
    const l={...h.store.state.loadouts[0],weaponId:'iron',armorId:'basic-armor',ringId:'gear-4'};
    const result=h.store.act({type:'setLoadout',index:0,loadout:l},0);if(!result.ok)throw Error(JSON.stringify(result));
    h.menu.dismissCharacterInfo();h.goto('hall');h.menu.render(h.store.state,'hall','');h.menu.showCharacterInfo();
    return window.qaWalk(h.root).find(n=>n.name==='角色数值-体力'&&n.activeInHierarchy)?.getComponent('cc.Label')?.string;
   });
   assert.equal(tiny,'0');report.cases.push({viewport,ringVitality:tiny});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);
  fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`PASS: ${report.cases.length} equipment detail/character cases, no page errors`);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
