'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/elite-strengthening-2026-11-04/ui');
(async()=>{fs.mkdirSync(out,{recursive:true});const errors=[];
const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,d)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(d)})});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const layouts=[];
try{browser=await chromium.launch({headless:true,channel:'chrome'});
for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
await page.waitForFunction(()=>window.__towerTest?.host?.menu);
const result=await page.evaluate(async()=>{
 const {ARCHETYPES}=await import('/js/xianxia/TowerContent.js');
 const h=window.__towerTest.host;h.enterTraining();h.run.pause();const r=h.run,s=r.state;s.floor=9;s.pending=[];s.reserved=[];s.enemies=[];s.player.x=33;s.player.y=-60;
 const rows=[];for(const rank of [2,3,4,5,6]){
 const a=ARCHETYPES.find(a=>a.role==='elite'&&a.rank===rank),n=ARCHETYPES.find(n=>n.role==='normal'&&n.rank===rank&&n.species===a.species);
 const elite=r._enemy({id:'verify-elite-'+rank,archetype:a.id,x:100,y:-60}),normal=r._enemy({id:'verify-normal-'+rank,archetype:n.id,x:100,y:-60});
 rows.push({rank,hp:elite.hp,hpRatio:elite.hp/normal.hp,damageRatio:elite.damage/normal.damage});if(rank===4)s.enemies.push(elite);
 }h.draw();return rows;
});
assert.deepEqual(result.map(r=>r.hpRatio),[4,8,20,24,28]);assert.ok(result.every(r=>Math.abs(r.damageRatio-1.7)<1e-9));
await page.waitForTimeout(500);await page.screenshot({path:path.join(out,`elite-${viewport.width}.png`)});
layouts.push({viewport,stats:result});await context.close();}
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify({status:'PASS',layouts,errors},null,2));console.log('PASS compiled elite stats, two landscape sizes');
}finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
