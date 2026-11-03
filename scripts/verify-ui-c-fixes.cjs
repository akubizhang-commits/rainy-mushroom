const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/ui-c-fixes');
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

await shot('hall-labels');
await page.evaluate(()=>window.__towerTest.host.menu.showSettings());await shot('settings');
await click('音效音量：100%');assert.ok(await exists('音效音量：0%'));
await click('减少动态效果：关闭');assert.ok(await exists('减少动态效果：开启'));
assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('xianxia.presentation.v1'))),{soundVolume:0,reducedMotion:true});
await page.keyboard.press('Tab');await shot('settings-focus');
await page.keyboard.press('ArrowDown');await shot('settings-focus-down');
await page.keyboard.press('Escape');assert.ok(!await exists('宗门设置遮罩'));
await page.evaluate(()=>window.__towerTest.host.goto('inventory'));await shot('inventory-labels');
const labels=await page.evaluate(()=>['全部','装备','丹药','材料'].map(name=>({name,caption:window.walk(window.find(name)).map(n=>n.getComponent('cc.Label')?.string||'').join('')})));
assert.ok(labels.every(r=>r.caption===r.name),JSON.stringify(labels));
await page.keyboard.press('Tab');await shot('inventory-focus');
for(let i=0;i<24;i++)await page.keyboard.press('Tab');await shot('inventory-scrolled-focus');
const focus=await page.evaluate(()=>{const ring=window.find('键盘焦点');if(!ring)return null;const n=ring.parent,camera=window.walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),p=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas');return{name:n.name,x:p.x/canvas.width,y:p.y/canvas.height};});
assert.ok(focus&&focus.x>=0&&focus.x<=1&&focus.y>=0&&focus.y<=1,JSON.stringify(focus));
await page.keyboard.press('Escape');assert.ok(!await exists('背包遮罩'));
await page.evaluate(()=>window.__towerTest.host.goto('forge'));await page.waitForTimeout(600);await click('炼器主殿');await click('商品卡片-weapon:fan:q1');assert.ok(await exists('购买物品弹窗'),'purchase opens before keyboard');await shot('purchase-before-keyboard');
await page.keyboard.press('Tab');await shot('purchase-after-tab');await page.keyboard.press('ArrowDown');await shot('purchase-focus');
const inside=await page.evaluate(()=>{let n=window.find('键盘焦点');while(n){if(n.name==='购买物品弹窗')return true;n=n.parent;}return false;});assert.ok(inside);
for(let i=0;i<20;i++){
 const name=await page.evaluate(()=>window.find('键盘焦点')?.parent.name);
 if(name==='增加数量')break;await page.keyboard.press('Tab');await page.waitForTimeout(100);
}
assert.equal(await page.evaluate(()=>window.find('键盘焦点')?.parent.name),'增加数量');
await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__towerTest.host.menu.gearCount),2);
await page.keyboard.press('Escape');assert.ok(!await exists('购买物品弹窗'));await shot('purchase-cancelled');
await page.evaluate(()=>window.__towerTest.host.goto('library'));await page.waitForTimeout(600);await page.keyboard.press('Tab');await shot('library-focus');
await page.evaluate(()=>window.__towerTest.host.enterFloor(1));await page.waitForFunction(()=>{const h=window.__towerTest.host;return h.run?.state.phase==='playing'&&h.run.state.time>3&&!h.host.assetLoading?.blocked;});
await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__towerTest.host.run?.state.phase==='paused');await shot('battle-pause-focus');
await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__towerTest.host.run?.state.phase==='playing');
const reduced=await page.evaluate(()=>{const h=window.__towerTest.host;h.tiandiArt.cameraKick=()=>({x:80,y:90});h.convergenceArt.cameraKick=()=>({x:0,y:0});h.burstArt.cameraKick=()=>({x:0,y:0});h.draw();return {x:h.camera.x-h.run.state.player.x,y:h.camera.y-h.run.state.player.y};});
assert.ok(Math.abs(reduced.x)<.001&&Math.abs(reduced.y-12)<.001,JSON.stringify(reduced));
report.cases.push({viewport,labels,focus,settingsPersisted:true,modalFocusContained:true,keyboardQuantity:2,pauseResume:true,reducedMotion:reduced});
await context.close();
}
assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
