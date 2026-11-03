// Read-only smoke fixtures using the compiled Cocos renderer, never live saves.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'design/tower-roster-trim-2026-11-01/game-review');

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,body)=>{
   if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
   res.end(body);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 const report={fixture:'Compiled engine, smoke memory storage. All nine floor menu portraits and final boss lore. UI unlock fixture does not write saves.',viewports:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const page=await browser.newPage({viewport});
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>!!window.__towerTest?.host?.menu);
   const before=await page.evaluate(()=>JSON.stringify({...window.__towerTest.host.store.state,restAt:0}));
   for(let floor=1;floor<=9;floor++){
    await page.evaluate(floor=>{const h=window.__towerTest.host,m=h.menu;m.selectedTowerFloor=floor;delete m.offsets.tower;m.render({...h.store.state,clearedFloor:9},'tower');},floor);
    await page.waitForFunction(()=>{const m=window.__towerTest.host.menu;return ['boar','wolf','spider','crocodile','snake-lady','bear','rhino','yak','white-tiger'].every(f=>m.towerImages.get('tower-monsters/'+f)?.frame)});
    const data=await page.evaluate(floor=>{const h=window.__towerTest.host,walk=n=>[n,...n.children.flatMap(walk)],nodes=walk(h.root),row=nodes.find(n=>n.name==='塔层-'+floor),p=row.children.find(n=>n.name==='层主特写'),image=p.children[0],sprite=image.getComponent('cc.Sprite');return {floor,path:image.name,width:sprite.spriteFrame.rect.width,labels:nodes.map(n=>n.getComponent('cc.Label')?.string).filter(Boolean)};},floor);
    assert.equal(data.path,'tower-monsters/'+['boar','wolf','spider','crocodile','snake-lady','bear','rhino','yak','white-tiger'][floor-1]);
    assert.ok(data.width>=256);
    if(floor===7){assert.ok(data.labels.includes('震岳石关'));assert.ok(data.labels.some(s=>s.replace(/\s/g,'').includes('震岳犀王据守')));}
    if(floor===8)assert.ok(data.labels.some(s=>s.replace(/\s/g,'').includes('苍鬃牛魔王统御')));
    assert.ok(!data.labels.some(s=>s.includes('裂风隼王盘旋')||s.includes('撼岩猿王守着')));
    await page.screenshot({path:path.join(OUT,`floor-${floor}-${viewport.width}.png`)});
    report.viewports.push({viewport,...data});
   }
   assert.equal(await page.evaluate(()=>JSON.stringify({...window.__towerTest.host.store.state,restAt:0})),before);
   await page.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status='PASS';
 }finally{
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
