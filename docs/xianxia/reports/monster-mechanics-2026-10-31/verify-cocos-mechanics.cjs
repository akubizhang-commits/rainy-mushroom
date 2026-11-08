// Reproducible synthetic paused fixtures rendered by the actual compiled Cocos host.
// This verifies presentation, pooling and errors; it is not balance or device performance evidence.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createServer}=require('node:http');
const ROOT=path.resolve(__dirname,'../../../..'),OUT=__dirname;
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
async function main(){
 const server=createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(bytes);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const report={status:'RUNNING',startedAt:new Date().toISOString(),fixture:'Synthetic paused training; actual compiled Cocos renderer; no performance or balance claims',results:[],errors:[]};let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.UI_CHROMIUM_EXECUTABLE||'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport});const page=await context.newPage();
   page.on('pageerror',e=>report.errors.push({viewport,kind:'pageerror',message:e.message}));page.on('console',e=>{if(e.type()==='error')report.errors.push({viewport,kind:'console',message:e.text()});});
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>!!window.__towerTest?.host?.menu);
   await page.evaluate(()=>{const h=window.__towerTest.host;h.enterTraining();h.run.pause();window.__mechanicsQA={campaign:JSON.stringify(h.store.state),writes:[]};const original=h.platform.storage.setItem;h.platform.storage.setItem=function(...args){window.__mechanicsQA.writes.push(args[0]);return original.apply(this,args);};});
   for(const scene of ['geometry','safe-gates','entities']){
    await page.evaluate(scene=>{
     const h=window.__towerTest.host,s=h.run.state,p=s.player;s.time=10;s.arenaVersion=1;s.reserved=[];s.pending=[];s.drops=[];s.effects=[];s.zones=[];s.projectiles=[];s.enemies=[];
     const zone=(id,shape,x,y,radius,extra={})=>({id,ownerId:'qa-boss',skillId:'M07',name:'裂地重踏',shape,x:p.x+x,y:p.y+y,radius,width:68,toX:p.x+x,toY:p.y+y,faceX:1,faceY:0,angle:Math.PI,innerRadius:0,safeZones:[],phase:'windup',startedAt:8,activatesAt:11.5,expiresAt:14,...extra});
     const enemy=(id,archetype,x,y,extra={})=>({...h.run._enemy({id,archetype,x:p.x+x,y:p.y+y}),...extra});
     s.monsterMechanics={version:1,sequence:100,zones:[],nextMajorAt:0};
     if(scene==='geometry'){
      s.monsterMechanics.zones=[zone('circle','circle',-350,40,95),zone('sector','sector',30,30,150,{name:'回旋尾扫',angle:Math.PI*1.2,faceX:0,faceY:-1}),zone('capsule','capsule',-330,-160,34,{name:'裂岩冲锋',toX:p.x+160,toY:p.y-160}),zone('ring','ring',355,10,110,{name:'环形震波',angle:Math.PI*1.5,innerRadius:72})];
      // An opaque friendly field underneath proves the dedicated warning layer order.
      s.zones=[{id:'friendly-cover',kind:'qa-friendly-field',x:p.x,y:p.y,radius:500,shape:'circle',hostile:false}];
     }else if(scene==='safe-gates'){
      s.monsterMechanics.zones=[zone('gates','safe-gates',0,0,2400,{name:'六门避劫',safeZones:[{x:p.x-190,y:p.y-35,radius:80},{x:p.x+190,y:p.y-35,radius:80}]})];
     }else{
      const normal=enemy('qa-normal','boar_boss',-320,20),rage=enemy('qa-boss','boar_boss',-100,20);
      normal.name='常态对照';rage.name='血怒首领';rage.mechanic.enraged=true;rage.mechanic.label='血怒';s.enemies=[rage,normal];
      const clone=enemy('qa-clone','boar_normal',150,20,{temporary:{kind:'clone',ownerId:rage.id}});delete clone.mechanic;s.enemies.push(clone);
      const kinds=['core','crystal','pillar','egg','lock','minion','hatchling'];
      for(let i=0;i<kinds.length;i++){const kind=kinds[i],e=enemy(`qa-${kind}`,'wolf_normal',-390+i*125,-145,{temporary:{kind,ownerId:rage.id}});delete e.mechanic;e.hp=e.maxHp*.65;s.enemies.push(e);}
      normal.mechanic={...normal.mechanic,phase:'active',label:'岩甲减伤80%',startedAt:8,activatesAt:8,until:14};
      const target=s.enemies.find(e=>e.temporary?.kind==='core');target.mechanic=undefined;
     }
     h.draw();window.__mechanicsQA.snapshot=JSON.stringify(s);
    },scene);
    await page.waitForFunction(()=>Array.from(window.__towerTest.host.monsterArt.entries.values()).every(e=>e.done));
    await page.evaluate(()=>window.__towerTest.host.draw());
    await page.waitForTimeout(200);
    const result=await page.evaluate(()=>{
     const h=window.__towerTest.host,q=window.__mechanicsQA,v=h.monsterMechanics,nodes=[...v.graphics.node.children];h.draw();
     return{logical:{width:h.width,height:h.height},labels:v.labels.filter(l=>l.node.active).map(l=>({text:l.string,x:l.node.position.x,y:l.node.position.y})),layerNames:h.battle.children.map(n=>n.name),nodesStable:nodes.every((n,i)=>n===v.graphics.node.children[i]),snapshotUnchanged:q.snapshot===JSON.stringify(h.run.state),campaignUnchanged:q.campaign===JSON.stringify(h.store.state),writes:q.writes,actors:Array.from(h.monsterArt.actors.entries()).map(([id,a])=>({id,color:a.sprite.color.toHEX('#rrggbbaa'),alpha:a.sprite.color.a,scaleX:a.node.scale.x,scaleY:a.node.scale.y}))};
    });
    assert.ok(result.nodesStable&&result.snapshotUnchanged&&result.campaignUnchanged);assert.deepEqual(result.writes,[]);
    const at=name=>result.layerNames.indexOf(name);for(const name of ['剑气斩特效层','一线天特效层','天地一剑特效层','剑阵落剑层','月牙与十字剑气层','战斗前景'])assert.ok(at('怪物机制预警与标识')>at(name));
    if(scene!=='entities')for(const label of result.labels.filter(l=>l.text.includes('秒')))assert.ok(label.y<=result.logical.height/2-238+.01,'warning caption must clear HUD');
    if(scene==='safe-gates')assert.equal(result.labels.filter(l=>l.text.includes('安全门区')).length,2);
    if(scene==='entities'){assert.equal(result.actors.find(a=>a.id==='qa-clone').alpha,150);assert.equal(result.actors.find(a=>a.id==='qa-boss').scaleY,1.2);assert.ok(result.labels.some(l=>l.text.includes('护甲结晶')));}
    const screenshot=`${scene}-${viewport.width}x${viewport.height}.png`;await page.screenshot({path:path.join(OUT,screenshot)});report.results.push({viewport,scene,screenshot,...result});
   }
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(error){report.status='FAIL';report.error=error.stack;process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(OUT,'cocos-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(report.status,report.results.length,OUT);if(report.error)console.error(report.error);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
