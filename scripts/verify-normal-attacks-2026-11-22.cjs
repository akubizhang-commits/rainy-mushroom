// 2026-11-22 ordinary attack clips (crocodile king / white tiger sweep, snake queen shot) in the compiled game (skills held on cooldown, real AI approach + attack).
// Read-only smoke fixture (memory storage), never live saves.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'design/xianxia-normal-attacks-2026-11-22/game-review');
const CASES=[{floor:4,family:'crocodile-humanoid',rank:4,role:'boss',clip:'sweep'},{floor:9,family:'white-tiger',rank:7,role:'boss',clip:'sweep'},{floor:5,family:'snake-lady',rank:5,role:'boss',clip:'shot'},
 // 2026-11-23 clips: spider-lady bite, snake / bat / bat-humanoid shot.
 {floor:5,family:'spider-lady',rank:6,role:'normal',archetype:'spider_normal_r6',clip:'bite'},
 {floor:3,family:'snake',rank:3,role:'elite',archetype:'snake_elite',clip:'shot'},
 {floor:3,family:'bat',rank:3,role:'boss',archetype:'bat_boss',clip:'shot'},
 {floor:4,family:'bat-humanoid',rank:4,role:'elite',archetype:'bat_elite_rank4',clip:'shot'},
 // 2026-11-23 reuse without credits: bat-humanoid normal bite plays the screech plus a lunge.
 {floor:4,family:'bat-humanoid',rank:4,role:'normal',archetype:'bat_normal_r4',clip:'shot',kind:'bite',block:['shot']},
 // 2026-11-23 per-role acceptance of the new clips (65 standard: normal / elite / boss each checked in game, plus pause and death). Spider-lady elites/bosses make no ordinary attack (web is replaced by M10, no bite fallback), so only the normal bites.
 {floor:4,family:'bat-humanoid',rank:4,role:'normal',archetype:'bat_normal_r4',clip:'shot',kind:'shot',block:['bite']},
 {floor:2,family:'snake',rank:2,role:'normal',archetype:'snake_normal',clip:'shot',kind:'shot',block:['bite']},
 {floor:1,family:'bat',rank:1,role:'normal',archetype:'bat_normal',clip:'shot',kind:'shot',block:['bite']},
 {floor:2,family:'bat',rank:2,role:'elite',archetype:'bat_elite',clip:'shot',kind:'shot'}];

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
   const authored=await page.evaluate(({floor,role,species,archetype})=>{
    const h=window.__towerTest.host;
    h.enterTraining();
    const Run=h.run.constructor;
    h.run=new Run({attemptId:1,floor,seed:17,hp:100,xp:0,arenaVersion:1,loadout:h.run.state.loadout});
    const run=h.run;run.setPlaytestAssist(true);
    const want=e=>archetype?e.archetype===archetype:e.role===role&&(!species||e.family===species||e.species===species||String(e.archetype||e.id).startsWith(species));
    // 2026-11-23: normal/elite cases spawn the authored archetype directly instead of clearing waves until it appears.
    if(archetype){run.pause();const x=run._enemy({id:'case',archetype,x:155,y:0});run.state.enemies=[x];Object.assign(x,{hp:1e9,maxHp:1e9});/* weak normals would die to the player's assist attacks */x.ai.entryUntil=x.ai.readyAt=x.ai.graceUntil=0;}
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
    return {floor:s.floor,wave:s.wave,rank:e.rank,name:e.name,skills:e.mechanic?.skills||[]};
   },c);
   assert.equal(authored.rank,c.rank);
   // Wait for the motion atlas, then return to the base pose.
   await page.waitForFunction((family)=>{const h=window.__towerTest.host;h.draw();const r=h.monsterArt.speciesRenderers?.get(family);return !!r&&r.motionFrames?.size>0},c.family,{timeout:30000});
   const setup=await page.evaluate(({family,block,chase})=>{
    const h=window.__towerTest.host,run=h.run,e=window.__boss;
    window.__read=()=>{
     const s=run.state;s.player.x=window.__chase?e.x-(e.radius+40):0;s.player.y=0;e.y=0;h.camera={x:s.player.x,y:0};h.draw();
     const r=h.monsterArt.speciesRenderers.get(family),a=r.actors.get(e.id)||h.monsterArt.actors.get(e.id);
     const frame=a?.sprite.spriteFrame;const name=frame?[...r.motionFrames].find(([,f])=>f===frame)?.[0]??'static':null;
     return {frame:name,scale:a?Math.abs(a.node.scale.y):null,color:a?a.sprite.color.g:null,alpha:a?a.sprite.color.a:null,angle:a?a.node.angle:null,
      enraged:e.mechanic?.enraged,skill:e.mechanic?.skillId,phase:e.mechanic?.phase,time:+run.state.time.toFixed(3),until:e.mechanic?.enrageUntil,present:!!a};
    };
    if(e.mechanic)for(const id of e.mechanic.skills)e.mechanic.cooldowns[id]=run.state.time+100000;
    for(const k of block)e.ai.cooldowns[k]=run.state.time+100000;
    // Spider elites/bosses keep a ranged spacing (web is replaced by M10), so they only bite a player who closes in.
    window.__chase=chase;
    return window.__read();
   },{family:c.family,block:c.block||[],chase:!!c.chase});
   // Real AI: the boss walks in and attacks with its ordinary sweep/bite.
   const seen=new Set(),modes=new Set();let shots=0,attacks=0;const tagCount={};
   for(let i=0;i<240;i++){
    const r=await page.evaluate(()=>{const run=window.__towerTest.host.run,e=window.__boss;run.resume();run.advance(1/15);run.pause();return {...window.__read(),mode:e.ai.mode,kind:e.ai.attack?.kind,x:e.x};});
    if(['windup','active','recovery'].includes(r.mode)&&r.kind){modes.add(r.mode+':'+r.kind);seen.add(r.frame);
     const tag=r.mode;if((tagCount[tag]=(tagCount[tag]||0)+1)%2===1&&tagCount[tag]<6)await page.screenshot({path:path.join(OUT,`${c.family}${c.kind?'-'+c.kind:''}-${r.mode}-${tagCount[tag]>>1}.png`)});}
    report.cases.push(r);
   }
   const sweepFrames=[...seen].filter(f=>f&&f.startsWith(c.clip+'-'));
   console.log(c.family,[...modes],sweepFrames.length,[...seen].filter(f=>!f?.startsWith(c.clip+'-')));
   if(c.kind)assert.ok(['windup','active','recovery'].every(m=>modes.has(m+':'+c.kind)),c.kind+' happens');assert.ok(sweepFrames.length>=6,c.clip+' plays');assert.ok([...seen].every(f=>f&&f.startsWith(c.clip+'-')),'no static/other frames during attack');
   // Pause: the frame and position hold while the run is paused. Death: the actor leaves after the death presentation.
   const held=await page.evaluate(async()=>{const h=window.__towerTest.host,e=window.__boss;const a0=window.__read();
    for(let i=0;i<20;i++){h.draw();await new Promise(r=>setTimeout(r,20));}const a1=window.__read();
    h.run.resume();h.run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});
    let gone=false;for(let i=0;i<90&&!gone;i++){h.run.advance(1/30);h.draw();gone=!window.__read().present;}
    h.run.pause();return {same:a0.frame===a1.frame&&a0.angle===a1.angle,gone};});
   assert.ok(held.same,'pause holds the frame');assert.ok(held.gone,'actor removed after death');
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
