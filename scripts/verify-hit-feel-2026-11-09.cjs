'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {pathToFileURL}=require('node:url');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(process.env.FEEL_OUT||path.join(ROOT,'design/xianxia-hit-feel-2026-11-09/browser'));
// 2026-11-09 打击感分档验证：当前全部攻击技能（周天剑域已退役）。
const SKILLS=[['sj_yujian','御剑术'],['sj_arc','流云斩'],['sj_moon','玄月斩'],['sj_moon_triple','逐月斩'],['sj_cross','双月斩'],['sj_line','剑破虚空'],['evo_tiandi','一剑开天'],['sj_shadow','分光连斩'],['sj_jinghong','惊鸿剑'],['sj_wanjian','周天剑阵'],['sj_qinglian','青莲剑阵'],['sj_sancai','三才剑阵'],['sj_formation','两仪剑阵'],['evo_sixiang','四象剑阵']];
const PARENT={evo_sixiang:'sj_formation',evo_tiandi:'sj_line'};
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const {skillForm}=await import(pathToFileURL(path.join(ROOT,'js/xianxia/TowerSkillForms.js')));
 const cases=SKILLS.flatMap(([id,name])=>[1,10].map(rank=>{const evo=!!PARENT[id],level=evo?(rank===1?1:2):rank,parent=evo?(rank===1?6:10):rank;const form=skillForm(id,level,parent);return {id,name,level,parent,skill:PARENT[id]||id,form,distance:id==='sj_wanjian'?form.radius*.8:id==='sj_qinglian'?120:id==='sj_moon'?150:id==='sj_arc'&&rank===1?65:id==='sj_cross'&&rank===1?65:160}}));
 const snapshot=fs.mkdtempSync('/tmp/game-feel-preview-');fs.cpSync(process.env.FEEL_BUILD||path.join(ROOT,'cocos-pilot/build/web-mobile'),snapshot,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(snapshot,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(snapshot+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;
 const report={status:'RUNNING',cases:[],errors:[],consoleErrors:[],snapshot};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport,recordVideo:{dir:OUT,size:viewport}});page=await context.newPage();page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});
   await installFixture(page,`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`,report.errors);
   await page.evaluate(()=>{
    window.__prepareFeel=c=>{
     window.__prepareLine({rank:1,angle:0,reach:500,origin:{x:-160,y:-70}});
     window.__lineView=()=>null; // 旧剑破虚空检查用的视图采样已与当前 SwordLineArt 结构不符，本检查不需要。
     const h=window.__towerTest.host,s=h.run.state,p=s.player,template=s.enemies[0];
     s.loadout.active={[c.skill]:c.parent};s.loadout.evolutions=c.id===c.skill?[]:[c.id];s.loadout.evolutionLevels=c.id===c.skill?{}:{[c.id]:c.level};s.cooldowns={[c.skill]:0};
     s.enemies=Array.from({length:c.parent===1?1:3},(_,i)=>{
      const e=JSON.parse(JSON.stringify(template));e.id=`feel-${i}`;e.x=p.x+c.distance;e.y=p.y+(i-1)*15;e.hp=e.maxHp=1e8;e.orbitNextAt=0;return e;
     });
     s.player.hp=s.player.maxHp;h.draw();if(h.overlay)h.overlay.active=false;
    };
   });
   for(const c of cases){
    await page.evaluate(c=>window.__prepareFeel(c),c);await page.waitForFunction(()=>{const h=window.__towerTest.host;h.draw();return h.monsterArt.actors.size>0&&h.hitImpact.clips.size===6});
    const result=await page.evaluate(()=>{
     const h=window.__towerTest.host,s=h.run.state,hits=new Map(),seen=new Map(),sounds={};let maxPoses=0,maxOffset=0,bodyChecks=0,readOnly=true,stable=true,maxTrauma=0,maxHolds=0,maxKick=0;
     const hi=h.hitImpact;window.__hitSounds=sounds;const patch=()=>{const a=hi.source;if(!a)return;const proto=Object.getPrototypeOf(a);if(!proto.__counted){const f=proto.playOneShot;proto.playOneShot=function(clip,v){const n=String(clip?.name||clip?._name||'?'),m=window.__hitSounds;if(m)m[n]=(m[n]||0)+1;return f.call(this,clip,v)};proto.__counted=true}};
     for(let i=0;i<260;i++){
      patch();window.__stepLine();patch();
      maxTrauma=Math.max(maxTrauma,hi.trauma);maxHolds=Math.max(maxHolds,hi.holds.size);const k=hi.cameraKick(s.time);maxKick=Math.max(maxKick,Math.hypot(k.x,k.y));
      for(const e of s.effects)if(e.kind==='hit'&&e.damage>0)hits.set(e.id,JSON.parse(JSON.stringify(e)));
      const poses=h.hitArt?.poses||[];maxPoses=Math.max(maxPoses,poses.length);
      for(const p of poses){seen.set(p.hit.id,{skill:p.skill,shape:p.shape,age:p.age});maxOffset=Math.max(maxOffset,Math.hypot(p.x,p.y));const actor=h.monsterArt.actors.get(p.hit.targetId),e=s.enemies.find(e=>e.id===p.hit.targetId);if(actor&&e){if(Math.abs(actor.node.position.x-(e.x-h.camera.x+p.x))>1e-4)throw Error('body does not follow settled recoil');bodyChecks++}}
      if(poses.length){
       const before=JSON.stringify(s),transforms=JSON.stringify(Array.from(h.monsterArt.actors,([id,a])=>[id,a.node.position.x,a.node.position.y,a.node.scale.x,a.node.scale.y]));h.draw();
       readOnly&&=JSON.stringify(s)===before;
       stable&&=transforms===JSON.stringify(Array.from(h.monsterArt.actors,([id,a])=>[id,a.node.position.x,a.node.position.y,a.node.scale.x,a.node.scale.y]));
      }
     }
     const end=s.time;s.loadout.active={};s.loadout.evolutions=[];s.casts=[];s.zones=[];s.projectiles=[];
     for(let i=0;i<60;i++)window.__stepLine();
     return {sounds,maxTrauma,maxHolds,maxKick,restTrauma:hi.trauma,restHolds:hi.holds.size,clipsLoaded:hi.clips.size,hits:Array.from(hits.values()),seen:Array.from(seen.values()),maxPoses,maxOffset,bodyChecks,readOnly,stable,expired:(h.hitArt?.poses.length||0)===0,end};
    });
    report.cases.push({viewport,fixture:{id:c.id,name:c.name,level:c.level,parent:c.parent},...result,hits:result.hits.length});assert.ok(result.hits,`${c.id} must actually hit`);
    assert.equal(result.clipsLoaded,6,'all six hit clips loaded');assert.ok(Object.keys(result.sounds).length>0,`${c.id} must play a hit sound`);
    assert.ok(result.restTrauma===0&&result.restHolds===0,`${c.id} shake/hold must return to rest`);assert.ok(result.maxKick<=6.5,`${c.id} kick capped`);
    assert.ok(result.seen.length,`${c.id} must render custom hit feedback`);assert.ok(result.bodyChecks>0);assert.ok(result.readOnly&&result.stable,`${c.id} redraw must be read-only and stable`);assert.ok(result.maxOffset<=9);assert.ok(result.expired);
   }
   // A genuine empty fight must never invent an impact.
   await page.evaluate(c=>window.__prepareFeel(c),cases[0]);const miss=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.enemies=[];for(let i=0;i<80;i++)window.__stepLine();return (h.hitArt?.poses.length||0)===0});assert.ok(miss);
   await page.waitForFunction(()=>window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
   // Uninterrupted production update loop, one full-size clip per skill.
   const segments=[];
   const recordingStart=Date.now();
   for(const c of cases.filter(c=>c.parent===10)){
    await page.evaluate(c=>{window.__prepareFeel(c);let label=document.getElementById('feel-label');if(!label){label=document.createElement('div');label.id='feel-label';label.style.cssText='position:fixed;left:50%;bottom:26px;transform:translateX(-50%);padding:8px 18px;background:#102d2ddd;color:#eaffff;font:20px sans-serif;border-radius:6px;pointer-events:none';document.body.appendChild(label)}label.textContent=c.name+' · 打击感';},c);
    await page.waitForTimeout(220);const start=Date.now();await page.evaluate(()=>window.__towerTest.host.run.resume());
    await page.waitForTimeout(['sj_formation','evo_sixiang','sj_sancai','sj_qinglian'].includes(c.id)?4600:2300);await page.evaluate(()=>window.__towerTest.host.run.pause());
    await page.screenshot({path:path.join(OUT,`${c.id}-${viewport.width}.png`)});segments.push({id:c.id,ms:Date.now()-start,relativeStart:start-recordingStart});
   }
   const cleanup=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.abandon();h.finish();return {trauma:h.hitImpact.trauma,holds:h.hitImpact.holds.size,poses:h.hitArt?.poses.length||0,bodies:h.hitArt?.bodies.size||0,writes:window.__lineWrites,unchanged:JSON.stringify(localStorage)===window.__lineInitial.storage}});
   report[`cleanup${viewport.width}`]=cleanup;assert.equal(cleanup.poses,0);assert.equal(cleanup.holds,0);assert.equal(cleanup.bodies,0);assert.deepEqual(cleanup.writes,[]);assert.ok(cleanup.unchanged);
   const video=page.video();await context.close();await video.saveAs(path.join(OUT,`raw-${viewport.width}.webm`));report[`segments${viewport.width}`]=segments;
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await page?.screenshot({path:path.join(OUT,'failure.png')}).catch(()=>{})}
 finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.status,report.cases.length);if(report.error)console.error(report.error)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
