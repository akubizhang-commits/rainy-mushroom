const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http'),{chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),serveRoot=process.env.WARNING_SERVER_ROOT||root,out=path.join(root,'reports/area-warnings-2026-11-05');
const ordinary=[['boar_normal_r1',50,'bite'],['boar_normal_r1',200,'charge'],['spider_elite',200,'web'],['tiger_normal',50,'sweep'],['snake_normal',200,'shot'],['bear_normal',50,'slam']].map(([archetype,distance,kind])=>({id:kind,archetype,distance,ordinary:true}));
const specials=[['M06','boar_boss','capsule'],['M07','bear_boss','circle'],['M08','crocodile_boss','sector'],['M09','bear_boss','capsule'],['M10','spider_boss','circle'],['M11','spider_boss','circle'],['M12','crocodile_boss','circle'],['M13','falcon_boss','circle'],['M14','bear_boss','circle'],['M15','yak_boss','ring'],['M16','snake_boss','sector'],['M17','falcon_boss','capsule'],['M18','bat_boss','ring'],['M19','yak_boss','safe-gates'],['M20','rhino_boss','capsule'],['M21','rhino_boss','circle'],['M24','yak_boss','safe-gates']].map(([id,archetype,shape])=>({id,archetype,shape}));
(async()=>{
 const {MONSTER_SKILLS}=await import('../js/xianxia/TowerMonsterMechanics.js');
 for(const entry of specials){entry.name=MONSTER_SKILLS[entry.id].name;entry.windup=MONSTER_SKILLS[entry.id].windup;}
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(serveRoot,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(serveRoot+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={results:[],errors:[]};
 try{browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
 const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
 await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked);
 for(const example of [...ordinary,...specials]){
 const info=await page.evaluate(example=>{
  const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
  Object.assign(s,{time:10,ticks:600,floor:example.id==='web'?3:1,arenaVersion:1,effects:[],drops:[],pending:[],reserved:[],zones:[],projectiles:[],enemies:[],monsterMechanics:{version:1,sequence:0,zones:[],nextMajorAt:999}});
  Object.assign(s.player,{x:80,y:0,hp:100000,maxHp:100000});
  const e=h.run._enemy({id:'warning-owner',archetype:example.archetype,x:example.ordinary?80-example.distance:-100,y:0});e.hp=e.maxHp=100000;e.mechanic=null;s.enemies=[e];
  let warning;
  if(example.ordinary){const spec=h.run._attackSpec(e,example.distance);if(!spec||spec.kind!==example.id)throw Error('wrong spec '+example.id+': '+JSON.stringify(spec));h.run._newAttack(e,spec);warning={start:10,end:10+e.ai.attack.windup};}
  else{
   const shape=example.shape,targeted=['M10','M11','M12','M13','M14','M18','M19','M21','M24'].includes(example.id);
   const radius={M06:e.radius+8,M07:145,M08:145,M09:e.radius+8,M10:55,M11:65,M12:48,M13:55,M14:55,M15:200,M16:145,M17:32,M18:110,M19:2400,M20:e.radius+8,M21:55,M24:2400}[example.id];
   const duration=example.id==='M12'?1:example.windup;
   const z={id:'area-fixture',ownerId:e.id,skillId:example.id,name:example.name,shape,phase:'windup',x:targeted?80:-100,y:0,radius,width:radius*2,toX:180,toY:0,faceX:1,faceY:0,angle:example.id==='M15'||example.id==='M18'?Math.PI*1.5:Math.PI*1.2,innerRadius:example.id==='M18'?82:0,startedAt:10,activatesAt:10+duration,expiresAt:14+duration,damage:example.id==='M21'?0:20,safeZones:shape==='safe-gates'?[{x:80,y:0,radius:58},{x:-170,y:120,radius:58}]:[]};
   s.monsterMechanics.zones=example.id==='M17'?[{...z,y:-110,toY:-110},{...z,id:'area-fixture-2',y:110,toY:110}]:[z];
   warning={start:10,end:10+duration};
  }
  window.warningReview={...example,...warning};
  const m=h.monsterMechanics;window.areaCalls=[];
  if(!m.originalArea){m.originalArea=m.drawAreaWarning;m.drawAreaWarning=function(g,z,time,camera,tint){window.areaCalls.push({shape:z.shape,time,startedAt:z.startedAt,activatesAt:z.activatesAt,phase:z.phase});return this.originalArea(g,z,time,camera,tint);};}
  h.draw();
  const ground=m.ranges.node.parent;
  return {...warning,kind:e.ai.attack?.kind,ordinaryBelow:h.warnings.node.getSiblingIndex()<h.monsterLayer.getSiblingIndex(),specialBelow:ground.getSiblingIndex()<h.monsterLayer.getSiblingIndex(),separate:m.ranges!==m.graphics};
 },example);
 assert.ok(info.ordinaryBelow&&info.specialBelow&&info.separate,'range tints must be below actor art');
 await page.waitForFunction(()=>!window.__towerTest.host.host.assetLoading?.blocked&&!window.__towerTest.host.transitioning);
 for(const progress of [0,.5,.95]){
  const pose=await page.evaluate(progress=>{const h=window.__towerTest.host,q=window.warningReview;h.run.state.time=q.start+(q.end-q.start)*progress;window.areaCalls=[];h.draw();return window.areaCalls;},progress);
  assert.equal(pose.length,example.id==='M17'?2:1,example.id+' must paint each intended range once');assert.ok(Math.abs((pose[0].time-pose[0].startedAt)/(pose[0].activatesAt-pose[0].startedAt)-progress)<1e-6);
  await page.screenshot({path:path.join(out,`${example.id}-${viewport.width}-${progress}.png`)});
 }
 const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(30);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
 report.results.push({viewport,example,info});
 }
 await page.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';console.log('PASS:',report.results.length,'ordinary/mechanic scenarios; three fill stages, actor layering and pause');
 }catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
