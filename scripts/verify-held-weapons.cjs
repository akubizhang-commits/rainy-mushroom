// Actual Cocos rendering; all controlled fixtures live in the training run.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(ROOT,process.env.HELD_REPORT||'reports/held-weapons-2026-11-03/runtime');
const BUILD=process.env.HELD_BUILD||path.join(ROOT,'cocos-pilot/build/web-mobile');
const CLARITY=process.env.HELD_CLARITY==='1',DPR=Number(process.env.HELD_DPR)||1;
const IDS=process.env.HELD_IDS?process.env.HELD_IDS.split(','):process.env.HELD_ALL==='1'
 ?fs.readdirSync(path.join(ROOT,'cocos-pilot/assets/resources/tower-library-items')).filter(n=>/^eq_sword_.*\.png$/.test(n)).map(n=>n.slice(0,-4))
 :['eq_sword_suwen','eq_sword_zhenyue'];
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const urlPath=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const inBuild=urlPath.startsWith('/cocos-pilot/build/web-mobile/');
  const base=inBuild?BUILD:ROOT;
  const p=path.resolve(base,'.'+(inBuild?urlPath.slice('/cocos-pilot/build/web-mobile'.length):urlPath));
  if(!p.startsWith(base+path.sep)){res.writeHead(403).end();return}
  fs.readFile(p,(e,b)=>{if(e){res.writeHead(404).end();return}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(p)]||'application/octet-stream');res.end(b)});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser,page;const report={status:'RUNNING',errors:[],consoleErrors:[],httpErrors:[],cases:[],live:[],portraits:[]};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport,deviceScaleFactor:DPR});page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});
   page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()})});
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1&playtest=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning);
   await page.evaluate(async()=>{
    window.qaWeapons=await import('/js/xianxia/TowerWeapons.js');
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    window.qaSave=JSON.stringify(localStorage);
    window.__towerTest.host.screen='skills';
   });
   for(const id of IDS){
    await page.evaluate(id=>{
     const h=window.__towerTest.host,m=h.menu;m.dismissCharacterInfo();
     const state=structuredClone(h.store.state),w=window.qaWeapons.createFixedWeapon(id,id==='eq_sword_iron'?'iron':'held-review');
     state.weapons[w.id]=w;state.loadouts[state.selectedLoadout].weaponId=w.id;
     m.render(state,'hall');m.showCharacterInfo();
    },id);
    await page.waitForFunction(id=>window.__towerTest.host.menu.characterPortraits[0]?.art.heldArt.has(id),id);
    const row=await page.evaluate(()=>{
     const p=window.__towerTest.host.menu.characterPortraits[0];p.state.time=.6;p.art.draw(p.root,p.state,0,0,false);
     return {id:p.state.loadout.weapon.definitionId,active:p.art.heldBlade.node.active,
      image:p.art.heldBlade.spriteFrame.texture.image?.uuid||''};
    });
    assert.equal(row.id,id);assert.ok(row.active);report.portraits.push({...row,viewport});
    if(['eq_sword_guiyan','eq_sword_songfeng','eq_sword_iron'].includes(id)){
     await page.waitForFunction(()=>!window.qaWalk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy));
     await page.screenshot({path:path.join(OUT,`${viewport.width}-portrait-${id}.png`)});
    }
   }
   await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.dismissCharacterInfo();h.enterTraining();h.run.pause();h.draw()});
   await page.waitForFunction(()=>window.__towerTest.host.characterArt?.sealFrames?.length===36);
   if(CLARITY)await page.evaluate(()=>{
    window.qaZoom=1;
    const art=window.__towerTest.host.characterArt,draw=art.draw;
    // A fresh full-resolution render for inspection, never resize a screenshot.
    art.draw=function(...args){
     const result=draw.apply(this,args);
     if(this.root&&window.qaZoom!==1){const s=this.root.scale;this.root.setScale(s.x*window.qaZoom,s.y*window.qaZoom,s.z)}
     return result;
    };
   });
   for(const id of IDS){
    await page.evaluate(id=>{
     const h=window.__towerTest.host,s=h.run.state,w=window.qaWeapons.createFixedWeapon(id,id==='eq_sword_iron'?'iron':'held-review');
     s.loadout.weapon=w;s.loadout.weaponId=w.id;s.loadout.weaponQuality=w.quality;s.loadout.weaponRefine=w.refine;
     s.enemies=[];s.pending=[];s.reserved=[];s.projectiles=[];s.effects=[];s.zones=[];
     h.draw();
    },id);
    await page.waitForFunction(id=>window.__towerTest.host.characterArt.heldArt.has(id),id);
    for(const face of [1,-1])for(const pose of ['idle','walk','run','windup','slash','flight','flight-slash','seal']){
     const row=await page.evaluate(({id,face,pose})=>{
      const h=window.__towerTest.host,s=h.run.state,a=h.characterArt;
      s.phase='paused';s.time=10.3;s.player.hp=100;s.player.faceX=face;
      s.loadout.passive={sj_flight:pose.startsWith('flight')?1:0};
      s.actions={current:null,basic:null};a.reset();
      if(['walk','run'].includes(pose)){
       const old={time:10.2,x:s.player.x-(pose==='run'?1:.3)*s.player.moveSpeed*.1,y:s.player.y};
       a.observe(old,s);s.time=10.55;
      }
      if(['windup','slash','flight-slash','seal'].includes(pose)){
       s.actions.current={skill:pose==='seal'?'sj_formation':'basic_attack',startedAt:10,releaseAt:10.3,endsAt:10.7,dirX:face,dirY:0};
       if(pose==='windup')s.time=10.15;
      }
      const unchanged=JSON.stringify(s);h.draw();
      const n=a.root,camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);
      const p=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
      return {id,face,pose,unchanged:unchanged===JSON.stringify(s),active:a.heldBlade.node.active,
       color:a.heldBlade.color.toHEX(),angle:a.heldBlade.node.angle,
       mipLevels:a.heldBlade.spriteFrame.texture.mipmapLevel,
       textureWidth:a.heldBlade.spriteFrame.texture.width,
       canvasWidth:canvas.width,
       baseFrame:a.frames.indexOf(a.body.spriteFrame),sealFrame:a.sealFrames.indexOf(a.body.spriteFrame),
       x:r.x+p.x/canvas.width*r.width,y:r.y+(1-p.y/canvas.height)*r.height,
       image:a.heldBlade.spriteFrame.texture.image?.uuid||'',time:s.time};
     },{id,face,pose});
     assert.ok(row.active);assert.ok(row.unchanged);assert.equal(row.color.slice(0,6).toLowerCase(),'ffffff');
     if(CLARITY)assert.ok(row.mipLevels>1,'actual GPU texture must have minification levels');
     row.viewport=viewport;row.deviceScaleFactor=DPR;row.file=`${viewport.width}-${id}-${face}-${pose}.png`;
     await page.waitForFunction(()=>!window.qaWalk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy));
     await page.screenshot({path:path.join(OUT,row.file)});report.cases.push(row);
     if(face===1&&pose==='idle')await page.screenshot({path:path.join(OUT,'detail-'+row.file),
      clip:{x:Math.max(0,row.x-120),y:Math.max(0,row.y-160),width:240,height:Math.min(210,viewport.height-Math.max(0,row.y-160))}});
     if(CLARITY&&face===1&&['idle','slash'].includes(pose)){
      await page.evaluate(()=>{window.qaZoom=2;window.__towerTest.host.draw()});
      await page.screenshot({path:path.join(OUT,'near-'+row.file)});
      await page.evaluate(()=>{window.qaZoom=1;window.__towerTest.host.draw()});
     }
    }
    // Real simulation and action callbacks, not only assigned poses.
    const live=await page.evaluate(id=>{
     const h=window.__towerTest.host;h.enterTraining();
     const s=h.run.state,a=h.characterArt,p=s.player,w=window.qaWeapons.createFixedWeapon(id,id==='eq_sword_iron'?'iron':'held-review');
     s.loadout.weapon=w;s.loadout.weaponId=w.id;s.loadout.active={sj_formation:1};s.loadout.passive={};
     const e=h.run._enemy({...s.pending[0],id:'held-review-target',x:p.x+60,y:p.y});
     e.hp=e.maxHp=1e8;e.moveSpeed=0;e.ai.readyAt=e.ai.graceUntil=e.ai.entryUntil=1e8;
     s.enemies=[e];s.pending=[];s.reserved=[];s.wavePlanned=1;s.waveKilled=0;
     const events=[],frames=new Set();const start=p.x;
     h.run.setInput(.3,0);
     for(let i=0;i<180;i++){
      const before=a.sample(s);h.run.advance(1/60,event=>{events.push(event.skill);a.observeCast(event)});
      a.observe(before,s);h.draw();frames.add(a.frames.indexOf(a.body.spriteFrame));
     }
     h.run.pause();h.draw();
     const saved={time:s.time,frame:a.body.spriteFrame,angle:a.heldBlade.node.angle};
     a.clearBindings();h.draw();
     return {id,moved:p.x-start,events,frames:[...frames],rebind:a.heldBlade.node.active&&a.body.spriteFrame===saved.frame&&a.heldBlade.node.angle===saved.angle};
    },id);
    assert.ok(live.moved>0);assert.ok(live.events.length);assert.ok(live.rebind);report.live.push({...live,viewport});
   }
   const frozen=await page.evaluate(()=>{const h=window.__towerTest.host;return {time:h.run.state.time,angle:h.characterArt.heldBlade.node.angle}});
   await page.waitForTimeout(200);
   assert.deepEqual(await page.evaluate(()=>{const h=window.__towerTest.host;return {time:h.run.state.time,angle:h.characterArt.heldBlade.node.angle}}),frozen);
   const final=await page.evaluate(()=>{
    const h=window.__towerTest.host;h.run.state.player.hp=0;h.draw();
    return {deadHidden:!h.characterArt.root.active,saveUnchanged:window.qaSave===JSON.stringify(localStorage)};
   });
   assert.ok(final.deadHidden);assert.ok(final.saveUnchanged);await context.close();
  }
  const idle=report.cases.filter(row=>row.file===`1280-${row.id}-1-idle.png`);
  assert.equal(new Set(idle.map(row=>row.image)).size,IDS.length,'each weapon must bind its own texture');
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;
  if(page&&!page.isClosed())await page.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{})}
 finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||`${report.cases.length} poses, ${report.live.length} live runs`)}
}
main();
