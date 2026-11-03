import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';

// Real queue, controlled transport/clock: catches early reveal, stranded failures,
// duplicate loads, mixed JSON/image keys, and callbacks after the host is gone.
function harness(){
 const path=new URL('../cocos-pilot/assets/scripts/TowerAssetQueue.ts',import.meta.url);
 assert.ok(existsSync(path),'a tracked asset queue must gate the first visible frame');
 const jobs=[],timers=new Map();let id=0;
 const errors=[],warnings=[];
 const ctx={console:{error:(...args)=>errors.push(args),warn:(...args)=>warnings.push(args)},setTimeout:fn=>{timers.set(++id,fn);return id},clearTimeout:i=>timers.delete(i)};
 runInNewContext(stripTypeScriptTypes(readFileSync(path,'utf8'),{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.Queue=TowerAssetQueue',ctx);
 const queue=new ctx.Queue((path,type,done)=>jobs.push({path,type,done}));
 return {queue,jobs,timers,errors,warnings,tick(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn())}};
}
function asset(){return {refs:0,addRef(){this.refs++;},decRef(){this.refs--;}}}
const image={},json={};
test('waits for all resources including loads started by a completion callback',()=>{
 const {queue,jobs}=harness();let shown=0;
 queue.load('scene',image,()=>{shown++;queue.load('atlas',json,()=>shown++);});
 queue.load('hud',image,()=>shown++);
 assert.equal(queue.state.pending,2);assert.equal(shown,0);
 jobs[0].done(null,asset());assert.equal(queue.state.pending,2);
 jobs[1].done(null,asset());assert.equal(queue.state.pending,1);
 jobs[2].done(null,asset());assert.equal(queue.state.pending,0);assert.equal(shown,3);
 assert.equal(queue.state.completed,3);assert.equal(queue.state.total,3);
});
test('deduplicates by path AND type and delivers cached art synchronously on reentry',()=>{
 const {queue,jobs}=harness();const a=asset();let received=0;
 queue.load('atlas',image,()=>received++);queue.load('atlas',image,()=>received++);
 queue.load('atlas',json,()=>received++);assert.equal(jobs.length,2);
 jobs[0].done(null,a);assert.equal(received,2);assert.equal(a.refs,1);
 queue.load('atlas',image,()=>received++);assert.equal(received,3);assert.equal(jobs.length,2);
 jobs[1].done(null,asset());queue.dispose();assert.equal(a.refs,0);
});
test('exhausted automatic retries keep the screen blocked; manual retry delivers original binding',()=>{
 const {queue,jobs,tick}=harness();let bound=false;
 queue.load('scene',image,()=>{bound=true});
 jobs[0].done(Error('offline'),null);tick();jobs[1].done(Error('offline'),null);tick();jobs[2].done(Error('offline'),null);
 assert.equal(bound,false);assert.equal(queue.state.failed,1);assert.equal(queue.state.pending,0);
 queue.retryFailed();assert.equal(queue.state.failed,0);assert.equal(queue.state.pending,1);
 jobs[3].done(null,asset());assert.equal(bound,true);assert.equal(queue.state.failed,0);
});
test('timeouts cannot let a late response finish a newer attempt; dispose cancels all delivery',()=>{
 const {queue,jobs,tick,timers}=harness();let bound=0;
 queue.load('scene',image,()=>bound++);tick();tick();
 jobs[0].done(null,asset());assert.equal(bound,0);
 jobs[1].done(null,asset());assert.equal(bound,1);
 queue.load('hud',image,()=>bound++);queue.dispose();
 jobs[2].done(null,asset());assert.equal(bound,1);assert.equal(timers.size,0);
});

test('tracked resources retain library metadata queries',()=>{
 const entry={uuid:'book-art'};
 const ctx={resources:{getInfoWithPath:()=>entry},AudioClip:class {},TowerAssetQueue:class {}};
 const source=readFileSync(new URL('../cocos-pilot/assets/scripts/TowerResources.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'');
 runInNewContext(stripTypeScriptTypes(source,{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.facade=towerResources',ctx);
 assert.equal(typeof ctx.facade.getInfoWithPath,'function');
 assert.equal(ctx.facade.getInfoWithPath('library/book',image),entry);
});


test('a failed binding blocks completion and retries only that binding without retaining or loading twice',()=>{
 const {queue,jobs,errors}=harness(),a=asset();let good=0,bad=0,fail=true;
 queue.load('scene',image,()=>good++);
 queue.load('scene',image,()=>{bad++;if(fail)throw Error('texture upload');},{retryable:true});
 jobs[0].done(null,a);
 assert.equal(good,1);assert.equal(bad,1);assert.equal(queue.state.failed,1);
 assert.equal(queue.state.completed,0);assert.equal(a.refs,1);assert.equal(errors.length,1);
 fail=false;queue.retryFailed();
 assert.equal(good,1);assert.equal(bad,2);assert.equal(queue.state.failed,0);
 assert.equal(queue.state.completed,1);assert.equal(jobs.length,1);assert.equal(a.refs,1);
 queue.retryFailed();assert.equal(bad,2);queue.dispose();assert.equal(a.refs,0);
});
test('cache-hit binding errors enter the current blocking batch and cannot escape synchronously',()=>{
 const {queue,jobs}=harness(),a=asset();let fail=true,bound=0;
 queue.load('shared',image,()=>{});jobs[0].done(null,a);queue.endBlocking();queue.beginBlocking();
 assert.doesNotThrow(()=>queue.load('shared',image,()=>{bound++;if(fail)throw Error('cache bind');},{retryable:true}));
 assert.equal(queue.state.failed,1);assert.equal(queue.state.total,1);
 fail=false;queue.retryFailed();assert.equal(bound,2);assert.equal(queue.state.completed,1);
 assert.equal(jobs.length,1);assert.equal(a.refs,1);
});
test('unknown side effects are never replayed; an explicit rollback permits a safe retry',()=>{
 const unsafe=harness(),a=asset();let allocations=0;
 unsafe.queue.load('unsafe',image,()=>{allocations++;throw Error('partial bind');});
 unsafe.jobs[0].done(null,a);assert.equal(unsafe.queue.state.restartRequired,1);
 unsafe.queue.retryFailed();assert.equal(allocations,1);assert.equal(unsafe.jobs.length,1);
 assert.equal(unsafe.queue.state.failed,1);
 const safe=harness();let fail=true,owned=0,rollbacks=0;
 safe.queue.load('safe',image,()=>{owned++;if(fail)throw Error('partial bind');},{rollback:()=>{owned--;rollbacks++;}});
 safe.jobs[0].done(null,asset());assert.equal(owned,0);assert.equal(rollbacks,1);
 assert.equal(safe.queue.state.restartRequired,0);fail=false;safe.queue.retryFailed();
 assert.equal(owned,1);assert.equal(rollbacks,1);assert.equal(safe.queue.state.failed,0);
});
test('failed cleanup requires restart rather than replaying a partially cleaned binding',()=>{
 const {queue,jobs,errors}=harness();let calls=0;
 queue.load('scene',image,()=>{calls++;throw Error('binding');},{rollback:()=>{throw Error('cleanup');}});
 jobs[0].done(null,asset());queue.retryFailed();
 assert.equal(calls,1);assert.equal(queue.state.failed,1);assert.equal(queue.state.restartRequired,1);
 assert.equal(errors.length,2);
});
test('a retried binding can request dependencies and remains blocked until they complete',()=>{
 const {queue,jobs}=harness();let fail=true;
 queue.load('scene',image,()=>{if(fail)throw Error('upload');queue.load('atlas',json,()=>{});},{retryable:true});
 jobs[0].done(null,asset());fail=false;queue.retryFailed();
 assert.equal(queue.state.failed,0);assert.equal(queue.state.pending,1);assert.equal(queue.state.total,2);
 jobs[1].done(null,asset());assert.equal(queue.state.completed,2);
});
test('same-resource recursive subscriptions execute once and cannot strand pending callbacks',()=>{
 const {queue,jobs}=harness();let outer=0,inner=0;
 queue.load('scene',image,()=>{outer++;queue.load('scene',image,()=>inner++);});
 jobs[0].done(null,asset());assert.equal(outer,1);assert.equal(inner,1);
 assert.equal(queue.state.pending,0);assert.equal(queue.state.failed,0);
});
test('dispose inside the first binding prevents later bindings and releases the retained asset once',()=>{
 const {queue,jobs}=harness(),a=asset();let late=0;
 queue.load('scene',image,()=>queue.dispose());queue.load('scene',image,()=>late++);
 jobs[0].done(null,a);assert.equal(late,0);assert.equal(a.refs,0);
 queue.dispose();assert.equal(a.refs,0);
});
test('nonblocking binding failures do not enter the loading batch',()=>{
 const {queue,jobs}=harness();queue.endBlocking();
 queue.load('background',image,()=>{throw Error('background upload');});jobs[0].done(null,asset());
 assert.equal(queue.state.failed,0);assert.equal(queue.state.pending,0);assert.equal(queue.state.restartRequired,0);
 queue.beginBlocking();queue.load('scene',image,()=>{});jobs[1].done(null,asset());
 assert.equal(queue.state.completed,1);assert.equal(queue.state.failed,0);
});
test('optional audio keeps the direct fallback path while images use the tracked session',()=>{
 class AudioClip{};class ImageAsset{};const direct=[],tracked=[];
 class Queue{load(...args){tracked.push(args)}dispose(){}}
 const ctx={resources:{getInfoWithPath(){},load:(...args)=>direct.push(args)},AudioClip,TowerAssetQueue:Queue};
 const source=readFileSync(new URL('../cocos-pilot/assets/scripts/TowerResources.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'');
 runInNewContext(stripTypeScriptTypes(source,{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.api={beginTowerResources,towerResources}',ctx);
 ctx.api.beginTowerResources();let audioError;
 ctx.api.towerResources.load('optional-sound',AudioClip,error=>{audioError=error});
 const options={retryable:true};ctx.api.towerResources.load('image',ImageAsset,()=>{},options);
 assert.equal(direct.length,1);assert.equal(tracked.length,1);assert.equal(tracked[0][3],options);
 const absent=Error('audio absent');direct[0][2](absent,null);assert.equal(audioError,absent);
});
