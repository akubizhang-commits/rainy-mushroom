const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/battle-equipment-2026-11-03');
const build=process.env.COMMERCE_BUILD||'/cocos-pilot/build/web-mobile';
(async()=>{
fs.mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(root+'/'))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(b);});});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={cases:[],errors:[]};
try{browser=await chromium.launch({headless:true,channel:'chrome'});
for(const viewport of [{width:844,height:390},{width:1280,height:720},{width:960,height:360}]){
const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}${build}/index.html?ruleset=xianxia&tower=1&smoke=1`);await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning);
await page.evaluate(async()=>{
 const h=window.__towerTest.host;h.campElapsed=-100000;
 window.walk=n=>[n,...n.children.flatMap(window.walk)];window.find=n=>window.walk(h.root).find(x=>x.name===n&&x.activeInHierarchy&&x.getComponent('cc.Button'))||window.walk(h.root).find(x=>x.name===n&&x.activeInHierarchy);
 const {checksum}=await import('/js/xianxia/Checksum.js'),{CAMP_PILLS}=await import('/js/xianxia/TowerProfile.js');
 let raw;const disk={getItem:()=>raw||null,setItem:(_,v)=>raw=v},Store=h.store.constructor,s=new Store(disk,Date.now());s.act({type:'sync'},Date.now());
 const env=JSON.parse(raw),state=JSON.parse(env.data);state.spiritStones=10000;state.contribution=10000;state.clearedFloor=1;state.xp=225;
 for(const [id,p] of Object.entries(CAMP_PILLS))if(p.material)state.pills[id]=1000;
 env.data=JSON.stringify(state);env.checksum=checksum(env.data);raw=JSON.stringify(env);h.store=new Store(disk,Date.now());h.render();
});
async function click(name){const p=await page.evaluate(name=>{const n=window.find(name);if(!n)throw Error('Missing '+name);if(!n.getComponent('cc.Button')?.interactable)throw Error('Disabled '+name);const camera=window.walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),v=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:r.x+v.x/c.width*r.width,y:r.y+(1-v.y/c.height)*r.height};},name);assert.ok(p.x>0&&p.x<viewport.width&&p.y>0&&p.y<viewport.height,name+' on screen');await page.mouse.click(p.x,p.y);await page.waitForTimeout(120);}
const shot=async tag=>{await page.waitForTimeout(500);await page.screenshot({path:path.join(out,`${tag}-${viewport.width}.png`)});};



await page.evaluate(()=>window.__towerTest.host.enterFloor(1,true));
await page.waitForFunction(()=>window.__towerTest.host.run?.state.phase==='playing');
await page.waitForFunction(()=>!window.__towerTest.host.transitioning);
await page.waitForTimeout(700);
await page.evaluate(()=>window.__towerTest.host.openInventory());
assert.equal(await page.evaluate(()=>window.__towerTest.host.run.state.phase),'paused');
for(const [slot,id] of [['weapon','iron'],['armor','basic-armor'],['ring','basic-ring']]){
 await click('装备槽-'+slot);
 const before=await page.evaluate(()=>{const h=window.__towerTest.host;return{hp:h.run.state.player.hp,mana:h.run.state.player.mana,time:h.run.state.time,cooldowns:h.run.state.cooldowns};});
 await shot('before-unequip-'+slot);
 await click('解除');
 let state=await page.evaluate(slot=>{const h=window.__towerTest.host;return{id:h.store.state.loadouts[0][slot+'Id'],phase:h.run.state.phase,open:h.menu?.inventoryOpen,hp:h.run.state.player.hp,mana:h.run.state.player.mana,time:h.run.state.time,cooldowns:h.run.state.cooldowns,same:JSON.stringify(h.run.snapshot())===JSON.stringify(h.store.state.activeRun.snapshot)};},slot);
 assert.equal(state.id,'');assert.equal(state.phase,'paused');assert.equal(state.open,true);assert.equal(state.same,true);assert.equal(state.time,before.time);assert.ok(state.hp<=before.hp);assert.ok(state.mana<=before.mana);assert.deepEqual(state.cooldowns,before.cooldowns);
 await shot('unequip-'+slot);
 await click('穿戴');
 assert.equal(await page.evaluate(slot=>window.__towerTest.host.store.state.loadouts[0][slot+'Id'],slot),id);
 assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.inventoryOpen),true);
}
await click('关闭背包');
await page.waitForFunction(()=>window.__towerTest.host.run?.state.phase==='playing');
await page.waitForTimeout(300);
await page.evaluate(()=>window.__towerTest.host.pause());
assert.equal(await page.evaluate(()=>window.__towerTest.host.pending),null);
assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.activeRun.snapshot.phase),'paused');
await shot('battle-resumed');
report.cases.push({viewport,status:'PASS'});
await context.close();
}assert.deepEqual(report.errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));}
finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
