// 2026-11-22 crocodile king ordinary sweep in the compiled game (skills held on cooldown, real AI approach + attack).
// Read-only smoke fixture (memory storage), never live saves.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'design/xianxia-normal-attacks-2026-11-22/game-review');
const CASES=[{floor:4,family:'crocodile-humanoid',rank:4,role:'boss'}];

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,body)=>{
   if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
   res.end(body);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 const report={cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const c of CASES){
   const page=await browser.newPage({viewport:{width:1280,height:720}});
   page.on('pageerror',e=>report.errors.push(c.family+': '+e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>!!window.__towerTest?.host?.menu,null,{timeout:30000});
   const authored=await page.evaluate(({floor,role,species})=>{
    const h=window.__towerTest.host;
    h.enterTraining();
    const Run=h.run.constructor;
    h.run=new Run({attemptId:1,floor,seed:17,hp:100,xp:0,arenaVersion:1,loadout:h.run.state.loadout});
    const run=h.run;run.setPlaytestAssist(true);
    const want=e=>e.role===role&&(!species||e.family===species||e.species===species||String(e.archetype||e.id).startsWith(species));
    for(let i=0;i<20000&&!run.state.enemies.some(want);i++){
     run.resume();
     for(const e of [...run.state.enemies])run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});
     run.advance(.1);
    }
    const e=run.state.enemies.find(want);
    if(!e)throw Error(role+' did not spawn');
    run.pause();window.__boss=e;
    const s=run.state;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp;
    Object.assign(e,{x:155,y:0});
    s.enemies=[e];s.pending=[];s.reserved=[];s.projectiles=[];s.effects=[];s.zones=[];s.drops=[];
    if(s.monsterMechanics)s.monsterMechanics.zones=[];
    h.camera={x:0,y:0};h.attackTargetId=e.id;h.draw();
    return {floor:s.floor,wave:s.wave,rank:e.rank,name:e.name,skills:e.mechanic.skills};
   },c);
   assert.equal(authored.rank,c.rank);assert.ok(authored.skills.includes('M02'));
   // Wait for the motion atlas, then return to the base pose.
   await page.waitForFunction((family)=>{const h=window.__towerTest.host;h.draw();const r=h.monsterArt.speciesRenderers?.get(family);return !!r&&r.motionFrames?.size>0},c.family,{timeout:30000});
   const setup=await page.evaluate((family)=>{
    const h=window.__towerTest.host,run=h.run,e=window.__boss;
    window.__read=()=>{
     const s=run.state;s.player.x=0;s.player.y=0;e.y=0;h.camera={x:0,y:0};h.draw();
     const r=h.monsterArt.speciesRenderers.get(family),a=r.actors.get(e.id)||h.monsterArt.actors.get(e.id);
     const frame=a?.sprite.spriteFrame;const name=frame?[...r.motionFrames].find(([,f])=>f===frame)?.[0]??'static':null;
     return {frame:name,scale:a?Math.abs(a.node.scale.y):null,color:a?a.sprite.color.g:null,alpha:a?a.sprite.color.a:null,angle:a?a.node.angle:null,
      enraged:e.mechanic.enraged,skill:e.mechanic.skillId,phase:e.mechanic.phase,time:+run.state.time.toFixed(3),until:e.mechanic.enrageUntil,present:!!a};
    };
    for(const id of e.mechanic.skills)e.mechanic.cooldowns[id]=run.state.time+100000;
    return window.__read();
   },c.family);
   // Real AI: the boss walks in and attacks with its ordinary sweep/bite.
   const seen=new Set(),modes=new Set();let shots=0,attacks=0;
   for(let i=0;i<120;i++){
    const r=await page.evaluate(()=>{const run=window.__towerTest.host.run,e=window.__boss;run.resume();run.advance(1/15);run.pause();return {...window.__read(),mode:e.ai.mode,kind:e.ai.attack?.kind,x:e.x};});
    if(['windup','active','recovery'].includes(r.mode)&&r.kind){modes.add(r.mode+':'+r.kind);seen.add(r.frame);
     if(shots<4&&i%3===0)await page.screenshot({path:path.join(OUT,`${c.family}-${r.mode}-${shots++}.png`)});}
    report.cases.push(r);
   }
   const sweepFrames=[...seen].filter(f=>f&&f.startsWith('sweep-'));
   console.log(c.family,[...modes],sweepFrames.length,[...seen].filter(f=>!f?.startsWith('sweep-')));
   assert.ok(sweepFrames.length>=6,'sweep plays');assert.ok([...seen].every(f=>f&&f.startsWith('sweep-')),'no static/other frames during attack');
   await page.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status='PASS';
 }finally{
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
 console.log(report.status);
})().catch(error=>{console.error(error);process.exitCode=1;});
