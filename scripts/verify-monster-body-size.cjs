const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/monster-body-size-2026-11-05');
(async()=>{
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={results:[],errors:[]};
 try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
  const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
  await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
  for(const family of ['boar','snake','bear','tiger','wolf','bat','falcon','spider','crocodile']){
   await page.evaluate(family=>{
    const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
    Object.assign(s,{time:10,ticks:600,floor:1,arenaVersion:1,effects:[],drops:[],pending:[],reserved:[],zones:[],projectiles:[],enemies:[],killLedger:[],monsterMechanics:{version:1,sequence:0,zones:[],nextMajorAt:999}});
    Object.assign(s.player,{x:0,y:0,hp:100000,maxHp:100000});s.loadout.active={};s.loadout.passive={};
    const base={boar:'boar_normal_r1',snake:'snake_normal_r2',bear:'bear_normal_r3',tiger:'tiger_normal_r3',wolf:'wolf_normal_r1',bat:'bat_normal',falcon:'falcon_normal',spider:'spider_normal',crocodile:'crocodile_normal'}[family];
    // Controlled ranks/roles exercise future roster entries as well as existing ones.
    for(const [i,rank,role] of [[0,1,'normal'],[1,4,'normal'],[2,7,'normal'],[3,7,'elite'],[4,3,'boss']]){
     const e=h.run._enemy({id:`size-${i}`,archetype:base,x:(i-2)*190,y:-120});
     Object.assign(e,{rank,role,hp:100000,maxHp:100000});e.ai={mode:'approach',until:0};s.enemies.push(e);
    }
    h.camera={x:0,y:0};h.draw();window.bodyFamily=family;
   },family);
   await page.waitForFunction(()=>{const h=window.__towerTest.host;h.draw();return !h.host.assetLoading?.blocked&&h.monsterLayer.children.filter(n=>n.name.startsWith('妖兽素材-size-')).length===5;},null,{timeout:90000});
   const data=await page.evaluate(()=>{
    const h=window.__towerTest.host;h.draw();const records=[];
    for(const e of h.run.state.enemies){
     const n=h.monsterLayer.children.find(n=>n.name===`妖兽素材-${e.id}`),r=[h.monsterArt,...h.monsterArt.speciesRenderers.values()].find(r=>r.actors.has(e.id)),a=r.actors.get(e.id),f=a.sprite.spriteFrame;
     records.push({rank:e.rank,role:e.role,width:a.transform.width,anchor:a.transform.anchorY,y:n.position.y,ground:e.y-h.camera.y,frame:[f.rect.width,f.rect.height],scale:n.scale.y,top:h.monsterArt.top(e.id)});
    }
    return records;
   });
   for(const [i,m] of [[1,1.2],[2,1.4],[3,2.2]])assert.ok(Math.abs(data[i].width/data[0].width-m)<1e-7,`${family} ratio ${i}`);
   assert.ok(data[4].width>=data[3].width*1.3-1e-7,`${family} boss`);
   const before=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state));await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.run.state)),before);
   await page.screenshot({path:path.join(out,`${family}-ranks-${viewport.width}.png`)});
   report.results.push({viewport,family,data,paused:true});
  }
  // Authored form changes are checked separately, using actual roster ids.
  for(const ids of [['boar_normal_r1','boar_normal_r4','boar_elite','boar_boss'],['snake_normal_r2','snake_normal_r4','snake_elite_f5_w5_n1','snake_boss'],['bear_normal_r3','bear_normal_r4','bear_elite','bear_boss'],['tiger_normal_r3','tiger_normal_r6','tiger_elite','tiger_boss_zhenyan']]){
   await page.evaluate(ids=>{const h=window.__towerTest.host,s=h.run.state;s.enemies=ids.map((archetype,i)=>h.run._enemy({id:`forms-${i}`,archetype,x:(i-1.5)*230,y:-120}));h.draw();},ids);
   await page.waitForFunction(()=>{const h=window.__towerTest.host;h.draw();return !h.host.assetLoading?.blocked&&h.monsterLayer.children.filter(n=>n.name.startsWith('妖兽素材-forms-')).length===4;});
   await page.screenshot({path:path.join(out,`${ids[0].split('_')[0]}-forms-${viewport.width}.png`)});
  }
  await page.evaluate(()=>{const h=window.__towerTest.host,s=h.run.state;s.enemies=[h.run._enemy({id:'rage-boss',archetype:'boar_boss',x:100,y:0})];const e=s.enemies[0];e.ai={mode:'approach',until:0};e.mechanic={...e.mechanic,skillId:'M02',phase:'windup',startedAt:10,until:11,enraged:false};h.draw();});
  await page.waitForFunction(()=>{const h=window.__towerTest.host;h.draw();return !!h.monsterArt.motionAtlas&&!h.host.assetLoading?.blocked;});
  for(const stage of ['windup','active','expired','death']){
   const data=await page.evaluate(stage=>{
    const h=window.__towerTest.host,s=h.run.state,e=s.enemies[0];
    if(stage==='active'){Object.assign(e.mechanic,{phase:'idle',enraged:true,enrageUntil:26});s.time=11;}
    if(stage==='expired'){Object.assign(e.mechanic,{enraged:false});s.time=26;}
    if(stage==='death'){Object.assign(e.mechanic,{skillId:'M06',phase:'active',enraged:true,until:28,chargeX:300});h.draw();s.enemies=[];s.killLedger=[{id:e.id}];s.time=27;}
    h.draw();const a=h.monsterArt.actors.get('rage-boss');return {stage,width:a.transform.width,scale:a.node.scale.y,anchor:a.transform.anchorY,expected:1-h.monsterArt.motionAtlas.anchor[1],y:a.node.position.y,ground:-h.camera.y,texture:a.sprite.spriteFrame.texture===h.monsterArt.motionTexture};
   },stage);
   assert.ok(Math.abs(data.width-237.952)<1e-7);assert.equal(data.scale,stage==='active'?1.2:1);assert.equal(data.y,data.ground);
   if(stage==='death'){assert.equal(data.anchor,data.expected);assert.ok(data.texture);}
   await page.screenshot({path:path.join(out,`boar-${stage}-${viewport.width}.png`)});report.results.push({viewport,...data});
  }
  await page.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';console.log('PASS: nine species, three ranks, elite/boss, pause and authored form changes at both landscape sizes');
 }catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
