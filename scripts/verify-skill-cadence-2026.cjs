const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/skill-cadence-implementation-2026-11-04/browser');fs.mkdirSync(out,{recursive:true});
(async()=>{const errors=[],cases=[];const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const width of [1280,844])for(const type of ['Liangyi','Sixiang']){
const context=await browser.newContext({viewport:{width,height:width===1280?720:390}}),page=await context.newPage();
await installFixture(page,'http://127.0.0.1:8768/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1',errors);
await page.addScriptTag({path:path.join(root,`design/xianxia-${type.toLowerCase()}-integration-2026-10-30/qa/${type.toLowerCase()}-observer.js`)});
await page.evaluate(t=>window[`install${t}IntegrationObserver`](),type);
for(const rank of type==='Liangyi'?[1,4,10]:[1,2]){
await page.evaluate(({type,rank})=>{window[`__prepare${type}Integration`]({rank});window.__towerTest.host.run._playtestAssist=false;}, {type,rank});
await page.waitForFunction(t=>{const h=window.__towerTest.host;return h[t==='Liangyi'?'formationArt':'sixiangArt'].ready&&!h.host.assetLoading?.blocked},type,{timeout:60000});
const nearEnd=await page.evaluate(t=>{const q=window[`__${t.toLowerCase()}Integration`];for(let n=0;n<650;n++){const v=window[`__step${t}Integration`]();if(v.inspection?.age>=7.8)return v;}throw Error('No eight-second visual');},type);
assert.ok(nearEnd.inspection.fade>0);await page.screenshot({path:path.join(out,`${type}-${rank}-${width}-7.8s.png`)});
const end=await page.evaluate(t=>{for(let n=0;n<65;n++)window[`__step${t}Integration`]();const q=window[`__${t.toLowerCase()}Integration`];return {pulses:q.pulses,view:q.read()};},type);
const count=type==='Sixiang'?(rank===1?16:20):(rank<4?12:rank<7?14:16);assert.equal(end.pulses.length,count);assert.equal(end.pulses.at(-1).pulseIndex,count);assert.ok(Math.abs(end.pulses.at(-1).scheduledAt-end.pulses[0].zoneStartedAt-8)<1e-7);assert.ok(!end.view.track);
cases.push({type,rank,width,count,first:end.pulses[0],last:end.pulses.at(-1),nearEndAge:nearEnd.inspection.age,cleanup:true});
}await context.close();}
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'PASS',cases,errors},null,2));console.log('PASS',cases.length);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
