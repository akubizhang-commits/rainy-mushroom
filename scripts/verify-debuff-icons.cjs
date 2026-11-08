const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/debuff-icons-v2-2026-11-05');
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
  const h=window.__towerTest.host,s=h.run.state;h.run.pause();
  const e=s.enemies.find(e=>e.hp>0);s.enemies=[e];e.x=s.player.x+180;e.y=s.player.y;
  e.weaponBleed={remaining:100,physical:100,stacks:2,nextAt:s.time+.5,endsAt:s.time+1.5};
  e.scarDebuff={endsAt:s.time+2.25,vulnerability:.2};
  s.loadout.passive.sj_spirit=1;s.player.mana=1;window.qaEnemy=e;
 });
 await page.waitForFunction(()=>{const p=window.__towerTest.host.debuffIcons.pool;return p.length>=2&&p.every(x=>!!x.art.sprite.spriteFrame)&&window.__towerTest.host.battleHud.surgeLabel.node.parent.children[0].getComponent('cc.Sprite').spriteFrame});
 const data=await page.evaluate(()=>window.__towerTest.host.debuffIcons.pool.filter(p=>p.node.active).map(p=>({name:p.node.name,text:p.label.string,size:p.node.getComponent('cc.UITransform').width,x:p.node.position.x,y:p.node.position.y})));
 assert.deepEqual(data.map(x=>x.text),['2','1']);assert.ok(data.every(x=>x.size===24));assert.equal(data[0].y,data[1].y);assert.equal(data[1].x-data[0].x,28);
 const state=await page.evaluate(()=>{
  const h=window.__towerTest.host,p=h.debuffIcons.pool,chip=h.battleHud.surgeLabel.node.parent,bar=h.battleHud.manaBar.node;
  return {left:p[0].node.position.x-12,anchor:h.monsterMechanics.debuffAnchors.get(qaEnemy.id).x,progress:p.map(x=>x.art.shade.fillRange),surge:chip.activeInHierarchy,surgeLeft:chip.position.x-12,barLeft:bar.position.x-bar.getComponent('cc.UITransform').width/2,below:chip.position.y<bar.position.y};
 });
 assert.equal(state.left,state.anchor);assert.deepEqual(state.progress,[-.5,-.25]);assert.equal(state.surge,true);assert.equal(state.surgeLeft,state.barLeft);assert.equal(state.below,true);
 await page.screenshot({path:path.join(out,'battle.png')});
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(300);await page.evaluate(()=>{const h=window.__towerTest.host;if(h.overlay)h.overlay.active=false;});await page.screenshot({path:path.join(out,'battle-844.png')});
 await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.player.mana=h.run.state.player.maxMana;});
 await page.waitForFunction(()=>!window.__towerTest.host.battleHud.surgeLabel.node.parent.active);
 report.cases.push({alignment:state,surgeEnds:true});
 await page.evaluate(()=>{const h=window.__towerTest.host;qaEnemy.hp=0;h.debuffIcons.draw(h.foreground.node,h.run.state,h.monsterMechanics.debuffAnchors)});
 assert.equal(await page.evaluate(()=>window.__towerTest.host.debuffIcons.pool.filter(p=>p.node.active).length),0);
 report.cases.push({data,deathCleared:true});assert.deepEqual(report.errors,[]);
 }finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r))}
 console.log('Debuff icons runtime checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
