const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(ROOT,process.env.CAPTION_REVIEW_OUT||'design/xianxia-monster-label-layout-2026-11-04/game-review'),SERVER_ROOT=process.env.CAPTION_SERVER_ROOT||ROOT;
async function inspectCaptions(page,report){
 const data=await page.evaluate(()=>{
  const h=window.__towerTest.host,v=h.monsterMechanics;
  const labels=v.labels.filter(l=>l.node.active).map(l=>{const t=l.node._uiProps.uiTransformComp;const c=v.captions.find(c=>c.value===l.string),bar=c?.bar;return{value:l.string,x:l.node.position.x,y:l.node.position.y,width:Math.max(t.width,bar?.width||0),bottom:Math.min(-16,bar?bar.offset:0),top:Math.max(16,bar?bar.offset+5:0)};});
  const objects=[...h.run.state.enemies.filter(e=>e.hp>0&&v.isObject(e)),...h.run.state.effects.filter(e=>e.kind==='monster_crystal_break'&&e.expiresAt>h.run.state.time)].map(e=>({x:e.x-h.camera.x,y:e.y-h.camera.y,r:e.radius}));
  const started=performance.now();for(let i=0;i<20;i++)h.draw();const drawMs=(performance.now()-started)/20;
  return{labels,objects,drawMs};
 });
 for(let i=0;i<data.labels.length;i++)for(let j=i+1;j<data.labels.length;j++){
  const a=data.labels[i],b=data.labels[j];assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2||a.y+a.top<=b.y+b.bottom||b.y+b.top<=a.y+a.bottom,`overlap: ${a.value} / ${b.value}`);
 }
 for(const l of data.labels)for(const o of data.objects){const height=Math.max(56,o.r*2);assert.ok(l.x+l.width/2<=o.x-height*.42||l.x-l.width/2>=o.x+height*.42||l.y+l.top<=o.y||l.y+l.bottom>=o.y+height,`object obscured: ${l.value}`);}
 report.captionChecks??=[];report.captionChecks.push(data);
}
(async()=>{fs.mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{const file=path.resolve(SERVER_ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(SERVER_ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});const report={results:[],errors:[]};
try{for(const viewport of [{width:1280,height:720},{width:844,height:390}])for(const side of [1,-1]){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))report.errors.push(`${r.status()} ${r.url()}`)});
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
 const data=await page.evaluate(side=>{
 const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
 s.floor=6;s.arenaVersion=1;s.time=10;s.ticks=600;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=10000;s.effects=[];s.drops=[];s.pending=[];s.reserved=[];s.zones=[];s.projectiles=[];s.killLedger=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:0};
 s.loadout.active={};s.loadout.passive={};
 const e=h.run._enemy({id:'crystal-owner',archetype:'bear_boss',x:200*side,y:0});e.maxHp=10000;e.hp=4000;for(const id of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[id]=999;e.mechanic.cooldowns.M04=10;s.enemies=[e];h.camera={x:0,y:0};h.run.resume();
 for(let i=0;i<180&&e.mechanic.phase!=='windup';i++)h.run.advance(1/60);h.run.pause();h.draw();const windup=h.monsterMechanics.armorArt.groups.size;h.run.resume();
 for(let i=0;i<300&&!s.enemies.some(e=>e.temporary?.kind==='crystal');i++)h.run.advance(1/60);
 for(const c of s.enemies.filter(e=>e.temporary?.kind==='crystal'))c.hp=c.maxHp=1000000;
 h.run.pause();h.draw();return{crystals:s.enemies.filter(e=>e.temporary?.kind==='crystal').map(e=>({id:e.id,x:e.x,y:e.y,expires:e.temporary.expiresAt})),uses:e.mechanic.uses.M04,windup};},side);assert.equal(data.windup,0);
 assert.equal(data.crystals.length,2);assert.equal(data.uses,1);
 await page.waitForFunction(()=>window.__towerTest.host.monsterMechanics?.armorArt?.frame&&window.__towerTest.host.monsterMechanics?.crystalArt?.frame&&window.__towerTest.host.monsterMechanics?.brokenCrystalArt?.frame&&!window.__towerTest.host.host.assetLoading?.blocked);
 const record=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.resume();h.run.advance(.35);h.run.pause();h.draw();return [...h.monsterMechanics.crystalArt.crystals.values()].map(a=>({frame:[a.sprite.spriteFrame.rect.width,a.sprite.spriteFrame.rect.height],size:a.transform.height,x:a.node.position.x,foot:a.node.position.y-a.transform.height*240/512+h.camera.y,depth:a.node.towerGroundY,parent:a.node.parent===h.monsterLayer}));});
 assert.equal(record.length,2);for(let i=0;i<2;i++){assert.deepEqual(record[i].frame,[512,512]);assert.ok(record[i].parent);assert.ok(Math.abs(record[i].foot-data.crystals[i].y)<.01);}
 const armor=await page.evaluate(()=>{const h=window.__towerTest.host,a=h.monsterMechanics.armorArt;return [...a.groups.entries()].map(([id,g])=>({id,side:g.side,parent:g.node.parent.name,plates:g.plates.map(p=>({x:p.node.position.x,y:p.node.position.y,frame:[p.sprite.spriteFrame.rect.width,p.sprite.spriteFrame.rect.height],width:p.transform.width,height:p.transform.height}))}));});assert.equal(armor.length,2);for(const g of armor){assert.equal(g.parent,'妖兽素材-crystal-owner');assert.equal(g.plates.length,3);for(const p of g.plates)assert.deepEqual(p.frame,[512,512]);}
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
 await inspectCaptions(page,report);await page.screenshot({path:path.join(OUT,`crystals-${side}-${viewport.width}.png`)});
 const first=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,b=s.enemies.find(e=>e.id==='crystal-owner'),cs=s.enemies.filter(e=>e.temporary?.kind==='crystal');for(const c of cs)c.hp=c.maxHp=1000000;window.crystalSnapshot=JSON.parse(JSON.stringify(s));const armorBefore=b.mechanic.armor;h.run._damageEnemy({target:cs[0].id,damage:999999999,scaled:true,source:'sj_yujian'});h.run.resume();h.run.advance(1/60);h.run.pause();h.draw();return{armorGroups:[...h.monsterMechanics.armorArt.groups.keys()],broken:h.monsterMechanics.brokenCrystalArt.crystals.size,armorBefore,armor:b.mechanic.armor,remaining:h.monsterMechanics.crystalArt.crystals.size};});assert.equal(first.armorBefore,.8);assert.equal(first.armor,.8);assert.equal(first.remaining,1);assert.equal(first.broken,1);assert.deepEqual(first.armorGroups,[data.crystals[1].id]);
 await inspectCaptions(page,report);await page.screenshot({path:path.join(OUT,`first-broken-${side}-${viewport.width}.png`)});
 const outcome=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,c=s.enemies.find(e=>e.temporary?.kind==='crystal'&&e.hp>0),b=s.enemies.find(e=>e.id==='crystal-owner');h.run._damageEnemy({target:c.id,damage:999999999,scaled:true,source:'sj_yujian'});h.run.resume();h.run.advance(1/60);h.run.pause();h.draw();return{armorGroups:h.monsterMechanics.armorArt.groups.size,broken:h.monsterMechanics.brokenCrystalArt.crystals.size,remaining:h.monsterMechanics.crystalArt.crystals.size,vulnerable:b.mechanic.vulnerableUntil>s.time,armor:b.mechanic.armor,skill:b.mechanic.skillId};});
 assert.equal(outcome.armorGroups,0);assert.equal(outcome.remaining,0);assert.equal(outcome.broken,2);assert.ok(outcome.vulnerable);assert.equal(outcome.armor,0);assert.equal(outcome.skill,'M23');
 await inspectCaptions(page,report);await page.screenshot({path:path.join(OUT,`broken-${side}-${viewport.width}.png`)});
 const freeze=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),freeze);
 const gone=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.resume();h.run.advance(.8);h.run.pause();h.draw();return h.monsterMechanics.brokenCrystalArt.crystals.size;});assert.equal(gone,0);
 const cleanup=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state=JSON.parse(JSON.stringify(window.crystalSnapshot));let s=h.run.state;s.enemies.find(e=>e.id==='crystal-owner').hp=0;h.draw();const death=h.monsterMechanics.crystalArt.crystals.size,armorDeath=h.monsterMechanics.armorArt.groups.size;
 h.run.state=JSON.parse(JSON.stringify(window.crystalSnapshot));s=h.run.state;s.time=s.enemies.find(e=>e.temporary?.kind==='crystal').temporary.expiresAt;h.draw();const expiry=h.monsterMechanics.crystalArt.crystals.size;const broken=h.monsterMechanics.brokenCrystalArt.crystals.size;return{death,expiry,broken,armorDeath,armorExpiry:h.monsterMechanics.armorArt.groups.size};});assert.equal(cleanup.death,0);assert.equal(cleanup.expiry,0);assert.equal(cleanup.broken,0);assert.equal(cleanup.armorDeath,0);assert.equal(cleanup.armorExpiry,0);
 report.results.push({viewport,side,armor,record,paused:true,first,outcome,cleanup});await page.close();
 }assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}console.log('PASS: 12 M04 stages, two landscape sizes and facings; label/bar collision, crystal/fragment clearance, armor, pause, death and expiry');
})().catch(e=>{console.error(e);process.exitCode=1});
