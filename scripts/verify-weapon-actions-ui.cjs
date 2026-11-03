// Real built Cocos UI, isolated in-memory fixtures; never reads a player's save.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const buildRoot=process.env.FORGING_BUILD_ROOT||'/cocos-pilot/build/web-mobile';
const root=path.resolve(__dirname,'..'),out=path.join(root,process.env.FORGING_REPORT_DIR||'reports/weapon-actions-2026-11-01/ui');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const compiled=process.env.FORGING_BUILD_DIR&&pathname.startsWith(buildRoot+'/');
  const allowed=compiled?path.resolve(process.env.FORGING_BUILD_DIR):root;
  const file=compiled?path.resolve(allowed,'.'+pathname.slice(buildRoot.length)):path.resolve(root,'.'+pathname);
  if(!file.startsWith(allowed+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser,page;const report={method:'Actual compiled Cocos rendering with programmatic panel navigation and an independent memory save. Controlled targets for damage labels, not natural progression.',cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport});page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}${buildRoot}/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning);
   await page.evaluate(async()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    window.qaFind=name=>window.qaWalk(h.root).find(n=>n.name===name&&n.activeInHierarchy);
    window.qaText=()=>window.qaWalk(h.root).filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.Label')?.string||'').join('\n');
    const W=await import('/js/xianxia/TowerWeapons.js');window.qaWeapons=W;
    const {checksum}=await import('/js/xianxia/Checksum.js');
    window.qaSeed=id=>{
     let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>{raw=v}},Store=h.store.constructor,s=new Store(disk,0);s.act({type:'sync'},0);
     const env=JSON.parse(raw),state=structuredClone(s.state),w=W.createFixedWeapon(id,'weapon-1');
     state.xp=10920;state.weapons[w.id]=w;state.weaponCounters[w.id]=0;state.weaponSequence=1;state.loadouts[0].weaponId=w.id;
     const data=JSON.stringify(state);raw=JSON.stringify({...env,data,checksum:checksum(data)});
     h.menu.dismissInventory();h.store=new Store(disk,0);if(h.store.readOnly)throw Error(h.store.error);
     h.goto('inventory');h.menu.backpack.select(w.id);h.menu.showInventory(h.store.state);
    };
   });
   const text=()=>page.evaluate(()=>window.qaText());
   const click=async name=>{
    const point=await page.evaluate(name=>{const n=window.qaFind(name);if(!n)throw Error('missing '+name);const camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);const v=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();return {x:r.x+v.x/canvas.width*r.width,y:r.y+(1-v.y/canvas.height)*r.height};},name);
    assert.ok(point.x>=0&&point.x<=viewport.width&&point.y>=0&&point.y<=viewport.height,`offscreen ${name}`);await page.mouse.click(point.x,point.y);
   };
   const shot=async tag=>{
    await page.waitForFunction(()=>!window.qaWalk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy));
    return page.screenshot({path:path.join(out,`${tag}-${viewport.width}.png`)});
   };
   await page.evaluate(()=>window.qaSeed('eq_sword_guiyan'));
   assert.match(await text(),/基础物理攻击/);assert.match(await text(),/基础法术攻击/);assert.match(await text(),/仅普攻/);assert.doesNotMatch(await text(),/属性强化/);await shot('fa-weapon');
   await page.evaluate(()=>window.qaSeed('eq_sword_zhufeng'));
   assert.match(await text(),/风属性伤害/);await shot('bao-weapon');
   await page.evaluate(()=>window.__towerTest.host.menu.backpack.details.scrollToBottom(0));
   await page.waitForTimeout(150);await shot('bao-affixes');
   await page.evaluate(()=>{
    const h=window.__towerTest.host;h.menu.dismissInventory();h.goto('hall');h.menu.showCharacterInfo();
   });
   assert.match(await text(),/物理攻击力/);assert.match(await text(),/法术攻击力/);await shot('character-attacks');
   await page.evaluate(()=>window.__towerTest.host.menu.dismissCharacterInfo());
   await page.evaluate(()=>{
    const h=window.__towerTest.host;h.menu.dismissInventory();h.enterTraining();
    const w=window.qaWeapons.createFixedWeapon('eq_sword_zhufeng','weapon-1'),Run=h.run.constructor;
    h.run=new Run({attemptId:1,floor:9,seed:41,hp:100,xp:10920,training:true,loadout:{growthVersion:1,skillsInitialized:true,active:{},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon:w,weaponId:w.id,weaponQuality:w.quality,weaponRefine:0,weaponFocusCount:0}});
    const r=h.run;for(let i=0;i<600&&!r.state.enemies.length;i++)r.advance(1/60);
    const e=r.state.enemies[0];e.x=r.state.player.x+85;e.y=r.state.player.y;e.hp=e.maxHp=10000;
    for(let i=0;i<120;i++){for(const enemy of r.state.enemies)enemy.ai.graceUntil=9999;r.advance(1/60);if(r.state.effects.some(e=>e.source==='weapon_on_hit'))break;}
    if(!r.state.effects.some(e=>e.source==='weapon_on_hit'))throw Error('no attached damage');
    r.pause();h.draw();
   });
   await page.waitForTimeout(180);
   const labels=await page.evaluate(()=>window.qaWalk(window.__towerTest.host.root).filter(n=>n.activeInHierarchy&&n.name==='战斗伤害数字').map(n=>({text:n.getComponent('cc.Label').string,layer:n.layer})));
   assert.ok(labels.length>=2,JSON.stringify(labels));assert.ok(labels.some(n=>n.text.includes(' · ')));assert.ok(labels.every(n=>n.layer===1<<25));await shot('basic-and-attached');
   report.cases.push({viewport,earlyElementGate:true,highElement:true,damageLabels:labels});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e;}
 finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
