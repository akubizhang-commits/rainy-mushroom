async page=>{
 const out='/Users/zhangnu/WeChatProjects/rainy-mushroom/docs/xianxia/reports/courtyard-runtime-2026-10-27/';
 const errors=[],results=[],onError=e=>errors.push(String(e));
 page.on('pageerror',onError);
 const waitHost=()=>page.waitForFunction(()=>window.cc?.director?.getScene()?.children.find(n=>n.name==='PinePilot')?.components.find(c=>c.survivor)?.survivor.art.ready);
 for(const size of [{width:390,height:844},{width:1280,height:800}]){
  await page.setViewportSize(size);
  await page.goto('http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&playtest=1&route=line');
  await waitHost();
  const initial=await page.evaluate(()=>{
   window.q=cc.director.getScene().children.find(n=>n.name==='PinePilot').components.find(c=>c.survivor).survivor;
   q.startRun();
   return {arena:q.run.arena,texture:!!q.art.courtyardTexture,config:q.playtest};
  });
  if(initial.arena!=='courtyard-v1'||!initial.texture)throw Error('Courtyard not loaded');
  await page.waitForTimeout(200);
  // Geometry fixtures; never export these as human playtest records.
  const corners=[];
  for(const [name,x,y,dx,dy] of [
   ['northwest',-893,1001,-1,1],['northeast',959,1001,1,1],
   ['southwest',-893,-1121,-1,-1],['southeast',959,-1121,1,-1]]){
   const r=await page.evaluate(({x,y,dx,dy})=>{
    const r=q.run;q.hidden=true;r.enemies.releaseAll();r.spawner.step=()=>{};
    r.player.hp=r.player.maxHp;r.player.invuln=100;Object.assign(r.player,{x,y});
    r.setInput(dx,dy);for(let i=0;i<30;i++)r.step();
    r.setInput(0,0);
    r.spawner._spawnOne(r,'elite_beetle',0,{x:r.player.x,y:r.player.y});
    const e=r.enemies.active[0];
    q.art.sync(r,0,false);
    const ground=q.art.ground.position,world=q.art.world.position;
    return {player:{x:r.player.x,y:r.player.y,r:r.player.r},
     enemy:{x:e.x,y:e.y,r:e.r},width:q.width,height:q.height,
     imageActive:q.art.courtyardNode.active,boundary:q.art.courtyardBoundary.active,
     legacyTiles:q.art.tiles.filter(n=>n.active).length,
     ground:{x:ground.x,y:ground.y},world:{x:world.x,y:world.y}};
   },{x,y,dx,dy});
   for(const e of [r.player,r.enemy]){
    if(e.x-e.r< -912||e.x+e.r>978||e.y-e.r< -1140||e.y+e.r>1020)throw Error('Out of bounds');
   }
   if(Math.hypot(r.enemy.x-r.player.x,r.enemy.y-r.player.y)<300)throw Error('Unsafe spawn');
   if(!r.imageActive||!r.boundary||r.legacyTiles!==0||JSON.stringify(r.ground)!==JSON.stringify(r.world))throw Error('Misaligned rendering');
   const cx=-r.ground.x,cy=-r.ground.y;
   if(cx-r.width/2< -1872||cx+r.width/2>1872||cy-r.height/2< -2292||cy+r.height/2>2700)throw Error('Camera outside image');
   corners.push({name,...r});
   if(size.width===390)await page.screenshot({path:out+name+'.png'});
  }
  await page.evaluate(()=>{
   q.hidden=false;q.startRun();q.run.spawner.step=()=>{};
   q.run.player.y=850;q.art.sync(q.run,0,false);
  });
  await page.locator('canvas').click({position:{x:100,y:300}});
  await page.keyboard.down('d');await page.waitForTimeout(180);await page.keyboard.up('d');
  const moved=await page.evaluate(()=>q.run.player.x);
  if(moved<=0)throw Error('Player cannot move');
  const restart=await page.evaluate(()=>{
   q.hud.on.pause();const paused=q.run.state;q.hud.on.resume();const resumed=q.run.state;
   q.startRun();return {paused,resumed,arena:q.run.arena,x:q.run.player.x,y:q.run.player.y};
  });
  if(restart.paused!=='paused'||restart.resumed!=='playing'||restart.arena!=='courtyard-v1'||restart.x!==0||restart.y!==0)throw Error('Restart failed');
  await page.evaluate(()=>{q.run.player.y=850;q.art.sync(q.run,0,false)});
  await page.waitForTimeout(200);
  await page.screenshot({path:out+`courtyard-${size.width}.png`});
  results.push({size,initial,corners,moved,restart});
 }
 await page.goto('http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html');
 await waitHost();
 const classic=await page.evaluate(()=>{
  const v=cc.director.getScene().children.find(n=>n.name==='PinePilot').components.find(c=>c.survivor).survivor;
  v.startRun();v.art.sync(v.run,0,false);
  return {ruleset:v.run.ruleset,arena:v.run.arena||null,courtyardLoaded:!!v.art.courtyardTexture,tiles:v.art.tiles.filter(n=>n.active).length};
 });
 if(classic.ruleset!=='survivor'||classic.courtyardLoaded||classic.tiles===0)throw Error('Classic changed');
 if(errors.length)throw Error(errors.join('\n'));
 const report={note:'Browser geometry/input fixtures, not human performance or balance evidence.',results,classic,errors};
 const download=page.waitForEvent('download');
 await page.evaluate(r=>{
  const u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'})),a=document.createElement('a');
  a.href=u;a.download='courtyard-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
 },report);
 await(await download).saveAs(out+'browser-results.json');
 page.off('pageerror',onError);
 await page.goto('http://127.0.0.1:8767/docs/xianxia/sword-playtest.html');
 return report;
}
