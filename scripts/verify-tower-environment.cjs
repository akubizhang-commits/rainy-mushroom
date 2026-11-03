'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/xianxia/reports/tower-environment-2026-10-30');
(async()=>{fs.mkdirSync(out,{recursive:true});const errors=[];
const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,d)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(d)})});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const layouts=[];
try{browser=await chromium.launch({headless:true,channel:'chrome'});
for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
await page.waitForFunction(()=>window.__towerTest?.host?.menu);
await page.evaluate(()=>{const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;s.arenaVersion=1;s.player.x=33;s.player.y=0;s.enemies=[];s.reserved=[{id:'qa-mist',x:280,y:120,readyAt:s.time+.2,warning:.8}];s.pending=[];h.draw()});
await page.waitForFunction(()=>window.__towerTest.host.environmentArt.loaded.size===3);
await page.evaluate(()=>window.__towerTest.host.draw());
const info=await page.evaluate(()=>{const h=window.__towerTest.host;return {layers:h.battle.children.map(n=>n.name),loaded:[...h.environmentArt.loaded.keys()],pillars:['north','south-west','south-east'].map(k=>{const n=h.environmentArt.nodes.get(k);return {id:k,active:n.active,x:n.position.x,y:n.position.y}})}});
assert.equal(info.pillars.filter(p=>p.active).length,3);assert.ok(info.layers.indexOf('镇妖柱与刷怪妖雾')<info.layers.indexOf('攻击预警'));
await page.screenshot({path:path.join(out,`battle-${viewport.width}x${viewport.height}.png`)});
const fade=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;const r=s.reserved[0];s.reserved=[];s.enemies=[{...r,hp:100,maxHp:100,radius:24,family:'wolf',rank:1,role:'normal',ai:{mode:'approach'}}];h.draw();const started=h.environmentArt.fading.size;s.time+=.5;h.draw();return {started,left:h.environmentArt.fading.size,node:h.environmentArt.nodes.has('mist-qa-mist')}});
assert.deepEqual(fade,{started:1,left:0,node:false});
await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.player.x=850;h.run.state.player.y=440;h.draw()});
await page.screenshot({path:path.join(out,`edge-${viewport.width}x${viewport.height}.png`)});
layouts.push({viewport,...info,fade});await context.close();}
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'PASS',layouts,errors},null,2));console.log('PASS: two landscape layouts, all textures loaded, warning order and mist cleanup');
}finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
