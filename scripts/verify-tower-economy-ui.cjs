'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{createServer}=require('node:http'),{pathToFileURL}=require('node:url');
const{chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,process.env.TOWER_UI_REPORT || 'docs/xianxia/reports/tower-economy-2026-10-28');

async function main(){
 const {TowerCampaignStore,TOWER_CAMPAIGN_KEY}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/TowerCampaign.js')));
 const {checksum}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/Checksum.js')));
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const store=new TowerCampaignStore(storage,0);store.act({type:'sync'},0);
 const envelope=JSON.parse(map.get(TOWER_CAMPAIGN_KEY)),state=JSON.parse(envelope.data);
 const topSeed=(()=>{for(let n=1;n<100000;n++){let v=n;v^=v<<13;v^=v>>>17;v^=v<<5;if((v>>>0)/4294967296>.995)return n;}throw Error('seed');})();
 Object.assign(state,{xp:1485,hp:50,clearedFloor:1,tutorialWaves:3,weaponPity:15,weaponSequence:15,rng:topSeed,
  spiritStones:2000,contribution:1000,equipmentRng:{armor:topSeed,ring:topSeed},
  skills:{sj_yujian:1,sj_arc:2,sj_wanjian:1}});
 envelope.data=JSON.stringify(state);envelope.checksum=checksum(envelope.data);
 const seed=JSON.stringify(envelope);
 const server=createServer((req,res)=>{
  const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 fs.mkdirSync(OUT,{recursive:true});const report={status:'RUNNING',cases:[],errors:[]};let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu);
   await page.evaluate(({key,seed})=>{const h=window.__towerTest.host;h.platform.storage.setItem(key,seed);h.store=new h.store.constructor(h.platform.storage,Date.now());h.render();},{key:TOWER_CAMPAIGN_KEY,seed});
   const read=()=>page.evaluate(()=>window.__towerTest.state());
   const labels=()=>page.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(window.__towerTest.host.root).flatMap(n=>{const l=n.getComponent('cc.Label');return l?[l.string]:[];});});
   async function click(name){
    const p=await page.evaluate(name=>{const walk=n=>[n,...n.children.flatMap(walk)],n=walk(window.__towerTest.host.root).find(n=>n.name===name);
     if(!n)throw Error('Missing '+name);if(!n.getComponent('cc.Button')?.interactable)throw Error('Disabled '+name);
     const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();
     return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);
    await page.mouse.click(p.x,p.y);await page.waitForTimeout(120);
   }
   await page.evaluate(()=>window.__towerTest.host.goto('forge'));
   const beforeDraw=await read();
   await page.screenshot({path:path.join(OUT,`forge-${viewport.width}.png`)});
   await click('黄阶炼制武器 · 100灵石＋100贡献');
   const drawn=await read();
   assert.equal(drawn.spiritStones,beforeDraw.spiritStones-100);
   assert.equal(drawn.contribution,beforeDraw.contribution-100);
   assert.equal(Object.keys(drawn.weapons).length,Object.keys(beforeDraw.weapons).length+1);
   assert.equal(drawn.xp,beforeDraw.xp);
   const drawnId=Object.keys(drawn.weapons).find(id=>!beforeDraw.weapons[id]);
   await page.evaluate(id=>{const h=window.__towerTest.host;h.menu.weaponDetailId=id;h.render();},drawnId);
   async function revealWeaponButton(name){
    await page.evaluate(name=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)];
     const n=walk(h.root).find(n=>n.name===name);if(!n)throw Error('Missing '+name);
     const scroll=h.menu.scroll, current=scroll.getScrollOffset();
     scroll.scrollToOffset(new cc.Vec2(0,Math.max(0,current.y+scroll.node.worldPosition.y-n.worldPosition.y)),0);
    },name);await page.waitForTimeout(80);
   }
   assert.equal(drawn.weapons[drawnId].affixes.length,4,'top weapon has four offense affixes without crit or focus');
   assert.equal(drawn.weapons[drawnId].quality,4);
   assert.equal(drawn.weaponPity,0);
   await page.evaluate(()=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)];
    const card=walk(h.root).find(n=>n.name.startsWith('▸ ')&&n.name.includes('藏品2'));
    if(!card)throw Error('Missing selected weapon card');
    const height=card.getComponent('cc.UITransform').height;
    h.menu.scroll.scrollToOffset(new cc.Vec2(0,Math.max(0,-card.position.y-height/2)),0);
   });await page.waitForTimeout(100);
   await page.screenshot({path:path.join(OUT,`weapon-affixes-${viewport.width}.png`)});
   await revealWeaponButton('装备到此配装');await click('装备到此配装');
   assert.equal((await read()).loadouts[0].weaponId,drawnId);
   assert.ok(!(await labels()).some(t=>t.includes('强化一级')));
   assert.equal(drawn.weapons[drawnId].refine,0);
   await revealWeaponButton('锁定武器');await click('锁定武器');
   assert.equal((await read()).weapons[drawnId].locked,true);
   await page.screenshot({path:path.join(OUT,`weapon-detail-${viewport.width}.png`)});

   for(const [category,title] of [['armor','防具'],['ring','戒指']]){
    await page.evaluate(()=>window.__towerTest.host.menu.scroll.scrollToTop(0));
    await click(title);
    const before=await read();
    await click(`黄阶炼制${title} · 80灵石＋40贡献`);
    const after=await read(),id=Object.keys(after.equipment).find(k=>!before.equipment[k]);
    assert.ok(id);assert.equal(after.spiritStones,before.spiritStones-80);
    assert.equal(after.contribution,before.contribution-40);
    assert.equal(after.equipment[id].category,category);assert.equal(after.equipment[id].quality,4);
    assert.ok(!(await labels()).some(t=>t.includes('强化一级')));
    await page.evaluate(({category,id})=>{const h=window.__towerTest.host;h.menu.equipmentDetailIds[category]=id;h.render();},{category,id});
    await revealWeaponButton('装备到此配装');await click('装备到此配装');
    assert.equal((await read()).loadouts[0][`${category}Id`],id);
    await revealWeaponButton(`锁定${title}`);await click(`锁定${title}`);
    assert.equal((await read()).equipment[id].locked,true);
    await page.screenshot({path:path.join(OUT,`${category}-detail-${viewport.width}.png`)});
   }
   const dismantles=[];
   for(const [category,title] of [['weapon','武器'],['armor','防具'],['ring','戒指']]){
    await page.evaluate(()=>window.__towerTest.host.menu.scroll.scrollToTop(0));await click(title);
    const before=await read(),field=category==='weapon'?'weapons':'equipment';
    const price=category==='weapon'?'100灵石＋100贡献':'80灵石＋40贡献';
    await click(`黄阶炼制${title} · ${price}`);
    const made=await read(),id=Object.keys(made[field]).find(k=>!before[field][k]);assert.ok(id);
    await page.evaluate(({category,id})=>{const h=window.__towerTest.host;if(category==='weapon')h.menu.weaponDetailId=id;else h.menu.equipmentDetailIds[category]=id;h.render();},{category,id});
    const refund=[0,2,4,8,16][made[field][id].quality],action=`分解${title} · 返还${refund}贡献`;
    await revealWeaponButton(action);await click(action);
    const removed=await read();assert.equal(removed[field][id],undefined);
    assert.equal(removed.contribution,made.contribution+refund);
    assert.ok(removed[field][removed.loadouts[0][`${category}Id`]],'equipped item retained');
    const repeat=await page.evaluate(({category,id})=>window.__towerTest.host.action({type:category==='weapon'?'dismantleWeapon':'dismantleEquipment',id}),{category,id});
    assert.equal(repeat.ok,false);assert.equal((await read()).contribution,removed.contribution);
    dismantles.push({category,refund,duplicateRejected:true});
   }
   const beforeBook=await read();
   await page.evaluate(()=>{const h=window.__towerTest.host;h.goto('library');h.menu.openDetails('sj_line');});
   let text=(await labels()).join('\n');
   assert.ok(!text.includes('共用'));assert.ok(!text.includes('上下/左右'));assert.ok(!text.includes('角色Lv.'));
   assert.ok(text.includes('精通'));assert.ok(text.includes('物理攻击'));
   await page.screenshot({path:path.join(OUT,`skills-${viewport.width}.png`)});
   await page.evaluate(()=>{const h=window.__towerTest.host;const walk=n=>[n,...n.children.flatMap(walk)];
    const group=walk(h.root).find(n=>n.name==='技能境界-金丹');
    h.menu.scroll.scrollToOffset(new cc.Vec2(0,-group.position.y-group.getComponent('cc.UITransform').height/2),0);
    h.menu.openDetails('evo_tiandi');});
   await page.waitForTimeout(150);
   await page.screenshot({path:path.join(OUT,`jindan-${viewport.width}.png`)});
   await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.openDetails('sj_line');h.menu.scroll.scrollToOffset(new cc.Vec2(0,0),0);});
   await click('learnSkill-sj_line');
   const learned=await read();assert.equal(learned.spiritStones,beforeBook.spiritStones-200);
   assert.equal(learned.skills.sj_line,1);assert.ok(learned.books.includes('sj_line'));
   const buttons=await page.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(window.__towerTest.host.root).filter(n=>n.name.startsWith('learnSkill-')).map(n=>({x:n.worldPosition.x,y:n.worldPosition.y}));});
   await page.evaluate(()=>window.__towerTest.host.menu.skillPaneScroll.scrollToBottom(0));
   assert.deepEqual(await page.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(window.__towerTest.host.root).filter(n=>n.name.startsWith('learnSkill-')).map(n=>({x:n.worldPosition.x,y:n.worldPosition.y}));}),buttons);
   await click('decreaseSkill-sj_line');assert.equal((await read()).spiritStones,learned.spiritStones);
   await click('learnSkill-sj_line');assert.equal((await read()).spiritStones,learned.spiritStones,'owned book never charged twice');
   await page.evaluate(()=>window.__towerTest.host.menu.openDetails('future_taixu'));
   assert.equal(await page.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(window.__towerTest.host.root).some(n=>n.name==='learnSkill-future_taixu');}),false);
   await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1);for(let i=0;i<120;i++){for(const e of h.run.state.enemies)e.hp=0;h.update(.1);if(h.run.state.killLedger.length>=10)break;}h.pause();});
   const battle=await read(),snapshot=battle.activeRun.snapshot;
   assert.ok(snapshot.loadout.armor && snapshot.loadout.ring);
   assert.equal(snapshot.loadout.ring.id,learned.loadouts[0].ringId);
   assert.ok(snapshot.armorState);
   assert.ok(snapshot.earned.xp>0);assert.equal(battle.xp,learned.xp+snapshot.earned.xp);
   assert.equal(battle.spiritStones,learned.spiritStones+snapshot.earned.cores*10);
   await page.screenshot({path:path.join(OUT,`battle-${viewport.width}.png`)});
   await page.evaluate(()=>window.__towerTest.host.withdraw());
   const finished=await read();assert.equal(finished.xp,battle.xp);assert.equal(finished.spiritStones,battle.spiritStones);
   await page.evaluate(()=>{const h=window.__towerTest.host;h.store=new h.store.constructor(h.platform.storage,Date.now());h.render();});
   const reload=await read();assert.equal(reload.spiritStones,finished.spiritStones);assert.equal(reload.xp,finished.xp);
   report.cases.push({viewport,dismantles,draw:{before:beforeDraw.spiritStones,after:drawn.spiritStones},book:{after:learned.spiritStones},battle:{xp:snapshot.earned.xp,stones:snapshot.earned.cores*10},reload:true});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}
 finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}
}
main();
