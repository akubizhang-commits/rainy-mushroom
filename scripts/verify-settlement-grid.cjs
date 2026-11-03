const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/settlement-grid-2026-11-02');
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
const exists=name=>page.evaluate(name=>!!window.find(name),name);
await page.evaluate(async()=>{
 const h=window.__towerTest.host,{CAMP_PILLS}=await import('/js/xianxia/TowerProfile.js');
 const items=Object.entries(CAMP_PILLS).filter(([,p])=>p.material).slice(0,19).map(([id],i)=>({id,count:i===0?123:7}));
 const state=JSON.parse(JSON.stringify(h.store.state));state.lastResult={earned:{xp:180,spiritStones:680,contribution:100},firstClear:true,materials:items};
 const originalStore=h.store,originalRender=h.render;h.store={state};h.render=()=>{};
 try{h.afterFinish({floor:1,phase:'won',earned:{cores:0}});}finally{h.store=originalStore;h.render=originalRender;}
});
await shot('harvest');
const summaryText=await page.evaluate(()=>window.walk(window.find('结算收获区')).map(n=>n.getComponent('cc.Label')?.string||'').join('\n'));
assert.ok(!summaryText.includes('实际入账')&&!summaryText.includes('修为'));
assert.ok(await exists('结算物品-stone_mid'));assert.ok(await exists('结算物品-stone_low'));assert.ok(await exists('结算物品-resource_contribution'));
await click('结算物品-resource_contribution');await shot('contribution');
assert.ok(await page.evaluate(()=>window.find('结算收获提示').getComponent('cc.Label').string.includes('贡献 · 本次获得 100')));
const cells=await page.evaluate(()=>window.walk(window.__towerTest.host.root).filter(n=>n.name.startsWith('结算物品-')).map(n=>({name:n.name,x:n.position.x,y:n.position.y})));
assert.ok(cells.length>8);assert.equal(cells[0].y,cells[7].y);assert.equal(cells[0].x,cells[8].x);assert.ok(cells[8].y<cells[0].y);
await click(cells[0].name);await shot('selected');
await page.evaluate(()=>window.find('结算收获列表').getComponent('cc.ScrollView').scrollToBottom(0));await shot('bottom');
assert.ok(await exists('返回宗门'));assert.ok(await exists('继续第2层'));await click('返回宗门');
assert.equal(await exists('结算收获区'),false);report.cases.push({viewport,items:cells.length,status:'PASS'});
await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1,true);});
await page.waitForFunction(()=>window.__towerTest.host.run&&window.walk(window.__towerTest.host.root).some(n=>n.name==='HUD.Notification'));
await page.evaluate(()=>{const h=window.__towerTest.host;h.breakthroughText='材料 +4：灵玉×1、寒晶砂×2、玉髓芝×1';h.breakthroughUntil=h.run.state.time+60;});
await shot('material-notice');
const noticeStyle=await page.evaluate(()=>({background:window.find('HUD.Notification').getComponent('cc.Graphics').enabled,outline:window.find('HUD.NotificationLabel').getComponent('cc.LabelOutline').enabled}));
assert.equal(noticeStyle.background,false);assert.equal(noticeStyle.outline,true);

await context.close();
}assert.deepEqual(report.errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));}
finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
