// Real compiled UI with isolated browser storage and an in-memory campaign.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/equipment-wear-realm-2026-11-04');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b)});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning);
   await page.evaluate(async()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    const {createFixedWeapon}=await import('/js/xianxia/TowerWeapons.js'),{checksum}=await import('/js/xianxia/Checksum.js');
    let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>{raw=v}},Store=h.store.constructor,fresh=new Store(disk,0);fresh.act({type:'sync'},0);
    const envelope=JSON.parse(raw),state=JSON.parse(envelope.data);state.xp=0;state.weaponSequence=1;
    state.weapons['weapon-1']=createFixedWeapon('eq_sword_caiyun','weapon-1');state.weaponCounters['weapon-1']=0;
    const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)});h.store=new Store(disk,0);
    if(h.store.readOnly)throw Error(h.store.error);h.goto('hall');h.menu.render(h.store.state,'hall','');h.menu.showInventory(h.store.state);h.menu.backpack.select('weapon-1');h.menu.showInventory(h.store.state);
   });
   await page.waitForFunction(()=>{let r=window.__towerTest.host.root;while(r.parent)r=r.parent;return !window.qaWalk(r).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy)});
   const result=await page.evaluate(()=>{
    const h=window.__towerTest.host,card=window.qaWalk(h.root).find(n=>n.name==='背包详情区'&&n.activeInHierarchy);
    const labels=window.qaWalk(card).flatMap(n=>{const l=n.getComponent('cc.Label');return l?[l.string]:[]});
    const button=window.qaWalk(h.root).find(n=>n.name==='穿戴'&&n.activeInHierarchy);
    return {labels,enabled:button?.getComponent('cc.Button')?.interactable};
   });
   assert.ok(result.labels.includes('穿戴要求：炼气'));assert.equal(result.enabled,true);
   await page.screenshot({path:path.join(out,`caiyun-${viewport.width}.png`)});
   const equip=await page.evaluate(()=>{const h=window.__towerTest.host;return h.store.act({type:'setLoadout',index:0,loadout:{...h.store.state.loadouts[0],weaponId:'weapon-1'}},0)});
   assert.ok(equip.ok,JSON.stringify(equip));report.cases.push({viewport,...result,equip});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }finally{fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));}
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
