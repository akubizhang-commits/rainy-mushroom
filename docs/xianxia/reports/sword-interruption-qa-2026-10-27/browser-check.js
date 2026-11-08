async page => {
 const out='/Users/zhangnu/WeChatProjects/rainy-mushroom/docs/xianxia/reports/sword-interruption-qa-2026-10-27/';
 const errors=[], checks=[];
 const onError=e=>errors.push(String(e));page.on('pageerror',onError);
 const check=(name,pass,data)=>{checks.push({name,pass,data});if(!pass)throw Error(name+': '+JSON.stringify(data))};
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&playtest=1&route=line');
 await page.waitForFunction(()=>window.cc?.director?.getScene()?.children.find(n=>n.name==='PinePilot')?.components.find(c=>c.survivor)?.survivor.art.ready);
 const environment=await page.evaluate(()=>{
  window.q=cc.director.getScene().children.find(n=>n.name==='PinePilot').components.find(c=>c.survivor).survivor;
  q.startRun();q.run.spawner.step=()=>{};
  window.snap=()=>({tick:q.run.simulationTick,state:q.run.state,x:q.run.player.x,y:q.run.player.y,hp:q.run.player.hp,
   input:q.input.vector(0),enabled:q.input.enabled,modal:q.hud.modal,offer:q.run.offerInfo?.id,
   pending:q.run.progression.pendingLevels,applied:q.run.appliedLevel});
  return {ua:navigator.userAgent,note:'Automated interruption fixture; spawns suppressed, progression injected. Not human play or a mobile-device test.'};
 });
 await page.keyboard.up('d');
 await page.locator('canvas').click({position:{x:100,y:350}});
 const first=await page.evaluate(()=>snap());
 await page.keyboard.down('d');await page.waitForTimeout(200);
 const moving=await page.evaluate(()=>snap());
 check('keyboard moves player',moving.x>first.x,{first,moving});
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 const paused=await page.evaluate(()=>snap());await page.waitForTimeout(300);
 const frozen=await page.evaluate(()=>snap());
 check('blur pauses and clears input',paused.state==='paused'&&paused.input.x===0&&paused.input.y===0,{paused});
 check('background ticks and HP freeze',frozen.tick===paused.tick&&frozen.hp===paused.hp,{paused,frozen});
 await page.keyboard.up('d');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForTimeout(150);
 check('focus requires explicit resume',(await page.evaluate(()=>snap())).state==='paused');
 await page.evaluate(()=>q.hud.on.resume());await page.waitForTimeout(200);
 const resumed=await page.evaluate(()=>snap());
 check('resume has no stale movement',resumed.state==='playing'&&resumed.x===paused.x&&resumed.y===paused.y&&resumed.tick>paused.tick,{resumed,paused});

 // Actual browser touch events through CDP, including cancellation.
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:650,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y:650,id:1}]});
 await page.waitForTimeout(150);
 const touch=await page.evaluate(()=>snap());
 check('touch drag produces movement',touch.input.x>.5,{touch});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 const cancelled=await page.evaluate(()=>snap());await page.waitForTimeout(150);
 const afterCancel=await page.evaluate(()=>snap());
 check('touch cancel stops movement',afterCancel.input.x===0&&afterCancel.input.y===0&&cancelled.x===afterCancel.x&&cancelled.y===afterCancel.y,{cancelled,afterCancel});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:650,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y:650,id:2}]});
 const beforeResize=await page.evaluate(()=>snap());
 check('drag active before resize',beforeResize.input.x>.5,{beforeResize});
 await page.setViewportSize({width:430,height:932});await page.waitForTimeout(300);
 const resized=await page.evaluate(()=>snap());
 check('resize clears drag',resized.input.x===0&&resized.input.y===0,{resized});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();

 const offered=await page.evaluate(()=>{
  const p=q.run.progression;p.level=3;p.pendingLevels=2;p.totalLevelUps=2;
  q.run._stepPickups(0);q.syncModal(0);
  return {...snap(),cards:JSON.stringify(q.run.offer)};
 });
 await page.waitForTimeout(450);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await page.waitForTimeout(250);
 await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));q.hud.on.resume()});
 const restored=await page.evaluate(()=>({...snap(),cards:JSON.stringify(q.run.offer)}));
 check('offer survives interruption unchanged',restored.state==='levelup'&&restored.offer===offered.offer&&restored.cards===offered.cards,{offered,restored});
 await page.evaluate(()=>q.hud.on.choose(0,q.run.offerInfo.id));
 const early=await page.evaluate(()=>snap());
 check('resume restores choice input lock',early.applied===offered.applied&&early.pending===2,{early});
 await page.waitForTimeout(450);
 const chosen=await page.evaluate(()=>{
  const id=q.run.offerInfo.id;q.hud.on.choose(0,id);
  const once=snap();q.hud.on.choose(0,id);
  return {once,twice:snap()};
 });
 check('queued selection commits only once',chosen.once.applied===offered.applied+1&&chosen.once.pending===1&&chosen.once.offer!==offered.offer&&JSON.stringify(chosen.once)===JSON.stringify(chosen.twice),chosen);
 await page.waitForTimeout(450);
 await page.screenshot({path:out+'queued-offer.png'});
 check('no page errors',errors.length===0,{errors});
 const result={environment,checks,errors};
 // Keep synthetic fixture records out of the human playtest collector.
 const downloadPromise=page.waitForEvent('download');
 await page.evaluate(r=>{
  const u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=u;a.download='interruption-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
 },result);
 await (await downloadPromise).saveAs(out+'results.json');
 await page.goto('http://127.0.0.1:8767/docs/xianxia/sword-playtest.html');
 page.off('pageerror',onError);
 return result;
}
