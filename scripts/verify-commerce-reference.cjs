const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/commerce-reference-2026-11-01');
const build=process.env.COMMERCE_BUILD||'/reports/commerce-reference-2026-11-01/build/web-mobile';
(async()=>{
fs.mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(root+'/'))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(b);});});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={cases:[],errors:[]};
try{browser=await chromium.launch({headless:true,channel:'chrome'});
for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
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
for(const [target,hall,furnace,close,key] of [['forge','炼器主殿','炼器炉','关闭炼器工坊','weapon:fan:q1'],['pills','丹霞主殿','炼丹炉','关闭丹药菜单','huichun']]){
 await page.evaluate(target=>window.__towerTest.host.goto(target),target);await click(hall);await shot(target+'-shop');assert.equal(await exists('开始炼制'),false);
 await click('商品卡片-'+key);await shot(target+'-purchase');assert.ok(await exists('购买物品弹窗'));await click('增加数量');
 await click('取消购买');assert.equal(await exists('购买物品弹窗'),false);await click('商品卡片-'+key);await click('确认购买');assert.ok(await exists('获得物品弹窗'));await shot(target+'-purchased');await click('确认获得');await click(close);
 await click(furnace);await click('配方卡片-'+(target==='forge'?'weapon:fa:q1':key));await shot(target+'-craft');assert.equal(await exists('商品列表'),false);
 await click('开始炼制');assert.ok(await exists('炼制确认弹窗'));await shot(target+'-confirm');await click('取消炼制');assert.equal(await exists('炼制确认弹窗'),false);
 await click('开始炼制');await click('确认炼制');assert.ok(await exists('获得物品弹窗'));await shot(target+'-result');await click('确认获得');
 const hero=await page.evaluate(()=>window.walk(window.find('炼制详情')).find(n=>n.name.startsWith('物品图-')&&n.getComponent('cc.Button')).name);await click(hero);assert.ok(await exists('物品详情弹窗'));await shot(target+'-detail');await click('关闭成品详情');
 await click(close);report.cases.push({width:viewport.width,target,purchase:true,craft:true,confirmation:true,result:true});
}
await context.close();
}assert.deepEqual(report.errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));}
finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
