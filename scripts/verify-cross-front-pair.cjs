const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {installFixture,cleanup,assertCleanup}=require('./verify-sword-line.cjs');
const ROOT=path.resolve(__dirname,'..'),SERVE=process.env.CROSS_PREVIEW_ROOT||ROOT;
const OUT=path.join(ROOT,'design/xianxia-cross-front-pair-2026-11-04/qa');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const p=path.resolve(SERVE,'.'+new URL(req.url,'http://local').pathname);
  if(!p.startsWith(SERVE+path.sep)){res.writeHead(403).end();return}
  fs.readFile(p,(e,b)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(p)]||'application/octet-stream');res.end(b)})
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const report={status:'RUNNING',cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const ctx=await browser.newContext({viewport,recordVideo:{dir:OUT,size:viewport}}),page=await ctx.newPage();
   await installFixture(page,`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
   await page.evaluate(()=>{
    window.__prepareCross=(rank,flying=false)=>{
     window.__prepareLine({rank:1,angle:0,reach:450,origin:{x:0,y:-60}});
     window.__lineView=()=>({});
     const h=window.__towerTest.host,s=h.run.state,template=s.enemies[0];
     s.loadout.active={sj_cross:rank};s.loadout.passive={sj_flight:flying?1:0};s.cooldowns={sj_cross:0};
     s.actions.readyAt=1e9;
     s.enemies=Array.from({length:8},(_,i)=>{
      const a=i*Math.PI/3,r=i===7?360:120+i*6;
      const e=h.run._enemy({...template,id:'cross-target-'+i,x:s.player.x+Math.cos(a)*r,y:s.player.y+Math.sin(a)*r});
      e.hp=e.maxHp=1e8;e.moveSpeed=0;e.ai.graceUntil=e.ai.readyAt=e.ai.entryUntil=1e8;return e;
     });
     h.run._playtestAssist=false;h.draw();if(h.overlay)h.overlay.active=false;
    };
   });
   for(const rank of [1,4,7])for(const flying of [false,true]){
    await page.evaluate(({rank,flying})=>window.__prepareCross(rank,flying),{rank,flying});
    await page.waitForFunction(()=>window.__towerTest.host.crossBurstArt.ready&&window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
    const result=await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state,seen=new Map();let effect;
     for(let i=0;i<100;i++){
      window.__stepLine();
      for(const e of s.effects){if(e.kind==='hit'&&e.source==='sj_cross')seen.set(e.id,e);if(e.shape==='cross-burst')effect={...e}}
     }
     return {hits:seen.size,radius:effect?.radius,origin:{x:effect?.x,y:effect?.y},player:{x:s.player.x,y:s.player.y},
      rear:[2,3,4].map(i=>s.enemies[i].hp),hurt:s.enemies.filter(e=>e.hp<1e8).length,outsideHp:s.enemies[7].hp,projectiles:s.projectiles.filter(e=>e.source==='sj_cross').length,actors:h.crossBurstArt.actors.size};
    });
    assert.equal(result.hits,4);assert.equal(result.hurt,4);assert.ok(result.rear.every(hp=>hp===1e8));assert.equal(result.outsideHp,1e8);assert.equal(result.projectiles,0);assert.equal(result.actors,0);
    assert.equal(result.radius,rank===1?180:rank===4?220:270);assert.deepEqual(result.origin,result.player);
    report.cases.push({viewport,rank,flying,...result});
   }
   await page.evaluate(()=>{window.__prepareCross(7);for(let i=0;i<100;i++){window.__stepLine();if(window.__towerTest.host.run.state.effects.some(e=>e.shape==='cross-burst'))break}for(let i=0;i<7;i++)window.__stepLine();const h=window.__towerTest.host;if(h.overlay)h.overlay.active=false});
   await page.screenshot({path:path.join(OUT,`opening-${viewport.width}.png`)});
   await page.evaluate(()=>{for(let i=0;i<13;i++)window.__stepLine()});
   await page.screenshot({path:path.join(OUT,`burst-${viewport.width}.png`)});
   const bloom=await page.evaluate(()=>{
    const h=window.__towerTest.host,a=Array.from(h.crossBurstArt.actors.values())[0];
    return {active:a.arcs.filter(p=>p.node.active).length,alpha:a.arcs.map(p=>p.sprite.color.a)};
   });
   assert.equal(bloom.active,2,'exactly two blades intersect');
   assert.ok(bloom.alpha.every(a=>a>0),'all blades retain visible white-violet color');
   const stationary=await page.evaluate(()=>{const h=window.__towerTest.host;const a=Array.from(h.crossBurstArt.actors.values())[0];const read=()=>a.arcs.map(p=>({x:p.node.position.x,y:p.node.position.y,angle:p.node.angle,w:p.ui.width,h:p.ui.height}));const before=read();for(let i=0;i<6;i++)window.__stepLine();return {before,after:read()};});assert.deepEqual(stationary.after,stationary.before,'visible arcs never fly, rotate or grow');
   const coverage=await page.evaluate(()=>{
    const h=window.__towerTest.host,original=h.skillEffects.draw;let result;
    h.skillEffects.draw=function(...args){
     const ids=args[1].effects.filter(e=>e.shape==='cross-burst').map(e=>e.id);
     result={ids,covered:ids.every(id=>args[6]?.has(id))};
     return original.apply(this,args);
    };
    try{h.draw();return result}finally{h.skillEffects.draw=original}
   });
   assert.ok(coverage.ids.length>0&&coverage.covered,'Compiled renderer must suppress the geometric fallback');
   await page.evaluate(()=>{for(let i=0;i<25;i++)window.__stepLine();const h=window.__towerTest.host;if(h.overlay)h.overlay.active=false});
   await page.screenshot({path:path.join(OUT,`fade-${viewport.width}.png`)});
   await page.evaluate(()=>window.__prepareCross(7));await page.waitForTimeout(400);
   await page.evaluate(()=>window.__towerTest.host.run.resume());await page.waitForTimeout(2600);
   const ended=await page.evaluate(()=>{const h=window.__towerTest.host,battle=h.battle;h.run.abandon();h.finish();return {actorsCleared:h.crossBurstArt.actors.size===0,runCleared:h.run===null,battleDetached:!battle.parent||!cc.isValid(battle,true),storageUnchanged:JSON.stringify(localStorage)===window.__lineInitial.storage,writes:window.__lineWrites};});assertCleanup(ended);const video=page.video();await ctx.close();await video.saveAs(path.join(OUT,`runtime-${viewport.width}.webm`));
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.cases.length,report.error||'')}
}
main();
