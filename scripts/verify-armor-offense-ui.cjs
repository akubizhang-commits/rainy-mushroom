// Compiled Cocos UI, isolated browser and in-memory campaign. No user saves.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/armor-offense-2026-11-02');
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
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning);
   await page.evaluate(async()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    const {createFixedEquipment}=await import('/js/xianxia/TowerEquipment.js');
    const {cultivationLevelXp}=await import('/js/xianxia/TowerProfile.js');
    const {checksum}=await import('/js/xianxia/Checksum.js');
    let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>{raw=v}},Store=h.store.constructor,fresh=new Store(disk,0);
    fresh.act({type:'sync'},0);const envelope=JSON.parse(raw),state=JSON.parse(envelope.data);
    state.xp=cultivationLevelXp(21);state.equipmentSequence=2;
    state.equipment['gear-1']=createFixedEquipment('eq_armor_wugou','gear-1');
    state.equipment['gear-2']=createFixedEquipment('eq_armor_chengxiao','gear-2');
    state.loadouts[0].armorId='gear-1';
    const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)});
    h.store=new Store(disk,0);if(h.store.readOnly)throw Error(h.store.error);
    h.goto('hall');h.menu.render(h.store.state,'hall','');h.menu.showInventory(h.store.state);
   });
   await page.waitForFunction(()=>{let root=window.__towerTest.host.root;while(root.parent)root=root.parent;return !window.qaWalk(root).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy)});
   for(const id of ['gear-1','gear-2']){
    await page.evaluate(id=>{const h=window.__towerTest.host;h.menu.backpack.remember();h.menu.backpack.select(id);h.menu.showInventory(h.store.state)},id);
    await page.waitForTimeout(150);
    const result=await page.evaluate(()=>{
     const card=window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='背包详情区'&&n.activeInHierarchy);
     return window.qaWalk(card).flatMap(n=>{const l=n.getComponent('cc.Label');return l?[{name:n.name,text:l.string,height:n.getComponent('cc.UITransform').height,lineHeight:l.lineHeight}]:[]});
    });
    const stats=result.find(l=>l.name==='装备基础属性');
    assert.match(stats.text,id==='gear-1'?/力量 \+44/:/智力 \+44/);
    assert.match(stats.text,id==='gear-1'?/普攻速度 \+8%/:/施法速度 \+16%/);
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
    assert.equal(get('角色数值-攻击速度'),id==='gear-1'?'1.08次/秒':'1次/秒');
    report.cases.push({viewport,id,sheet:labels.filter(l=>l.name.startsWith('角色数值-'))});
    await page.screenshot({path:path.join(out,`${id}-character-${viewport.width}.png`)});
   }
   await context.close();
  }
  assert.deepEqual(report.errors,[]);
  fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`PASS: ${report.cases.length} armor detail/character cases, no page errors`);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
