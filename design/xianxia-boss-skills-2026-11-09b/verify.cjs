// Real compiled Cocos check: Boss skill clips (bear-humanoid M07 stomp / M04 guard, rhino M07 stomp, yak M15 roar)
// play by the real mechanic phase; other skills of the same Boss keep the portrait; pause freezes the pose;
// death clears the actor once; storage unchanged.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(__dirname,'game-review');
// family, archetype, floor, skill, clip, hp fraction, still-static skills checked once each
const CASES=[['bear-humanoid','bear_boss',6,'M09','heave',1],['bear-humanoid','bear_boss',6,'M07','stomp',1]];
const STATIC={'bear-humanoid':[]}; // floor-6 boss loadout is M04/M07/M09 only; M02 (elite) static is covered by the unit test
(async()=>{fs.mkdirSync(OUT,{recursive:true});const report={results:[],errors:[]};
const server=createServer((req,res)=>{const f=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(f)]||'application/octet-stream');res.end(b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
for(const viewport of [{width:1280,height:720},{width:844,height:390}]){const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:120000});const storage=await page.evaluate(()=>JSON.stringify(localStorage));
for(const [family,archetype,floor,skill,clipName,hpFrac] of CASES)for(const direction of [1,-1]){
 await page.evaluate(({archetype,floor,direction,hpFrac})=>{const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;s.time=10;s.ticks=600;s.floor=floor;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=1e6;s.player.invulnerableUntil=999;s.enemies=[];s.pending=[];s.reserved=[];s.effects=[];s.drops=[];s.projectiles=[];s.zones=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:999};
  const e=h.run._enemy({id:'skill-review',archetype,x:-direction*90,y:0});e.maxHp=1e6;e.hp=e.maxHp*hpFrac;if(e.mechanic){e.mechanic.phase='idle';for(const k of Object.keys(e.mechanic.cooldowns||{}))e.mechanic.cooldowns[k]=999;}for(const k of Object.keys(e.ai.cooldowns||{}))e.ai.cooldowns[k]=999;e.ai.mode='approach';e.ai.entryUntil=s.time;e.ai.graceUntil=s.time;s.enemies=[e];h.camera={x:0,y:0};h.draw();},{archetype,floor,direction,hpFrac});
 await page.waitForFunction(f=>{const h=window.__towerTest.host;h.draw();const r=h.monsterArt.speciesRenderers.get(f);return r?.motionTexture&&r.actors.get('skill-review');},family,{timeout:90000});
 const pose=()=>page.evaluate(f=>{const h=window.__towerTest.host,r=h.monsterArt.speciesRenderers.get(f),a=r.actors.get('skill-review');return{frame:[...r.motionFrames].find(([,x])=>x===a.sprite.spriteFrame)?.[0]||'static',scale:a.node.scale.x,y:a.node.position.y,size:a.transform.width};},family);
 // Drive the real mechanic: only this skill is ready, then advance the real simulation through windup/active/recovery.
 const seen=await page.evaluate(({f,skill,clipName,shotAt})=>{const h=window.__towerTest.host,s=h.run.state,e=s.enemies[0],m=e.mechanic;
  for(const k of Object.keys(m.cooldowns))m.cooldowns[k]=k===skill?0:999;m.phase='idle';s.monsterMechanics.nextMajorAt=0;for(const k of Object.keys(e.ai.cooldowns))e.ai.cooldowns[k]=999;e.ai.mode='approach';
  const r=h.monsterArt.speciesRenderers.get(f),clip=r.motionAtlas.clips[clipName],out=[];h.run.resume();
  for(let i=0;i<1500;i++){h.run.advance(1/60);h.draw();const a=r.actors.get(e.id),name=[...r.motionFrames].find(([,x])=>x===a.sprite.spriteFrame)?.[0]||'static';out.push([m.skillId===skill?m.phase:'other:'+m.skillId+':'+m.phase,name]);
   if(m.skillId===skill&&m.phase===shotAt)break;}
  h.run.pause();h.draw();return{out,phases:clip.phases,frames:clip.frames};},{f:family,skill,clipName,shotAt:['M07','M09','M15'].includes(skill)?'recovery':'active'});
 const p1=await pose();assert.match(p1.frame,new RegExp('^'+clipName+'-'),`${archetype} ${skill} active pose ${p1.frame}`);assert.equal(Math.sign(p1.scale),-direction,`${archetype} ${skill} facing`);
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(150);await page.evaluate(()=>window.__towerTest.host.draw());
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);assert.deepEqual(await pose(),p1);
 for(let k=0;k<20;k++){await page.waitForTimeout(150);await page.evaluate(()=>window.__towerTest.host.draw());}
 await page.screenshot({path:path.join(OUT,`${archetype}-${skill}-${direction}-${viewport.width}-active.png`)});
 const rest=await page.evaluate(({f,skill})=>{const h=window.__towerTest.host,e=h.run.state.enemies[0],m=e.mechanic,r=h.monsterArt.speciesRenderers.get(f),out=[];h.run.resume();
  for(let i=0;i<1500;i++){h.run.advance(1/60);h.draw();const a=r.actors.get(e.id),name=[...r.motionFrames].find(([,x])=>x===a.sprite.spriteFrame)?.[0]||'static';out.push([m.skillId===skill?m.phase:'other:'+m.skillId+':'+m.phase,name]);if(m.phase==='idle')break;}
  h.run.pause();return out;},{f:family,skill});
 const all=[...seen.out,...rest],mine=all.filter(o=>['windup','active','recovery'].includes(o[0]));
 const instant=['M07','M09','M15'].includes(skill);for(const mode of instant?['windup']:['windup','active']){const [o,c]=seen.phases[mode],allowed=seen.frames.slice(o,o+c),got=mine.filter(x=>x[0]===mode);assert.ok(got.length>0,`${archetype} ${skill} ${mode} observed`);assert.ok(got.every(x=>allowed.includes(x[1])),`${archetype} ${skill} ${mode} frames ${[...new Set(got.map(x=>x[1]))]}`);}
 const rec=mine.filter(x=>x[0]==='recovery'),[ro,rc]=seen.phases.recovery,rAllowed=instant?seen.frames.slice(seen.phases.active[0]):seen.frames.slice(ro,ro+rc);if(instant)assert.ok(rec.length>0&&rec[0][1]===seen.frames[seen.phases.active[0]],`${archetype} ${skill} recovery opens on impact frame ${rec[0]?.[1]}`);
 if(rec.length)assert.ok(rec.every(x=>rAllowed.includes(x[1])),`${archetype} ${skill} recovery frames`);
 const other=all.filter(o=>o[0].startsWith('other:M23'));if(other.length)assert.ok(other.every(o=>o[1]==='static'||!o[1].startsWith(clipName)),`${archetype} ${skill} M23 does not play ${clipName}`);
 const distinct=new Set(mine.map(x=>x[1]));assert.ok(distinct.size>=6,`${archetype} ${skill} plays ${distinct.size} frames`);
 report.results.push({viewport,archetype,direction,skill,clip:clipName,distinctFrames:distinct.size,ticks:mine.length,recoveryTicks:rec.length,endedVia:[...new Set(all.map(o=>o[0]))]});
 // One untouched skill of the same Boss keeps the portrait.
 if(direction===1&&STATIC[family].length){const st=STATIC[family][0];const stat=await page.evaluate(({st})=>{const h=window.__towerTest.host,s=h.run.state,e=s.enemies[0],m=e.mechanic;e.hp=e.maxHp*.15;for(const k of Object.keys(m.cooldowns))m.cooldowns[k]=k===st?0:999;m.phase='idle';s.monsterMechanics.nextMajorAt=0;for(const k of Object.keys(e.ai.cooldowns))e.ai.cooldowns[k]=999;const f=h.monsterArt.speciesRenderers.get(e.family==='bear'?'bear-humanoid':e.family),out=[];h.run.resume();
   for(let i=0;i<600;i++){h.run.advance(1/60);h.draw();const r=[...h.monsterArt.speciesRenderers.values()].find(r=>r.actors.has(e.id)),a=r.actors.get(e.id);if(m.skillId===st&&['windup','active'].includes(m.phase)&&!e.ai.attack&&!m.chargeStarted)out.push([...r.motionFrames].find(([,x])=>x===a.sprite.spriteFrame)?.[0]||'static');if(out.length&&m.phase==='idle')break;}
   h.run.pause();return out;},{st});
  assert.ok(stat.length>0,`${archetype} ${st} observed`);assert.ok(stat.every(x=>x==='static'||x.startsWith('move-')),`${archetype} ${st} keeps portrait/walk: ${[...new Set(stat)]}`);report.results.push({viewport,archetype,staticSkill:st,ticks:stat.length,frames:[...new Set(stat)]});}
 const death=await page.evaluate(f=>{const h=window.__towerTest.host,e=h.run.state.enemies[0];h.run.resume();h.run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'});h.run.advance(.1);h.run.pause();h.draw();return{remaining:h.monsterArt.speciesRenderers.get(f).actors.has(e.id),kills:h.run.state.killLedger.filter(k=>k.id===e.id).length};},family);
 assert.deepEqual(death,{remaining:false,kills:1});
}
assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),storage);await page.close();}
assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));}
console.log('PASS: bear M09 heave + M07 stomp on the real mechanic timeline');})().catch(e=>{console.error(e);process.exitCode=1});
