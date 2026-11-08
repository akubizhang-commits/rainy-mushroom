const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/monster-emission-2026-11-05');
(async()=>{
 const {ARCHETYPES}=await import('../js/xianxia/TowerContent.js');
 const forms=['snake','snake-lady','scorpion','scorpion-humanoid','bat','bat-humanoid','falcon','falcon-humanoid'];
 const cases=forms.map(family=>({family,archetype:ARCHETYPES.find(a=>a.art_family===family).id}));
 const server=createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,b)=>{if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.wasm':'application/wasm','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(b);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;const report={results:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
   for(const c of cases)for(const face of [-1,1])for(const role of ['normal','elite','boss']){
    await page.evaluate(({c,face,role})=>{
     const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
     Object.assign(s,{time:10,ticks:600,floor:5,arenaVersion:1,effects:[],drops:[],pending:[],reserved:[],zones:[],projectiles:[],enemies:[],killLedger:[],monsterMechanics:{version:1,sequence:0,zones:[],nextMajorAt:999}});
     Object.assign(s.player,{x:120*face,y:-80,hp:100000,maxHp:100000});s.loadout.active={};s.loadout.passive={};
     const e=h.run._enemy({id:'emitter',archetype:c.archetype,x:-120*face,y:-80});
     Object.assign(e,{role,hp:100000,maxHp:100000});if(e.mechanic){e.mechanic.phase='idle';for(const k of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[k]=999;}
     s.enemies=[e];e.ai.entryUntil=e.ai.readyAt=e.ai.graceUntil=0;
     const spec=h.run._baseAttackSpec(e);if(!spec||spec.kind!=='shot')throw Error('No real ranged spec: '+c.archetype);
     h.run._newAttack(e,spec);e.ai.mode='active';e.ai.until=11;h.run._enemyActions([],s.player);
     h.camera={x:0,y:0};h.draw();window.emissionStart=JSON.parse(JSON.stringify(s.projectiles));
    },{c,face,role});
    await page.waitForFunction(()=>{
     const h=window.__towerTest.host;h.draw();
     return !h.host.assetLoading?.blocked&&h.projectileLayer.children.some(n=>/^(毒液|飞羽|音波)-/.test(n.name))
      &&[h.monsterArt,...h.monsterArt.speciesRenderers.values()].some(r=>r.actors.has('emitter'));
    },null,{timeout:90000});
    const data=await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state,rows=[];
     const renderer=[h.monsterArt,...h.monsterArt.speciesRenderers.values()].find(r=>r.actors.has('emitter'));
     const actor=renderer.actors.get('emitter'),uvs={snake:[.19,.32],'snake-lady':[.426,.258],scorpion:[.65,.255],'scorpion-humanoid':[.78,.20],bat:[.40,.65],'bat-humanoid':[.36,.30],falcon:[.48,.50],'falcon-humanoid':[.40,.39]};
     h.camera={x:37,y:-23};h.draw();
     const uv=uvs[actor.family],socket={x:actor.node.position.x+(uv[0]-actor.transform.anchorX)*actor.transform.width*actor.node.scale.x,
      y:actor.node.position.y+(1-uv[1]-actor.transform.anchorY)*actor.transform.height*actor.node.scale.y};
     for(const p of s.projectiles){
      const pose=h.monsterArt.constructor.projectilePose(p),n=h.projectileLayer.children.find(n=>n.name.endsWith('-'+p.id));
      if(!n)throw Error('Missing projectile '+p.id);
      rows.push({x:p.x,y:p.y,pose,node:{x:n.position.x,y:n.position.y,angle:n.angle},socket,camera:{...h.camera},launch:p.launch});
     }
     h.camera={x:0,y:0};h.draw();return rows;
    });
    assert.equal(data.length,role==='boss'?3:1);
    for(const p of data){
     assert.ok(p.pose.lift>5);assert.equal(p.launch.family,c.family);
     assert.ok(Math.abs(p.node.x-(p.pose.x-p.camera.x))<.001);
     assert.ok(Math.abs(p.node.y-(p.pose.y-p.camera.y))<.001);
     assert.ok(Math.abs(p.node.angle-p.pose.angle*180/Math.PI)<.001);
     assert.ok(Math.hypot(p.node.x-p.socket.x,p.node.y-p.socket.y)<.01,`${c.family} rendered socket mismatch: ${JSON.stringify(p)}`);
    }
    if(role==='boss'&&(face===1||c.family==='snake-lady')){
     await page.screenshot({path:path.join(out,`${c.family}-${face}-launch-${viewport.width}.png`)});
    }
    await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state;
     for(let i=0;i<8;i++){s.time+=1/60;h.run._projectiles([],[],{...s.player});}
     h.draw();
    });
    if(role==='boss'&&face===1)await page.screenshot({path:path.join(out,`${c.family}-flight-${viewport.width}.png`)});
    const checks=await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state,shots=s.projectiles,Art=h.monsterArt.constructor;
     const before=JSON.stringify(s);h.draw();h.draw();const paused=JSON.stringify(s)===before;
     const poses=shots.map(p=>Art.projectilePose(p));
     s.enemies[0].x+=100;s.enemies[0].hp=0;if(s.enemies[0].mechanic)s.enemies[0].mechanic.enraged=true;
     s.enemies=[];h.draw();
     const independent=shots.every((p,i)=>JSON.stringify(Art.projectilePose(p))===JSON.stringify(poses[i]));
     const restored=JSON.parse(JSON.stringify(shots)).every((p,i)=>JSON.stringify(Art.projectilePose(p))===JSON.stringify(poses[i]));
     for(const p of shots){const length=Math.hypot(p.vx,p.vy);p.x=p.launch.x+p.vx/length*300;p.y=p.launch.y+p.vy/length*300;}
     h.draw();const landed=shots.every(p=>{const q=Art.projectilePose(p);return q.x===p.x&&q.y===p.y&&q.lift===0;});
     s.projectiles=[];h.draw();const cleared=!h.projectileLayer.children.some(n=>/^(毒液|飞羽|音波)-/.test(n.name));
     return{paused,independent,restored,landed,cleared};
    });
    for(const [key,value] of Object.entries(checks))assert.ok(value,key);
    report.results.push({viewport,family:c.family,face,role,data,checks});
   }
   for(const skill of ['M10','M03']){
    await page.evaluate(skill=>{
     const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
     Object.assign(s,{time:10,ticks:600,floor:skill==='M10'?3:5,arenaVersion:1,effects:[],drops:[],pending:[],reserved:[],zones:[],projectiles:[],enemies:[],killLedger:[],monsterMechanics:{version:1,sequence:0,zones:[],nextMajorAt:0}});
     Object.assign(s.player,{x:0,y:0,hp:100000,maxHp:100000});s.loadout.active={};s.loadout.passive={};
     const e=h.run._enemy({id:'mechanic-owner',archetype:skill==='M10'?'spider_boss':'snake_boss',x:-160,y:0});
     e.maxHp=10000;e.hp=4000;e.ai.entryUntil=e.ai.readyAt=e.ai.graceUntil=0;
     for(const id of Object.keys(e.mechanic.cooldowns))e.mechanic.cooldowns[id]=999;e.mechanic.cooldowns[skill]=10;s.enemies=[e];
     h.run.resume();
     for(let i=0;i<360;i++){
      h.run.advance(1/60);
      if(skill==='M10'&&s.monsterMechanics.zones.some(z=>z.skillId===skill)||skill==='M03'&&e.mechanic.skillId===skill&&e.mechanic.phase==='active')break;
     }
     h.run.pause();
     if(skill==='M10'){
      const z=s.monsterMechanics.zones.find(z=>z.skillId===skill);
      if(!z)throw Error('M10 did not start');s.time=z.activatesAt-.35;
     }
     h.draw();
    },skill);
    await page.waitForFunction(skill=>{
     const h=window.__towerTest.host;h.draw();
     return skill==='M10'?h.monsterMechanics.webArt.webs.size>0:h.monsterMechanics.spiritFlowArt.plumes.size>0;
    },skill,{timeout:90000});
    const record=await page.evaluate(skill=>{
     const h=window.__towerTest.host,s=h.run.state,kind=skill==='M10'?'web':'spirit';
     const point=h.monsterArt.attachmentPosition('mechanic-owner',kind);
     let actual;
     if(skill==='M10'){
      const w=[...h.monsterMechanics.webArt.webs.values()][0];
      actual={x:w.node.position.x,y:w.node.position.y};
     }else{
      const p=[...h.monsterMechanics.spiritFlowArt.plumes.values()][0],a=p.node.angle*Math.PI/180;
      actual={x:p.node.position.x+Math.cos(a)*p.transform.width,y:p.node.position.y+Math.sin(a)*p.transform.width};
     }
     const before=JSON.stringify(s);h.draw();h.draw();
     return{point,actual,paused:before===JSON.stringify(s)};
    },skill);
    assert.ok(Math.hypot(record.actual.x-record.point.x,record.actual.y-record.point.y)<.01);
    assert.ok(record.paused);
    await page.screenshot({path:path.join(out,`${skill}-attachment-${viewport.width}.png`)});
    const clean=await page.evaluate(skill=>{
     const h=window.__towerTest.host,s=h.run.state;
     let landed=true;
     if(skill==='M10'){
      const z=s.monsterMechanics.zones.find(z=>z.skillId===skill);s.time=z.activatesAt;h.draw();
      const w=[...h.monsterMechanics.webArt.webs.values()][0];
      landed=Math.hypot(w.node.position.x-(z.x-h.camera.x),w.node.position.y-(z.y-h.camera.y))<.01;
     }
     s.enemies.find(e=>e.id==='mechanic-owner').hp=0;h.draw();
     return{landed,removed:skill==='M10'?h.monsterMechanics.webArt.webs.size===0:h.monsterMechanics.spiritFlowArt.plumes.size===0};
    },skill);
    assert.ok(clean.landed&&clean.removed);
    report.results.push({viewport,skill,record,clean});
   }
   await page.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=String(e);throw e;}
 finally{fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
 console.log('PASS: 96 ranged release cases plus M10/M03 attachments in two landscape sizes; model socket, flight, camera, pause, owner death, restored poses and cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
