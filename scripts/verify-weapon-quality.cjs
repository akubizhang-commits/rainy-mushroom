// Actual Cocos rendering; all controlled fixtures live in the training run.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(ROOT,process.env.HELD_REPORT||'reports/weapon-quality-integration-2026-11-03/runtime');
const BUILD=process.env.HELD_BUILD||path.join(ROOT,'cocos-pilot/build/web-mobile');
const CLARITY=process.env.HELD_CLARITY==='1',DPR=Number(process.env.HELD_DPR)||1;
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const u=decodeURIComponent(new URL(req.url,'http://local').pathname),inside=u.startsWith('/cocos-pilot/build/web-mobile/');
  const base=inside?BUILD:ROOT,p=path.resolve(base,'.'+(inside?u.slice('/cocos-pilot/build/web-mobile'.length):u));
  if(!p.startsWith(base+path.sep)){res.writeHead(403).end();return}
  fs.readFile(p,(e,b)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(p)]||'application/octet-stream');res.end(b)});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const report={status:'RUNNING',errors:[],cases:[]};let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport,recordVideo:{dir:path.join(OUT,'video'),size:viewport}}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1&playtest=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning);
   await page.evaluate(async()=>{
    window.qw=await import('/js/xianxia/TowerWeapons.js');window.walk=n=>[n,...n.children.flatMap(window.walk)];
    window.saved=JSON.stringify(localStorage);window.h=window.__towerTest.host;h.screen='skills';
    window.pcount=g=>g?.impl?.paths?.length||0;
   });
   for(const id of ['eq_sword_suwen','eq_sword_zhenyue'])for(const quality of [1,2,3,4]){
    await page.evaluate(({id,quality})=>{
     h.menu.dismissCharacterInfo();const s=structuredClone(h.store.state),w=qw.createFixedWeapon(id,'qa-weapon');
     s.weapons[w.id]=w;s.loadouts[s.selectedLoadout].weaponId=w.id;
     h.menu.render(s,'hall');h.menu.showCharacterInfo();h.menu.characterPortraits[0].state.loadout.weapon.quality=quality;
    },{id,quality});
    await page.waitForFunction(id=>h.menu.characterPortraits[0]?.art.heldArt.has(id),id);
    await page.waitForFunction(()=>!walk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy));
    const row=await page.evaluate(()=>{
     const p=h.menu.characterPortraits[0];p.state.time=.6;p.art.draw(p.root,p.state,0,0,false);return {id:p.state.loadout.weapon.definitionId,quality:p.state.loadout.weapon.quality,paths:pcount(p.art.qualityLight),body:p.art.root.active,held:p.art.heldBlade.node.active};
    });
    assert.ok(row.held&&row.body);assert.equal(row.quality,quality);assert.equal(row.paths>0,quality>1);
    await page.screenshot({path:path.join(OUT,`${viewport.width}-detail-${id}-${quality}.png`)});
    report.cases.push({viewport,kind:'detail',...row});
   }
   await page.evaluate(()=>{h.menu.dismissCharacterInfo();h.menu.updateEffects(.1)});
   await page.waitForFunction(()=>h.menu.characterPortraits.length===0);
   await page.evaluate(()=>h.menu.showInventory(h.menu.state));
   await page.waitForFunction(()=>h.menu.characterPortraits.some(p=>p.art.heldBlade?.node.active));
   await page.screenshot({path:path.join(OUT,`${viewport.width}-inventory.png`)});
   await page.evaluate(()=>{h.menu.dismissInventory();h.enterTraining();h.run.pause();h.draw()});
   await page.waitForFunction(()=>h.characterArt.frames.length>0);
   await page.evaluate(()=>{const a=h.characterArt,draw=a.draw;window.qaQuality=4;a.draw=function(parent,s,...args){return draw.call(this,parent,{...s,loadout:{...s.loadout,weapon:{...s.loadout.weapon,quality:window.qaQuality}}},...args)}});
   for(const quality of [1,2,3,4]){
    await page.evaluate(quality=>{
     const s=h.run.state,w=qw.createFixedWeapon('eq_sword_zhenyue','qa');window.qaQuality=quality;s.loadout.weapon=w;s.loadout.weaponId=w.id;s.enemies=[];s.effects=[];s.projectiles=[];
     s.time=.6;s.actions={current:null,basic:null};h.characterArt.reset();h.draw();
    },quality);
    await page.waitForFunction(()=>h.characterArt.heldArt.has('eq_sword_zhenyue'));
    await page.evaluate(()=>h.draw());
    const count=await page.evaluate(()=>pcount(h.characterArt.qualityLight));assert.equal(count>0,quality>1);
    await page.screenshot({path:path.join(OUT,`${viewport.width}-battle-${quality}.png`)});
    report.cases.push({viewport,kind:'battle',quality,paths:count});
   }
   const checks=await page.evaluate(()=>{
    const a=h.characterArt,s=h.run.state;
    s.actions={current:{skill:'basic_attack',startedAt:1,releaseAt:1.3,endsAt:1.9,dirX:1}};
    for(let n=0;n<12;n++){s.time=1.31+n*.01;h.draw()}
    const geometry=()=>JSON.stringify([a.qualityArt.samples,a.qualityLight.impl.paths.map(p=>p.points.map(v=>[v.x,v.y])),a.qualityTrail.impl.paths.map(p=>p.points.map(v=>[v.x,v.y]))]);
    const before=geometry();h.draw();h.draw();const paused=before===geometry();
    window.qaQuality=1;h.draw();const down=pcount(a.qualityLight)===0&&pcount(a.qualityTrail)===0;
    s.player.hp=0;h.draw();return {paused,down,dead:!a.root.active,save:window.saved===JSON.stringify(localStorage)};
   });
   for(const [k,v] of Object.entries(checks))assert.ok(v,k);report.cases.push({viewport,kind:'lifecycle',...checks});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1}
 finally{if(browser)await browser.close();server.close();fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length+' cases')}
}
main();
