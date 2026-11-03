const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/minor-level-scattered-motes-2026-11-03');
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
 const env=JSON.parse(raw),state=JSON.parse(env.data);Object.assign(state,{xp,contribution,spiritStones:contribution,breakthroughRng:rng});state.pills.zhuji=stock;state.pills.ningdan=xp===6600?stock:0;
 env.data=JSON.stringify(state);env.checksum=checksum(env.data);raw=JSON.stringify(env);h.store=new Store(window.fixtureDisk,Date.now());if(h.store.readOnly)throw Error(h.store.error);
 h.enterFloor(1,true);
 },{xp,contribution,rng,stock});
 await page.waitForFunction(()=>!window.__towerTest.host.transitioning);await page.waitForFunction(()=>!window.walk(cc.director.getScene()).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy),{},{timeout:60000});await page.waitForTimeout(150);
}
await setup({xp:44});
await page.waitForFunction(()=>window.__towerTest.host.levelBeam.frame);
await page.waitForFunction(()=>window.__towerTest.host.run.state.enemies.length>0);
await page.evaluate(()=>{window.__towerTest.host.run.state.enemies[0].hp=0;});
await page.waitForFunction(()=>window.__towerTest.host.levelEffects.length>0);
await page.waitForTimeout(220);await shot('minor-beam');
const state=await page.evaluate(()=>{const h=window.__towerTest.host,a=window.find('小境界晋升光柱');return{active:!!a,phase:h.run.state.phase,alpha:a?.getComponent('cc.Sprite').color.a,title:h.levelLabel.string};});
assert.equal(state.active,true);assert.equal(state.phase,'playing');assert.ok(state.alpha>180);assert.match(state.title,/炼气.+层/);
await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.phase='paused';window.beamEffect={...h.levelEffects.at(-1)};window.frozen={time:h.run.state.time,y:h.levelBeam.actor.position.y,alpha:h.levelBeam.actor.getComponent('cc.Sprite').color.a,uploads:h.levelBeam.uploads};});
await page.waitForTimeout(300);
assert.equal(await page.evaluate(()=>{const h=window.__towerTest.host;return h.run.state.time===window.frozen.time&&h.levelBeam.actor.position.y===window.frozen.y&&h.levelBeam.uploads===window.frozen.uploads&&h.levelBeam.actor.getComponent('cc.Sprite').color.a===window.frozen.alpha;}),true);
const flow=await page.evaluate(()=>{const h=window.__towerTest.host,b=h.levelBeam;const first=b.canvas.toDataURL();b.animate(.48,false);const second=b.canvas.toDataURL();b.animate(.48,true);const quiet=b.canvas.toDataURL();b.animate(.68,true);return{changed:first!==second,quiet:quiet===b.canvas.toDataURL(),uploads:b.uploads};});
assert.equal(flow.changed,true);assert.equal(flow.quiet,true);assert.ok(flow.uploads>2);
await page.evaluate(()=>{window.__towerTest.host.run.state.phase='playing';});
await page.waitForFunction(()=>!window.__towerTest.host.levelBeam.actor.active);await shot('minor-finished');
assert.equal(await page.evaluate(()=>window.__towerTest.host.levelEffects.length),0);
if(viewport.width===844){
 for(let i=0;i<24;i++){
  await page.evaluate(i=>{const h=window.__towerTest.host;h.run.state.phase='paused';h.levelEffects=[{...window.beamEffect}];h.run.state.time=window.beamEffect.started+i/20;h.draw();},i);
  await page.screenshot({path:path.join(out,`flow-${String(i).padStart(2,'0')}.png`)});
 }
}
report.cases.push({viewport,status:'PASS'});
await context.close();
}assert.deepEqual(report.errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));}
finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
