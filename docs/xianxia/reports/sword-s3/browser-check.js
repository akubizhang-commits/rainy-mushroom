async (page) => {
 const base='/Users/zhangnu/WeChatProjects/rainy-mushroom/docs/xianxia/reports/sword-s3/';
 const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia');
 await page.waitForFunction(()=>window.cc?.director?.getScene()?.children.find(n=>n.name==='PinePilot')?.components.find(c=>c.constructor.name==='PinePilot')?.survivor?.art?.ready);
 await page.evaluate(()=>{window.__v=cc.director.getScene().children.find(n=>n.name==='PinePilot').components.find(c=>c.constructor.name==='PinePilot').survivor;__v.startRun()});
 const acquired=[];
 for(const id of ['sj_shadow','sj_formation','sj_heart','sj_mark','sj_bone','sj_gate']){
  const index=await page.evaluate(id=>{const r=__v.run;r.player.hp=r.player.maxHp;r.player.invuln=1000;r.appliedLevel=Math.max(10,r.appliedLevel);r.progression.pendingLevels=1;r.progression.level=r.appliedLevel+1;for(let i=0;i<100;i++){r.state='playing';r._enterLevelup();if(r.offer.some(c=>c.id===id))return r.offer.findIndex(c=>c.id===id)}throw Error('No offer '+id)},id);
  await page.waitForFunction(()=>__v.hud.unlocked);
  await page.screenshot({path:base+id+'-card.png'});
  await page.mouse.click(190,320+index*137);acquired.push(id);
 }
 const setup=await page.evaluate(()=>{
  const v=__v,r=v.run;v.update=()=>{};r.state='playing';r.offer=null;r.progression.pendingLevels=0;v.hud.closeModal();
  r.spawner.step=()=>{};r._stepPickups=()=>{};r.player.invuln=0;r.player.hp=r.player.maxHp;r.player.x=0;r.player.y=0;
  r.enemies.releaseAll();r.shots.releaseAll();r.swordCombat.marks.clear();r.swordCombat.kills.length=0;
  const e=r.enemies.acquire();Object.assign(e,{kind:'gnat',behavior:'chase',x:70,y:0,r:10,speed:0,hp:100000,maxHp:100000,damage:1,kbX:0,kbY:0,takenMul:1});
  for(const w of r.weapons){w.readyAtTick=0;if(w.pendingShadows)w.pendingShadows.length=0;if(w.formations)w.formations.length=0}
  v.art.resetWanjian();window.__s3log=[];
  window.__s3step=()=>{r.step();for(const event of r.drainEvents()){if(event.type.startsWith('sword'))__s3log.push(event);const fn=v.art[event.type];if(typeof fn==='function')fn.call(v.art,event)}v.art.sync(r,0,false)};
  for(let i=0;i<25;i++)__s3step();r.player.x=-110;v.art.sync(r,0,false);
  return {version:r.skillRulesVersion,weapons:r.weapons.map(w=>w.id),passives:r.passives,shadow:r.weapons.find(w=>w.id==='sj_shadow').pendingShadows.map(x=>({...x})),formation:r.weapons.find(w=>w.id==='sj_formation').formations.map(x=>({...x})),markCount:r.swordCombat.marks.size};
 });
 await page.screenshot({path:base+'ground-setup.png'});
 const strike=await page.evaluate(()=>{while(!__s3log.some(e=>e.type==='swordShadowStrike'))__s3step();return __s3log.find(e=>e.type==='swordShadowStrike')});
 await page.screenshot({path:base+'shadow-strike.png'});
 const sustain=await page.evaluate(()=>{for(let i=0;i<360;i++)__s3step();const r=__v.run,t=r.simulationTick;r.pause();r.advance(.1);const pauseFrozen=r.simulationTick===t;r.resume();return {events:__s3log.reduce((a,e)=>(a[e.type]=(a[e.type]||0)+1,a),{}),dotHits:__s3log.filter(e=>e.type==='swordDamage'&&e.kind==='dot').length,markCount:r.swordCombat.marks.size,pauseFrozen}});
 const gate=await page.evaluate(()=>{const r=__v.run;r.swordCombat.rng={next:()=>0};r.swordCombat.marks.clear();r.enemies.active[0].hp=1;r.weapons.find(w=>w.id==='sj_yujian').readyAtTick=0;for(let i=0;i<300&&!__s3log.some(e=>e.type==='swordGateBurst');i++)__s3step();return __s3log.find(e=>e.type==='swordGateBurst')||null});
 await page.screenshot({path:base+'gate-burst.png'});
 await page.reload();page.off('pageerror',onError);
 const report={acquired,setup,strike,sustain,gate,errors,notes:'Controlled level/draft injection; real pointer selections. Stationary high-HP enemy, disabled spawns/pickups for sustained observation. Gate RNG forced to zero and existing DOT cleared only for last direct-kill visual capture. Not a balance sample.'};
 return report;
}
