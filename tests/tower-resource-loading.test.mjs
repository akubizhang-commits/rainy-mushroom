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
 const ctx={console,setTimeout:fn=>{timers.set(++id,fn);return id},clearTimeout:i=>timers.delete(i)};
 runInNewContext(stripTypeScriptTypes(readFileSync(path,'utf8'),{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.Queue=TowerAssetQueue',ctx);
 const queue=new ctx.Queue((path,type,done)=>jobs.push({path,type,done}));
 return {queue,jobs,timers,tick(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn())}};
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

test('release drops only the selected typed cache entry and permits fresh reentry',()=>{
 const {queue,jobs}=harness(),a=asset(),meta=asset(),shared=asset();
 queue.load('motion',image,()=>{});queue.load('motion',json,()=>{});queue.load('portrait',image,()=>{});
 jobs[0].done(null,a);jobs[1].done(null,meta);jobs[2].done(null,shared);
 queue.release('motion',image);queue.release('motion',image);
 assert.equal(a.refs,0);assert.equal(meta.refs,1);assert.equal(shared.refs,1);
 let next;queue.load('motion',image,(_,value)=>next=value);assert.equal(jobs.length,4);
 const fresh=asset();jobs[3].done(null,fresh);assert.equal(next,fresh);assert.equal(fresh.refs,1);
 queue.dispose();assert.equal(a.refs,0);assert.equal(fresh.refs,0);assert.equal(meta.refs,0);
});
test('release cancels pending retries and late responses without blocking replacement loads',()=>{
 const {queue,jobs,timers,tick}=harness();let old=0,next=0;
 queue.load('motion',image,()=>old++);jobs[0].done(Error('offline'));queue.release('motion',image);
 assert.equal(queue.state.total,0);assert.equal(timers.size,0);tick();assert.equal(jobs.length,1);
 queue.load('motion',image,()=>next++);const stale=asset();jobs[0].done(null,stale);
 assert.equal(stale.refs,0);assert.equal(old,0);assert.equal(queue.state.pending,1);
 jobs[1].done(null,asset());assert.equal(next,1);assert.equal(queue.state.pending,0);
});
test('release during completion prevents remaining stale callbacks and double release',()=>{
 const {queue,jobs}=harness(),a=asset();let stale=0;
 queue.load('motion',image,()=>queue.release('motion',image));
 queue.load('motion',image,()=>stale++);jobs[0].done(null,a);
 assert.equal(stale,0);assert.equal(a.refs,0);assert.equal(queue.state.total,0);
 queue.dispose();assert.equal(a.refs,0);
});
