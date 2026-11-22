// 2026-11-22 audit: where do hostile ranged projectiles appear relative to the shooter's body in the compiled game?
// Real AI (approach, spacing, shot), one representative archetype per art family x role. Read-only smoke fixture.
// Output: rel = (projectile y - feet y) / (head top y - feet y) on screen at the first rendered frame (0 = feet, 1 = top).
const fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'design/xianxia-ranged-emission-2026-11-22/audit');
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const {ARCHETYPES}=await import('../js/xianxia/TowerContent.js');
 const pick=new Map();
 for(const a of ARCHETYPES){const sp=a.species||a.id.split('_')[0];if(!['snake','bat','falcon','scorpion'].includes(sp))continue;const k=a.art_family+'/'+a.role;if(!pick.has(k))pick.set(k,a);}
 const cases=[...pick.values()].map(a=>({archetype:a.id,family:a.art_family,role:a.role,rank:a.rank}));
 const server=createServer((req,res)=>{
  const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://l').pathname));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 const rows=[],errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
  await page.waitForFunction(()=>window.__towerTest?.host?.menu,null,{timeout:90000});
  for(const c of cases)for(const face of [1,-1]){
   await page.evaluate(({c,face})=>{
    const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
    Object.assign(s,{time:10,ticks:600,floor:5,arenaVersion:1,effects:[],drops:[],pending:[],reserved:[],zones:[],projectiles:[],enemies:[],killLedger:[],monsterMechanics:{version:1,sequence:0,zones:[],nextMajorAt:999}});
    Object.assign(s.player,{x:0,y:0,hp:1e7,maxHp:1e7});s.loadout.active={};s.loadout.passive={};
    const e=h.run._enemy({id:'shooter',archetype:c.archetype,x:-260*face,y:-40});
    Object.assign(e,{hp:1e7,maxHp:1e7});if(e.mechanic)for(const k of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[k]=1e6;
    s.enemies=[e];e.ai.entryUntil=e.ai.readyAt=e.ai.graceUntil=0;h.camera={x:0,y:0};h.draw();
   },{c,face});
   await page.waitForFunction(()=>{const h=window.__towerTest.host;h.draw();return [h.monsterArt,...h.monsterArt.speciesRenderers.values()].some(r=>r.actors.has('shooter'));},null,{timeout:60000});
   await page.waitForTimeout(400);
   const r=await page.evaluate(()=>{
    const h=window.__towerTest.host,run=h.run,s=run.state;run.resume();
    for(let i=0;i<60*12&&!s.projectiles.some(p=>p.hostile);i++){run.advance(1/60);s.player.hp=s.player.maxHp;}
    run.pause();h.camera={x:0,y:0};h.draw();h.draw();
    const p=s.projectiles.find(p=>p.hostile);if(!p)return {error:'no shot',mode:s.enemies[0]?.ai.mode};
    const renderer=[h.monsterArt,...h.monsterArt.speciesRenderers.values()].find(r=>r.actors.has('shooter'));
    const a=renderer.actors.get('shooter'),n=h.projectileLayer.children.find(n=>n.name.endsWith('-'+p.id));
    const tr=a.transform,sy=a.node.scale.y,frame=a.sprite.spriteFrame,fname=renderer.motionFrames?[...renderer.motionFrames].find(([,f])=>f===frame)?.[0]??'portrait':'portrait';
    const feetY=a.node.position.y,topY=feetY+(1-tr.anchorY)*tr.height*sy,bottomY=feetY-tr.anchorY*tr.height*sy;
    return {frame:fname,feetY,topY,bottomY,actorX:a.node.position.x,proj:n?{x:n.position.x,y:n.position.y,name:n.name,active:n.active}:null,
     shot:{x:p.x,y:p.y},launch:p.launch,pose:h.monsterArt.constructor.projectilePose(p),mode:s.enemies[0].ai.mode,kind:s.enemies[0].ai.attack?.kind,time:s.time};
   });
   if(r.proj)r.rel=+((r.proj.y-r.feetY)/(r.topY-r.feetY)).toFixed(2);
   rows.push({...c,face,...r});
   console.log(c.family.padEnd(18),c.role.padEnd(6),c.archetype.padEnd(26),'face',face,'frame',r.frame,'rel',r.rel,r.error||'',r.launch?.family);
   if(face===1)await page.screenshot({path:path.join(OUT,`${c.family}-${c.role}.png`)});
  }
 }finally{
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({rows,errors},null,2)+'\n');
  await browser.close();await new Promise(r=>server.close(r));
 }
 if(errors.length)console.log('page errors',errors);
})().catch(e=>{console.error(e);process.exitCode=1;});
