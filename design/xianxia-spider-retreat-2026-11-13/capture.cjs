// Screenshot strip of a spider elite backing away while the player chases (real build), cropped around the spider.
const fs=require('node:fs'),path=require('node:path'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(__dirname,'capture');
(async()=>{fs.mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{const f=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm'})[path.extname(f)]||'application/octet-stream');res.end(b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
try{const page=await browser.newPage({viewport:{width:1280,height:720}});
await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:120000});
await page.evaluate(()=>{const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;s.time=10;s.ticks=600;s.floor=3;s.pending=[];s.reserved=[];s.effects=[];s.drops=[];s.player.x=0;s.player.y=0;s.player.hp=s.player.maxHp=1e6;s.player.invulnerableUntil=999;s.enemies=[];s.zones=[];s.casts=[];s.projectiles=[];s.loadout.active={};s.monsterMechanics={version:1,sequence:0,zones:[],nextMajorAt:999};
 const e=h.run._enemy({id:'sp',archetype:'spider_elite_f3_w5_n1',x:-170,y:0});e.hp=e.maxHp=1e9;e.ai.mode='approach';e.ai.entryUntil=s.time;e.ai.graceUntil=s.time;for(const k of Object.keys(e.ai.cooldowns))e.ai.cooldowns[k]=k==='shot'?0:999;s.enemies=[e];h.camera={x:0,y:0};h.draw();});
await page.waitForFunction(()=>{const h=window.__towerTest.host;h.draw();return h.monsterArt.speciesRenderers.get('spider')?.motionTexture;},null,{timeout:90000});
const info=[];
for(let k=0;k<40;k++){
 const r=await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state,e=s.enemies[0];h.run.resume();
  for(let i=0;i<4;i++){const dx=e.x-s.player.x,dy=e.y-s.player.y,l=Math.hypot(dx,dy)||1;s.input.x=dx/l;s.input.y=dy/l;h.run.advance(1/60);}
  h.run.pause();h.draw();const r=h.monsterArt.speciesRenderers.get('spider'),a=r.actors.get('sp');
  return{frame:[...r.motionFrames].find(([,x])=>x===a.sprite.spriteFrame)?.[0]||'static',scale:a.node.scale.x,x:a.node.position.x,y:a.node.position.y,w:a.transform.width,ex:e.x,px:s.player.x};});
 await page.waitForTimeout(60);await page.evaluate(()=>window.__towerTest.host.draw());
 await page.screenshot({path:path.join(OUT,`f${String(k).padStart(2,'0')}.png`)});info.push(r);}
fs.writeFileSync(path.join(OUT,'info.json'),JSON.stringify(info,null,1));console.log(JSON.stringify(info.map(i=>[i.frame,Math.sign(i.scale),Math.round(i.ex),Math.round(i.px)])));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
