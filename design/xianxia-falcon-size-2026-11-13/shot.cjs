// Two low-rank falcons side by side: left one flying (moving), right one hovering in a shot windup (portrait).
const fs=require('node:fs'),path=require('node:path'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..');
(async()=>{const server=createServer((req,res)=>{const f=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm'})[path.extname(f)]||'application/octet-stream');res.end(b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
try{const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:120000});
await page.evaluate(()=>{const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;s.time=10;s.ticks=600;s.floor=2;s.player.x=0;s.player.y=90;s.player.hp=s.player.maxHp=1e6;s.player.invulnerableUntil=999;
 s.enemies=[];s.pending=[];s.reserved=[];s.effects=[];s.drops=[];s.projectiles=[];s.zones=[];s.casts=[];s.loadout.active={};s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:999};
 const mk=(id,x)=>{const e=h.run._enemy({id,archetype:'falcon_normal',x,y:0});e.hp=e.maxHp=1e9;e.ai.entryUntil=999;for(const k of Object.keys(e.ai.cooldowns))e.ai.cooldowns[k]=999;return e};
 s.enemies=[mk('fly',-110),mk('hover',110)];h.camera={x:0,y:0};h.draw();});
await page.waitForFunction(()=>{const h=window.__towerTest.host;h.draw();return h.monsterArt.speciesRenderers.get('falcon')?.motionTexture;},null,{timeout:90000});
const sizes=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,[f,v]=s.enemies;
 for(let i=0;i<6;i++){f.x+=2;v.ai.mode='windup';v.ai.until=s.time+1;v.ai.attack={id:'x',kind:'shot',startedAt:s.time,active:.1,recovery:.5,dirX:0,dirY:-1};h.draw();}
 const r=h.monsterArt.speciesRenderers.get('falcon'),name=a=>[...r.motionFrames].find(([,x])=>x===a.sprite.spriteFrame)?.[0]||'portrait';
 return ['fly','hover'].map(id=>{const a=r.actors.get(id);return{id,frame:name(a),width:Math.round(a.transform.width)}});});
for(let k=0;k<15;k++){await page.waitForTimeout(120);await page.evaluate(()=>{const h=window.__towerTest.host,[f]=h.run.state.enemies;f.x+=2;h.draw();});}
await page.screenshot({path:path.join(__dirname,'after-full.png')});
console.log(JSON.stringify(sizes),'errors',errors.length);
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
