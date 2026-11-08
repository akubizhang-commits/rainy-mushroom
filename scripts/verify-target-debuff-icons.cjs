const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/target-debuff-icons-2026-11-05');
(async()=>{
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={cases:[],errors:[]};
 try{
 browser=await chromium.launch({headless:true,channel:'chrome'});

 fs.mkdirSync(out,{recursive:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning,{},{timeout:60000});
 await page.evaluate(()=>{const h=window.__towerTest.host;h.enterFloor(1,true);h.run.setPlaytestAssist(true);});
 await page.waitForFunction(()=>window.__towerTest.host.run?.state.enemies.some(e=>e.hp>0),{},{timeout:60000});
 await page.evaluate(()=>{
  const h=window.__towerTest.host,s=h.run.state;h.run.pause();const e=s.enemies.find(e=>e.hp>0);
  s.enemies=[e];e.role='boss';e.name='撼地熊王';e.x=s.player.x+180;e.y=s.player.y;
  e.mechanic={phase:'recovery',label:'妖核暴露',startedAt:s.time,until:s.time+3.2,vulnerableStartedAt:s.time-2.8,vulnerableUntil:s.time+3.2,vulnerability:.2,skills:[],enraged:false};
  e.weaponBleed={remaining:100,physical:100,stacks:2,nextAt:s.time+.5,endsAt:s.time+1.5};
  h.attackTargetId=e.id;window.qaEnemy=e;
 });
 await page.waitForFunction(()=>{const h=window.__towerTest.host,p=h.targetDebuffIcons.pool;return h.bossPanel.active&&p.length===2&&p.every(x=>!!x.art.sprite.spriteFrame)});
 const data=await page.evaluate(()=>{const h=window.__towerTest.host;return {icons:h.targetDebuffIcons.pool.filter(p=>p.node.active).map(p=>({name:p.node.name,x:p.node.position.x,y:p.node.position.y,text:p.label.string,progress:p.art.shade.fillRange,parent:p.node.parent.name})),mechanicText:h.bossMechanicLabel.string}});
 assert.equal(data.icons.length,2);assert.ok(data.icons.every(p=>p.parent==='HUD.Boss'));assert.equal(data.icons[0].x-12,-136);assert.equal(data.icons[1].x-data.icons[0].x,28);assert.equal(data.icons[0].text,'2');assert.ok(Math.abs(data.icons[1].progress+2.8/6)<1e-6);assert.equal(data.mechanicText,'');
 await page.screenshot({path:path.join(out,'target-1280.png')});
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300);
 await page.evaluate(()=>{const h=window.__towerTest.host;if(h.overlay)h.overlay.active=false;});
 await page.screenshot({path:path.join(out,'target-844.png')});
 await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;const other={...qaEnemy,id:'clean-target',weaponBleed:undefined,mechanic:undefined,role:'normal'};s.enemies.push(other);h.attackTargetId=other.id;});
 await page.waitForFunction(()=>!window.__towerTest.host.targetDebuffIcons.hasActiveIcons);
 await page.evaluate(()=>{const h=window.__towerTest.host;h.attackTargetId=qaEnemy.id;});
 await page.waitForFunction(()=>window.__towerTest.host.targetDebuffIcons.hasActiveIcons);
 await page.evaluate(()=>{qaEnemy.hp=0;});
 await page.waitForFunction(()=>!window.__towerTest.host.bossPanel.active&&!window.__towerTest.host.targetDebuffIcons.hasActiveIcons);
 report.cases.push({data,targetSwitchClears:true,deathClears:true});assert.deepEqual(report.errors,[]);
 }finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r))}
 console.log('Debuff icons runtime checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
