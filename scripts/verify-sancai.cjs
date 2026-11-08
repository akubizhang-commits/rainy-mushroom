// Real Cocos renderer, real TowerRun pulses. Only enemy placement/health and
// loadout are fixtures; no fabricated skill effects or persistent game writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||
 '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {installFixture}=require('./verify-sword-line.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,process.env.SANCAI_QA_DIR||'reports/sancai-2026-11-04/browser');
fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true}),report={cases:[],errors:[]};
 let currentPage;
 try{
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   currentPage=page;page.setDefaultTimeout(60000);
   await installFixture(page,process.env.SANCAI_URL||'http://127.0.0.1:8768/reports/sancai-2026-11-04/web-mobile/index.html?smoke=1',report.errors);
   await page.evaluate(()=>{
    const h=window.__towerTest.host;
    window.__prepareSancai=rank=>{
     if(h.run){h.run.abandon();h.finish();}
     h.enterTraining();h.run.pause();
     const run=h.run,s=run.state,p=s.player,template=s.pending[0];
     if(!template)throw Error('authored enemy template missing');
     s.loadout.active={sj_sancai:rank};s.loadout.passive={};s.loadout.evolutions=[];s.loadout.evolutionLevels={};
     delete s.loadout.trainedSkills;
     s.cooldowns={sj_sancai:0};s.casts=[];s.zones=[];s.effects=[];s.projectiles=[];
     p.x=33;p.y=-60;p.faceX=1;p.faceY=0;
     const enemy=run._enemy({...template,id:'sancai-browser-target',x:p.x+165,y:p.y-10});
     enemy.hp=enemy.maxHp=1e8;enemy.moveSpeed=0;
     enemy.ai.readyAt=enemy.ai.graceUntil=enemy.ai.entryUntil=1e8;
     s.enemies=[enemy];s.pending=[];s.reserved=[];s.wavePlanned=1;s.waveKilled=0;
     h.characterArt.reset();h.sancaiArt.reset();
     window.__sancaiPulses=new Map();window.__sancaiHits=new Map();window.__sancaiCasts=[];
     h.draw();
    };
    window.__readSancai=()=>{
     const s=h.run.state;
     return {time:s.time,phase:s.phase,
      zones:s.zones.filter(z=>z.kind==='sancai').map(z=>({id:z.id,x:z.x,y:z.y,radius:z.radius,
       startedAt:z.startedAt,expiresAt:z.expiresAt,pulseIndex:z.pulseIndex,pulseCount:z.pulseCount})),
      slots:h.sancaiArt.slots.map(a=>({id:a.id,ground:a.ground.active,air:a.air.active,
       plate:!!a.plate?.enabled,
       x:a.ground.position.x,y:a.ground.position.y,
       swords:a.swords.map(s=>({active:s.node.active,x:s.node.position.x,y:s.node.position.y,
        opacity:s.opacity.opacity,sprite:s.sprite.enabled,angle:s.node.angle,
        color:[s.sprite.color.r,s.sprite.color.g,s.sprite.color.b]}))})),
      camera:{...h.camera},
      pulses:[...window.__sancaiPulses.values()],hits:[...window.__sancaiHits.values()],
      casts:window.__sancaiCasts,
     };
    };
    window.__stepSancai=n=>{
     for(let i=0;i<n;i++){
      h.run.resume();h.run.advance(1/60,e=>{window.__sancaiCasts.push(e);h.characterArt.observeCast(e)});h.run.pause();
      const s=h.run.state;
      if(s.zones.some(z=>z.kind==='sancai'))s.cooldowns.sj_sancai=1e8;
      for(const e of s.effects){
       if(e.kind==='sancai')window.__sancaiPulses.set(e.id,{id:e.id,index:e.pulseIndex,time:e.startedAt});
       if(e.kind==='hit'&&e.source==='sancai')window.__sancaiHits.set(e.id,{id:e.id,damage:e.damage});
      }
      h.draw();
     }
     return window.__readSancai();
    };
    window.__sancaiToAge=age=>{
     for(let i=0;i<600;i++){
      const state=window.__stepSancai(1),z=state.zones[0];
      if(z&&state.time-z.startedAt>=age-1e-8)return state;
     }
     throw Error(`Sancai never reached age ${age}`);
    };
   });
   for(const rank of [1,4,7]){
    await page.evaluate(rank=>window.__prepareSancai(rank),rank);
    await page.waitForFunction(()=>{
     const h=window.__towerTest.host;
     return h.sancaiArt.ready&&!h.transitioning&&!h.host.assetLoading?.blocked;
    },null,{timeout:60000});
    const shots=[];
    for(const [age,label] of [[.55,'first'],[1.55,'second'],[2.55,'third']]){
     const state=await page.evaluate(age=>window.__sancaiToAge(age),age);
     assert.equal(state.zones.length,1);
     assert.equal(state.zones[0].radius,rank===1?150:rank===4?165:180);
     assert.equal(state.slots.filter(s=>s.ground&&s.air).length,1);
     const slot=state.slots.find(s=>s.id===state.zones[0].id),z=state.zones[0];
     assert.ok(Math.abs(slot.x-(z.x-state.camera.x))<1e-4);
     assert.ok(Math.abs(slot.y-(z.y-state.camera.y))<1e-4);
     assert.ok(slot.swords.filter(s=>s.active).every(s=>s.sprite));
     if(process.env.SANCAI_TRIAD){
      assert.ok(slot.plate,'supplied plate must be loaded');
      assert.deepEqual(slot.swords.map(s=>s.color),[[100,205,255],[255,111,72],[145,242,111]]);
      assert.ok(slot.swords[1].x>0&&slot.swords[2].x<0,'fire right, wood left');
     }
     if(rank===1||label==='third')await page.screenshot({path:path.join(out,`sancai-${rank}-${viewport.width}-${label}.png`)});
     const before=JSON.stringify(state);
     await page.waitForTimeout(120);
     assert.equal(JSON.stringify(await page.evaluate(()=>window.__readSancai())),before,'paused state and artwork freeze');
     shots.push(state);
    }
    // Reduced motion must use the same fixed boundary and no falling sword.
    const reduced=await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state;
     h.sancaiArt.syncTower(h.world.node,h.formationLayer,s,h.camera,true);
     return window.__readSancai();
    });
    assert.equal(reduced.zones[0].pulseIndex,3);
    assert.ok(reduced.slots.find(s=>s.id).swords.every(s=>s.active));
    const end=await page.evaluate(()=>window.__stepSancai(80));
    assert.equal(end.pulses.length,3);assert.equal(end.hits.length,3);
    assert.equal(end.zones.length,0);assert.ok(end.slots.every(s=>!s.air&&!s.ground));
    assert.equal(end.casts.filter(e=>e.skill==='sj_sancai'||e.form==='sj_sancai'||e.formId==='sj_sancai').length<=1,true);
    report.cases.push({viewport,rank,shots,reduced,cleanup:true,pause:true,pulses:end.pulses,hits:end.hits});
   }
   const cleanup=await page.evaluate(()=>{
    const h=window.__towerTest.host;
    h.withdraw();
    const confirm=h.overlay?.getChildByName('退出战斗确认面板')?.getChildByName('确认');
    if(!confirm)throw Error('Missing withdrawal confirmation');
    confirm.emit('click');
    return {runCleared:h.run===null,slots:h.sancaiArt.slots.length,
     unchanged:JSON.stringify(localStorage)===window.__lineInitial.storage,
     writes:window.__lineWrites};
   });
   assert.ok(cleanup.runCleared);assert.equal(cleanup.slots,0);assert.ok(cleanup.unchanged);assert.deepEqual(cleanup.writes,[]);
   const menu=await page.evaluate(()=>{
    const h=window.__towerTest.host;h.menu.go('librarySkills');
    h.menu.detailId='sj_sancai';h.menu.expandedSkillRealms.add('筑基');
    // Detached presentation fixture only; purchases/save atomicity are tested
    // against the actual Campaign in xianxia-sancai.test.mjs.
    h.menu.render({...window.__towerTest.state(),xp:1801,skills:{},skillsInitialized:true,playtestSkillPoints:100},'library','');
    const labels=[],walk=n=>{const label=n.getComponent(cc.Label);if(label)labels.push(label.string);n.children.forEach(walk)};
    walk(h.root);
    return {name:labels.some(t=>t.includes('三才剑阵')),slow:labels.some(t=>t.includes('20%')),
     cost:labels.some(t=>t.includes('功法点')),unchanged:JSON.stringify(localStorage)===window.__lineInitial.storage,labels};
   });
   await page.waitForFunction(()=>{
    const h=window.__towerTest.host;
    return !h.transitioning&&!h.host.assetLoading?.blocked;
   });
   await page.screenshot({path:path.join(out,`sancai-menu-${viewport.width}.png`)});
   report.cases.push({viewport,menu});
   assert.ok(menu.name&&menu.slow&&menu.cost&&menu.unchanged,JSON.stringify(menu));
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(error){report.status='FAIL';report.error=error.stack;
  if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
  throw error}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close()}
 console.log(`PASS ${report.cases.length} Cocos Sancai cases`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
