'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{createServer}=require('node:http');const{pathToFileURL}=require('node:url');
const{chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'docs/xianxia/reports/character-inventory');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const{TowerCampaignStore,TOWER_CAMPAIGN_KEY}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/TowerCampaign.js')));
 const{checksum}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/Checksum.js')));
 function seed(xp){const map=new Map(),store=new TowerCampaignStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},Date.now());store.act({type:'sync'},Date.now());const env=JSON.parse(map.get(TOWER_CAMPAIGN_KEY)),state=JSON.parse(env.data);state.xp=xp;env.data=JSON.stringify(state);env.checksum=checksum(env.data);return JSON.stringify(env);}
 const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={status:'RUNNING',cases:[],errors:[]};
 try{browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 async function open(viewport){const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1&playtest=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu);return{context,page};}
 async function click(page,name){const p=await page.evaluate(name=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],n=walk(h.root).find(n=>n.name===name);if(!n)throw Error('missing '+name);const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);await page.mouse.click(p.x,p.y);await page.waitForTimeout(100);}
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const {context,page}=await open(viewport);
 const initial=await page.evaluate(()=>{const h=window.__towerTest.host;return{stones:h.store.state.spiritStones,contribution:h.store.state.contribution,normal:h.platform.storage.getItem('xianxia.sect-tower.campaign.v1')}});
 await page.evaluate(()=>window.__towerTest.host.showTools());await click(page,'资源与成长');
 await page.screenshot({path:path.join(OUT,`tools-${viewport.width}.png`)});
 await click(page,'灵石补给');await click(page,'+99,999极品灵石');
 await click(page,'返回资源工具');await click(page,'+99,999宗门贡献');await click(page,'升至金丹巅峰（27级，仅场外）');
 const boosted=await page.evaluate(()=>{const h=window.__towerTest.host;return{stones:h.store.state.spiritStones,contribution:h.store.state.contribution,xp:h.store.state.xp,normal:h.platform.storage.getItem('xianxia.sect-tower.campaign.v1')}});
 assert.equal(boosted.stones-initial.stones,99999*1000000);assert.equal(boosted.contribution-initial.contribution,99999);assert.equal(boosted.normal,initial.normal);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.render();for(let i=0;i<6;i++){h.action({type:'drawWeapon',tier:'xuan'});h.action({type:'drawEquipment',category:i%2?'ring':'armor',tier:'xuan'});}h.goto('inventory');});
 await page.screenshot({path:path.join(OUT,`inventory-${viewport.width}.png`)});
 const ids=await page.evaluate(()=>Object.keys(window.__towerTest.host.store.state.weapons).filter(x=>x!=='starter'));
 const item=await page.evaluate(()=>{const h=window.__towerTest.host;return Object.values(h.store.state.weapons).filter(x=>x.tier==='xuan').at(-1).id});
 await click(page,'背包物品-'+item);await page.screenshot({path:path.join(OUT,`item-${viewport.width}.png`)});
 await click(page,'锁定');assert.equal(await page.evaluate(id=>window.__towerTest.host.store.state.weapons[id].locked,item),true);
 assert.equal(await page.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(window.__towerTest.host.root).find(n=>n.name==='分解').getComponent('cc.Button').interactable}),false);
 await click(page,'解锁');await click(page,'分解');await page.screenshot({path:path.join(OUT,`dismantle-${viewport.width}.png`)});await click(page,'确认分解');
 assert.equal(await page.evaluate(id=>!!window.__towerTest.host.store.state.weapons[id],item),false);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.enterTraining();h.run.state.enemies=[];h.run.state.loadout.skills={};});
 await page.waitForFunction(()=>window.__towerTest.host.characterArt?.atlas);
 await page.screenshot({path:path.join(OUT,`idle-${viewport.width}.png`)});
 await page.keyboard.down('d');await page.waitForTimeout(450);await page.screenshot({path:path.join(OUT,`run-${viewport.width}.png`)});await page.keyboard.up('d');
 const loaded=await page.evaluate(()=>{const a=window.__towerTest.host.characterArt;return{frames:a.atlas.frames.length,root:!!a.root,mode:a.mode}});
 assert.equal(loaded.frames,35);assert.ok(loaded.root);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.touch=777;h.stick.dx=.4;h.stick.dy=0;});await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>window.__towerTest.host.characterArt.mode),'walk');
 await page.screenshot({path:path.join(OUT,`walk-${viewport.width}.png`)});
 await page.evaluate(()=>{const h=window.__towerTest.host;h.pause();});
 const frozen=await page.evaluate(()=>{const h=window.__towerTest.host;return {time:h.run.state.time,rect:h.characterArt.body?.spriteFrame?.rect}});
 await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>{const h=window.__towerTest.host;return {time:h.run.state.time,rect:h.characterArt.body?.spriteFrame?.rect}}),frozen);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.loadout.passive.sj_flight=1;h.run.resume();h.render();});await page.waitForTimeout(100);
 await page.screenshot({path:path.join(OUT,`flight-${viewport.width}.png`)});
 assert.ok(await page.evaluate(()=>window.__towerTest.host.characterArt.root?.active));
 report.cases.push({viewport,boosted,loaded});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}}
main();
