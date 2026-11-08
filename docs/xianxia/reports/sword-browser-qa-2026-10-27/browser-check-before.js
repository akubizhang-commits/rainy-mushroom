async (page) => {
 const out='/Users/zhangnu/WeChatProjects/rainy-mushroom/docs/xianxia/reports/sword-browser-qa-2026-10-27/';
 const errors=[];const onError=e=>errors.push(String(e));page.on('pageerror',onError);
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&perf=1');
 await page.waitForFunction(()=>window.cc?.director?.getScene()?.children.find(n=>n.name==='PinePilot')?.components.find(c=>c.survivor)?.survivor?.art?.ready);
 const environment=await page.evaluate(()=>{
  const host=cc.director.getScene().children.find(n=>n.name==='PinePilot').components.find(c=>c.survivor);
  window.__qaHost=host;const v=host.survivor;
  // Separate stress fixture, never export as human/balance evidence.
  for(const key of Object.keys(v.profile.permanent))v.profile.permanent[key]=0;
  v.profile.settings.sound=false;v.profile.settings.vibration=false;v.audio.setEnabled(false);
  window.__qaCounts=()=>{
   const a=v.art,r=v.run;
   const count=n=>1+n.children.reduce((s,c)=>s+count(c),0);
   return {tick:r?.simulationTick,time:r?.time,state:r?.state,hp:r?.player.hp,
    enemies:r?.enemies.count,shots:r?.shots.count,bubbles:r?.mistBubbles.count,
    treeNodes:count(v.root),active:a.activeNodes,pools:a.poolCounts,
    views:{arc:a.arcViews.size,line:a.lineViews.size,rain:a.swordRainViews.size,
     ground:a.swordAreaBlasts.size,passive:a.swordPassiveBlasts.size,hits:a.swordHits.length},
    dropped:{...r?.diag.dropped},droppedTime:r?.diag.droppedTime};
  };
  window.__qaSetup=(evolved)=>{
   v.startRun();const reset=__qaCounts(),r=v.run;
   r.spawner.step=()=>{};r._stepPickups=()=>{};
   for(const id of ['sj_wanjian','sj_line','sj_formation'])r._applyCard({kind:'weapon',id,level:1});
   for(const w of r.weapons){w.level=5;w.evolved=evolved.includes(w.id)}
   r.passives={sj_heart:3,sj_mark:3,sj_bone:3,sj_gate:3};
   r.appliedLevel=27;r.progression.level=27;r.progression.totalLevelUps=26;
   r.time=360;r.simulationTick=21600;r.stats=r._computeStats();
   r.player.hp=r.player.maxHp=100000;r.player.invuln=100000;
   for(let i=0;i<200;i++){
    const angle=i*2.399963229728653,rad=35+Math.sqrt(i/200)*285;
    r.spawner._spawnOne(r,i%2?'gnat':'beetle',6,{x:Math.cos(angle)*rad,y:Math.sin(angle)*rad});
   }
   for(let i=0;i<r.enemies.count;i++){
    const e=r.enemies.active[i];e.speed=0;e.hp=e.maxHp=1e7;e.damage=0;e.kbRes=1;
   }
   return {reset,fixture:__qaCounts(),weapons:r.weapons.map(w=>({id:w.id,level:w.level,evolved:w.evolved}))};
  };
  window.__qaMeasure=ms=>new Promise(resolve=>{
   const frames=[],logic=[],nodes=[],enemies=[],draws=[];let first=null,last=null;
   const tick=t=>{
    if(first===null)first=t;
    if(last!==null){frames.push(t-last);logic.push(v.stepMs);nodes.push(__qaCounts().treeNodes);
     enemies.push(v.run.enemies.count);draws.push(cc.director.root.device.numDrawCalls||0)}
    last=t;
    if(t-first<ms){requestAnimationFrame(tick);return}
    const stats=a=>{const s=a.slice().sort((a,b)=>a-b);return {n:s.length,mean:a.reduce((x,y)=>x+y,0)/a.length,p95:s[Math.floor((s.length-1)*.95)],max:s[s.length-1],min:s[0]}};
    resolve({frames:stats(frames),logic:stats(logic),nodes:stats(nodes),enemies:stats(enemies),draws:stats(draws),end:__qaCounts()});
   };requestAnimationFrame(tick);
  });
  return {ua:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,
   dpr:devicePixelRatio,visible:[v.width,v.height],deviceName:cc.director.root.device.renderer||null,
   perfPanel:!!host.perf,settings:{...v.profile.settings}};
 });
 const cases=[];
 for(const [name,evolved] of [['rain-orbit',['sj_yujian','sj_wanjian']],['line-formation',['sj_line','sj_formation']]]){
  for(let repeat=0;repeat<2;repeat++){
   const setup=await page.evaluate(e=>__qaSetup(e),evolved);
   await page.waitForTimeout(1800);
   const result=await page.evaluate(()=>__qaMeasure(8500));
   const pause=await page.evaluate(async()=>{
    const v=__qaHost.survivor;v.hud.on.pause();const before=__qaCounts();
    await new Promise(r=>setTimeout(r,300));const after=__qaCounts();
    v.hud.on.resume();return {before,after,frozen:before.tick===after.tick&&before.hp===after.hp};
   });
   cases.push({name,repeat,setup,result,pause});
  }
  await page.screenshot({path:out+name+'.png'});
 }
 const cleanup=await page.evaluate(()=>{
  const v=__qaHost.survivor;v.startRun();const immediate=__qaCounts();
  return {immediate,initialWeapons:v.run.weapons.map(w=>w.id)};
 });
 await page.waitForTimeout(100);
 cleanup.afterFrame=await page.evaluate(()=>__qaCounts());
 await page.goto('http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia');
 await page.waitForFunction(()=>window.cc?.director?.getScene()?.children.find(n=>n.name==='PinePilot')?.components.find(c=>c.survivor)?.survivor?.art?.ready);
 cleanup.reload=await page.evaluate(()=>{
  const h=cc.director.getScene().children.find(n=>n.name==='PinePilot').components.find(c=>c.survivor);
  return {screen:h.survivor.screen,run:!!h.survivor.run,perf:!!h.perf};
 });
 page.off('pageerror',onError);
 const result={environment,cases,cleanup,errors,note:'Injected static 200-enemy fixtures with full weapons, two evolutions, invulnerability and no pickups. Browser-only, no human/balance/device claim.'};
 await page.evaluate(data=>{window.__qaResult=data},result);
 return result;
}
