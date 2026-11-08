const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/damage-numbers-2026-11-05');
const buildPath=process.env.DAMAGE_BUILD_PATH||'/cocos-pilot/build/web-mobile';
(async()=>{
 const {ARCHETYPES}=await import('../js/xianxia/TowerContent.js');
 const cases=[...new Map(ARCHETYPES.filter(a=>a.art_family).map(a=>[a.art_family,{family:a.art_family,archetype:a.id}])).values()];
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
   await page.goto(`http://127.0.0.1:${server.address().port}${buildPath}/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.host.assetLoading?.blocked,null,{timeout:90000});
   for(const c of cases)for(const mode of ['normal','elite','boss','rage']){
    await page.evaluate(({c,mode})=>{
     const h=window.__towerTest.host;h.enterTraining();h.run.pause();const s=h.run.state;
     Object.assign(s,{time:10,ticks:600,floor:5,arenaVersion:1,effects:[],drops:[],pending:[],reserved:[],zones:[],projectiles:[],enemies:[],killLedger:[],monsterMechanics:{version:1,sequence:0,zones:[],nextMajorAt:999}});
     Object.assign(s.player,{x:-230,y:-130,hp:100000,maxHp:100000});s.loadout.active={};s.loadout.passive={};
     const e=h.run._enemy({id:'damage-target',archetype:c.archetype,x:0,y:-130});
     Object.assign(e,{role:mode==='rage'?'boss':mode,hp:100000,maxHp:100000});
     if(e.mechanic){e.mechanic.phase='idle';e.mechanic.enraged=mode==='rage';for(const k of Object.keys(e.mechanic.cooldowns||{}))e.mechanic.cooldowns[k]=999;}
     if(mode==='rage'&&!e.mechanic)e.mechanic={enraged:true,phase:'idle',cooldowns:{}};
     s.enemies=[e];e.ai.mode='idle';e.ai.entryUntil=e.ai.readyAt=e.ai.graceUntil=999;
     h.damageNumbers.reset();h.camera={x:0,y:0};h.draw();
    },{c,mode});
    await page.waitForFunction(()=>{const h=window.__towerTest.host;h.draw();return !h.host.assetLoading?.blocked&&[h.monsterArt,...h.monsterArt.speciesRenderers.values()].some(r=>r.actors.has('damage-target'));},null,{timeout:90000});
    await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state;
     s.effects=['normal','weapon_bleed','wound','weapon_on_hit'].map((source,i)=>({id:`d-${i}`,kind:'hit',targetId:'damage-target',x:0,y:-130,damage:source==='weapon_bleed'?3576:2300,source,element:'fire',critical:i===0,startedAt:10,targetRadius:24,expiresAt:10.65}));h.draw();
    });
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const data=await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state;h.draw();
     const rows=h.damageNumbers.pool.filter(p=>p.node.active).map(p=>({text:p.label.string,x:p.node.position.x,y:p.node.position.y,width:p.label.node.getComponent('cc.UITransform').width,height:p.label.node.getComponent('cc.UITransform').height}));
     const anchor=h.damageNumbers.anchors.get('damage-target'),copy=JSON.stringify(s);h.draw();h.draw();
     const pause=copy===JSON.stringify(s),points=h.damageNumbers.pool.filter(p=>p.node.active).map(p=>({x:p.node.position.x,y:p.node.position.y}));
     const blockers=[h.minimap.node.parent,h.battleHud.root,h.bossPanel].filter(n=>n?.active).map(n=>{const t=n.getComponent('cc.UITransform');return {x:n.position.x,y:n.position.y,width:t.width,height:t.height}});
     return {rows,anchor,pause,points,blockers,width:h.width,height:h.height};
    });
    assert.equal(data.rows.length,4,`${c.family} ${mode} missing rows`);assert.ok(data.pause);
    for(let i=0;i<data.rows.length;i++){
     const row=data.rows[i];assert.ok(Number.isFinite(row.x+row.y));assert.ok(Math.abs(row.x)+row.width/2<=data.width/2+1,`${c.family} horizontal clipping`);
     assert.ok(Math.abs(row.y)+row.height/2<=data.height/2+1,`${c.family} vertical clipping`);
     assert.equal(row.x,data.points[i].x);assert.equal(row.y,data.points[i].y);
     for(const b of data.blockers)assert.ok(Math.abs(row.x-b.x)>=(row.width+b.width)/2||Math.abs(row.y-b.y)>=(row.height+b.height)/2,`${c.family} text hidden under HUD`);
     for(let j=i+1;j<data.rows.length;j++)assert.ok(Math.abs(row.y-data.rows[j].y)+.01>=(row.height+data.rows[j].height)/2+2,`${c.family} overlapping rows`);
    }
    assert.ok(data.anchor.y>-100,`${c.family} anchor at feet`);
    if(mode==='boss'&&['bear-humanoid','spider','bat','boar','snake-lady'].includes(c.family))await page.screenshot({path:path.join(out,`${c.family}-${mode}-${viewport.width}.png`)});
    const death=await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state,before=h.damageNumbers.pool.filter(p=>p.node.active).map(p=>({x:p.node.position.x,y:p.node.position.y}));
     s.enemies=[];h.draw();const after=h.damageNumbers.pool.filter(p=>p.node.active).map(p=>({x:p.node.position.x,y:p.node.position.y}));
     s.time=10.7;s.effects=[];h.draw();return {stable:JSON.stringify(before)===JSON.stringify(after),cleared:h.damageNumbers.pool.every(p=>!p.node.active)};
    });
    assert.ok(death.stable);assert.ok(death.cleared);report.results.push({viewport,...c,mode,...data,death});console.log(viewport.width,c.family,mode);
   }
   await page.close();
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{fs.writeFileSync(path.join(out,'runtime.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
 console.log(`PASS: ${report.results.length} form/role/viewport cases`);
})().catch(e=>{console.error(e);process.exitCode=1;});
