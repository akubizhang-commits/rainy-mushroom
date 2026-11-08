// Actual Cocos render + pointer checks in isolated browser storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createServer} = require('node:http');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.REPORT_DIR || path.join(ROOT, 'docs/xianxia/reports/paper-hud-2026-10-29');
const visualOnly = process.argv.includes('--visual-only');
const types = {'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'};
(async () => {
 fs.mkdirSync(OUT, {recursive:true});
 const server = createServer((req,res) => {
  const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(ROOT + path.sep)) {res.writeHead(403).end();return;}
  fs.readFile(file,(error,data) => {if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);});
 });
 await new Promise(r => server.listen(0,'127.0.0.1',r));
 const report = {status:'RUNNING',scope:visualOnly?'HUD rendering':'HUD rendering and navigation',layouts:[],errors:[]};
 let browser;
 try {
  browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'})});
  const url = `http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`;
  for(const viewport of [{width:1280,height:720},{width:844,height:390},{width:1024,height:768}]) {
   const context = await browser.newContext({viewport});
   const page = await context.newPage();
   page.on('pageerror',error => report.errors.push(error.message));
   await page.goto(url);
   await page.waitForFunction(() => window.__towerTest?.host?.menu);
   await page.evaluate(() => {
    window.qaWalk = n => [n,...n.children.flatMap(window.qaWalk)];
    window.qaFind = name => window.qaWalk(window.__towerTest.host.root).find(n=>n.name===name&&n.activeInHierarchy);
   });
   await page.waitForFunction(() => window.qaFind('HUD.PaperArtwork')?.getComponent('cc.Sprite')?.spriteFrame && window.qaFind('霁云宗已确认母稿')?.getComponent('cc.Sprite')?.spriteFrame);
   const data = await page.evaluate(() => {
    const h = window.__towerTest.host, menu=h.menu;
    const rects=['HUD.PlayerVitals','HUD.Portrait','HUD.ProfessionIcon','HUD.RealmLabel','HUD.HPLabel','HUD.HPBar'].map(name => {
     const n=window.qaFind(name),t=n.getComponent('cc.UITransform');
     const r=t.getBoundingBoxToWorld();
     return {name,x:r.x,y:r.y,width:r.width,height:r.height};
    });
    return {rects,hp:window.qaFind('HUD.HPLabel').getComponent('cc.Label').string,realm:window.qaFind('HUD.RealmLabel').getComponent('cc.Label').string,width:h.width,height:h.height,hasMana:!!window.qaFind('HUD.ManaTrack'),hasXp:!!window.qaFind('HUD.XPBar')};
   });
   assert.equal(data.hasMana,false);assert.equal(data.hasXp,false);
   assert.equal(data.realm,'炼气 · 初期');assert.match(data.hp,/^\d+\/\d+$/);
   const parent=data.rects[0];
   for(const r of data.rects.slice(1)) {
    assert.ok(r.x>=parent.x&&r.x+r.width<=parent.x+parent.width+.01,`${r.name} horizontal`);
    assert.ok(r.y>=parent.y&&r.y+r.height<=parent.y+parent.height+.01,`${r.name} vertical`);
   }
   const obstructed=await page.evaluate(()=>{
    const hud=window.qaFind('HUD.PlayerVitals').getComponent('cc.UITransform').getBoundingBoxToWorld();
    const portrait=window.qaFind('HUD.Portrait').getComponent('cc.UITransform').getBoundingBoxToWorld();
    const nodes=window.qaWalk(window.__towerTest.host.menu.root);
    const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
    return nodes.filter(n=>n.name.startsWith('宗门入口-')||n.parent?.name.startsWith('宗门入口-')).filter(n=>{
     const r=n.getComponent('cc.UITransform').getBoundingBoxToWorld();
     return overlap(n.name.startsWith('宗门入口-')?portrait:hud,r);
    }).map(n=>n.name);
   });
   assert.deepEqual(obstructed,[],'Keep labels clear and the avatar hit area away from scene entrances');
   data.sectEntrancesClear=true;
   await page.screenshot({path:path.join(OUT,`hall-${viewport.width}x${viewport.height}.png`)});
   const gaps=await page.evaluate(()=>{
    const get=name=>window.qaFind(name),rect=name=>get(name).getComponent('cc.UITransform');
    const portrait=get('HUD.Portrait'),profession=get('HUD.ProfessionIcon'),realm=get('HUD.RealmLabel'),hp=get('HUD.HPLabel'),bar=get('HUD.HPBar');
    return {left:profession.position.x-rect('HUD.ProfessionIcon').width/2-portrait.position.x-rect('HUD.Portrait').width/2,
     iconText:realm.position.x-rect('HUD.RealmLabel').width/2-profession.position.x-rect('HUD.ProfessionIcon').width/2,
     captionLeft:get('HUD.HPCaption').position.x-rect('HUD.HPCaption').width/2-portrait.position.x-rect('HUD.Portrait').width/2,
     right:rect('HUD.PlayerVitals').width/2-hp.position.x-rect('HUD.HPLabel').width/2,
     barRight:rect('HUD.PlayerVitals').width/2-bar.position.x-rect('HUD.HPBar').width/2};
   });
   assert.ok(gaps.left>=12&&gaps.left<=24&&gaps.captionLeft>=12&&gaps.captionLeft<=24);
   assert.ok(gaps.iconText>=6&&gaps.right>=32&&gaps.barRight>=32);data.hudGaps=gaps;
   const highLife=[];
   for(const total of [1271,9999,999999,98765432,2000000000]){
    await page.evaluate(total=>{
     const h=window.__towerTest.host,s=window.__towerTest.state();
     h.menu.updatePlayerHud({...s,activeRun:{snapshot:{player:{xp:10920,hp:total,maxHp:total}}}});
    },total);
    // Allow Cocos to remeasure and repaint the new string before inspection.
    await page.waitForTimeout(80);
    const measured=await page.evaluate(()=>{
     const n=window.qaFind('HUD.HPLabel'),l=n.getComponent('cc.Label'),t=n.getComponent('cc.UITransform');
     return {text:l.string,width:t.width,font:l.actualFontSize||l.fontSize,x:n.position.x};
    });
    assert.equal(measured.width,152);assert.ok(measured.font>=22,`${total}: ${measured.font}`);
    highLife.push({total,...measured});
    if(total===1271||total===999999)await page.screenshot({path:path.join(OUT,`hp-${total}-${viewport.width}x${viewport.height}.png`)});
   }
   data.highLife=highLife;
   await page.evaluate(()=>window.__towerTest.host.menu.updatePlayerHud(window.__towerTest.state()));
   if(visualOnly){
    report.layouts.push({viewport,...data});await context.close();continue;
   }
   const before = await page.evaluate(()=>JSON.stringify(window.__towerTest.state()));
   // Presentation-only fixture: exact 20% HP without touching the campaign.
   await page.evaluate(()=>{const h=window.__towerTest.host,s=window.__towerTest.state();s.hp=20;h.menu.refreshVitals(s);});
   assert.equal(await page.evaluate(()=>window.qaFind('HUD.HPLabel').getComponent('cc.Label').string),'20/100');
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.state())),before);
   await page.screenshot({path:path.join(OUT,`low-hp-${viewport.width}x${viewport.height}.png`)});
   await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.refreshVitals(window.__towerTest.state());});
   async function click(name,offset=0) {
    // Navigation rebuilds the scene graph. Let its world transforms settle
    // before projecting the next newly created control into browser pixels.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const p=await page.evaluate(({name,offset})=>{
     const n=window.qaFind(name);if(!n)throw Error('Missing node '+name);
     const camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);
     const world=n.getComponent('cc.UITransform').convertToWorldSpaceAR(new cc.Vec3(offset,0,0));
     const point=camera.worldToScreen(world),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
     return {x:r.x+point.x/canvas.width*r.width,y:r.y+(1-point.y/canvas.height)*r.height};
    },{name,offset});
    await page.mouse.click(p.x,p.y);
   }
   const actions=[];
   // Click outside the smaller visible disks, inside their unchanged touch pads.
   for(const [name,target] of [['背包','inventory'],['技能','library']]){
    await click(name,34);await page.waitForFunction(target=>window.__towerTest.host.menu.currentPage===target,target);
    await click('← 宗门');await page.waitForFunction(()=>window.__towerTest.host.menu.currentPage==='hall');
   }
   await click('设置',34);await page.waitForFunction(()=>!!window.qaFind('设置面板'));
   await click('关闭设置');await page.waitForFunction(()=>!window.qaFind('设置面板'));
   // The host syncs restAt periodically even at full HP; compare gameplay fields.
   const infoBefore=await page.evaluate(()=>JSON.stringify(window.__towerTest.state(),(key,value)=>key==='restAt'?undefined:value));
   await click('HUD.Portrait');await page.waitForFunction(()=>!!window.qaFind('角色信息面板'));
   const info=await page.evaluate(()=>{
    const box=window.qaFind('角色信息面板').getComponent('cc.UITransform');
    return {width:box.width,height:box.height,realm:window.qaFind('角色境界').getComponent('cc.Label').string,
     stats:['角色气血上限','角色攻击力','角色移动速度'].map(name=>window.qaFind(name).getComponent('cc.Label').string)};
   });
   assert.ok(info.width<1280&&info.height<windowHeight(data));
   assert.deepEqual(info.stats,['100','100','220']);
   // Clicking in the panel must neither dismiss it nor activate the scene below.
   await click('角色信息标题');assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'hall');
   await page.screenshot({path:path.join(OUT,`character-info-${viewport.width}x${viewport.height}.png`)});
   const extended=await page.evaluate(()=>{
    const value=name=>window.qaFind(name).getComponent('cc.Label').string;
    const view=window.qaFind('角色详细属性视口'),scroll=view.getComponent('cc.ScrollView');
    const left=window.qaFind('角色境界').worldPosition.y;
    scroll.scrollToBottom(0);
    return {crit:value('角色数值-直接攻击暴击率'),focus:value('角色数值-会心触发'),
     cooldown:value('角色数值-主动功法冷却缩减'),left,
     scrollable:scroll.content.getComponent('cc.UITransform').height>view.getComponent('cc.UITransform').height};
   });
   assert.equal(extended.crit,'0%');assert.equal(extended.focus,'未激活');assert.equal(extended.cooldown,'0%');assert.equal(extended.scrollable,true);
   await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>window.qaFind('角色境界').worldPosition.y),extended.left);
   await page.screenshot({path:path.join(OUT,`character-details-${viewport.width}x${viewport.height}.png`)});
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.qaFind('角色信息面板'));
   await click('HUD.Portrait');await click('关闭角色信息');await page.waitForFunction(()=>!window.qaFind('角色信息面板'));
   await click('HUD.Portrait');
   // This is over the backpack behind the veil: close only, with no click-through.
   await click('背包');await page.waitForFunction(()=>!window.qaFind('角色信息面板'));
   assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.currentPage),'hall');
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.state(),(key,value)=>key==='restAt'?undefined:value)),infoBefore);
   data.characterInfo=info;data.compactButtonPaddingClickable=true;
   for(const [name,target] of [['宗门入口-凌霄剑峰','library'],['宗门入口-炼器峰','forge'],['宗门入口-丹霞峰','pills'],['宗门入口-霁云主峰','home'],['宗门入口-山门','gate']]) {
    await click(name);await page.waitForFunction(target=>window.__towerTest.host.menu.currentPage===target,target);
    actions.push(target);
    await click('← 宗门');await page.waitForFunction(()=>window.__towerTest.host.menu.currentPage==='hall');
    await page.waitForFunction(()=>window.qaFind('HUD.PaperArtwork')?.getComponent('cc.Sprite')?.spriteFrame);
   }
   await click('宗门入口-锁妖塔');await page.waitForFunction(()=>window.__towerTest.host.menu.currentPage==='tower');actions.push('tower');
   await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1);h.run.pause();h.draw();});
   await page.waitForFunction(()=>!!window.qaFind('HUD.PaperArtwork')?.getComponent('cc.Sprite')?.spriteFrame);
   assert.ok(await page.evaluate(()=>!window.qaFind('HUD.ManaTrack')&&!window.qaFind('HUD.XPBar')));
   const combat=await page.evaluate(()=>{
    const rect=name=>{const n=window.qaFind(name),r=n.getComponent('cc.UITransform').getBoundingBoxToWorld();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {vitals:rect('HUD.PlayerVitals'),map:rect('HUD.Minimap'),settings:rect('HUD.Pause'),bag:rect('HUD.Inventory'),skills:rect('HUD.Skills')};
   });
   assert.deepEqual(combat.vitals,data.rects[0]&&{x:data.rects[0].x,y:data.rects[0].y,width:data.rects[0].width,height:data.rects[0].height});
   assert.equal(combat.bag.y,combat.skills.y);assert.ok(combat.bag.x>combat.skills.x);
   assert.ok(combat.settings.x+combat.settings.width<=combat.map.x+.01);
   assert.ok(combat.map.y>combat.bag.y+combat.bag.height);

   await page.screenshot({path:path.join(OUT,`battle-${viewport.width}x${viewport.height}.png`)});
   await click('HUD.Pause',34);await page.waitForFunction(()=>window.__towerTest.host.run.state.phase==='paused'&&!!window.qaFind('继续挑战'));
   await click('继续挑战');
   await click('HUD.Inventory',34);await page.waitForFunction(()=>window.__towerTest.host.menu?.currentPage==='inventory');
   await page.evaluate(()=>window.__towerTest.host.resume());
   await click('HUD.Skills',34);await page.waitForFunction(()=>window.__towerTest.host.menu?.currentPage==='library');
   report.layouts.push({viewport,...data,actions,lowHp:'20/100',combat,combatActions:true});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 } catch(error) {report.status='FAIL';report.error=error.stack;process.exitCode=1;}
 finally {if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(report.status,report.error||`${report.layouts.length} landscape layouts`);}
})();

function windowHeight(data){return data.height*1280/data.width;}
