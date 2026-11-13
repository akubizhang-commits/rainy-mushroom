// Repro: low-rank spider backs away when the player is close (ranged kiting, ai.mode 'approach').
// Records per tick: ai mode, distance, whether it moved, and which atlas frame the renderer shows.
const fs=require('node:fs'),path=require('node:path'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..'),OUT=__dirname;
const ARCH=process.argv[2]||'spider_normal_r1',FLOOR=+(process.argv[3]||3);
(async()=>{
const server=createServer((req,res)=>{const f=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(f)]||'application/octet-stream');res.end(b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
try{const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:120000});
await page.evaluate(({ARCH,FLOOR})=>{const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;s.time=10;s.ticks=600;s.floor=FLOOR;s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=1e6;s.player.invulnerableUntil=999;s.enemies=[];s.pending=[];s.reserved=[];s.effects=[];s.drops=[];s.projectiles=[];s.zones=[];s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:999};
 const e=h.run._enemy({id:'sp',archetype:ARCH,x:-200,y:0});e.hp=e.maxHp=1e6;e.ai.mode='approach';e.ai.entryUntil=s.time;e.ai.graceUntil=s.time;s.enemies=[e];h.camera={x:0,y:0};h.draw();},{ARCH,FLOOR});
await page.waitForFunction(()=>{const h=window.__towerTest.host;h.draw();const r=h.monsterArt.speciesRenderers.get('spider');return r?.motionTexture&&r.actors.get('sp');},null,{timeout:90000});
const out=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,e=s.enemies[0],r=h.monsterArt.speciesRenderers.get('spider'),rows=[];
 // shot ready (so it kites), every other attack on cooldown; start inside preferredMin so it must back away.
 for(const k of Object.keys(e.ai.cooldowns))e.ai.cooldowns[k]=k==='shot'?0:999;e.x=s.player.x-90;e.y=0;h.run.resume();
 for(let i=0;i<180;i++){const px=e.x,py=e.y;h.run.advance(1/60);h.draw();const a=r.actors.get(e.id);
  rows.push({t:+s.time.toFixed(3),mode:e.ai.mode,kind:e.ai.attack?.kind||null,d:Math.round(Math.hypot(e.x-s.player.x,e.y-s.player.y)),moved:+Math.hypot(e.x-px,e.y-py).toFixed(2),frame:[...r.motionFrames].find(([,x])=>x===a.sprite.spriteFrame)?.[0]||'static'});}
 h.run.pause();return{rows,cooldowns:e.ai.cooldowns};});
fs.writeFileSync(path.join(OUT,`repro-${ARCH}.json`),JSON.stringify(out,null,1));
const runs=[];for(const r of out.rows){const k=`${r.mode}/${r.kind}/${r.moved>0?'moving':'still'}/${r.frame.replace(/-\d+$/,'')}`;if(runs.length&&runs.at(-1)[0]===k)runs.at(-1)[1]++;else runs.push([k,1]);}
console.log(ARCH,JSON.stringify(runs));console.log('first rows',JSON.stringify(out.rows.slice(0,6)));console.log('errors',errors.length);
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
