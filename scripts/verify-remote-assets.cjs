// Floor-entry check for remote loading of the resources bundle, the browser equivalent of the WeChat build's
// settings.assets.server/remoteBundles. Copies the web-mobile build (the source build is never modified), moves its
// resources bundle to a second origin as remote/resources, boots, enters floor 1 and waits for every monster motion atlas.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),build=path.join(root,'cocos-pilot/build/web-mobile');
const TYPES={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm','.css':'text/css','.mp3':'audio/mpeg','.bin':'application/octet-stream'};
function serve(dir,log,cors){
 const server=createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.resolve(dir,'.'+pathname);log.push(pathname);
  if(cors)res.setHeader('Access-Control-Allow-Origin','*');
  if(!file.startsWith(dir+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,b)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',TYPES[path.extname(file)]||'application/octet-stream');res.end(b);});
 });
 return new Promise(r=>server.listen(0,'127.0.0.1',()=>r(server)));
}
// Creator stores 22-character compressed UUIDs in bundle configs (engine decode-uuid.ts).
const KEYS='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',HEX='0123456789abcdef';
function decodeUuid(b){
 if(b.length!==22)return b;let h=b[0]+b[1];
 for(let i=2;i<22;i+=2){const l=KEYS.indexOf(b[i]),r=KEYS.indexOf(b[i+1]);h+=HEX[l>>2]+HEX[((l&3)<<2)|(r>>4)]+HEX[r&15];}
 return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rainy-remote-verify-')),game=path.join(tmp,'game'),remote=path.join(tmp,'cdn');
 const gameLog=[],remoteLog=[],errors=[];let browser,gameServer,remoteServer;const summary={};
 try{
  fs.cpSync(build,game,{recursive:true});fs.mkdirSync(path.join(remote,'remote'),{recursive:true});
  fs.renameSync(path.join(game,'assets/resources'),path.join(remote,'remote/resources'));
  remoteServer=await serve(remote,remoteLog,true);gameServer=await serve(game,gameLog,false);
  const server=`http://127.0.0.1:${remoteServer.address().port}/`;
  const settingsFiles=fs.readdirSync(path.join(game,'src')).filter(n=>/^settings(\.[0-9a-zA-Z]+)?\.json$/.test(n));assert.equal(settingsFiles.length,1,'one settings file');
  const settingsPath=path.join(game,'src',settingsFiles[0]),settings=JSON.parse(fs.readFileSync(settingsPath,'utf8'));
  Object.assign(settings.assets,{server,remoteBundles:['resources']});fs.writeFileSync(settingsPath,JSON.stringify(settings));
  const configName=fs.readdirSync(path.join(remote,'remote/resources')).find(n=>/^config(\.[0-9a-zA-Z]+)?\.json$/.test(n));
  const config=JSON.parse(fs.readFileSync(path.join(remote,'remote/resources',configName),'utf8'));
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${gameServer.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`);
  await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
  await page.evaluate(()=>window.__towerTest.host.enterFloor(1,true));
  await page.waitForFunction(()=>{const h=window.__towerTest.host,r=[...(h.monsterArt?.speciesRenderers?.values()||[])];
   return !h.host.assetLoading?.blocked&&r.length>0&&r.every(x=>x.motionFrames?.size>0);},null,{timeout:60000});
  const art=await page.evaluate(()=>[...window.__towerTest.host.monsterArt.speciesRenderers].map(([family,r])=>({family,frames:r.motionFrames.size})));
  // Map requested import/native file names (uuid before the first '.', minus any @sub) back to resource paths.
  const requested=new Set(),paths=new Set();
  for(const p of remoteLog){const m=/^\/remote\/resources\/(?:import|native)\/[^/]+\/([^/.@]+)/.exec(p);if(m)requested.add(m[1]);}
  // Keys are indexes into uuids in release configs and the UUID itself in debug configs.
  for(const [key,entry] of Object.entries(config.paths||{})){const u=String(/^\d+$/.test(key)?config.uuids[key]:key);if(requested.has(decodeUuid(u.split('@')[0])))paths.add(entry[0]);}
  const motionPaths=[...paths].filter(p=>p.startsWith('tower-monsters-motion/'));
  Object.assign(summary,{server,config:configName,remoteRequests:remoteLog.length,gameResourcesRequests:gameLog.filter(p=>p.startsWith('/assets/resources/')).length,
   motionPaths:motionPaths.length,motionSample:motionPaths.slice(0,5),renderers:art,errors});
  assert.deepEqual(errors,[]);assert.equal(summary.gameResourcesRequests,0,'no resources requests to the game origin');
  assert.ok(remoteLog.includes('/remote/resources/'+configName),'remote config requested');
  assert.ok(art.length>0&&art.every(r=>r.frames>0),'every monster motion renderer has frames');
  assert.ok(motionPaths.length>0,'tower-monsters-motion assets requested from the remote origin');
  summary.status='PASS';console.log(JSON.stringify(summary,null,2));
 }catch(e){summary.status='FAIL';summary.error=String(e);summary.errors=errors;summary.remoteRequests=remoteLog.length;console.error(JSON.stringify(summary,null,2));process.exitCode=1;}
 finally{await browser?.close();for(const s of [gameServer,remoteServer])if(s)await new Promise(r=>s.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
})();
