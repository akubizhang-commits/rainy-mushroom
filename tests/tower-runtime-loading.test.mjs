import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
function harness(){
 const timers=new Map();let id=0;const jobs=[];
 const ctx={console:{warn(){},error(){}},setTimeout:fn=>{timers.set(++id,fn);return id},clearTimeout:i=>timers.delete(i),Component:class{},_decorator:{}};
 for(const name of ['TowerAssetQueue','TowerLoadingScreen','PinePilot']){
  const src=readFileSync(new URL(`../cocos-pilot/assets/scripts/${name}.ts`,import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^@ccclass.*$/gm,'');
  runInNewContext(stripTypeScriptTypes(src,{mode:'transform'}).replace(/^export /gm,'')+`\nglobalThis.${name}=${name}`,ctx);
 }
 const queue=new ctx.TowerAssetQueue((path,type,done)=>jobs.push({path,done}));
 const screen=Object.create(ctx.TowerLoadingScreen.prototype);
 Object.assign(screen,{queue,root:{active:true,parent:{children:[{}]},setSiblingIndex(){}},retry:{active:false},caption:{string:''},quietFrames:0,state:queue.state,drawProgress(){},resize(){}});
 queue.onChange=s=>screen.changed(s);
 const host=new ctx.PinePilot();host.assetLoading=screen;
 let time=0,resets=0;host.survivor={prepareAssets(){resets++},update(dt){time+=dt}};
 return {queue,screen,host,jobs,type:{},get time(){return time},get resets(){return resets},finish(job){job.done(null,{addRef(){},decRef(){}})},tick(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn())}};
}
test('runtime art never reopens loading or interrupts combat, including failed retries',()=>{
 const h=harness();h.host.update(.016);h.host.update(.016);assert.equal(h.screen.blocked,false);
 h.queue.load('runtime-art',h.type,()=>{});
 assert.equal(h.screen.blocked,false,'background resource must not reopen full-screen loading');
 const resets=h.resets;h.host.update(.1);assert.equal(h.time,.1);assert.equal(h.resets,resets);
 h.jobs[0].done(Error('offline'));h.tick();h.jobs[1].done(Error('offline'));h.tick();h.jobs[2].done(Error('offline'));
 assert.equal(h.screen.blocked,false);h.host.update(.1);assert.equal(h.time,.2);
});
test('explicit transition waits for new dependencies but ignores unrelated failed background art',()=>{
 const h=harness();h.host.update(.016);h.host.update(.016);
 h.queue.load('optional',h.type,()=>{});h.jobs[0].done(Error('offline'));h.tick();h.jobs[1].done(Error('offline'));h.tick();h.jobs[2].done(Error('offline'));
 h.screen.beginTransition();
 h.queue.load('scene',h.type,()=>h.queue.load('scene-atlas',h.type,()=>{}));
 h.host.update(.1);assert.equal(h.time,0);assert.equal(h.screen.blocked,true);
 h.finish(h.jobs[3]);h.host.update(.1);assert.equal(h.screen.blocked,true);
 h.finish(h.jobs[4]);h.host.update(.1);assert.equal(h.screen.blocked,true);h.host.update(.1);assert.equal(h.screen.blocked,false);
});
test('a transition adopts an in-flight background resource without duplicate requests',()=>{
 const h=harness();h.host.update(.016);h.host.update(.016);
 let bound=0;h.queue.load('shared',h.type,()=>bound++);
 h.screen.beginTransition();h.queue.load('shared',h.type,()=>bound++);
 h.host.update(.1);h.host.update(.1);assert.equal(h.screen.blocked,true);assert.equal(h.jobs.length,1);
 h.finish(h.jobs[0]);h.host.update(.1);h.host.update(.1);assert.equal(h.screen.blocked,false);assert.equal(bound,2);
});

test('floor preload includes later waves, authored boss art and motion before enemies spawn',async()=>{
 const {FLOORS,ARCHETYPES}=await import('../js/xianxia/TowerContent.js');
 const requests=[];const ctx={ARCHETYPES,ImageAsset:class{},JsonAsset:class{},resources:{load:(path,type)=>requests.push([path,type])}};
 const src=readFileSync(new URL('../cocos-pilot/assets/scripts/TowerMonsterArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'');
 runInNewContext(stripTypeScriptTypes(src,{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.Art=TowerMonsterArt',ctx);
 const art=new ctx.Art();art.preloadFloor(FLOORS[0]);
 for(const path of ['tower-monsters/boar','tower-monsters/wolf','tower-monsters/spider','tower-monsters-motion/boar-v3','tower-monsters-motion/boar-v3-enraged','tower-monsters-motion/wolf-v1'])assert.ok(requests.some(x=>x[0]===path),path);
 assert.equal(requests.filter(x=>x[0]==='tower-monsters-motion/wolf-v1').length,2,'image and metadata');
 const count=requests.length;art.preloadFloor(FLOORS[0]);assert.equal(requests.length,count);
 art.preloadFloor(FLOORS[4]);assert.ok(requests.some(x=>x[0]==='tower-monsters/snake-lady'));
});
test('drop preload requests material, heal and XP art without creating world objects',()=>{
 const requests=[];const ctx={ImageAsset:class{},resources:{load:path=>requests.push(path)}};
 const src=readFileSync(new URL('../cocos-pilot/assets/scripts/TowerStoneArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'');
 runInNewContext(stripTypeScriptTypes(src,{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.Art=TowerStoneArt',ctx);
 const art=new ctx.Art();art.preloadDrops();
 for(const path of ['stone_low','stone_top','drop_heal','resource_xp_essence','pill_forge_xuantie','pill_huichuncao'])assert.ok(requests.includes(`tower-stones/${path}`),path);
 const count=requests.length;art.preloadDrops();assert.equal(requests.length,count);
 assert.equal(art.bindings.size,0);
});
