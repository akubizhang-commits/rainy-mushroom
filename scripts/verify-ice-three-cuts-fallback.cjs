const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {installFixture}=require('./verify-sword-line.cjs');
const {installQi}=require('./verify-ice-three-cuts.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
async function main(){
 const base=path.join(ROOT,'design/xianxia-sword-qi-three-cuts-2026-11-02/integration');
 const build=JSON.parse(fs.readFileSync(path.join(base,'build-snapshot.json'))).path;
 let i=1,out;do{out=path.join(base,`fallback-${String(i++).padStart(2,'0')}`)}while(fs.existsSync(out));
 fs.mkdirSync(out);fs.copyFileSync(__filename,path.join(out,'verification-script.cjs'));
 const report={status:'RUNNING',errors:[],blocked:0,cases:[]};
 const successful=fs.readdirSync(base).filter(n=>/^runtime-\d+$/.test(n))
  .sort().reverse().find(n=>JSON.parse(fs.readFileSync(path.join(base,n,'report.json'))).status==='PASSED');
 assert.ok(successful,'Need a successful production run before testing its URLs');
 const completed=JSON.parse(fs.readFileSync(path.join(base,successful,'report.json')));
 assert.equal(completed.status,'PASSED');
 const nativePaths=new Set(completed.assets.map(a=>new URL(a.nativeUrl).pathname));
 const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'};
 const server=createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(nativePaths.has(name)){report.blocked++;return res.writeHead(404).end('intentional texture failure')}
  const file=path.resolve(build,'.'+decodeURIComponent(name));
  if(!file.startsWith(build+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,bytes)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes)});
 });
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  const context=await browser.newContext({viewport:{width:844,height:390}}),page=await context.newPage();
  await installFixture(page,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
  await page.evaluate(()=>window.__prepareLine({rank:7,angle:0,reach:640}));await installQi(page);
  await page.waitForTimeout(1000);
  for(const rank of [7,1]){
   await page.evaluate(rank=>window.__prepareQi({skill:'sj_arc',rank,angle:0,origin:{x:-250,y:-60},distance:rank===1?90:420}),rank);
   const result=await page.evaluate(()=>{
    const q=window.__qiQA;q.captureFallback=true;
    for(let i=0;i<37;i++)window.__stepQi();
    return {view:q.read(),records:q.fallbackRecords};
   });
   await page.screenshot({path:path.join(out,`rank-${rank}.png`)});
   const end=await page.evaluate(()=>{for(let i=0;i<150;i++)window.__stepQi();const q=window.__qiQA;return {view:q.read(),hits:q.hits,shots:[...q.shots.values()]}});
   assert.equal(result.view.actors.length,0);assert.equal(result.view.nearActors.length,0);
   if(rank===7){
    assert.deepEqual([...new Set(result.records.map(r=>r.item.pulseIndex))].sort(),[1,2,3]);
    const {swordQiSegments,swordQiVisualLift}=await import('../js/xianxia/TowerSwordQi.js');
    for(const record of result.records){
     const {item,time,camera,commands}=record,segments=swordQiSegments('crescent',item.width,item.pulseIndex);
     assert.equal(commands.length,segments.length*4);
     const point=segments[0].a;
     assert.ok(Math.abs(commands[0][1]-(item.x-camera.x+point.x))<1e-6);
     assert.ok(Math.abs(commands[0][2]-(item.y-camera.y+swordQiVisualLift(item)+point.y))<1e-6);
    }
    assert.equal(end.hits.filter(h=>h.id==='qi-main').length,3);
   }else assert.ok(end.hits.length>=1);
   report.cases.push({rank,fallbackRecords:result.records.length,hits:end.hits.length,passed:true});
  }
  assert.ok(report.blocked>=3);assert.deepEqual(report.errors,[]);report.status='PASSED';
 }catch(error){report.status='FAILED';report.failure=error.stack;throw error}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));console.log(out)}
}
main().catch(error=>{console.error(error);process.exitCode=1});
