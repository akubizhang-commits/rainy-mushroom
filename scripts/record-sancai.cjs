// Capture the shipped Cocos animation at exact simulation cadence.
// These are game recordings, not generated animation assets.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {installFixture}=require('./verify-sword-line.cjs');
const root=path.resolve(__dirname,'..');
const out=path.resolve(root,process.env.SANCAI_CAPTURE_DIR||'design/xianxia-sancai-animation-2026-11-04');
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const report={kind:'actual-cocos-fixed-step-recording',fps:30,simulationHz:60,errors:[],cases:[]};
 try{
  const viewport=process.env.SANCAI_SMALL?{width:844,height:390}:{width:1280,height:720};
  const context=await browser.newContext({viewport});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  await installFixture(page,process.env.SANCAI_URL||'http://127.0.0.1:8768/reports/sancai-2026-11-04/web-mobile/index.html?smoke=1',report.errors);
  for(const rank of [1,7]){
   const dir=path.join(out,`frames-rank${rank}`);fs.mkdirSync(dir,{recursive:true});
   await page.evaluate(rank=>{
    const h=window.__towerTest.host;
    if(h.run){h.run.abandon();h.finish()}
    h.enterTraining();h.run.pause();
    const run=h.run,s=run.state,p=s.player,template=s.pending[0];
    s.loadout.active={sj_sancai:rank};s.loadout.passive={};
    s.loadout.evolutions=[];s.loadout.evolutionLevels={};delete s.loadout.trainedSkills;
    s.cooldowns={sj_sancai:0};s.casts=[];s.zones=[];s.effects=[];s.projectiles=[];
    p.x=33;p.y=-60;p.faceX=1;p.faceY=0;
    const e=run._enemy({...template,id:'sancai-preview-target',x:p.x+165,y:p.y-10});
    e.hp=e.maxHp=1e8;e.moveSpeed=0;
    e.ai.readyAt=e.ai.graceUntil=e.ai.entryUntil=1e8;
    s.enemies=[e];s.pending=[];s.reserved=[];s.wavePlanned=1;s.waveKilled=0;
    h.characterArt.reset();h.sancaiArt.reset();h.draw();
    window.__recordPulses=new Map();
   },rank);
   await page.waitForFunction(()=>{
    const h=window.__towerTest.host;
    return h.sancaiArt.ready&&!h.transitioning&&!h.host.assetLoading?.blocked;
   });
   // 15 frames of anticipation, 120 frames of actual 60 Hz simulation.
   for(let frame=0;frame<135;frame++){
    if(frame>=15)await page.evaluate(()=>{
     const h=window.__towerTest.host;
     for(let step=0;step<2;step++){
      h.run.resume();h.run.advance(1/60,e=>h.characterArt.observeCast(e));h.run.pause();
      const s=h.run.state;
      if(s.zones.some(z=>z.kind==='sancai'))s.cooldowns.sj_sancai=1e8;
      for(const e of s.effects)if(e.kind==='sancai')window.__recordPulses.set(e.id,e.pulseIndex);
     }
     h.draw();
    });
    await page.screenshot({path:path.join(dir,`${String(frame).padStart(4,'0')}.png`)});
   }
   const result=await page.evaluate(()=>{
    const h=window.__towerTest.host;
    return {time:h.run.state.time,pulses:[...window.__recordPulses.values()],
     zones:h.run.state.zones.filter(z=>z.kind==='sancai').length,
     cleared:h.sancaiArt.slots.every(s=>!s.ground.active&&!s.air.active),
     storageUnchanged:JSON.stringify(localStorage)===window.__lineInitial.storage,writes:window.__lineWrites};
   });
   assert.equal(result.pulses.length,3);assert.equal(result.zones,0);
   assert.ok(result.cleared&&result.storageUnchanged);assert.deepEqual(result.writes,[]);
   report.cases.push({rank,...result});
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;throw e}
 finally{await browser.close();fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify(report,null,2)+'\n')}
 console.log('PASS: two full Sancai animation captures');
}
main().catch(e=>{console.error(e);process.exitCode=1});
