const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/zhuji-pill-2026-10-31');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b)})
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;const report={cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning);
   await page.evaluate(async()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    window.qaFind=name=>window.qaWalk(h.root).find(n=>n.name===name&&n.activeInHierarchy);
    window.qaText=()=>window.qaWalk(h.root).filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.Label')?.string||'').join('\n');
    const {checksum}=await import('/js/xianxia/Checksum.js');
    window.qaSeed=(rng)=>{
     let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>{raw=v}};
     const Store=h.store.constructor,s=new Store(disk,0);s.act({type:'sync'},0);
     const envelope=JSON.parse(raw),state={...s.state,xp:1800,breakthroughRng:rng};
     const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)});
     h.store=new Store(disk,0);if(h.store.readOnly)throw Error(h.store.error);
     h.goto('pills');h.menu.apothecaryOpen=true;h.menu.render(h.store.state,'pills','');
    };
    window.qaSeed(10000);
   });
   const click=async name=>{
    const point=await page.evaluate(name=>{
     const n=window.qaFind(name);if(!n)throw Error('Missing '+name);
     const camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);
     const v=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
     return {x:r.x+v.x/canvas.width*r.width,y:r.y+(1-v.y/canvas.height)*r.height};
    },name);await page.mouse.click(point.x,point.y);
   };
   await page.waitForFunction(()=>!!window.qaFind('灵石素材-pill_zhuji-apothecary-zhuji')?.getComponent('cc.Sprite')?.spriteFrame);
   assert.match(await page.evaluate(()=>window.qaText()),/筑基丹/);
   await page.screenshot({path:path.join(out,`shop-${viewport.width}.png`)});
   await click('丹药商品-zhuji');
   assert.match(await page.evaluate(()=>window.qaText()),/筑基成功率30%/);
   await page.screenshot({path:path.join(out,`buy-${viewport.width}.png`)});
   await click('购买');
   assert.deepEqual(await page.evaluate(()=>({stock:window.__towerTest.host.store.state.pills.zhuji,money:window.__towerTest.host.store.state.contribution})),{stock:1,money:240});
   await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.apothecarySelection='';h.menu.apothecaryOpen=false;h.goto('hall');h.menu.showInventory(h.store.state);h.menu.backpack.select('zhuji');h.menu.showInventory(h.store.state)});
   assert.match(await page.evaluate(()=>window.qaText()),/30%/);
   await page.screenshot({path:path.join(out,`inventory-${viewport.width}.png`)});
   await click('使用');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.xp),1800);
   assert.match(await page.evaluate(()=>window.__towerTest.host.notice),/筑基失败/);
   assert.match(await page.evaluate(()=>window.qaText()),/筑基失败/);
   await page.screenshot({path:path.join(out,`failure-${viewport.width}.png`)});
   await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.dismissInventory();window.qaSeed(1);h.action({type:'buyPill',id:'zhuji',count:2});h.menu.apothecarySelection='';h.menu.apothecaryOpen=false;h.goto('hall');h.menu.showInventory(h.store.state);h.menu.backpack.select('zhuji');h.menu.showInventory(h.store.state)});
   await click('使用');
   assert.equal(await page.evaluate(()=>window.__towerTest.host.store.state.xp),1801);
   assert.match(await page.evaluate(()=>window.__towerTest.host.notice),/突破筑基/);
   await page.screenshot({path:path.join(out,`success-${viewport.width}.png`)});
   report.cases.push({viewport,shop:true,purchase:true,inventory:true,failureKeepsXp:true,success:true});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;throw e}
 finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
