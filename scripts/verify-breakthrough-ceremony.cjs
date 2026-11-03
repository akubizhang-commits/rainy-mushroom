const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/breakthrough-ceremony-2026-11-03');
const build=process.env.COMMERCE_BUILD||'/cocos-pilot/build/web-mobile';
(async()=>{
fs.mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(root+'/'))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(b);});});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={cases:[],errors:[]};
try{browser=await chromium.launch({headless:true,channel:'chrome'});
for(const viewport of [{width:844,height:390},{width:1280,height:720},{width:960,height:360}]){
const context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}${build}/index.html?ruleset=xianxia&tower=1&smoke=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning);

await page.evaluate(()=>{window.walk=n=>[n,...n.children.flatMap(window.walk)];window.find=name=>window.walk(window.__towerTest.host.root).find(n=>n.name===name&&n.activeInHierarchy);});
async function click(name){const p=await page.evaluate(name=>{const n=window.find(name);if(!n)throw Error('Missing '+name);if(!n.getComponent('cc.Button')?.interactable)throw Error('Disabled '+name);const camera=window.walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);assert.ok(p.x>0&&p.x<viewport.width&&p.y>0&&p.y<viewport.height,name+' on screen');await page.mouse.click(p.x,p.y);await page.waitForTimeout(120);}
const shot=async tag=>{await page.screenshot({path:path.join(out,`${tag}-${viewport.width}.png`)});};
async function setup({xp=1800,contribution=300,rng=1,stock=0}={}){
 await page.evaluate(async({xp,contribution,rng,stock})=>{
 const h=window.__towerTest.host,{checksum}=await import('/js/xianxia/Checksum.js');h.ritual?.close();h.ceremony=null;h.breakthroughLock=0;h.presentationHidden=false;h.run=null;h.screen='camp';
 let raw;window.fixtureDisk={fail:false,getItem:()=>raw||null,setItem:(_,v)=>{if(window.fixtureDisk.fail)throw Error('full');raw=v;}};
 const Store=h.store.constructor;let store=new Store(window.fixtureDisk,Date.now());store.act({type:'sync'},Date.now());
 const env=JSON.parse(raw),state=JSON.parse(env.data);Object.assign(state,{xp,contribution,breakthroughRng:rng});state.pills.zhuji=stock;state.pills.ningdan=xp===6600?stock:0;
 env.data=JSON.stringify(state);env.checksum=checksum(env.data);raw=JSON.stringify(env);h.store=new Store(window.fixtureDisk,Date.now());if(h.store.readOnly)throw Error(h.store.error);
 h.enterFloor(1,true);
 },{xp,contribution,rng,stock});
 await page.waitForFunction(()=>!window.__towerTest.host.transitioning);await page.waitForFunction(()=>!window.walk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy),{},{timeout:60000});await page.waitForTimeout(150);
}
await setup();await shot('prepare-purchase');
assert.equal(await page.evaluate(()=>!!window.find('对话面板')),false);
assert.match(await page.evaluate(()=>window.find('突破确认文字').getComponent('cc.Label').string),/60贡献/);
const before=await page.evaluate(()=>({money:window.__towerTest.host.store.state.contribution,ticks:window.__towerTest.host.run.state.ticks}));
await click('突破确认');
assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.contribution),before.money-60);
assert.equal(await page.evaluate(()=>window.find('HUD.ContributionCount').getComponent('cc.Label').string),'×240');
await page.evaluate(()=>{window.__towerTest.host.tryBreakthrough();});assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.contribution),before.money-60);
await page.waitForTimeout(500);await shot('gather');
const resizeMoney=await page.evaluate(()=>window.__towerTest.host.store.state.contribution);await page.setViewportSize({width:viewport.width-24,height:viewport.height});await page.waitForTimeout(150);await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.contribution),resizeMoney);
assert.equal(await page.evaluate(()=>window.__towerTest.host.run.state.ticks),before.ticks);
await page.waitForFunction(()=>window.__towerTest.host.ceremony?.elapsed>=2.12);await shot('burst');
await page.waitForFunction(()=>!window.__towerTest.host.ceremony);await shot('success');
assert.ok(await page.evaluate(()=>!!window.find('突破继续战斗')));
assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.xp),1801);
await click('突破继续战斗');await page.waitForFunction(()=>window.__towerTest.host.run.state.phase==='playing');
await setup({rng:123456789});await click('突破确认');
await page.waitForFunction(()=>!window.__towerTest.host.ceremony);await shot('failure');
assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.xp),1800);assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.contribution),240);
await setup({contribution:10});await shot('insufficient');assert.equal(await page.evaluate(()=>window.find('突破确认').getComponent('cc.Button').interactable),false);await click('突破稍后');
await page.waitForFunction(()=>window.__towerTest.host.run.state.phase==='playing');
await setup({stock:1});await page.evaluate(()=>window.fixtureDisk.fail=true);await click('突破确认');
assert.equal(await page.evaluate(()=>window.__towerTest.host.ceremony),null);assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.pills.zhuji),1);await shot('save-failed');
await page.evaluate(()=>window.fixtureDisk.fail=false);await click('突破确认');
await page.waitForFunction(()=>!window.__towerTest.host.ceremony);assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.contribution),300);
await setup({xp:6600});await shot('jindan-prepare');assert.match(await page.evaluate(()=>window.find('突破确认文字').getComponent('cc.Label').string),/120贡献/);
await click('突破确认');await page.waitForTimeout(350);
await page.evaluate(()=>window.__towerTest.host.hide());const elapsed=await page.evaluate(()=>window.__towerTest.host.ceremony.elapsed);
await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.__towerTest.host.ceremony.elapsed),elapsed);await page.evaluate(()=>window.__towerTest.host.shown());
await page.waitForFunction(()=>!window.__towerTest.host.ceremony);await shot('jindan-success');
assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.xp),6601);
await click('突破修习功法');assert.equal(await page.evaluate(()=>window.__towerTest.host.screen),'skills');
await setup({xp:44});
await page.waitForFunction(()=>window.__towerTest.host.run.state.enemies.length>0);
await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.enemies[0].hp=0;});
await page.waitForFunction(()=>window.__towerTest.host.levelEffects.length>0);
await page.waitForTimeout(180);await shot('minor-level');
const minor=await page.evaluate(()=>{const h=window.__towerTest.host;return {phase:h.run.state.phase,title:h.levelLabel.string,ticks:h.run.state.ticks};});
assert.equal(minor.phase,'playing');assert.match(minor.title,/炼气.+层/);
await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>window.__towerTest.host.run.state.ticks)>minor.ticks);

report.cases.push({viewport,status:'PASS'});
await context.close();
}assert.deepEqual(report.errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));}
finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
