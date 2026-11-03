const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/ui-a-fixes');
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
await page.evaluate(()=>window.__towerTest.host.goto('inventory'));
await shot('inventory');await click('装备槽-weapon');await shot('weapon-detail');
const weaponText=await page.evaluate(()=>window.walk(window.__towerTest.host.root).map(n=>n.getComponent('cc.Label')?.string||'').join('\n'));
assert.ok(weaponText.includes('30%'));assert.ok(!weaponText.includes('3\n0%'));
await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.dismissInventory();h.menu.go('librarySkills');});await shot('skills');
for(const [target,hall,key] of [['forge','炼器主殿','weapon:fan:q1'],['pills','丹霞主殿','huichun']]){
 await page.evaluate(target=>window.__towerTest.host.goto(target),target);await page.waitForTimeout(700);await click(hall);await shot(target+'-shop');await click('商品卡片-'+key);await shot(target+'-purchase');
 const controls=await page.evaluate(()=>['减少数量','增加数量','最大数量'].map(name=>{const n=window.find(name),u=n.getComponent('cc.UITransform'),cam=window.walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean),a=cam.worldToScreen(n.worldPosition),b=cam.worldToScreen(new cc.Vec3(n.worldPosition.x+u.width*n.worldScale.x,n.worldPosition.y+u.height*n.worldScale.y,n.worldPosition.z)),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{name,w:u.width,h:u.height,screenW:Math.abs(b.x-a.x)*r.width/c.width,screenH:Math.abs(b.y-a.y)*r.height/c.height};}));
 assert.ok(controls.every(n=>n.screenW>=44&&n.screenH>=44),JSON.stringify(controls));report.cases.push({viewport,target,controls});await click('增加数量');await click('取消购买');
 await click('商品卡片-'+key);await click('确认购买');assert.ok(await exists('获得物品弹窗'));await click('确认获得');
}
await page.evaluate(()=>{const h=window.__towerTest.host;h.goto('hall');h.showModal('长错误说明',Array.from({length:80},(_,i)=>`第${i+1}条：存储空间不足，请清理后重试。`).join('\n'),[{text:'关闭测试',fn:()=>h.render()}]);});
await shot('long-error');
const longBody=await page.evaluate(()=>{const v=window.find('弹窗正文卷轴'),s=v.getComponent('cc.ScrollView');s.scrollToBottom(0);return {scroll:s.vertical,height:v.getComponent('cc.UITransform').height};});
assert.equal(longBody.scroll,true);assert.ok(longBody.height>=112);await shot('long-error-bottom');await click('关闭测试');
await page.evaluate(()=>{const h=window.__towerTest.host;window.modalSelected='';h.showModal('选择突破物品',Array.from({length:12},(_,i)=>`突破说明${i+1}：成功后进入下一境界。`).join('\n'),Array.from({length:12},(_,i)=>({text:`突破选项${i+1}`,fn:()=>{window.modalSelected=String(i+1);h.render();}})));});
await shot('many-actions');
const multi=await page.evaluate(()=>{const v=window.find('弹窗正文卷轴'),a=window.find('弹窗操作卷轴');a.getComponent('cc.ScrollView').scrollToBottom(0);return{bodyH:v.getComponent('cc.UITransform').height,actionH:a.getComponent('cc.UITransform').height,scroll:a.getComponent('cc.ScrollView').vertical};});
assert.ok(multi.bodyH>=112);assert.ok(multi.actionH>=88);assert.equal(multi.scroll,true);await shot('many-actions-bottom');await click('突破选项12');assert.equal(await page.evaluate(()=>window.modalSelected),'12');
await page.evaluate(async()=>{
 const h=window.__towerTest.host,{CAMP_PILLS}=await import('/js/xianxia/TowerProfile.js');
 const items=Object.entries(CAMP_PILLS).filter(([,p])=>p.material).slice(0,19).map(([id],i)=>({id,count:i===0?123:7}));
 const state=JSON.parse(JSON.stringify(h.store.state));state.lastResult={earned:{xp:180,spiritStones:650,contribution:100},firstClear:true,materials:items};
 const originalStore=h.store,originalRender=h.render;h.store={state};h.render=()=>{};
 try{h.afterFinish({floor:1,phase:'won',earned:{cores:0}});}finally{h.store=originalStore;h.render=originalRender;}
});
await shot('harvest');
const hintY=await page.evaluate(()=>window.find('结算收获提示').worldPosition.y);
const cells=await page.evaluate(()=>window.walk(window.__towerTest.host.root).filter(n=>n.name.startsWith('结算物品-')).map(n=>({name:n.name,x:n.position.x,y:n.position.y})));
assert.ok(cells.length>8);assert.equal(cells[0].y,cells[7].y);assert.equal(cells[0].x,cells[8].x);assert.ok(cells[8].y<cells[0].y);
await click(cells[0].name);await shot('selected');
await page.evaluate(()=>window.find('结算收获列表').getComponent('cc.ScrollView').scrollToBottom(0));await shot('bottom');assert.equal(await page.evaluate(()=>window.find('结算收获提示').worldPosition.y),hintY);
assert.ok(await exists('返回宗门'));assert.ok(await exists('继续第2层'));await click('返回宗门');
assert.equal(await exists('结算收获区'),false);report.cases.push({viewport,items:cells.length,status:'PASS'});
await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1,true);});
await page.waitForFunction(()=>window.__towerTest.host.run&&window.walk(window.__towerTest.host.root).some(n=>n.name==='HUD.Notification'));
await page.evaluate(()=>{const h=window.__towerTest.host;h.breakthroughText='材料 +4：灵玉×1、寒晶砂×2、玉髓芝×1';h.breakthroughUntil=h.run.state.time+60;});
await shot('material-notice');
const pauseSize=await page.evaluate(()=>{const u=window.find('HUD.Pause').getComponent('cc.UITransform');return{w:u.width,h:u.height};});assert.ok(pauseSize.w>=72&&pauseSize.h>=72);
const noticeStyle=await page.evaluate(()=>({background:window.find('HUD.Notification').getComponent('cc.Graphics').enabled,outline:window.find('HUD.NotificationLabel').getComponent('cc.LabelOutline').enabled}));
assert.equal(noticeStyle.background,false);assert.equal(noticeStyle.outline,true);
await page.evaluate(()=>{const h=window.__towerTest.host;if(h.menu)throw Error('Battle fixture must have no menu');h.run.pause();h.showModal('战斗保存失败',Array.from({length:30},(_,i)=>`第${i+1}条：保存空间不足，重试前战斗保持暂停。`).join('\n'),[{text:'关闭战斗测试',fn:()=>h.render()}]);});
assert.ok(await exists('弹窗正文卷轴'));await shot('battle-error');await click('关闭战斗测试');


await context.close();
}assert.deepEqual(report.errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));}
finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
