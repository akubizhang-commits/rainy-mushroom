// Real Cocos buttons and browser inputs in fresh, isolated browser storage.
// Observation uses the scene graph, not fabricated gameplay results.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const out=process.env.REPORT_DIR || 'docs/xianxia/reports/tower-functional-alpha-2026-10-27';
const url=process.env.PREVIEW_URL || 'http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1';
fs.mkdirSync(out,{recursive:true});

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{
  for(const viewport of [{width:390,height:844},{width:360,height:640},{width:1280,height:800}]){
   const context=await browser.newContext({viewport,deviceScaleFactor:1}),page=await context.newPage();
   const errors=[],actions=[],prefix=`${viewport.width}x${viewport.height}`;
   page.on('pageerror',e=>errors.push(e.message));
   const load=async()=>{await page.goto(url);await page.waitForFunction(()=>{
    const pilot=window.cc?.director.getScene()?.children.find(n=>n.name==='PinePilot');
    window.towerQA=pilot?.components.find(c=>c.constructor.name==='PinePilot')?.survivor;
    return window.towerQA?.store?.state;
   });await page.waitForTimeout(180);};
   const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(towerQA.store.state)));
   const screenshot=name=>page.screenshot({path:path.join(out,`${prefix}-${name}.png`)});
   const locate=(caption,parent)=>page.evaluate(({caption,parent})=>{
    const walk=n=>[n,...n.children.flatMap(walk)];
    const nodes=walk(towerQA.root);
    const matches=nodes.filter(n=>n.activeInHierarchy&&n.name===caption&&n.getComponent('cc.Button')
      &&(!parent||n.parent.name.startsWith(parent)));
    const node=matches.find(n=>n.getComponent('cc.Button').interactable)||matches[0];if(!node)return null;
    const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(c=>c);
    const canvas=document.querySelector('canvas'),rect=canvas.getBoundingClientRect();
    const xy=p=>{const v=camera.worldToScreen(p);return{x:rect.x+v.x/canvas.width*rect.width,y:rect.y+(1-v.y/canvas.height)*rect.height};};
    let scroll=node.parent;while(scroll&&!scroll.getComponent('cc.ScrollView'))scroll=scroll.parent;
    let clip={top:rect.top,bottom:rect.bottom};
    if(scroll){const h=scroll.getComponent('cc.UITransform').height*scroll.worldScale.y;
     clip={top:xy(new cc.Vec3(scroll.worldPosition.x,scroll.worldPosition.y+h/2,0)).y,
      bottom:xy(new cc.Vec3(scroll.worldPosition.x,scroll.worldPosition.y-h/2,0)).y};}
    return{...xy(node.worldPosition),clip,enabled:node.getComponent('cc.Button').interactable};
   },{caption,parent});
   const click=async(caption,parent)=>{
    for(let i=0;i<100;i++){
     const t=await locate(caption,parent);assert.ok(t,`missing button ${caption} / ${parent||''}`);
     assert.ok(t.enabled,`disabled ${caption}`);
     if(t.y>t.clip.top+17&&t.y<t.clip.bottom-17){
      await page.mouse.click(t.x,t.y);await page.waitForTimeout(110);actions.push(caption);return;
     }
     await page.mouse.move(t.x,(t.clip.top+t.clip.bottom)/2);
     await page.mouse.wheel(0,t.y<t.clip.top?-280:280);await page.waitForTimeout(40);
    }throw Error(`cannot scroll to ${caption}`);
   };
   try{
    await load();assert.equal((await state()).contribution,300);await screenshot('hall');
    await click('藏经阁');
    await click('学习 · 20妖丹','弦月斩');
    assert.equal((await state()).skills.sj_arc,1);assert.equal((await state()).cores,0);
    await click('整备');
    await click('加入此配装','弦月斩');
    assert.ok((await state()).loadouts[0].active.includes('sj_arc'));
    await click('2号配装');await click('使用这套配装出战');
    assert.equal((await state()).selectedLoadout,1);
    await click('1号配装');await click('使用这套配装出战');
    assert.equal((await state()).selectedLoadout,0);
    await click('宗门');
    await click('天工坊');
    await click('寻器一次 · 100贡献');
    const drawn=await state();assert.ok(drawn.contribution>=200&&drawn.contribution<=216);
    const owned=Object.keys(drawn.weapons).find(k=>k!=='eq_sword_suwen');
    if(owned){
     const names={eq_sword_qingxiao:'青霄剑',eq_sword_zhenyue:'镇岳剑'};
     await click('装备到当前配装',names[owned]);
     assert.equal((await state()).loadouts[0].weaponId,owned);
    }
    await screenshot('forge');
    await click('丹药');
    await click('购买一颗 · 20贡献','培元丹');
    await click('服用一颗','培元丹');
    assert.equal((await state()).xp,50);assert.equal((await state()).pills.peiyuan,0);
    await screenshot('pills');
    const beforeReload=await state();await load();
    const afterReload=await state();
    for(const key of ['xp','cores','contribution','skills','weapons','loadouts'])assert.deepEqual(afterReload[key],beforeReload[key],`persistent ${key}`);
    await click('锁妖塔');
    await click('继续挑战第1层');
    await page.waitForFunction(()=>towerQA.run?.state.time>1);
    const before=await page.evaluate(()=>({...towerQA.run.state.player}));
    await page.keyboard.down('d');await page.waitForTimeout(650);await page.keyboard.up('d');
    const after=await page.evaluate(()=>({...towerQA.run.state.player}));
    assert.ok(after.x>before.x+20,'keyboard movement');
    // Canvas drag exercises the actual touch-to-joystick path.
    await page.mouse.move(viewport.width/2,viewport.height*.6);await page.mouse.down();
    await page.mouse.move(viewport.width/2-55,viewport.height*.6);await page.waitForTimeout(400);await page.mouse.up();
    const afterDrag=await page.evaluate(()=>({...towerQA.run.state.player}));
    assert.ok(afterDrag.x<after.x-10,'touch/drag movement');
    await page.waitForFunction(()=>towerQA.run?.state.earned.xp>0,{timeout:30000});
    await screenshot('battle');
    await click('暂停');
    const paused=await page.evaluate(()=>towerQA.run.snapshot());assert.equal(paused.phase,'paused');
    await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>towerQA.run.state.time),paused.time);
    await load();
    const restored=await page.evaluate(()=>towerQA.run.snapshot());
    assert.equal(restored.time,paused.time);assert.equal(restored.player.hp,paused.player.hp);
    assert.deepEqual(restored.cooldowns,paused.cooldowns);assert.equal(restored.phase,'paused');
    await screenshot('resume');
    if(viewport.width===390){
     await page.evaluate(()=>{towerQA._qaStorage=towerQA.store.storage;towerQA.store.storage={getItem:k=>towerQA._qaStorage.getItem(k),setItem(){throw Error('QA disk unavailable');}};});
     await click('继续挑战');
     await page.waitForFunction(()=>towerQA.pending);
     const stopped=await page.evaluate(()=>towerQA.run.state.time);await page.waitForTimeout(300);
     assert.equal(await page.evaluate(()=>towerQA.run.state.time),stopped,'failed save freezes combat');
     await screenshot('save-retry');
     await page.evaluate(()=>{towerQA.store.storage=towerQA._qaStorage;});
     await click('重试保存');
     assert.equal(await page.evaluate(()=>towerQA.pending),null);
    }
    await click('继续挑战');await page.waitForTimeout(500);await click('暂停');
    const earned=await page.evaluate(()=>towerQA.run.state.earned);
    await click('返回宗门');await click('返回宗门');
    const settled=await state();assert.equal(settled.activeRun,null);assert.ok(settled.xp>=beforeReload.xp+earned.xp);
    await screenshot('returned');
    if(viewport.width===390){
     await click('锁妖塔');await click('继续挑战第1层');
     // Accelerate the real simulation through a complete floor using movement
     // only. No HP, damage, rewards, RNG, enemies, or progress are fabricated.
     const completed=await page.evaluate(()=>{
      const r=towerQA.run;
      for(let i=0;i<1200*30&&r.state.phase==='playing';i++){
       const p=r.state.player,t=r.state.time*.24;
       let dx=33+490*Math.cos(t)-p.x,dy=-60+490*Math.sin(t)-p.y,d=Math.max(1,Math.hypot(dx,dy));dx/=d;dy/=d;
       for(const e of r.state.enemies){const q=Math.hypot(p.x-e.x,p.y-e.y);if(q<135){dx+=(p.x-e.x)/Math.max(1,q)*(135-q)/45;dy+=(p.y-e.y)/Math.max(1,q)*(135-q)/45;}}
       r.setViewport({xmin:p.x-352,xmax:p.x+352,ymin:p.y-506,ymax:p.y+511});
       r.setInput(dx,dy);r.advance(1/30);
      }
      const result={phase:r.state.phase,hp:r.state.player.hp,xp:r.state.player.xp,earned:r.state.earned};
      towerQA.update(0);return result;
     });
     assert.equal(completed.phase,'won');assert.equal((await state()).clearedFloor,1);
     await page.waitForTimeout(120);await screenshot('floor-cleared');
     await click('继续第2层');
     assert.equal(await page.evaluate(()=>towerQA.run.state.floor),2);
     assert.ok(Math.abs((await page.evaluate(()=>towerQA.run.state.player.hp))-completed.hp)<.1,'next floor inherits HP');
     await click('暂停');await click('返回宗门');await click('返回宗门');
    }
    assert.deepEqual(errors,[]);
    results.push({viewport,ok:true,actions,earned,errors});console.log(prefix,'passed',actions.length,'pointer actions');
   }catch(e){await screenshot('FAIL');results.push({viewport,ok:false,actions,error:String(e),errors});throw e;}
   finally{await context.close();}
  }
 }finally{
  fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({url,results},null,2));
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
