const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {installFixture}=require('./verify-sword-line.cjs');
const {installQi}=require('./verify-ice-three-cuts.cjs');
const out=path.resolve(__dirname,process.env.QI_REPORT_DIRECTORY||'../reports/moon-original-vfx-2026-11-04');
async function main(){
 const report={checks:[],errors:[]},browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   await installFixture(page,'http://127.0.0.1:8768/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1',report.errors);
   await installQi(page);
   for(const skill of ['sj_arc','sj_moon','sj_moon_triple']){
    await page.evaluate(f=>window.__prepareQi(f),{skill,rank:1,angle:0,distance:skill==='sj_arc'?100:280});
    await page.waitForFunction(()=>{const h=window.__towerTest.host;return !h.transitioning&&h.qiArt.ready&&h.arcArt.ready});
    await page.waitForTimeout(500);
    const states=[];
    for(let i=0;i<90;i++){
     states.push(await page.evaluate(()=>window.__stepQi()));
     if([14,24,34].includes(i))await page.screenshot({path:path.join(out,`${skill}-${viewport.width}-${i}.png`)});
     if(i===24){const before=await page.evaluate(()=>JSON.stringify(window.__qiQA.read()));await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>JSON.stringify(window.__qiQA.read())),before,'pause');}
    }
    const actual=await page.evaluate(()=>({shots:[...window.__qiQA.shots.values()],effects:[...window.__qiQA.effects.values()]}));
    const variants=[...new Set(states.flatMap(s=>s.actors.map(a=>a.variant)))];
    assert.equal(actual.shots.length,skill==='sj_arc'?0:skill==='sj_moon'?1:3);
    if(skill==='sj_arc'){assert.equal(actual.effects.length,3);if(process.env.QI_EXPECT_WHITE){const images=states.flatMap(s=>s.nearActors.map(a=>a.image));assert.ok(images.length>0);const white=await page.evaluate(()=>window.__towerTest.host.arcArt.liuyunAssets.length);assert.equal(white,3);}}
    else{assert.deepEqual(variants,skill==='sj_moon'?['moonWhite']:['crescent','sweep','down']);assert.ok(actual.shots.every(s=>s.range<=420));}
    assert.equal(states.at(-1).actors.length+states.at(-1).nearActors.length,0,'effects expire');
    report.checks.push({viewport,skill,shots:actual.shots.length,melee:actual.effects.length,variants,pause:true,cleanup:true});
   }
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASSED';
 }catch(e){report.status='FAILED';report.error=e.stack;throw e}
 finally{fs.writeFileSync(path.join(out,'runtime.json'),JSON.stringify(report,null,2));await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
