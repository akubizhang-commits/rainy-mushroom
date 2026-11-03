// Verify compiled Cocos material art using an isolated in-memory save.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/material-art');
const keys=['huichuncao','bailuhua','huangjing','lingshenxu','ningluzhi','linglu','yusuizhi','zilinghua','jinsuiguo'];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={cases:[],errors:[]};
 try{browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning);
 await page.evaluate(async keys=>{const h=window.__towerTest.host;h.campElapsed=-100000;window.walk=n=>[n,...n.children.flatMap(window.walk)];
 const {checksum}=await import('/js/xianxia/Checksum.js');let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>raw=v},Store=h.store.constructor,s=new Store(disk,0);s.act({type:'sync'},0);const env=JSON.parse(raw),state={...s.state,pills:{...s.state.pills,...Object.fromEntries(keys.map(k=>[k,5]))}};const data=JSON.stringify(state);raw=JSON.stringify({...env,data,checksum:checksum(data)});h.store=new Store(disk,0);if(h.store.readOnly)throw Error(h.store.error);window.before=JSON.stringify(h.store.state);h.goto('hall');h.menu.showInventory(h.store.state);h.menu.backpack.filters={category:'material',sort:'name'};h.menu.showInventory(h.store.state);
 },keys);
 for(const key of keys){
 await page.evaluate(key=>{const h=window.__towerTest.host;h.menu.backpack.selected=key;h.menu.showInventory(h.store.state);},key);
 await page.waitForFunction(key=>walk(window.__towerTest.host.root).some(n=>n.activeInHierarchy&&n.name.startsWith('灵石素材-pill_'+key+'-')&&n.getComponent('cc.Sprite')?.spriteFrame),key);
 report.cases.push({viewport,key,inventory:true});
 }
 await page.screenshot({path:path.join(out,`inventory-${viewport.width}.png`)});
 await page.evaluate(()=>{const h=window.__towerTest.host;h.menu.dismissInventory();h.goto('library');});
 for(const key of keys){
 await page.evaluate(key=>window.__towerTest.host.menu.libraryPanel.showEntry('pill_'+key),key);
 await page.waitForFunction(key=>walk(window.__towerTest.host.root).some(n=>n.activeInHierarchy&&n.name==='tower-library-items/pill_'+key&&n.getComponent('cc.Sprite')?.spriteFrame),key);
 await page.screenshot({path:path.join(out,`${key}-${viewport.width}.png`)});
 report.cases.push({viewport,key,library:true});
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.store.state)===window.before),true);
 await context.close();
 }
 assert.deepEqual(report.errors,[]);console.log('Verified 9 material inventory icons and HD library portraits at both landscape sizes.');
 }finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
