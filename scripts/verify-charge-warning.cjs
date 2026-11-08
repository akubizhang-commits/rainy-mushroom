const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/charge-warning-2026-11-05'),serveRoot=process.env.CHARGE_SERVER_ROOT||root;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(serveRoot,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(serveRoot+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={results:[],errors:[]};
 try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked);
 for(const kind of ['ordinary','boss'])for(const direction of [-1,1]){
 const info=await page.evaluate(({kind,direction})=>{
 const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
 Object.assign(s,{time:10,ticks:600,floor:1,arenaVersion:1,effects:[],drops:[],pending:[],reserved:[],zones:[],projectiles:[],enemies:[],monsterMechanics:{version:1,sequence:0,zones:[],nextMajorAt:999}});
 Object.assign(s.player,{x:direction*110,y:0,hp:100000,maxHp:100000});
 const e=h.run._enemy({id:'charge-review',archetype:kind==='boss'?'boar_boss':'boar_normal_r1',x:-direction*110,y:0});e.hp=e.maxHp=100000;s.enemies=[e];
 if(kind==='ordinary'){h.run._newAttack(e,h.run._attackSpec(e,220));if(e.ai.attack.kind!=='charge')throw Error('not charge');}
 else{for(const id of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[id]=id==='M06'?0:999;s.monsterMechanics.nextMajorAt=0;e.ai.entryUntil=0;e.ai.transitionUntil=0;h.run.resume();for(let i=0;i<180&&!s.monsterMechanics.zones.some(z=>z.skillId==='M06');i++)h.run.advance(1/60);h.run.pause();if(!s.monsterMechanics.zones.some(z=>z.skillId==='M06'))throw Error('boss failed to start M06');}
 h.draw();const z=kind==='boss'?s.monsterMechanics.zones.find(z=>z.skillId==='M06'):s.zones.find(z=>z.ownerId===e.id);
 window.chargeReview={kind,direction,startedAt:kind==='boss'?z.startedAt:e.ai.attack.startedAt,activatesAt:kind==='boss'?z.activatesAt:e.ai.attack.startedAt+e.ai.attack.windup};
 if(!h.monsterMechanics.chargeOriginal){const m=h.monsterMechanics;m.chargeOriginal=m.drawCharge;m.drawCharge=function(g,z,time,camera){window.lastCharge={z:JSON.parse(JSON.stringify(z)),time};return this.chargeOriginal(g,z,time,camera);};}
 return window.chargeReview;
 },{kind,direction});
 await page.waitForFunction(()=>{const h=window.__towerTest.host;return !h.host.assetLoading?.blocked&&!h.transitioning;});
 for(const progress of [0,.25,.5,.9,1]){
 const observed=await page.evaluate(progress=>{const h=window.__towerTest.host,q=window.chargeReview;h.run.state.time=q.startedAt+(q.activatesAt-q.startedAt)*progress;h.draw();return window.lastCharge;},progress);
 assert.ok(observed);assert.ok(Math.abs(observed.time-(info.startedAt+(info.activatesAt-info.startedAt)*progress))<1e-7);
 await page.screenshot({path:path.join(out,`${kind}-${direction}-${viewport.width}-${progress}.png`)});
 }
 const frozen=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),frozen);
 const transition=await page.evaluate(()=>{
 const h=window.__towerTest.host,s=h.run.state,q=window.chargeReview,e=s.enemies[0];s.time=q.startedAt;s.ticks=Math.round(s.time*60);h.run.resume();
 let before=s.time;
 for(let i=0;i<240;i++){before=s.time;h.run.advance(1/60);if((q.kind==='boss'?e.mechanic.phase:e.ai.mode)==='active')break;}
 h.run.pause();h.draw();return {before,after:s.time,phase:q.kind==='boss'?e.mechanic.phase:e.ai.mode};
 });
 assert.equal(transition.phase,'active');assert.ok(transition.before<=info.activatesAt+1e-6);assert.ok(transition.after>=info.activatesAt-1e-6&&transition.after-info.activatesAt<1/60+1e-6);
 report.results.push({viewport,...info,transition});
 }
 await page.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';console.log('PASS: ordinary/boss charge, both directions, five windup stages, pause, two landscapes');
 }catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
