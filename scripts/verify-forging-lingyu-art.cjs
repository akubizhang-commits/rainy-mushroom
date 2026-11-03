// Real built Cocos UI, isolated in-memory fixtures; never reads a player's save.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const buildRoot=process.env.FORGING_BUILD_ROOT||'/cocos-pilot/build/web-mobile';
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/forging-lingyu-art/ui');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser,page;const report={method:'Actual compiled Cocos material sprite and resource loading, independent memory save. Seeded resources, not natural progression.',cases:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport});page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}${buildRoot}/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning);
   await page.evaluate(async()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    window.qaFind=name=>window.qaWalk(h.root).find(n=>n.name===name&&n.activeInHierarchy&&n.getComponent('cc.Button'))
      ||window.qaWalk(h.root).find(n=>n.name===name&&n.activeInHierarchy);
    window.qaText=()=>window.qaWalk(h.root).filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.Label')?.string||'').join('\n');
    const {checksum}=await import('/js/xianxia/Checksum.js');
    window.qaSeed=(patch={})=>{
     let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>{raw=v}},Store=h.store.constructor,s=new Store(disk,0);s.act({type:'sync'},0);
     const env=JSON.parse(raw),state={...s.state,...patch,pills:{...s.state.pills,...patch.pills}};
     const data=JSON.stringify(state);raw=JSON.stringify({...env,data,checksum:checksum(data)});
     h.menu.dismissInventory();h.store=new Store(disk,0);if(h.store.readOnly)throw Error(h.store.error);
     h.goto('forge');h.menu.gearOpen=true;h.menu.forgeDialog='closed';h.menu.gearMode='craft';h.menu.gearCategory='weapon';h.menu.gearQuality=1;h.menu.gearSelection='eq_sword_caiyun:q1';h.menu.gearCount=1;h.menu.gearLastSubmit=0;h.menu.gearRequest=null;h.menu.gearAvailable=false;h.menu.gearNotice='';h.menu.render(h.store.state,'forge','');
    };
    window.qaSeed({pills:{forge_xuantie:100,forge_lingmu:100,forge_yaopi:100,forge_lingsi:100,forge_lingyu:100}});
   });
   await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.showInventory(h.store.state);h.menu.backpack.select('forge_lingyu');h.menu.showInventory(h.store.state);});
   await page.waitForFunction(()=>{
    const nodes=window.qaWalk(window.__towerTest.host.root);
    return ['xuantie','lingmu','yaopi','lingsi','lingyu'].every(id=>nodes.some(n=>n.activeInHierarchy&&n.name.includes('pill_forge_'+id)&&n.getComponent('cc.Sprite')?.spriteFrame));
   });
   await page.screenshot({path:path.join(out,`materials-${viewport.width}.png`)});
   await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.backpack.select('');h.menu.backpack.filters={category:'material',materialType:'forge',sort:'recent'};h.menu.showInventory(h.store.state);});
   await page.waitForTimeout(250);
   await page.screenshot({path:path.join(out,`bag-${viewport.width}.png`)});
   const assets=await page.evaluate(async()=>{
    const load=p=>new Promise((resolve,reject)=>cc.resources.load(p,cc.ImageAsset,(e,a)=>e?reject(e):resolve({path:p,width:a.width,height:a.height})));
    return Promise.all(['xuantie','lingmu','yaopi','lingsi','lingyu'].map(id=>load('tower-library-items/pill_forge_'+id)));
   });
   assert.ok(assets.every(a=>a.width===512&&a.height===512));
   report.cases.push({viewport,fiveMaterialSprites:true,libraryPortraits:assets});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e;}
 finally{fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
