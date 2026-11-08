async (page) => {
 const base='/Users/zhangnu/WeChatProjects/rainy-mushroom/docs/xianxia/reports/sword-s4/';
 const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia');
 await page.waitForFunction(()=>window.cc?.director?.getScene()?.children.find(n=>n.name==='PinePilot')?.components.find(c=>c.constructor.name==='PinePilot')?.survivor?.art?.ready);
 const results=[];
 for(const id of ['sj_yujian','sj_wanjian','sj_line','sj_formation']){
  const index=await page.evaluate(id=>{
   const v=window.__v=cc.director.getScene().children.find(n=>n.name==='PinePilot').components.find(c=>c.constructor.name==='PinePilot').survivor;
   if(v.__originalUpdate)v.update=v.__originalUpdate;else v.__originalUpdate=v.update;v.startRun();const r=v.run;r.spawner.step=()=>{};r._stepPickups=()=>{};r.player.invuln=9999;
   // Reuse native weapon-state factory through normal acquisition before setting rank.
   if(id!=='sj_yujian')r._applyCard({kind:'weapon',id,level:1});
   r.weapons=r.weapons.filter(w=>w.id===id);r.weapons[0].level=5;
   r.passives={sj_heart:3,sj_mark:3,sj_bone:3,sj_gate:3};r.stats=r._computeStats();
   r.time=360;r.simulationTick=21600;r.appliedLevel=19;r.progression.totalLevelUps=18;r.progression.pendingLevels=1;r.progression.level=20;
   r._enterLevelup();return r.offer.findIndex(c=>c.kind==='evolve'&&c.id===id);
  },id);
  if(index<0)throw Error('Evolution not offered: '+id);
  await page.waitForFunction(()=>__v.hud.unlocked);
  await page.screenshot({path:base+id+'-card.png'});
  await page.mouse.click(190,320+index*137);
  await page.waitForFunction(id=>__v.run.weapons.some(w=>w.id===id&&w.evolved),id);
  const setup=await page.evaluate(()=>{
   const v=__v,r=v.run;v.update=()=>{};r.spawner.step=()=>{};r._stepPickups=()=>{};
   while(r.enemies.count)r.enemies.release(r.enemies.active[r.enemies.count-1]);while(r.shots.count)r.shots.release(r.shots.active[r.shots.count-1]);r.events.length=0;r.player.x=0;r.player.y=0;r.player.invuln=9999;
   const e=r.enemies.acquire();Object.assign(e,{x:110,y:0,r:12,hp:1e7,maxHp:1e7,speed:0,damage:0,kind:'gnat',behavior:'chase',takenMul:1,kbRes:1,kbX:0,kbY:0});
   v.art.resetWanjian();window.__s4log=[];
   window.__s4step=()=>{r.step();for(const event of r.drainEvents()){if(event.type.startsWith('sword'))__s4log.push(event);const fn=v.art[event.type];if(typeof fn==='function')fn.call(v.art,event)}v.art.sync(r,0,false)};
   return {version:r.skillRulesVersion,tick:r.simulationTick,evolved:r.weapons[0].evolved,level:r.appliedLevel};
  });
  if(id==='sj_yujian')await page.evaluate(()=>{for(let i=0;i<600&&!__s4log.some(e=>e.type==='swordRainPulse');i++)__s4step();});
  if(id==='sj_wanjian')await page.evaluate(()=>{for(let i=0;i<35;i++)__s4step()});
  if(id==='sj_line')await page.evaluate(()=>{for(let i=0;i<90&&!__s4log.some(e=>e.type==='swordLineStrike');i++)__s4step()});
  if(id==='sj_formation')await page.evaluate(()=>{for(let i=0;i<3;i++)__s4step()});
  await page.screenshot({path:base+id+'-effect.png'});
  const result=await page.evaluate(()=>{
   const r=__v.run,id=r.weapons[0].id;
   // Allow first rain/formation cycle to finish, without starting second cycle.
   if(id==='sj_yujian')for(let i=0;i<80;i++)__s4step();
   if(id==='sj_formation')for(let i=0;i<269;i++)__s4step();
   const tick=r.simulationTick;r.pause();r.advance(.1);const frozen=r.simulationTick===tick;r.resume();
   return {frozen,events:__s4log.reduce((a,e)=>(a[e.type]=(a[e.type]||0)+1,a),{}),first:__s4log.find(e=>['swordRainWarn','swordLineStrike','swordFormationPlace'].includes(e.type))||null,hp:r.enemies.active[0]?.hp};
  });
  results.push({id,index,setup,...result});
 }
 await page.reload();await page.waitForFunction(()=>window.cc?.director?.getScene()?.children.find(n=>n.name==='PinePilot')?.components.find(c=>c.constructor.name==='PinePilot')?.survivor?.art?.ready);
 page.off('pageerror',onError);return {results,errors,notes:'Controlled Lv20 evolution setup; each card picked with real pointer. Enemies held stationary with high HP; not a balance sample. Reloaded ordinary camp after checks.'};
}
