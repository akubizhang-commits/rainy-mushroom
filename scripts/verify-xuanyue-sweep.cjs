const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {installFixture}=require('./verify-sword-line.cjs');const {installQi}=require('./verify-ice-three-cuts.cjs');
const out=path.resolve(__dirname,process.env.QI_REPORT_DIRECTORY||'../design/xuanyue-sweep-2026-11-04');
(async()=>{const b=await chromium.launch({headless:true,channel:'chrome'}),report={checks:[],errors:[]};try{
for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
const ctx=await b.newContext({viewport}),page=await ctx.newPage();await installFixture(page,'http://127.0.0.1:8768/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1',report.errors);await installQi(page);
for(const skill of ['sj_moon','sj_arc','sj_moon_triple']){
await page.evaluate(skill=>window.__prepareQi({skill,rank:1,angle:0,distance:skill==='sj_arc'?100:skill==='sj_moon'?220:260}),skill);
await page.waitForFunction(()=>!window.__towerTest.host.transitioning&&window.__towerTest.host.qiArt.ready&&window.__towerTest.host.arcArt.ready);
await page.waitForTimeout(700);
const states=[];let captured=false;const moonEffects=new Map();
for(let i=0;i<90;i++){
 const s=await page.evaluate(()=>window.__stepQi());states.push(s);
 const effects=await page.evaluate(()=>window.__towerTest.host.run.state.effects.filter(e=>e.source==='sj_moon'&&e.kind==='cross'));for(const e of effects)moonEffects.set(e.id,e);
 if(skill==='sj_moon'&&s.actors.length&&s.actors[0].alpha>130){
  if(!captured){await page.screenshot({path:path.join(out,`moon-${viewport.width}.png`)});captured=true;
   const before=JSON.stringify(s);await page.waitForTimeout(120);assert.equal(JSON.stringify(await page.evaluate(()=>window.__qiQA.read())),before);}
 }
}
const all=await page.evaluate(()=>({shots:[...window.__qiQA.shots.values()],effects:[...window.__qiQA.effects.values()]}));
if(skill==='sj_moon'){
 assert.equal(all.shots.length,0);assert.equal(moonEffects.size,1);assert.ok(captured);
 const poses=states.flatMap(s=>s.actors);assert.deepEqual([...new Set(poses.map(a=>a.variant))],['moonWhite']);
 assert.equal(new Set(poses.map(a=>`${a.x},${a.y}`)).size,1);assert.ok(poses.every(a=>Math.abs(a.width-460*1024/880)<.01));
 assert.equal(states.at(-1).actors.length,0);
}else assert.equal(all.shots.length,skill==='sj_arc'?0:3);
report.checks.push({viewport,skill,shots:all.shots.length,moonEffects:moonEffects.size,stationary:skill==='sj_moon'?true:undefined});
}
await ctx.close();
}assert.deepEqual(report.errors,[]);report.status='PASSED';
}catch(e){report.status='FAILED';report.error=e.stack;throw e}finally{fs.writeFileSync(path.join(out,'runtime.json'),JSON.stringify(report,null,2));await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
