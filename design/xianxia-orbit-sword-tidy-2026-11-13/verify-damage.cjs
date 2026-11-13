// Real build: level-10 base orbit, one stationary monster on the ring (blade hits) and one inside the inner field.
// Expect ring hits = coefficient × 10/7 × 1.25, inner hits = coefficient × 10/7.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..');
(async()=>{const server=createServer((req,res)=>{const f=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm'})[path.extname(f)]||'application/octet-stream');res.end(b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
try{const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:120000});
const r=await page.evaluate(()=>{const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;s.time=10;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=1e6;s.player.invulnerableUntil=999;
 s.enemies=[];s.zones=[];s.casts=[];s.projectiles=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:999};s.loadout.active={sj_wanjian:10};for(const k of Object.keys(s.cooldowns))s.cooldowns[k]=0;
 const mk=(id,x)=>{const e=h.run._enemy({id,archetype:'spider_normal_r1',x,y:0});e.hp=e.maxHp=1e9;e.moveSpeed=0;e.ai.entryUntil=999;for(const k of Object.keys(e.ai.cooldowns))e.ai.cooldowns[k]=999;return e};
 s.enemies=[mk('ring',150),mk('near',40)];const hp=Object.fromEntries(s.enemies.map(e=>[e.id,e.hp])),dm={ring:[],near:[]};h.run.resume();
 for(let i=0;i<60*4;i++){h.run.advance(1/60);for(const e of s.enemies){if(e.hp<hp[e.id]){dm[e.id].push(hp[e.id]-e.hp);hp[e.id]=e.hp}}}
 h.run.pause();return dm;});
const ratio=r.ring.map(d=>d/r.near[0]);console.log('ring hits',r.ring.length,'near hits',r.near.length,'ring/near damage ratios',[...new Set(ratio.map(x=>x.toFixed(3)))],'errors',errors.length);
assert.ok(r.ring.length>0&&r.near.length>0);assert.ok(ratio.every(x=>Math.abs(x-1.25)<.01),'ring blade hits are compensated ×1.25 vs the inner field');assert.equal(errors.length,0);console.log('PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
