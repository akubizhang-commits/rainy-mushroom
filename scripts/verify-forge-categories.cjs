'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{createServer}=require('node:http');const{pathToFileURL}=require('node:url');
const{chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/forge-categories');
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const{TowerCampaignStore,TOWER_CAMPAIGN_KEY}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/TowerCampaign.js')));
 const{checksum}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/Checksum.js')));
 function seed(xp){const map=new Map(),store=new TowerCampaignStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},Date.now());store.act({type:'sync'},Date.now());const env=JSON.parse(map.get(TOWER_CAMPAIGN_KEY)),state=JSON.parse(env.data);state.xp=xp;state.spiritStones=10000;state.contribution=10000;state.rng=12345;state.weaponPity=30;state.weaponSequence=30;env.data=JSON.stringify(state);env.checksum=checksum(env.data);return JSON.stringify(env);}
 const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={status:'RUNNING',cases:[],errors:[]};
 try{browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 async function open(viewport,xp){const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log(m.text());});await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu).catch(async error=>{await page.screenshot({path:path.join(OUT,'startup-failure.png')});console.log(await page.locator('body').innerText());throw error;});await page.evaluate(({key,data})=>{const h=window.__towerTest.host;h.platform.storage.setItem(key,data);h.store=new h.store.constructor(h.platform.storage,Date.now());h.render();},{key:TOWER_CAMPAIGN_KEY,data:seed(xp)});return{context,page};}
 async function click(page,name){const p=await page.evaluate(name=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],n=walk(h.root).find(n=>n.name===name);if(!n)throw Error('missing '+name);const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);await page.mouse.click(p.x,p.y);await page.waitForTimeout(100);}
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 for(const [xp,tier] of [[0,'huang'],[1485,'huang'],[5400,'xuan']]){
 const {context,page}=await open(viewport,xp);
 await page.evaluate(()=>window.__towerTest.host.goto('forge'));
 await click(page,'炼器炉');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.forgeTier),tier);
 const badges=await page.evaluate(()=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],nodes=walk(h.menu.root);return ['黄','玄','地','天','仙'].map(name=>{const n=nodes.find(n=>n.name===`选择${name}阶`);return {name,x:n.position.x,enabled:n.getComponent('cc.Button').interactable};});});
 assert.deepEqual(badges.map(b=>b.enabled),[true,true,false,false,false]);
 for(let i=1;i<badges.length;i++)assert.ok(badges[i].x>badges[i-1].x);
 const actions=await page.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)],nodes=walk(window.__towerTest.host.menu.root);return nodes.filter(n=>/武器抽取(一次|十次)$/.test(n.name)).map(n=>({x:n.position.x,y:n.position.y,height:n.getComponent('cc.UITransform').height}));});
 assert.equal(actions.length,2);assert.equal(actions[0].y,actions[1].y);assert.ok(actions[0].x<actions[1].x);assert.deepEqual(actions.map(a=>a.height),[72,72]);
 const prices=await page.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)],nodes=walk(window.__towerTest.host.menu.root);return [1,10].map(count=>{const n=nodes.find(n=>n.name===`炼器费用-${count}`);return {x:n.position.x,y:n.position.y,icons:walk(n).filter(c=>c.name.startsWith('灵石素材-')).length};});});
 prices.forEach((price,i)=>{assert.equal(price.x,actions[i].x);assert.ok(price.y+16<actions[i].y-actions[i].height/2);assert.equal(price.icons,2);});


 await page.waitForFunction(()=>window.__towerTest.host.menu.towerImages.get('tower-equipment/eq_sword_suwen')?.frame);
 await page.screenshot({path:path.join(OUT,`weapon-${viewport.width}-${xp}.png`)});
 const initial=await page.evaluate(()=>window.__towerTest.host.store.state.spiritStones);
 await click(page,'下一炼器类别');
 await page.waitForFunction(()=>window.__towerTest.host.menu.towerImages.get('tower-equipment/eq_armor_qingma')?.frame);
 await page.screenshot({path:path.join(OUT,`equipment-${viewport.width}-${xp}.png`)});
 await click(page,'选择玄阶');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.forgeTier),'xuan');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.spiritStones),initial);
 await click(page,'选择黄阶');
 await click(page,'黄阶防具抽取十次');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.spiritStones),initial-900);
 const result=await page.evaluate(()=>window.__towerTest.host.menu.forgeResult.request);
 assert.deepEqual(result,{category:'armor',tier:'huang',count:10});
 await click(page,'跳过展示');
 await click(page,'返回炼器峰-左');await click(page,'炼器炉');
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.forgeTier),tier);
 if(viewport.width===1280 && xp===5400){
  for(const target of ['hall','home','tower','library','pills','loadouts','inventory']){
   await page.evaluate(target=>window.__towerTest.host.goto(target),target);
   await page.waitForTimeout(250);
   await page.screenshot({path:path.join(OUT,`review-${target}.png`)});
  }
 }
 report.cases.push({viewport,xp,tier});await context.close();
 }
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.error||report.cases.length);}}
main();
