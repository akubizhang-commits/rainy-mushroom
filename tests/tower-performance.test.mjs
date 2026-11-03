import test from 'node:test'
import assert from 'node:assert/strict'
import {existsSync,readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {stripTypeScriptTypes} from 'node:module'
import {resourceGroup} from '../js/xianxia/TowerResourceGroups.js'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {towerStorage,readPlaytestTools} from '../js/xianxia/TowerPlaytest.js'
function harness(options={}){
 const file=new URL('../cocos-pilot/assets/scripts/TowerPerformance.ts',import.meta.url)
 assert.ok(existsSync(file),'QA sampler must exist')
 let time=0,heap=1000
 const context={resourceGroup,console,performance:{now:()=>time}}
 const source=readFileSync(file,'utf8').replace(/^import .*$/gm,'')
 runInNewContext(stripTypeScriptTypes(source,{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.api={createTowerPerformance,TowerPerformance};',context)
 const defaults={clock:()=>time,heap:()=>heap,frameCapacity:4,cpuCapacity:4,eventCapacity:4,memoryCapacity:4,environment:'browser-local',...options}
 return {api:context.api,defaults,setTime:v=>time=v,setHeap:v=>heap=v,create:()=>context.api.createTowerPerformance({profile:'qa',developerTools:true},defaults)}
}
const plain=v=>JSON.parse(JSON.stringify(v))
test('only explicit QA capabilities construct a sampler or expose its API',()=>{
 const h=harness(),target={}
 for(const caps of [{profile:'production',developerTools:false},{profile:'production',developerTools:true},{profile:'qa',developerTools:false},{profile:'qa',developerTools:'true'},{}])assert.equal(h.api.createTowerPerformance(caps,h.defaults),null)
 const p=h.create();p.install(target);assert.ok(Object.isFrozen(target.__towerPerf));assert.equal(typeof target.__towerPerf.start,'function');p.destroy();assert.equal(target.__towerPerf,undefined)
})
test('engine frame intervals retain real hitches and exclude only documented background transitions',()=>{
 const h=harness({frameCapacity:10}),p=h.create();p.start('ordinary-battle')
 p.frame(.016,false);h.setTime(16);p.frame(.016,false);h.setTime(48);p.frame(.032,false)
 h.setTime(1048);p.frame(.1,false);p.setHidden(true);h.setTime(2000);p.frame(.1,false);p.setHidden(false);h.setTime(4000);p.frame(.1,false);h.setTime(4016);p.frame(.016,false)
 const s=plain(p.stop());assert.equal(s.summary.engineFrameMs.count,4);assert.equal(s.summary.engineFrameMs.p50,16);assert.equal(s.summary.engineFrameMs.p95,1000)
 assert.equal(s.frames.length,7);assert.equal(s.frames[0].intervalMs,null);assert.equal(s.frames[5].resumed,true);assert.equal(s.frames[4].hidden,true)
 assert.equal(s.metadata.frameSource,'Cocos Component.update');assert.equal(s.metadata.deviceValidation,'not-run')
})
test('capacity limits are explicit and restarts reset sampling without unbounded retention',()=>{
 const h=harness({frameCapacity:2,cpuCapacity:2,eventCapacity:2}),p=h.create();p.start('camp')
 for(let i=0;i<5;i++){h.setTime(i*16);p.frame(.016,false);const t=p.begin();h.setTime(i*16+2);p.end('draw',t);p.mark('interactive-ready')}
 const s=plain(p.stop());assert.equal(s.frames.length,2);assert.equal(s.cpu.length,2);assert.equal(s.events.length,2);assert.equal(s.dropped.frames,3);assert.equal(s.dropped.cpu,3);assert.equal(s.dropped.events,3)
 p.start('scene-switch');assert.equal(p.snapshot().frames.length,0);assert.equal(p.snapshot().dropped.frames,0)
 p.destroy();p.frame(.1,false);assert.throws(()=>p.start('camp'),/destroyed/)
})
test('CPU probes preserve operation values and errors while recording every completed interval',()=>{
 const h=harness(),p=h.create();p.start('multi-skill');let result
 const t=p.begin();try{result=42;h.setTime(5)}finally{p.end('simulation',t)}
 assert.equal(result,42)
 const error=Error('original');assert.throws(()=>{const t=p.begin();try{h.setTime(9);throw error}finally{p.end('persist',t)}},e=>e===error)
 const s=plain(p.stop());assert.equal(s.summary.cpuMs.simulation.p95,5);assert.equal(s.summary.cpuMs.persist.p95,4)
 const n=s.cpu.length;p.end('draw',NaN);assert.equal(p.snapshot().cpu.length,n)
})
test('resource traces distinguish transport, binding failure and rollback-safe retry without exporting errors',()=>{
 const h=harness({eventCapacity:12}),p=h.create();p.start('network-failure')
 p.resource({stage:'transport',status:'start',path:'tower-monsters-motion/boar-v3',type:'ImageAsset',attempt:1,token:1})
 h.setTime(12);p.resource({stage:'transport',status:'ready',path:'tower-monsters-motion/boar-v3',type:'ImageAsset',attempt:1,token:1,width:4096,height:3072})
 p.resource({stage:'binding',status:'failed',path:'tower-monsters-motion/boar-v3',type:'ImageAsset',attempt:1,token:1,retryable:true,error:'secret storage contents'})
 p.resource({stage:'binding',status:'ready',path:'tower-monsters-motion/boar-v3',type:'ImageAsset',attempt:1,token:1})
 const s=plain(p.stop());assert.equal(s.resources.length,4);assert.equal(s.resources[2].stage,'binding');assert.equal(s.resources[2].status,'failed');assert.equal(s.resources[2].group,'monster:boar')
 assert.equal(s.resources[2].error,undefined);assert.equal(s.summary.knownImages.rgba8EstimateBytes,50331648);assert.equal(s.summary.gpuMs,null);assert.equal(s.summary.processMemoryBytes,null)
 p.resource({stage:'lifetime',status:'released',path:'tower-monsters-motion/boar-v3',type:'ImageAsset',attempt:1,token:1});assert.equal(p.snapshot().summary.knownImages.rgba8EstimateBytes,0)
})
test('heap sampling is low frequency, optional and never substitutes process or GPU memory',()=>{
 const h=harness({frameCapacity:10}),p=h.create();p.start('camp');p.frame(.016,false);h.setHeap(2000);h.setTime(999);p.frame(.016,false);h.setTime(1000);p.frame(.016,false)
 const s=plain(p.stop());assert.equal(s.memory.length,2);assert.equal(s.memory[1].jsHeapBytes,2000);assert.equal(s.metadata.heapSource,'optional performance.memory.usedJSHeapSize estimate')
 const absent=h.api.createTowerPerformance({profile:'qa',developerTools:true},{...h.defaults,heap:()=>{throw Error('unavailable')}});absent.start('camp');absent.frame(.1,false);assert.equal(absent.snapshot().memory[0].jsHeapBytes,null)
})
test('invalid scenarios, resource paths and takeover cleanup cannot expose arbitrary user data',()=>{
 const h=harness(),p=h.create(),target={};assert.throws(()=>p.start('secret-save-state'),/scenario/)
 p.start('camp');p.resource({stage:'transport',status:'ready',path:'https://host/private?token=secret',type:'ImageAsset',attempt:1,token:1});assert.equal(p.snapshot().resources.length,0)
 p.install(target);target.__towerPerf={other:true};p.destroy();assert.equal(target.__towerPerf.other,true)
})
function queueHarness(observer){
 const timers=new Map(),jobs=[];let id=0
 const context={console:{warn(){},error(){}},setTimeout:fn=>{timers.set(++id,fn);return id},clearTimeout:key=>timers.delete(key)}
 const src=readFileSync(new URL('../cocos-pilot/assets/scripts/TowerAssetQueue.ts',import.meta.url),'utf8')
 runInNewContext(stripTypeScriptTypes(src,{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.Queue=TowerAssetQueue',context)
 const queue=new context.Queue((path,type,done)=>jobs.push({path,type,done}),observer)
 return {queue,jobs,tick(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn())}}
}
test('queue diagnostics report attempts and binding failures without altering retry or reference semantics',()=>{
 const records=[],q=queueHarness(e=>records.push(e));class ImageAsset{};const a={width:2,height:3,refs:0,addRef(){this.refs++},decRef(){this.refs--}}
 let good=0,bad=0,fail=true
 q.queue.load('atlas',ImageAsset,()=>good++);q.queue.load('atlas',ImageAsset,()=>{bad++;if(fail)throw Error('bind')},{retryable:true})
 q.jobs[0].done(null,a);assert.equal(a.refs,1);assert.equal(q.queue.state.failed,1)
 assert.deepEqual(records.map(e=>e.stage+':'+e.status),['transport:start','transport:ready','binding:ready','binding:failed'])
 assert.equal(records[1].width,2);assert.equal(records[3].retryable,true)
 fail=false;q.queue.retryFailed();assert.equal(good,1);assert.equal(bad,2);assert.equal(a.refs,1)
 q.queue.dispose();assert.equal(a.refs,0);assert.equal(records.at(-1).status,'released')
})
test('diagnostic observer errors cannot change queue completion, timeout retries, or late callback handling',()=>{
 const q=queueHarness(()=>{throw Error('observer failed')});let bound=0;const a={addRef(){},decRef(){}}
 q.queue.load('atlas',class ImageAsset{},()=>bound++);q.tick();q.tick();assert.equal(q.jobs.length,2)
 q.jobs[0].done(null,a);assert.equal(bound,0);assert.doesNotThrow(()=>q.jobs[1].done(null,a));assert.equal(bound,1);assert.equal(q.queue.state.completed,1)
})
test('optional audio diagnostics remain availability-only and callback or observer failures preserve original behavior',()=>{
 const events=[],jobs=[];class AudioClip{};class ImageAsset{}
 class Queue{constructor(transport,observer){this.observer=observer}dispose(){}}
 const ctx={Asset:class{},AudioClip,resources:{getInfoWithPath(){},load:(path,type,complete)=>jobs.push({path,type,complete})},TowerAssetQueue:Queue}
 const source=readFileSync(new URL('../cocos-pilot/assets/scripts/TowerResources.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'')
 runInNewContext(stripTypeScriptTypes(source,{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.api={beginTowerResources,endTowerResources,towerResources}',ctx)
 const queue=ctx.api.beginTowerResources(e=>events.push(e));let callbackError
 ctx.api.towerResources.load('optional-sound',AudioClip,error=>{callbackError=error});const absent=Error('absent');jobs[0].complete(absent,null)
 assert.equal(callbackError,absent);assert.deepEqual(events.map(e=>e.stage+':'+e.status),['optional-audio:start','optional-audio:failed'])
 assert.equal(events.some(e=>e.stage==='binding'),false)
 ctx.api.endTowerResources(queue);ctx.api.towerResources.load('direct',ImageAsset,()=>{});assert.equal(events.length,2)
})
function loadHost(context={}){
 const ctx={Component:class{},_decorator:{},...context}
 const source=readFileSync(new URL('../cocos-pilot/assets/scripts/PinePilot.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^@ccclass.*$/gm,'')
 runInNewContext(stripTypeScriptTypes(source,{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.Host=PinePilot',ctx)
 return {ctx,host:new ctx.Host()}
}
test('real host installs no production sampler and QA lifecycle removes only its own API',()=>{
 let created=0;const prod=loadHost({BUILD_CAPABILITIES:{profile:'production',developerTools:false},createTowerPerformance(){created++;throw Error('should not allocate')}})
 prod.host.setupPerformance();assert.equal(created,0);assert.equal(prod.ctx.__towerPerf,undefined)
 const h=harness(),listeners=new Map(),doc={hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)}}
 const qa=loadHost({BUILD_CAPABILITIES:{profile:'qa',developerTools:true},sys:{isBrowser:true},document:doc,createTowerPerformance:c=>h.api.createTowerPerformance(c,h.defaults)})
 qa.host.setupPerformance();assert.equal(typeof qa.ctx.__towerPerf.start,'function');assert.equal(listeners.size,1)
 doc.hidden=true;listeners.get('visibilitychange')();assert.equal(qa.host.performance.snapshot().events[0].kind,'hidden')
 qa.host.stopPerformance();assert.equal(listeners.size,0);assert.equal(qa.ctx.__towerPerf,undefined)
})
test('real host records engine updates through loading and preserves thrown game errors',()=>{
 const h=harness(),p=h.create();p.start('startup');const {host}=loadHost();host.performance=p
 let prepared=0,advanced=0;host.survivor={prepareAssets(){prepared++},update(){advanced++;h.setTime(10);throw original}};host.assetLoading={blocked:true,update(){}}
 host.update(.016);assert.equal(prepared,1);assert.equal(advanced,0)
 const original=Error('game error');host.assetLoading.blocked=false;h.setTime(5);assert.throws(()=>host.update(.016),e=>e===original)
 const s=plain(p.stop());assert.equal(s.frames.length,2);assert.equal(s.frames[0].loadingBlocked,true);assert.equal(s.summary.cpuMs.update.count,2);assert.equal(s.summary.cpuMs.update.max,5)
 assert.equal(s.events.filter(e=>e.kind==='interactive-ready').length,1)
})
test('real TowerView transaction and snapshot probes preserve objects, parameters and failures',()=>{
 const h=harness(),p=h.create();p.start('storage-failure');const ctx={}
 const src=readFileSync(new URL('../cocos-pilot/assets/scripts/TowerView.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'')
 runInNewContext(stripTypeScriptTypes(src,{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.View=TowerView',ctx)
 const view=Object.create(ctx.View.prototype),snapshot={unchanged:true},action={type:'test'},response={ok:false,reason:'save-failed'},calls=[]
 view.host={performance:p};view.store={act:(a,now)=>{calls.push([a,now]);h.setTime(3);return response}};view.run={snapshot:()=>{h.setTime(5);return snapshot}}
 assert.equal(view.actStore(action,7),response);assert.equal(calls[0][0],action);assert.equal(calls[0][1],7);assert.equal(view.snapshotRun(),snapshot)
 const original=Error('snapshot failed');view.run.snapshot=()=>{throw original};assert.throws(()=>view.snapshotRun(),e=>e===original)
 const s=plain(p.stop());assert.equal(s.summary.cpuMs.persist.count,1);assert.equal(s.summary.cpuMs.snapshot.count,2)
})

function lifecycleHarness(browser){
 const h=harness({frameCapacity:12,eventCapacity:12,environment:browser?'browser-local':'mini-game-unverified'})
 const eventBus=()=>{const listeners=new Map();return {
  on(name,fn,target){const list=listeners.get(name)||[];list.push({fn,target});listeners.set(name,list)},
  off(name,fn,target){listeners.set(name,(listeners.get(name)||[]).filter(v=>v.fn!==fn||v.target!==target))},
  emit(name){for(const {fn,target} of listeners.get(name)||[])fn.call(target)},
 }}
 const game=eventBus(),dom=eventBus(),windowEvents=eventBus(),data=new Map();let blocked=false
 const storage={getItem:key=>data.get(key)??null,setItem(key,value){if(blocked)throw Error('disk unavailable');data.set(key,value)}}
 const doc={hidden:false,addEventListener:dom.on,removeEventListener:dom.off}
 const context={BUILD_CAPABILITIES:{profile:'qa',developerTools:true},sys:{isBrowser:browser,localStorage:storage},createTowerPerformance:c=>h.api.createTowerPerformance(c,h.defaults)}
 if(browser)Object.assign(context,{document:doc,window:{addEventListener:windowEvents.on,removeEventListener:windowEvents.off,location:{search:''}},URLSearchParams})
 const {host}=loadHost(context);host.setupPerformance();host.canvas={layer:1,addChild(){}}
 class VisualBoundary{stop(){}reset(){}}
 class Node{layer=1;addComponent(Type){return new Type()}}
 class UITransform{setContentSize(){}}
 const ctx={...context,game,Game:{EVENT_HIDE:'hide',EVENT_SHOW:'show'},TowerCampaignStore,TOWER_CAMPAIGN_KEY,TowerRun,towerStorage,readPlaytestTools,Node,UITransform,Mask:class{},input:{on(){}},Input:{EventType:{KEY_DOWN:'key-down',KEY_UP:'key-up'}},view:{getVisibleSize:()=>({width:1280,height:720}),getFrameSize:()=>({width:1280,height:720}),setDesignResolutionSize(){}},ResolutionPolicy:{SHOW_ALL:0,FIXED_WIDTH:1}}
 // The test replaces rendering/audio boundaries only. Real platform registration,
 // View constructor/lifecycle, campaign transactions and sampler stay connected.
 for(const name of ['TowerBreakthroughAudio','TowerBodyFallbacks','TowerEnvironmentArt','TowerMonsterArt','TowerProjectileArt','SwordArcArt','FlightSwordArt','FlightStreamArt','NingshenAuraArt','JianguAuraArt','BumieAuraArt','JianxinAuraArt','QingpingAudio','SwordBurstArt','ConvergenceArt','SwordLineArt','SwordShadowArt','TowerHitArt','TowerDamageNumbers','TowerDebuffIcons','SwordTiandiArt','CrossBurstArt','SwordQiArt','OrbitSwordArt','LiangyiFormationArt','SixiangFormationArt','TowerStoneArt','TowerCharacterArt','PickupFeedback','TowerLevelBeamArt','TowerKeyboardNavigation'])ctx[name]=VisualBoundary
 for(const name of ['TowerPlatform','TowerView']){
  const source=readFileSync(new URL(`../cocos-pilot/assets/scripts/${name}.ts`,import.meta.url),'utf8').replace(/^import .*$/gm,'')
  runInNewContext(stripTypeScriptTypes(source,{mode:'transform'}).replace(/^export /gm,'')+`\nglobalThis.${name}=${name}`,ctx)
 }
 ctx.TowerView.prototype.render=function(){}
 ctx.TowerView.prototype.showModal=function(){}
 const view=new ctx.TowerView(host)
 return {...h,host,view,doc,hide:()=>game.emit('hide'),show:()=>game.emit('show'),visibility:()=>dom.emit('visibilitychange'),blockWrites:()=>blocked=true,raw:()=>data.get(TOWER_CAMPAIGN_KEY)}
}
for(const browser of [false,true])test(`real ${browser?'browser duplicate':'mini-game'} lifecycle excludes resume gaps while failed checkpoint stays atomic`,()=>{
 const h=lifecycleHarness(browser),p=h.host.performance,view=h.view
 const started=view.store.act({type:'startFloor',floor:1,seed:737},Date.now());assert.equal(started.ok,true)
 view.run=TowerRun.restore(started.snapshot||view.store.state.activeRun.snapshot);view.screen='battle'
 const before=view.store.state,raw=h.raw();h.blockWrites();p.start('background-resume')
 h.host.update(.016);h.setTime(16);h.host.update(.016);h.setTime(32);h.hide()
 if(browser){h.doc.hidden=true;h.visibility()}
 h.hide();assert.equal(view.run.state.phase,'paused');assert.equal(view.store.state,before);assert.equal(h.raw(),raw);assert.equal(view.pending.type,'checkpoint')
 h.setTime(1000);h.host.update(.1);h.setTime(4000);h.show()
 if(browser){h.doc.hidden=false;h.visibility()}
 h.show();h.host.update(.1);h.setTime(4016);h.host.update(.016)
 const s=plain(p.stop());assert.equal(s.frames[2].hidden,true);assert.equal(s.frames[2].intervalMs,984)
 assert.equal(s.frames[3].resumed,true);assert.equal(s.frames[3].intervalMs,3000)
 assert.deepEqual(s.events.filter(e=>e.kind==='hidden'||e.kind==='visible').map(e=>e.kind),['hidden','visible'])
 assert.equal(s.summary.engineFrameMs.count,2);assert.equal(s.summary.engineFrameMs.p95,16);assert.equal(s.summary.engineFrameMs.p99,16)
 assert.equal(view.store.state,before);assert.equal(h.raw(),raw);assert.equal(view.run.state.phase,'paused');assert.equal(view.skipFrame,true)
 view.platform.destroy();h.host.stopPerformance()
})
